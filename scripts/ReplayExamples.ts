import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { XmlSvgCodec } from '../src/adapters/svg/XmlSvgCodec.js';
import { ShapeFactory } from '../src/domain/factories/ShapeFactory.js';

class ReplayExamples {
  async run(): Promise<void> {
    await mkdir('.verification', { recursive: true });
    for (const [name, count, errors] of [['flowchart', 8, 0], ['session', 5, 2]] as const) {
      const input = await readFile(`examples/${name}.commands`, 'utf8');
      const result = spawnSync(process.execPath, ['dist/main.js'], { input, encoding: 'utf8', timeout: 20000 });
      if (result.error || result.status !== 0 || result.stderr) throw new Error(result.stderr || String(result.error));
      const actualErrors = result.stdout.split('\n').filter(line => line.startsWith('error:'));
      if (actualErrors.length !== errors) throw new Error(`unexpected errors in ${name}: ${actualErrors.join('; ')}`);
      const path = name === 'session' ? 'examples/demo.svg' : 'examples/flowchart.svg';
      const document = new XmlSvgCodec(new ShapeFactory()).decode(await readFile(path, 'utf8')).document;
      if (document.count !== count) throw new Error(`wrong element count in ${name}`);
      await writeFile(`.verification/${name}.txt`, result.stdout, 'utf8');
      console.log(`${name}: compiled CLI replay passed; ${count} elements; ${errors} expected errors`);
    }
  }
}

await new ReplayExamples().run();
