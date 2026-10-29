import { Shape } from './Shape.js';
import type { ShapeVisitor } from '../visitors/ShapeVisitor.js';

export class RectShape extends Shape {
  constructor(id: string) { super(id, ['x', 'y', 'width', 'height'], ['width', 'height']); }
  get type(): string { return 'rect'; }
  initialize(parameters: readonly string[]): void { this.initializeGeometry(parameters, 'fill'); }
  move(dx: number, dy: number): void { this.translate('x', 'y', dx, dy); }
  clone(): RectShape { return this.copyInto(new RectShape(this.id)); }
  accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitRect(this); }
}
