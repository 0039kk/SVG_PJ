import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export class AddToCommand extends EditCommand {
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected apply(document: SvgDocument): string {
    const shape = document.find(this.id);
    document.addTo(this.groupId, this.id);
    return `${shape.label} added to ${shape.parent!.label}`;
  }
  protected describeUndo(document: SvgDocument): string {
    const shape = document.find(this.id);
    return `${shape.label} restored into ${shape.parent!.label}`;
  }
}
