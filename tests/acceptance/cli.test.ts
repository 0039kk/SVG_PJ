import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { XmlSvgCodec } from '../../src/adapters/svg/XmlSvgCodec.js';
import { ShapeFactory } from '../../src/domain/factories/ShapeFactory.js';

describe('real CLI processes', () => {
  it('replays the two-node flowchart and serializes eight correctly nested elements', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'svg-cli-test-'));
    try {
      const output = join(directory, '流程图 result.svg').replaceAll('\\', '/');
      const input = (await readFile(new URL('../../examples/flowchart.commands', import.meta.url), 'utf8'))
        .replace('save examples/flowchart.svg', `save "${output}"`);
      const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts'], { input, encoding: 'utf8', timeout: 20000 });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain("svg-editor 0.1 — type 'help' for commands");
      expect(result.stdout).not.toContain('error:');
      expect(result.stdout).toContain('saved to ' + output + ' (8 elements)');
      const document = new XmlSvgCodec(new ShapeFactory()).decode(await readFile(output, 'utf8')).document;
      expect(document.count).toBe(8);
      expect(document.find('node2').parent?.label).toBe('g#flowchart');
      expect(document.find('process').attributes.y).toBe('100');
      expect(document.find('process-label').textContent).toBe('处理数据 v2');
      expect(document.root.children.map(shape => shape.id)).toEqual(['flowchart']);
    } finally {
      if (dirname(directory) !== tmpdir() || !basename(directory).startsWith('svg-cli-test-')) throw new Error('unsafe cleanup path');
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('replays the complete transcript and continues after expected errors', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'svg-cli-test-'));
    try {
      const path = join(directory, 'demo.svg').replaceAll('\\', '/');
      const input = (await readFile(new URL('../../examples/session.commands', import.meta.url), 'utf8'))
        .replace('save examples/demo.svg', `save "${path}"`);
      const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts'], { input, encoding: 'utf8', timeout: 20000 });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe('');
      const errors = result.stdout.split('\n').filter(line => line.startsWith('error:'));
      expect(errors).toEqual([
        'error: cannot group a container into its own descendant: markers', 'error: undo not allowed after io command',
      ]);
      expect(result.stdout).toContain('warning: assigned id rect1 to unnamed <rect>');
      expect(result.stdout).toContain('read tests/fixtures/other.svg (7 elements)');
      expect(result.stdout).toContain('ellipse#e1  cx=1 cy=2 rx=3 ry=4');
      const document = new XmlSvgCodec(new ShapeFactory()).decode(await readFile(path, 'utf8')).document;
      expect(document.count).toBe(5);
      expect(document.find('c1').attributes.cx).toBe('130');
      expect(document.find('title').textContent).toBe('My Diagram');
      expect(document.find('box').parent?.label).toBe('g#markers');
    } finally {
      if (dirname(directory) !== tmpdir() || !basename(directory).startsWith('svg-cli-test-')) throw new Error('unsafe cleanup path');
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('runs piped commands without interactive prompts and supports graceful EOF', () => {
    // A real terminal reports isTTY; process piping deliberately emits no prompts.
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts'], { input: 'help\ninit\ncreate g x\n', encoding: 'utf8', timeout: 20000 });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('g#x created');
    expect(result.stdout).not.toMatch(/^svg> /m);
  });
});
