import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export class DeleteCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected apply(document: SvgDocument): string {
    const label = document.find(this.id).label;
    document.delete(this.id);
    return `${label} deleted`;
  }
}
