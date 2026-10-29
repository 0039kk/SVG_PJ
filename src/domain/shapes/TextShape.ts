import { Shape } from './Shape.js';
import { Values } from '../Values.js';
import { EditorError } from '../errors/EditorError.js';
import type { ShapeVisitor } from '../visitors/ShapeVisitor.js';

export class TextShape extends Shape {
  private content = '';
  constructor(id: string) { super(id, ['x', 'y']); }
  get type(): string { return 'text'; }
  override get textContent(): string { return this.content; }
  initialize(parameters: readonly string[]): void {
    if (parameters.length !== 3) throw new EditorError('invalid parameters for text');
    this.initializeGeometry(parameters.slice(0, 2));
    this.setTextContent(parameters[2]!);
  }
  override setTextContent(text: string): void { this.content = Values.text(text); }
  override setAttribute(name: string, value: string): void {
    if (name === 'text') this.setTextContent(value);
    else super.setAttribute(name, value);
  }
  move(dx: number, dy: number): void { this.translate('x', 'y', dx, dy); }
  clone(): TextShape { return this.copyInto(new TextShape(this.id)); }
  accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitText(this); }
}
