import { Shape } from './Shape.js';
import { Values } from '../Values.js';
import { ChildList } from '../document/ChildList.js';
import type { Container } from '../document/Container.js';
import type { ShapeVisitor } from '../visitors/ShapeVisitor.js';

export class GroupShape extends Shape implements Container {
  private readonly list = new ChildList(this);
  constructor(id: string) { super(id, []); }
  get type(): string { return 'g'; }
  get shape(): Shape { return this; }
  override get children(): readonly Shape[] { return this.list.children; }
  override asContainer(): Container { return this; }
  insert(shape: Shape, index?: number): void { this.list.insert(shape, index); }
  remove(shape: Shape): void { this.list.remove(shape); }
  initialize(parameters: readonly string[]): void { this.initializeGeometry(parameters); }
  move(dx: number, dy: number): void {
    Values.finite(dx, 'dx'); Values.finite(dy, 'dy');
    for (const child of this.children) child.move(dx, dy);
  }
  override scale(factor: number): void {
    Values.positive(factor, 'scale factor');
    for (const child of this.children) child.scale(factor);
  }
  clone(): GroupShape {
    const copy = this.copyInto(new GroupShape(this.id));
    for (const child of this.children) copy.insert(child.clone());
    return copy;
  }
  accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitGroup(this); }
}
