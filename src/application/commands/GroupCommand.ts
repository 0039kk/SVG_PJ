import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export class GroupCommand extends EditCommand {
  constructor(private readonly id: string, private readonly ids: readonly string[]) { super(); }
  protected apply(document: SvgDocument): string {
    const group = document.group(this.id, this.ids);
    return `${group.label} created with ${group.children.length} children`;
  }
}
