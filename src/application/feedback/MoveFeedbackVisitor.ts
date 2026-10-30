import type { ShapeVisitor } from '../../domain/visitors/ShapeVisitor.js';
import type { Shape } from '../../domain/shapes/Shape.js';
import type { RectShape } from '../../domain/shapes/RectShape.js';
import type { CircleShape } from '../../domain/shapes/CircleShape.js';
import type { EllipseShape } from '../../domain/shapes/EllipseShape.js';
import type { LineShape } from '../../domain/shapes/LineShape.js';
import type { TextShape } from '../../domain/shapes/TextShape.js';
import type { GroupShape } from '../../domain/shapes/GroupShape.js';

export class MoveFeedbackVisitor implements ShapeVisitor<string> {
  constructor(private readonly dx: number, private readonly dy: number, private readonly undo = false) {}

  visitRect(shape: RectShape): string { return this.point(shape, 'x', 'y'); }
  visitCircle(shape: CircleShape): string { return this.point(shape, 'cx', 'cy'); }
  visitEllipse(shape: EllipseShape): string { return this.point(shape, 'cx', 'cy'); }
  visitText(shape: TextShape): string { return this.point(shape, 'x', 'y'); }

  visitLine(shape: LineShape): string {
    const a = shape.attributes;
    return `${shape.label} moved${this.undo ? ' back' : ''} to (${a.x1},${a.y1}) -> (${a.x2},${a.y2})`;
  }

  visitGroup(shape: GroupShape): string {
    const dx = this.undo ? -this.dx : this.dx;
    const dy = this.undo ? -this.dy : this.dy;
    return `${shape.label} moved${this.undo ? ' back' : ''} by (${dx},${dy})`;
  }

  private point(shape: Shape, x: string, y: string): string {
    const a = shape.attributes;
    return `${shape.label} moved${this.undo ? ' back' : ''} to (${a[x]},${a[y]})`;
  }
}
