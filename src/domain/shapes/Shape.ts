import { Values } from '../Values.js';
import { EditorError } from '../errors/EditorError.js';
import type { Container } from '../document/Container.js';
import type { ShapeVisitor } from '../visitors/ShapeVisitor.js';

export abstract class Shape {
  private readonly identifier: string;
  private owner: Container | undefined;
  private readonly geometry: Map<string, number>;
  private readonly styles = new Map<string, string>();

  protected constructor(id: string, coordinates: readonly string[], private readonly sizes: readonly string[] = []) {
    this.identifier = Values.id(id);
    this.geometry = new Map(coordinates.map(name => [name, 0]));
  }

  abstract get type(): string;
  abstract initialize(parameters: readonly string[]): void;
  abstract move(dx: number, dy: number): void;
  abstract clone(): Shape;
  abstract accept<T>(visitor: ShapeVisitor<T>): T;

  get id(): string { return this.identifier; }
  get label(): string { return `${this.type}#${this.id}`; }
  get parent(): Container | undefined { return this.owner; }
  get children(): readonly Shape[] { return []; }
  get textContent(): string | undefined { return undefined; }
  get attributes(): Readonly<Record<string, string>> {
    return Object.fromEntries([
      ['id', this.id],
      ...[...this.geometry].map(([name, value]) => [name, String(value)]),
      ...this.styles,
    ]);
  }

  /** Infrastructure hook used by ChildList; document operations own attachment. */
  bindParent(parent: Container | undefined): void { this.owner = parent; }

  asContainer(): Container { throw new EditorError(`not a container: ${this.id}`); }

  setTextContent(text: string): void {
    if (text.trim()) throw new EditorError(`unexpected text in <${this.type}>`);
  }

  setAttribute(name: string, value: string): void {
    if (this.geometry.has(name)) {
      const number = Values.number(value, name);
      if (this.sizes.includes(name)) Values.nonnegative(number, name);
      this.geometry.set(name, number);
      return;
    }
    if (name === 'fill' || name === 'stroke' || name === 'stroke-width') {
      Values.text(value);
      if (name === 'stroke-width') value = String(Values.nonnegative(Values.number(value, name), name));
      this.styles.set(name, value);
      return;
    }
    throw new EditorError(`unknown attribute: ${name}`);
  }

  scale(factor: number): void {
    Values.positive(factor, 'scale factor');
    for (const [name, value] of this.geometry) this.setAttribute(name, String(value * factor));
  }

  protected translate(x: string, y: string, dx: number, dy: number): void {
    this.setAttribute(x, String(this.coordinate(x) + Values.finite(dx, 'dx')));
    this.setAttribute(y, String(this.coordinate(y) + Values.finite(dy, 'dy')));
  }

  protected coordinate(name: string): number { return this.geometry.get(name)!; }

  protected initializeGeometry(parameters: readonly string[], paint?: string): void {
    const names = [...this.geometry.keys()];
    if (parameters.length < names.length || parameters.length > names.length + (paint ? 1 : 0)) {
      throw new EditorError(`invalid parameters for ${this.type}`);
    }
    names.forEach((name, index) => this.setAttribute(name, parameters[index]!));
    if (paint && parameters.length > names.length) this.setAttribute(paint, parameters[names.length]!);
  }

  protected copyInto<T extends Shape>(target: T): T {
    for (const [name, value] of Object.entries(this.attributes)) {
      if (name !== 'id') target.setAttribute(name, value);
    }
    if (this.textContent !== undefined) target.setTextContent(this.textContent);
    return target;
  }
}
