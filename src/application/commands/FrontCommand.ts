import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export class FrontCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected apply(document: SvgDocument): string {
    document.reorder(this.id, true);
    return `${document.find(this.id).label} moved to front`;
  }
  protected describeUndo(document: SvgDocument): string {
    const shape = document.find(this.id);
    return `${shape.label} restored to position ${shape.parent!.children.indexOf(shape) + 1} in ${shape.parent!.label}`;
  }
}
