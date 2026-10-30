import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export class ScaleCommand extends EditCommand {
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected apply(document: SvgDocument): string {
    const shape = document.find(this.id);
    shape.scale(this.factor);
    return `${shape.label} scaled by ${this.factor}`;
  }
  protected describeUndo(document: SvgDocument): string { return `${document.find(this.id).label} scale restored`; }
}
