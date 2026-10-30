import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { ShapeFactory } from '../../domain/factories/ShapeFactory.js';

export class CreateCommand extends EditCommand {
  constructor(private readonly factory: ShapeFactory, private readonly type: string,
    private readonly id: string, private readonly parameters: readonly string[], private readonly parentId?: string) { super(); }
  protected apply(document: SvgDocument): string {
    document.ensureAvailable(this.id);
    const shape = this.factory.create(this.type, this.id, this.parameters);
    document.add(shape, this.parentId);
    return `${shape.label} created${this.parentId === undefined ? '' : ` in ${shape.parent!.label}`}`;
  }
  protected describeUndo(_document: SvgDocument): string { return `${this.type}#${this.id} deleted`; }
}
