import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, basename, dirname, sep } from 'node:path';

class ArchitectureCheck {
  private readonly root = resolve('src');
  private readonly failures: string[] = [];

  async run(): Promise<void> {
    const files = await this.files(this.root);
    for (const file of files) await this.inspect(file);
    if (this.failures.length) throw new Error(this.failures.join('\n'));
    console.log(`Architecture check passed: ${files.length} TypeScript files; dependency directions, class filenames, no switch dispatch.`);
  }

  private async files(directory: string): Promise<string[]> {
    const result: string[] = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) result.push(...await this.files(path));
      else if (path.endsWith('.ts')) result.push(path);
    }
    return result;
  }

  private layer(path: string): string { return relative(this.root, path).split(sep)[0]!; }

  private async inspect(file: string): Promise<void> {
    const source = await readFile(file, 'utf8');
    const layer = this.layer(file);
    const allowed: Record<string, readonly string[]> = {
      domain: ['domain'], application: ['domain', 'application'],
      cli: ['application', 'cli'], adapters: ['domain', 'application', 'adapters'],
    };
    // Intentionally checks this repository's explicit, single-line import style.
    // It is a guardrail, complemented by the documented manual dispatch review.
    const classes = [...source.matchAll(/^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/gm)];
    for (const declaration of classes) {
      if (declaration[1] !== basename(file, '.ts')) this.failures.push(`${file}: class name must match filename`);
    }
    if (classes.length > 1) this.failures.push(`${file}: multiple classes in one file`);
    if (/\bfunction\s+\w+\s*\(/.test(source)) this.failures.push(`${file}: free function declaration`);
    if (/\bswitch\s*\(/.test(source)) this.failures.push(`${file}: switch dispatch requires review`);
    if (/\bimport\s*\(/.test(source)) this.failures.push(`${file}: dynamic import requires review`);
    for (const statement of source.matchAll(/^import\s+[^\n]*?from\s+['"]([^'"]+)['"]/gm)) {
      const name = statement[1]!;
      if (name.startsWith('.')) {
        const target = this.layer(resolve(dirname(file), name));
        if (allowed[layer] && !allowed[layer]!.includes(target)) this.failures.push(`${file}: ${layer} cannot import ${target}`);
      } else if (layer === 'domain' || layer === 'application') {
        this.failures.push(`${file}: core cannot import external library ${name}`);
      }
    }
  }
}

await new ArchitectureCheck().run();
