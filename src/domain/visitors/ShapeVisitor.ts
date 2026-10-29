import type { RectShape } from '../shapes/RectShape.js';
import type { CircleShape } from '../shapes/CircleShape.js';
import type { EllipseShape } from '../shapes/EllipseShape.js';
import type { LineShape } from '../shapes/LineShape.js';
import type { TextShape } from '../shapes/TextShape.js';
import type { GroupShape } from '../shapes/GroupShape.js';

export interface ShapeVisitor<T> {
  visitRect(shape: RectShape): T;
  visitCircle(shape: CircleShape): T;
  visitEllipse(shape: EllipseShape): T;
  visitLine(shape: LineShape): T;
  visitText(shape: TextShape): T;
  visitGroup(shape: GroupShape): T;
}
