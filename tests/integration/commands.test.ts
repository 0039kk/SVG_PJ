import { describe, it, expect } from 'vitest';
import { EditorSession } from '../../src/application/services/EditorSession.js';
import { CommandDispatcher } from '../../src/application/services/CommandDispatcher.js';
import { TextDocumentPresenter } from '../../src/adapters/presentation/TextDocumentPresenter.js';
import { ShapeFactory } from '../../src/domain/factories/ShapeFactory.js';
import { Repl } from '../../src/cli/Repl.js';
import { Tokenizer } from '../../src/cli/Tokenizer.js';
import { Readable, Writable } from 'node:stream';
import type { SvgCodec } from '../../src/application/ports/SvgCodec.js';

describe('CLI command and history contracts', () => {
  const createEditor = () => {
    const unusedCodec: SvgCodec = { encode: () => '', decode: () => { throw new Error('unused'); } };
    const session = new EditorSession({ read: async () => { throw new Error('missing'); }, write: async () => {} }, unusedCodec);
    const presenter = new TextDocumentPresenter();
    const repl = new Repl(new CommandDispatcher(session, new ShapeFactory(), presenter));
    const state = () => JSON.stringify({ tree: presenter.tree(session.document), path: session.savePath, history: session.historyStatus });
    return { session, repl, state };
  };

  it('tokenizes Chinese, empty text, colors and quoted in without treating colors as comments', () => {
    const tokenizer = new Tokenizer();
    expect(tokenizer.tokenize('  # comment')).toEqual([]);
    expect(tokenizer.tokenize('create text t 1 2 "in" in g').slice(-3)).toEqual([
      { value: 'in', quoted: true }, { value: 'in', quoted: false }, { value: 'g', quoted: false },
    ]);
    expect(tokenizer.tokenize('set t text ""').at(-1)?.value).toBe('');
    expect(tokenizer.tokenize('set t text "中文 \\"x\\""'.replaceAll('\\\\', '\\')).at(-1)?.value).toBe('中文 "x"');
    expect(tokenizer.tokenize('create circle c 1 2 3 #fff').at(-1)?.value).toBe('#fff');
    expect(() => tokenizer.tokenize('set t text "missing')).toThrow('unterminated');
    expect(() => tokenizer.tokenize('set t text "x"suffix')).toThrow('whitespace');
  });

  it('handles no document, all create types, queries and the IO barrier', async () => {
    const { session, repl } = createEditor();
    expect(await repl.evaluate('tree')).toBe("error: no document. use 'init' or 'read' first");
    expect(await repl.evaluate('help')).toContain('create <type>');
    expect(await repl.evaluate('init')).toBe('canvas 800x600 created');
    expect(await repl.evaluate('undo')).toBe('error: undo not allowed after io command');
    await repl.evaluate('create g scene');
    for (const command of ['create rect r 1 2 3 4 #fff in scene', 'create circle c 1 2 3',
      'create ellipse e 1 2 3 4', 'create line l 1 2 3 4 black', 'create text t 1 2 "in" in scene']) {
      expect(await repl.evaluate(command)).not.toMatch(/^error:/);
    }
    expect(session.document.count).toBe(6);
    expect(await repl.evaluate('show t')).toContain('parent=g#scene');
    expect(await repl.evaluate('tree scene')).toContain('text#t  (1,2) "in"');
    const status = session.historyStatus;
    await repl.evaluate('tree'); await repl.evaluate('show r'); await repl.evaluate('canvas'); await repl.evaluate('help');
    expect(session.historyStatus).toEqual(status);
    await repl.evaluate('canvas 400 300');
    expect(await repl.evaluate('redo')).toBe('error: undo not allowed after io command');
    await repl.evaluate('move scene 0 0'); await repl.evaluate('undo');
    expect(await repl.evaluate('undo')).toBe('error: nothing to undo');
  });

  it('prints svg> prompts for interactive input and closes at EOF', async () => {
    const { repl } = createEditor();
    let text = '';
    const output = new Writable({ write(chunk, _encoding, callback) { text += chunk.toString(); callback(); } });
    await repl.run(Readable.from(['init\ncreate g scene\n# comment\n']), output, true);
    expect(text.match(/svg> /g)).toHaveLength(4);
    expect(text).toContain('svg> canvas 800x600 created');
    expect(text).toContain('svg> g#scene created');
  });

  it('restores cross-parent ordering and every descendant as one history unit', async () => {
    const { session, repl, state } = createEditor();
    for (const command of ['init', 'create g outer', 'create g a in outer', 'create g b in outer',
      'create rect r 1 2 3 4 in a', 'create circle c 5 6 7 in b']) await repl.evaluate(command);
    const original = new TextDocumentPresenter().tree(session.document);
    await repl.evaluate('group pair c r');
    expect(session.document.find('pair').children.map(child => child.id)).toEqual(['r', 'c']);
    await repl.evaluate('undo');
    expect(new TextDocumentPresenter().tree(session.document)).toBe(original);
    const beforeFailure = state();
    expect(await repl.evaluate('group bad outer r')).toBe('error: cannot group a container into its own descendant: outer');
    expect(state()).toBe(beforeFailure);
    await repl.evaluate('redo');
    await repl.evaluate('delete pair');
    expect(() => session.document.find('r')).toThrow('no such shape');
    await repl.evaluate('undo');
    expect(session.document.find('r').parent?.label).toBe('g#pair');
    await repl.evaluate('ungroup pair');
    expect(session.document.find('r').parent?.label).toBe('g#outer');
    await repl.evaluate('undo');
    expect(session.document.find('c').parent?.label).toBe('g#pair');
  });

  it('restores absent attributes, handles z-order/addto, and clears redo only after a successful edit', async () => {
    const { session, repl, state } = createEditor();
    for (const command of ['init', 'create g g', 'create rect r 1 2 3 4', 'create circle c 1 2 3']) await repl.evaluate(command);
    await repl.evaluate('set r fill red'); await repl.evaluate('undo');
    expect(session.document.find('r').attributes).not.toHaveProperty('fill');
    const before = state();
    expect(await repl.evaluate('set r nope 2')).toBe('error: unknown attribute: nope');
    expect(state()).toBe(before);
    await repl.evaluate('redo'); expect(session.document.find('r').attributes.fill).toBe('red');
    await repl.evaluate('front r'); expect(session.document.root.children.at(-1)?.id).toBe('r');
    await repl.evaluate('back c'); expect(session.document.root.children[0]?.id).toBe('c');
    await repl.evaluate('addto g r'); expect(session.document.find('r').parent?.label).toBe('g#g');
    await repl.evaluate('undo'); await repl.evaluate('move c 0 0');
    expect(await repl.evaluate('redo')).toBe('error: nothing to redo');
  });

  it('keeps document, path, redo and barrier unchanged on every rejected command', async () => {
    const { session, repl, state } = createEditor();
    for (const command of ['init', 'create g g', 'create rect r 1 2 3 4 in g', 'move r 1 2', 'undo']) await repl.evaluate(command);
    const before = state();
    const errors = ['create g g', 'create box b 1 2 3 4 "title"', 'create g bad in r', 'create g bad in missing',
      'delete missing', 'scale g 0', 'scale r -1', 'scale r NaN', 'move r Infinity 2', 'move r 2foo 3',
      'create rect bad 0 0 -1 2', 'set r width -2', 'set r id other', 'ungroup g', 'ungroup r',
      'group pair r r', 'addto g g', 'canvas 0 1', 'canvas 2', 'canvas 3 4 extra', 'save',
      'read missing.svg', 'nonsense', 'move r 1', 'tree r extra', 'set r text "unclosed'];
    for (const command of errors) {
      expect(await repl.evaluate(command), command).toMatch(/^error: [^\r\n]+$/);
      expect(state(), command).toBe(before);
      session.document.assertInvariants();
    }
  });

  it('discards an entire recursive edit when a later descendant overflows', async () => {
    const { session, repl, state } = createEditor();
    for (const command of ['init', 'create g g', 'create rect r 1 2 3 4 in g', 'create circle c 1e308 0 2 in g']) await repl.evaluate(command);
    const before = state();
    expect(await repl.evaluate('scale g 10')).toContain('error: invalid number');
    expect(state()).toBe(before);
    expect(session.document.find('r').attributes.x).toBe('1');
  });

  it.each([
    'create rect new 10 20 30 40 blue in outer', 'create circle new 10 20 30 in outer',
    'create ellipse new 10 20 30 40 in outer', 'create line new 10 20 30 40 black in outer',
    'create text new 10 20 "new text" in outer', 'create g new in outer',
    'delete outer', 'move outer -5 2.5', 'scale outer 1.5', 'set r width 8',
    'set t text "changed"', 'set outer fill blue', 'group pair c r', 'ungroup inner',
    'addto inner r', 'front inner', 'back r',
  ])('restores and redoes one complete edit: %s', async command => {
    const { session, repl } = createEditor();
    const presenter = new TextDocumentPresenter();
    for (const setup of ['init', 'create g outer', 'create g inner in outer',
      'create rect r 1 2 3 4 in outer', 'create circle c 10 20 30 in inner',
      'create text t 10 20 "original" in inner']) await repl.evaluate(setup);
    const before = presenter.tree(session.document);
    const history = session.historyStatus.undo;
    expect(await repl.evaluate(command)).not.toMatch(/^error:/);
    const after = presenter.tree(session.document);
    expect(after).not.toBe(before);
    expect(session.historyStatus.undo).toBe(history + 1);
    expect(await repl.evaluate('undo')).not.toMatch(/^error:/);
    expect(presenter.tree(session.document)).toBe(before);
    session.document.assertInvariants();
    expect(await repl.evaluate('redo')).not.toMatch(/^error:/);
    expect(presenter.tree(session.document)).toBe(after);
    session.document.assertInvariants();
  });
});
