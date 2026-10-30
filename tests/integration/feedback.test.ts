import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { EditorSession } from '../../src/application/services/EditorSession.js';
import { CommandDispatcher } from '../../src/application/services/CommandDispatcher.js';
import { XmlSvgCodec } from '../../src/adapters/svg/XmlSvgCodec.js';
import { TextDocumentPresenter } from '../../src/adapters/presentation/TextDocumentPresenter.js';
import { ShapeFactory } from '../../src/domain/factories/ShapeFactory.js';
import { Repl } from '../../src/cli/Repl.js';

const createEditor = () => {
  const factory = new ShapeFactory();
  const storage = new Map<string, string>();
  const session = new EditorSession({
    read: async path => {
      const source = storage.get(path);
      if (source === undefined) throw new Error('missing file');
      return source;
    },
    write: async (path, source) => { storage.set(path, source); },
  }, new XmlSvgCodec(factory));
  return { session, storage, repl: new Repl(new CommandDispatcher(session, factory, new TextDocumentPresenter())) };
};

describe('feedback follows the requirement transcripts', () => {
  it.each(['6', '6.1'])('matches every command feedback line in requirement section %s exactly', async section => {
    const specification = await readFile(new URL('../../phase_cli_1.md', import.meta.url), 'utf8');
    const part = section === '6'
      ? specification.split('## 6. 典型会话')[1]!.split('### 6.1')[0]!
      : specification.split('### 6.1')[1]!.split('**版本 B')[0]!;
    const transcript = [...part.matchAll(/```text\r?\n([\s\S]*?)```/g)]
      .map(match => match[1]!).find(block => /^svg> init /m.test(block));
    expect(transcript).toBeDefined();
    const { repl, storage } = createEditor();
    storage.set('other.svg', await readFile(new URL('../fixtures/other.svg', import.meta.url), 'utf8'));
    const lines = transcript!.split(/\r?\n/);
    let compared = 0;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]!;
      if (!line.startsWith('svg> ')) continue;
      const command = line.slice(5);
      const output = await repl.evaluate(command);
      // Tree alignment is a separate presentation concern; compare all feedback verbatim.
      if (command === 'tree' || command.startsWith('tree ')) continue;
      const expected: string[] = [];
      for (let cursor = index + 1; cursor < lines.length && !lines[cursor]!.startsWith('svg> '); cursor++) {
        const text = lines[cursor]!;
        if (text.trim() && !text.trimStart().startsWith('#')) expected.push(text);
      }
      expect(output, command).toBe(expected.join('\n'));
      compared++;
    }
    expect(compared).toBeGreaterThan(10);
  });

  it.each([
    ['rect', '1 2 3 4', 'rect#r moved to (31,1.5)', 'rect#r moved back to (1,2)'],
    ['circle', '1 2 3', 'circle#r moved to (31,1.5)', 'circle#r moved back to (1,2)'],
    ['ellipse', '1 2 3 4', 'ellipse#r moved to (31,1.5)', 'ellipse#r moved back to (1,2)'],
    ['text', '1 2 "hello"', 'text#r moved to (31,1.5)', 'text#r moved back to (1,2)'],
    ['line', '1 2 3 4', 'line#r moved to (31,1.5) -> (33,3.5)', 'line#r moved back to (1,2) -> (3,4)'],
  ])('reports actual restored coordinates for %s, including redo', async (type, parameters, moved, restored) => {
    const { repl } = createEditor();
    await repl.evaluate('init'); await repl.evaluate(`create ${type} r ${parameters}`);
    expect(await repl.evaluate('move r 30 -0.5')).toBe(moved);
    expect(await repl.evaluate('undo')).toBe(restored);
    expect(await repl.evaluate('redo')).toBe(moved);
  });

  it.each([
    ['create g new in outer', 'g#new deleted', 'g#new created in g#outer'],
    ['delete inner', 'g#inner restored into g#outer', 'g#inner deleted'],
    ['scale outer 2', 'g#outer scale restored', 'g#outer scaled by 2'],
    ['set t text "new"', 'text#t updated: text="old"', 'text#t updated: text="new"'],
    ['set r fill red', 'rect#r updated: fill removed', 'rect#r updated: fill="red"'],
    ['group pair c r', 'g#pair ungrouped', 'g#pair created with 2 children'],
    ['ungroup inner', 'g#inner restored into g#outer', 'g#inner ungrouped'],
    ['addto inner r', 'rect#r restored into g#outer', 'rect#r added to g#inner'],
    ['front inner', 'g#inner restored to position 1 in g#outer', 'g#inner moved to front'],
    ['back r', 'rect#r restored to position 2 in g#outer', 'rect#r moved to back'],
  ])('describes the restored result for %s without replaying its old success message', async (command, undone, redone) => {
    const { repl } = createEditor();
    for (const setup of ['init', 'create g outer', 'create g inner in outer',
      'create rect r 1 2 3 4 in outer', 'create circle c 10 20 30 in inner',
      'create text t 10 20 "old" in inner']) await repl.evaluate(setup);
    expect(await repl.evaluate(command)).toBe(redone);
    expect(await repl.evaluate('undo')).toBe(undone);
    expect(await repl.evaluate('redo')).toBe(redone);
  });

  it('keeps the original coordinates across repeated undo/redo and normalizes negative zero', async () => {
    const { repl } = createEditor();
    await repl.evaluate('init'); await repl.evaluate('create g g'); await repl.evaluate('create rect r 1 2 3 4 in g');
    expect(await repl.evaluate('move g 0 100')).toBe('g#g moved by (0,100)');
    for (let iteration = 0; iteration < 3; iteration++) {
      expect(await repl.evaluate('undo')).toBe('g#g moved back by (0,-100)');
      expect(await repl.evaluate('redo')).toBe('g#g moved by (0,100)');
    }
    await repl.evaluate('undo');
    expect(await repl.evaluate('move r 0 -0')).toBe('rect#r moved to (1,2)');
    expect(await repl.evaluate('undo')).toBe('rect#r moved back to (1,2)');
  });

  it('formats set feedback from the stored value, including normalized numbers and empty text', async () => {
    const { repl } = createEditor();
    await repl.evaluate('init'); await repl.evaluate('create rect r 1 2 3 4');
    expect(await repl.evaluate('set r width 1e2')).toBe('rect#r updated: width="100"');
    expect(await repl.evaluate('undo')).toBe('rect#r updated: width="3"');
    expect(await repl.evaluate('redo')).toBe('rect#r updated: width="100"');
    await repl.evaluate('create text t 1 2 "old"');
    expect(await repl.evaluate('set t text ""')).toBe('text#t updated: text=""');
    expect(await repl.evaluate('undo')).toBe('text#t updated: text="old"');
  });
});
