import { EditorError } from '../errors/EditorError.js';
import type { Shape } from '../shapes/Shape.js';
import { RectShape } from '../shapes/RectShape.js';
import { CircleShape } from '../shapes/CircleShape.js';
import { EllipseShape } from '../shapes/EllipseShape.js';
import { LineShape } from '../shapes/LineShape.js';
import { TextShape } from '../shapes/TextShape.js';
import { GroupShape } from '../shapes/GroupShape.js';

export class ShapeFactory {
  // Phase 1's only shape-name dispatch. Future plugin registry refactoring point.
  private readonly constructors = new Map<string, new (id: string) => Shape>([
    ['rect', RectShape], ['circle', CircleShape], ['ellipse', EllipseShape],
    ['line', LineShape], ['text', TextShape], ['g', GroupShape],
  ]);

  empty(type: string, id: string): Shape {
    const Constructor = this.constructors.get(type);
    if (!Constructor) throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return new Constructor(id);
  }

  create(type: string, id: string, parameters: readonly string[]): Shape {
    const shape = this.empty(type, id);
    shape.initialize(parameters);
    return shape;
  }
}
