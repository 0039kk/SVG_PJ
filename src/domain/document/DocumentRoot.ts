import { ChildList } from './ChildList.js';
import type { Container } from './Container.js';
import type { Shape } from '../shapes/Shape.js';

export class DocumentRoot implements Container {
  private readonly list = new ChildList(this);
  get shape(): undefined { return undefined; }
  get label(): string { return 'svg'; }
  get parent(): undefined { return undefined; }
  get children(): readonly Shape[] { return this.list.children; }
  insert(shape: Shape, index?: number): void { this.list.insert(shape, index); }
  remove(shape: Shape): void { this.list.remove(shape); }
  clone(): DocumentRoot {
    const copy = new DocumentRoot();
    for (const child of this.children) copy.insert(child.clone());
    return copy;
  }
}
