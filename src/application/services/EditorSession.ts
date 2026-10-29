import { SvgDocument } from '../../domain/document/SvgDocument.js';
import { EditorError } from '../../domain/errors/EditorError.js';
import type { EditCommand } from '../commands/EditCommand.js';
import { HistoryManager } from '../history/HistoryManager.js';
import type { FileGateway } from '../ports/FileGateway.js';
import type { SvgCodec } from '../ports/SvgCodec.js';

export class EditorSession {
  private current: SvgDocument | undefined;
  private path: string | undefined;
  private readonly history = new HistoryManager();

  constructor(private readonly files: FileGateway, private readonly codec: SvgCodec) {}

  get document(): SvgDocument {
    if (!this.current) throw new EditorError("no document. use 'init' or 'read' first");
    return this.current;
  }
  get savePath(): string | undefined { return this.path; }
  get historyStatus(): ReturnType<EditorSession['status']> { return this.status(); }

  init(width = 800, height = 600): string {
    const document = new SvgDocument(width, height);
    this.current = document; this.path = undefined; this.history.barrier();
    return `canvas ${width}x${height} created`;
  }

  canvas(width?: number, height?: number): string {
    const current = this.document;
    if (width === undefined && height === undefined) return `canvas ${current.width}x${current.height}`;
    if (width === undefined || height === undefined) throw new EditorError('usage: canvas [w h]');
    const next = current.clone(); next.resize(width, height);
    this.current = next; this.history.barrier();
    return `canvas resized to ${width}x${height}`;
  }

  edit(command: EditCommand): string {
    const result = command.execute(this.document);
    this.current = result.document; this.history.record(command);
    return result.message;
  }

  undo(): string {
    this.document;
    const result = this.history.undo(); this.current = result.document;
    return result.message;
  }

  redo(): string {
    this.document;
    const result = this.history.redo(); this.current = result.document;
    return result.message;
  }

  async read(path: string): Promise<string> {
    let source: string;
    try { source = await this.files.read(path); }
    catch { throw new EditorError(`cannot read file: ${path}`); }
    const decoded = this.codec.decode(source);
    this.current = decoded.document; this.path = path; this.history.barrier();
    return [...decoded.warnings, `read ${path} (${decoded.document.count} elements)`].join('\n');
  }

  async save(path?: string): Promise<string> {
    const document = this.document;
    const destination = path ?? this.path;
    if (!destination) throw new EditorError('no save path. use \'save <file.svg>\'');
    const source = this.codec.encode(document);
    try { await this.files.write(destination, source); }
    catch { throw new EditorError(`cannot write file: ${destination}`); }
    this.path = destination; this.history.barrier();
    return `saved to ${destination} (${document.count} elements)`;
  }

  private status(): { undo: number; redo: number; blocked: boolean } { return this.history.status; }
}
