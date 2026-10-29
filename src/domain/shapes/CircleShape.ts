import { Shape } from './Shape.js';
import type { ShapeVisitor } from '../visitors/ShapeVisitor.js';

export class CircleShape extends Shape {
  constructor(id: string) { super(id, ['cx', 'cy', 'r'], ['r']); }
  get type(): string { return 'circle'; }
  initialize(parameters: readonly string[]): void { this.initializeGeometry(parameters, 'fill'); }
  move(dx: number, dy: number): void { this.translate('cx', 'cy', dx, dy); }
  clone(): CircleShape { return this.copyInto(new CircleShape(this.id)); }
  accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitCircle(this); }
}
