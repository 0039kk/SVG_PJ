import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { MoveFeedbackVisitor } from '../feedback/MoveFeedbackVisitor.js';

export class MoveCommand extends EditCommand {
  constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) { super(); }
  protected apply(document: SvgDocument): string {
    const shape = document.find(this.id);
    shape.move(this.dx, this.dy);
    return shape.accept(new MoveFeedbackVisitor(this.dx, this.dy));
  }
  protected describeUndo(document: SvgDocument): string {
    return document.find(this.id).accept(new MoveFeedbackVisitor(this.dx, this.dy, true));
  }
}
