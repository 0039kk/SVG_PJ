import { readFile, open, rename, unlink } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FileGateway } from '../../application/ports/FileGateway.js';

export class NodeFileGateway implements FileGateway {
  async read(path: string): Promise<string> { return readFile(path, 'utf8'); }

  async write(path: string, content: string): Promise<void> {
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    let created = false;
    try {
      const handle = await open(temporary, 'wx');
      created = true;
      try { await handle.writeFile(content, 'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      await rename(temporary, path);
      created = false;
    } finally {
      if (created) await unlink(temporary).catch(() => {});
    }
  }
}
