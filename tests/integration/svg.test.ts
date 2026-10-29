import { describe, it, expect } from 'vitest';
import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { XmlSvgCodec } from '../../src/adapters/svg/XmlSvgCodec.js';
import { NodeFileGateway } from '../../src/adapters/filesystem/NodeFileGateway.js';
import { TextDocumentPresenter } from '../../src/adapters/presentation/TextDocumentPresenter.js';
import { ShapeFactory } from '../../src/domain/factories/ShapeFactory.js';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { EditorSession } from '../../src/application/services/EditorSession.js';
import { CommandDispatcher } from '../../src/application/services/CommandDispatcher.js';
import { Repl } from '../../src/cli/Repl.js';

describe('SVG import export and IO isolation', () => {
  const factory = new ShapeFactory();
  const codec = new XmlSvgCodec(factory);
  const presenter = new TextDocumentPresenter();

  it('imports the supplied fixture and preserves all supported semantics on round-trip', async () => {
    const source = await readFile(new URL('../fixtures/other.svg', import.meta.url), 'utf8');
    const decoded = codec.decode(source);
    expect(decoded.warnings).toEqual(['warning: assigned id rect1 to unnamed <rect>']);
    expect(decoded.document.count).toBe(7);
    expect(decoded.document.find('r2').parent?.label).toBe('g#g1');
    const saved = codec.encode(decoded.document);
    expect(presenter.tree(codec.decode(saved).document)).toBe(presenter.tree(decoded.document));
    expect(codec.decode(saved).warnings).toEqual([]);
  });

  it('reserves ids across the whole file before generating missing ones', () => {
    const { document, warnings } = codec.decode('<svg><rect/><g><rect id="rect1"/><rect/></g><g id="g1"/></svg>');
    expect(warnings).toEqual([
      'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id g2 to unnamed <g>',
      'warning: assigned id rect3 to unnamed <rect>',
    ]);
    expect(document.count).toBe(5);
    expect(document.find('rect1').parent?.label).toBe('g#g2');
  });

  it('uses XML text nodes for Chinese, special characters, empty strings and CDATA', () => {
    const document = new SvgDocument(320, 240);
    document.add(factory.create('text', 't', ['1.5', '-2', '中文 & <tag> "quotes" 😀']));
    document.add(factory.create('text', 'empty', ['0', '0', '']));
    const source = codec.encode(document);
    expect(source).toContain('&amp;'); expect(source).toContain('&lt;tag&gt;');
    const decoded = codec.decode(source).document;
    expect(decoded.find('t').textContent).toBe(document.find('t').textContent);
    expect(decoded.find('empty').textContent).toBe('');
    expect(codec.decode('<svg><text id="t"><![CDATA[<>&]]></text></svg>').document.find('t').textContent).toBe('<>&');
    const carriageReturn = codec.decode('<svg><text id="cr">a&#13;b</text></svg>').document;
    expect(codec.encode(carriageReturn)).toContain('a&#13;b');
    expect(codec.decode(codec.encode(carriageReturn)).document.find('cr').textContent).toBe('a\rb');
    expect(decoded.find('t').attributes).not.toHaveProperty('fill');
  });

  it('accepts standard namespaces, px canvas sizes, declarations and comments', () => {
    const document = codec.decode('<?xml version="1.0"?><!--note--><s:svg xmlns:s="http://www.w3.org/2000/svg" width="400px" height="200px" viewBox="0,0,400,200"><s:g id="g"><!-- c --><s:rect id="r"/></s:g></s:svg>').document;
    expect(document.width).toBe(400); expect(document.height).toBe(200);
    expect(document.find('r').parent?.label).toBe('g#g');
  });

  it.each([
    '<svg><rect></svg>', '<svg><rect id="r"/><circle id="r"/></svg>', '<svg><path id="p"/></svg>',
    '<svg><g id="g" transform="translate(1,2)"/></svg>', '<svg viewBox="1 0 800 600"/>',
    '<svg><rect width="NaN"/></svg>', '<svg><rect width="-1"/></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///secret">]><svg/>',
    '<svg><text id="t">&unknown;</text></svg>', '<svg><text id="t"><tspan>bad</tspan></text></svg>',
    '<svg style="fill:red"/>', '<svg><rect id="r" opacity="0.5"/></svg>', '<svg xmlns="urn:not-svg"/>',
    '<svg><text text="lost"/></svg>', '<?xml-stylesheet href="external.css"?><svg/>',
    '<svg><g>lost text</g></svg>', '<svg><rect x=1/></svg>', '<svg width="100%"/>',
    '<svg xmlns="http://www.w3.org/2000/svg"><g xmlns="" id="not-svg"/></svg>',
  ])('rejects unsupported or malformed SVG without pretending to import: %s', source => {
    expect(() => codec.decode(source)).toThrow();
  });

  it('commits read/save paths and barriers only on success; failed import emits no warnings', async () => {
    const storage = new Map<string, string>();
    storage.set('good.svg', '<svg><rect id="r" x="1"/></svg>');
    storage.set('bad.svg', '<svg><rect/><g transform="translate(2,3)"/></svg>');
    let failWrite = false;
    const files = {
      read: async (path: string) => { if (!storage.has(path)) throw new Error('missing'); return storage.get(path)!; },
      write: async (path: string, content: string) => { if (failWrite) throw new Error('denied'); storage.set(path, content); },
    };
    const session = new EditorSession(files, codec);
    const repl = new Repl(new CommandDispatcher(session, factory, presenter));
    await repl.evaluate('read good.svg'); await repl.evaluate('move r 5 0'); await repl.evaluate('undo');
    const state = () => JSON.stringify({ tree: presenter.tree(session.document), path: session.savePath, history: session.historyStatus });
    const before = state();
    expect(await repl.evaluate('read bad.svg')).toMatch(/^error:/);
    expect(state()).toBe(before);
    expect(await repl.evaluate('read missing.svg')).toBe('error: cannot read file: missing.svg');
    expect(state()).toBe(before);
    failWrite = true;
    expect(await repl.evaluate('save elsewhere.svg')).toBe('error: cannot write file: elsewhere.svg');
    expect(state()).toBe(before);
    failWrite = false;
    expect(await repl.evaluate('save "new file.svg"')).toContain('saved to new file.svg');
    expect(session.savePath).toBe('new file.svg');
    expect(await repl.evaluate('undo')).toBe('error: undo not allowed after io command');
    await repl.evaluate('move r 1 0');
    await repl.evaluate('save');
    expect(codec.decode(storage.get('new file.svg')!).document.find('r').attributes.x).toBe('2');
    await repl.evaluate('init');
    expect(session.savePath).toBeUndefined();
  });

  it('atomically overwrites real files, supports Unicode/spaces and cleans temporary files after failure', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'svg-editor-test-'));
    try {
      const files = new NodeFileGateway();
      const path = join(directory, '中文 drawing.svg');
      await files.write(path, '<svg/>'); await files.write(path, '<svg width="100"/>');
      expect(await files.read(path)).toBe('<svg width="100"/>');
      await expect(files.write(directory, 'cannot replace a directory')).rejects.toThrow();
      await expect(files.write(join(directory, 'missing', 'file.svg'), 'x')).rejects.toThrow();
      expect(await readdir(directory)).toEqual(['中文 drawing.svg']);
    } finally {
      if (dirname(directory) !== tmpdir() || !basename(directory).startsWith('svg-editor-test-')) throw new Error('unsafe cleanup path');
      await rm(directory, { recursive: true, force: true });
    }
  });
});
