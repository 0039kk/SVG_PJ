import { EditorError } from '../errors/EditorError.js';
import type { Shape } from '../shapes/Shape.js';
import type { Container } from './Container.js';

export class ChildList {
  private readonly items: Shape[] = [];

  constructor(private readonly owner: Container) {}

  get children(): readonly Shape[] { return [...this.items]; }

  insert(shape: Shape, index = this.items.length): void {
    if (shape.parent) throw new EditorError(`shape already has a parent: ${shape.id}`);
    for (let current: Container | undefined = this.owner; current; current = current.parent) {
      if (current.shape === shape) throw new EditorError(`cannot move a container into its own descendant: ${shape.id}`);
    }
    if (!Number.isInteger(index) || index < 0 || index > this.items.length) {
      throw new EditorError('invalid child index');
    }
    this.items.splice(index, 0, shape);
    shape.bindParent(this.owner);
  }

  remove(shape: Shape): void {
    const index = this.items.indexOf(shape);
    if (index < 0) throw new EditorError(`shape is not a child: ${shape.id}`);
    this.items.splice(index, 1);
    shape.bindParent(undefined);
  }
}
