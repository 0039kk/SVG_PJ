import { Shape } from './Shape.js';
import type { ShapeVisitor } from '../visitors/ShapeVisitor.js';

export class LineShape extends Shape {
  constructor(id: string) { super(id, ['x1', 'y1', 'x2', 'y2']); }
  get type(): string { return 'line'; }
  initialize(parameters: readonly string[]): void { this.initializeGeometry(parameters, 'stroke'); }
  move(dx: number, dy: number): void {
    this.translate('x1', 'y1', dx, dy);
    this.translate('x2', 'y2', dx, dy);
  }
  clone(): LineShape { return this.copyInto(new LineShape(this.id)); }
  accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitLine(this); }
}
