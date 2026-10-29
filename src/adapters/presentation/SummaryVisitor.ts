import type { ShapeVisitor } from '../../domain/visitors/ShapeVisitor.js';
import type { RectShape } from '../../domain/shapes/RectShape.js';
import type { CircleShape } from '../../domain/shapes/CircleShape.js';
import type { EllipseShape } from '../../domain/shapes/EllipseShape.js';
import type { LineShape } from '../../domain/shapes/LineShape.js';
import type { TextShape } from '../../domain/shapes/TextShape.js';
import type { GroupShape } from '../../domain/shapes/GroupShape.js';

export class SummaryVisitor implements ShapeVisitor<string> {
  visitRect(shape: RectShape): string {
    const a = shape.attributes;
    return `x=${a.x} y=${a.y} w=${a.width} h=${a.height}`;
  }
  visitCircle(shape: CircleShape): string {
    const a = shape.attributes; return `cx=${a.cx} cy=${a.cy} r=${a.r}`;
  }
  visitEllipse(shape: EllipseShape): string {
    const a = shape.attributes; return `cx=${a.cx} cy=${a.cy} rx=${a.rx} ry=${a.ry}`;
  }
  visitLine(shape: LineShape): string {
    const a = shape.attributes; return `(${a.x1},${a.y1}) -> (${a.x2},${a.y2})`;
  }
  visitText(shape: TextShape): string {
    const a = shape.attributes; return `(${a.x},${a.y}) ${JSON.stringify(shape.textContent)}`;
  }
  visitGroup(_shape: GroupShape): string { return ''; }
}
