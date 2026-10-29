import type { Document, Element } from '@xmldom/xmldom';
import type { ShapeVisitor } from '../../domain/visitors/ShapeVisitor.js';
import type { Shape } from '../../domain/shapes/Shape.js';
import type { RectShape } from '../../domain/shapes/RectShape.js';
import type { CircleShape } from '../../domain/shapes/CircleShape.js';
import type { EllipseShape } from '../../domain/shapes/EllipseShape.js';
import type { LineShape } from '../../domain/shapes/LineShape.js';
import type { TextShape } from '../../domain/shapes/TextShape.js';
import type { GroupShape } from '../../domain/shapes/GroupShape.js';

export class SvgOutputVisitor implements ShapeVisitor<Element> {
  constructor(private readonly document: Document) {}
  visitRect(shape: RectShape): Element { return this.element(shape); }
  visitCircle(shape: CircleShape): Element { return this.element(shape); }
  visitEllipse(shape: EllipseShape): Element { return this.element(shape); }
  visitLine(shape: LineShape): Element { return this.element(shape); }
  visitText(shape: TextShape): Element { return this.element(shape); }
  visitGroup(shape: GroupShape): Element { return this.element(shape); }

  private element(shape: Shape): Element {
    const element = this.document.createElementNS('http://www.w3.org/2000/svg', shape.type);
    for (const [name, value] of Object.entries(shape.attributes)) element.setAttribute(name, value);
    if (shape.textContent !== undefined) element.appendChild(this.document.createTextNode(shape.textContent));
    for (const child of shape.children) element.appendChild(child.accept(this));
    return element;
  }
}
