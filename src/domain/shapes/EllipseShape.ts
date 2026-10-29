import { Shape } from './Shape.js';
import type { ShapeVisitor } from '../visitors/ShapeVisitor.js';

export class EllipseShape extends Shape {
  constructor(id: string) { super(id, ['cx', 'cy', 'rx', 'ry'], ['rx', 'ry']); }
  get type(): string { return 'ellipse'; }
  initialize(parameters: readonly string[]): void { this.initializeGeometry(parameters, 'fill'); }
  move(dx: number, dy: number): void { this.translate('cx', 'cy', dx, dy); }
  clone(): EllipseShape { return this.copyInto(new EllipseShape(this.id)); }
  accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitEllipse(this); }
}
