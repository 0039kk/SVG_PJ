import { Values } from '../Values.js';
import { EditorError } from '../errors/EditorError.js';
import { GroupShape } from '../shapes/GroupShape.js';
import type { Shape } from '../shapes/Shape.js';
import type { Container } from './Container.js';
import { DocumentRoot } from './DocumentRoot.js';

export class SvgDocument {
  private canvasWidth: number;
  private canvasHeight: number;
  private readonly index = new Map<string, Shape>();

  constructor(width = 800, height = 600, private readonly documentRoot = new DocumentRoot()) {
    this.canvasWidth = Values.positive(width, 'canvas width');
    this.canvasHeight = Values.positive(height, 'canvas height');
    this.assertInvariants();
  }

  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get root(): DocumentRoot { return this.documentRoot; }
  get count(): number { return this.index.size; }

  resize(width: number, height: number): void {
    Values.positive(width, 'canvas width'); Values.positive(height, 'canvas height');
    this.canvasWidth = width; this.canvasHeight = height;
  }

  find(id: string): Shape {
    const shape = this.index.get(id);
    if (!shape) throw new EditorError(`no such shape: ${id}`);
    return shape;
  }

  container(id?: string): Container {
    if (id === undefined) return this.root;
    const shape = this.index.get(id);
    if (!shape) throw new EditorError(`no such container: ${id}`);
    return shape.asContainer();
  }

  ensureAvailable(id: string): void {
    Values.id(id);
    if (this.index.has(id)) throw new EditorError(`id already exists: ${id}`);
  }

  add(shape: Shape, containerId?: string): void {
    const parent = this.container(containerId);
    const ids = new Set<string>();
    for (const node of this.walk([shape])) {
      this.ensureAvailable(node.id);
      if (ids.has(node.id)) throw new EditorError(`id already exists: ${node.id}`);
      ids.add(node.id);
    }
    parent.insert(shape);
    this.assertInvariants();
  }

  delete(id: string): void {
    const shape = this.find(id);
    shape.parent!.remove(shape);
    this.assertInvariants();
  }

  group(id: string, selectedIds: readonly string[]): GroupShape {
    this.ensureAvailable(id);
    if (!selectedIds.length) throw new EditorError('group requires at least one shape');
    if (new Set(selectedIds).size !== selectedIds.length) throw new EditorError('duplicate shape in group');
    const selected = new Set(selectedIds.map(selectedId => this.find(selectedId)));
    const ordered = this.walk(this.root.children).filter(shape => selected.has(shape));
    for (const node of ordered) {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.shape && selected.has(parent.shape)) {
          throw new EditorError(`cannot group a container into its own descendant: ${parent.shape.id}`);
        }
      }
    }
    let destination = ordered[0]!.parent!;
    while (!ordered.every(node => this.hasAncestor(node, destination))) destination = destination.parent!;
    const branches = ordered.map(node => {
      let branch = node;
      while (branch.parent !== destination) branch = branch.parent!.shape!;
      return branch;
    });
    const position = Math.min(...branches.map(branch => destination.children.indexOf(branch)));
    const group = new GroupShape(id);
    destination.insert(group, position);
    for (const shape of ordered) { shape.parent!.remove(shape); group.insert(shape); }
    this.assertInvariants();
    return group;
  }

  ungroup(id: string): void {
    const shape = this.find(id);
    const container = shape.asContainer();
    const parent = shape.parent!;
    if (parent === this.root) throw new EditorError(`cannot ungroup top-level container: ${id}`);
    let position = parent.children.indexOf(shape);
    parent.remove(shape);
    for (const child of container.children) {
      container.remove(child); parent.insert(child, position++);
    }
    this.assertInvariants();
  }

  addTo(containerId: string, id: string): void {
    const target = this.container(containerId);
    const shape = this.find(id);
    if (target.shape === shape || this.hasAncestor(target, shape)) {
      throw new EditorError(`cannot move a container into its own descendant: ${id}`);
    }
    shape.parent!.remove(shape);
    target.insert(shape);
    this.assertInvariants();
  }

  reorder(id: string, front: boolean): void {
    const shape = this.find(id);
    const parent = shape.parent!;
    parent.remove(shape);
    parent.insert(shape, front ? parent.children.length : 0);
    this.assertInvariants();
  }

  clone(): SvgDocument { return new SvgDocument(this.width, this.height, this.root.clone()); }

  assertInvariants(): void {
    const next = new Map<string, Shape>();
    const visited = new Set<Shape>();
    const visit = (children: readonly Shape[], parent: Container): void => {
      for (const child of children) {
        if (visited.has(child)) throw new EditorError('invalid tree: cycle or repeated node');
        if (child.parent !== parent) throw new EditorError('invalid tree: parent mismatch');
        if (next.has(child.id)) throw new EditorError(`id already exists: ${child.id}`);
        visited.add(child); next.set(child.id, child);
        if (child.children.length) visit(child.children, child.asContainer());
      }
    };
    visit(this.root.children, this.root);
    this.index.clear();
    for (const [id, shape] of next) this.index.set(id, shape);
  }

  private hasAncestor(node: { readonly parent: Container | undefined }, ancestor: Container | Shape): boolean {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (parent === ancestor || parent.shape === ancestor) return true;
    }
    return false;
  }

  private walk(children: readonly Shape[]): Shape[] {
    return children.flatMap(child => [child, ...this.walk(child.children)]);
  }
}
