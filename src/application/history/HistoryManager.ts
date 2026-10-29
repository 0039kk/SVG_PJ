import type { EditCommand } from '../commands/EditCommand.js';
import { EditorError } from '../../domain/errors/EditorError.js';

export class HistoryManager {
  private readonly past: EditCommand[] = [];
  private readonly future: EditCommand[] = [];
  private blocked = false;

  get status(): Readonly<{ undo: number; redo: number; blocked: boolean }> {
    return { undo: this.past.length, redo: this.future.length, blocked: this.blocked };
  }

  record(command: EditCommand): void {
    this.past.push(command); this.future.length = 0; this.blocked = false;
  }

  barrier(): void {
    this.past.length = 0; this.future.length = 0; this.blocked = true;
  }

  undo(): ReturnType<EditCommand['undo']> {
    this.ensureAllowed();
    const command = this.past.at(-1);
    if (!command) throw new EditorError('nothing to undo');
    const result = command.undo();
    this.past.pop(); this.future.push(command);
    return result;
  }

  redo(): ReturnType<EditCommand['redo']> {
    this.ensureAllowed();
    const command = this.future.at(-1);
    if (!command) throw new EditorError('nothing to redo');
    const result = command.redo();
    this.future.pop(); this.past.push(command);
    return result;
  }

  private ensureAllowed(): void {
    if (this.blocked) throw new EditorError('undo not allowed after io command');
  }
}
