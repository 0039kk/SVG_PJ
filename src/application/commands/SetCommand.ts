import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export class SetCommand extends EditCommand {
  constructor(private readonly id: string, private readonly attribute: string, private readonly value: string) { super(); }
  protected apply(document: SvgDocument): string {
    const shape = document.find(this.id);
    shape.setAttribute(this.attribute, this.value);
    return this.describe(document);
  }
  protected describeUndo(document: SvgDocument): string { return this.describe(document); }
  private describe(document: SvgDocument): string {
    const shape = document.find(this.id);
    const value = this.attribute === 'text' ? shape.textContent : shape.attributes[this.attribute];
    if (value === undefined) return `${shape.label} updated: ${this.attribute} removed`;
    return `${shape.label} updated: ${this.attribute}=${JSON.stringify(value)}`;
  }
}
