import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export class UngroupCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected apply(document: SvgDocument): string {
    document.ungroup(this.id);
    return `g#${this.id} ungrouped`;
  }
}
