import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Element, Node } from '@xmldom/xmldom';
import type { SvgCodec } from '../../application/ports/SvgCodec.js';
import { SvgDocument } from '../../domain/document/SvgDocument.js';
import { EditorError } from '../../domain/errors/EditorError.js';
import { Values } from '../../domain/Values.js';
import type { ShapeFactory } from '../../domain/factories/ShapeFactory.js';
import type { Shape } from '../../domain/shapes/Shape.js';
import { SvgOutputVisitor } from './SvgOutputVisitor.js';

export class XmlSvgCodec implements SvgCodec {
  private readonly namespace = 'http://www.w3.org/2000/svg';
  constructor(private readonly factory: ShapeFactory) {}

  encode(document: SvgDocument): string {
    document.assertInvariants();
    const xml = new DOMImplementation().createDocument(this.namespace, 'svg', null);
    const root = xml.documentElement!;
    root.setAttribute('xmlns', this.namespace);
    root.setAttribute('width', String(document.width));
    root.setAttribute('height', String(document.height));
    root.setAttribute('viewBox', `0 0 ${document.width} ${document.height}`);
    const visitor = new SvgOutputVisitor(xml);
    for (const shape of document.root.children) root.appendChild(shape.accept(visitor));
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(xml) + '\n';
  }

  decode(source: string): { readonly document: SvgDocument; readonly warnings: readonly string[] } {
    Values.text(source);
    if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source)) throw new EditorError('unsupported SVG: DTD and entities are not allowed');
    let xml;
    try {
      xml = new DOMParser({ onError: (_level, message) => { throw new Error(message); } })
        .parseFromString(source, 'application/xml');
    } catch { throw new EditorError('invalid SVG XML'); }
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg') throw new EditorError('invalid SVG root: expected <svg>');
    this.checkNamespace(root);
    for (const node of this.nodes(xml)) {
      if (node === root || node.nodeType === 8 || (node.nodeType === 3 && !node.nodeValue?.trim())) continue;
      if (node.nodeType === 7 && node.nodeName === 'xml') continue;
      throw new EditorError('unsupported SVG content outside root');
    }
    const allowedRoot = new Set(['width', 'height', 'viewBox']);
    for (const attribute of Array.from(root.attributes)) {
      if (this.namespaceAttribute(attribute.name)) continue;
      if (!allowedRoot.has(attribute.name)) throw new EditorError(`unsupported SVG root attribute: ${attribute.name}`);
    }
    const width = this.length(root.getAttribute('width') ?? '800', 'canvas width');
    const height = this.length(root.getAttribute('height') ?? '600', 'canvas height');
    const document = new SvgDocument(width, height);
    if (root.hasAttribute('viewBox')) {
      const viewBox = root.getAttribute('viewBox')!.trim().split(/[\s,]+/).map(value => Values.number(value, 'viewBox'));
      if (viewBox.length !== 4 || viewBox.some((value, index) => value !== [0, 0, width, height][index])) {
        throw new EditorError('unsupported SVG viewBox: expected 0 0 width height');
      }
    }
    const reserved = new Set<string>();
    for (const element of Array.from(root.getElementsByTagName('*'))) {
      const id = element.getAttribute('id');
      if (!id) continue;
      Values.id(id);
      if (reserved.has(id)) throw new EditorError(`id already exists: ${id}`);
      reserved.add(id);
    }
    const warnings: string[] = [];
    for (const node of this.nodes(root)) {
      if (node.nodeType === 1) document.add(this.decodeShape(node as Element, reserved, warnings));
      else this.checkWhitespace(node);
    }
    return { document, warnings };
  }

  private decodeShape(element: Element, reserved: Set<string>, warnings: string[]): Shape {
    this.checkNamespace(element);
    const type = element.localName ?? element.tagName;
    let id = element.getAttribute('id');
    if (!id) {
      let number = 1;
      while (reserved.has(`${type}${number}`)) number++;
      id = `${type}${number}`; reserved.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
    }
    const shape = this.factory.empty(type, id);
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === 'id' || this.namespaceAttribute(attribute.name)) continue;
      if (attribute.name === 'text') throw new EditorError('unknown attribute: text');
      shape.setAttribute(attribute.name, attribute.value);
    }
    let text = '';
    for (const node of this.nodes(element)) {
      if (node.nodeType === 1) {
        shape.asContainer().insert(this.decodeShape(node as Element, reserved, warnings));
      } else if (node.nodeType === 3 || node.nodeType === 4) text += node.nodeValue ?? '';
      else this.checkWhitespace(node);
    }
    shape.setTextContent(text);
    return shape;
  }

  private nodes(parent: Node): Node[] { return Array.from(parent.childNodes ?? []); }

  private checkNamespace(element: Element): void {
    if (element.namespaceURI && element.namespaceURI !== this.namespace) throw new EditorError('unsupported SVG namespace');
    if (!element.namespaceURI && element.parentNode?.namespaceURI === this.namespace) {
      throw new EditorError('unsupported SVG namespace reset');
    }
  }

  private namespaceAttribute(name: string): boolean { return name === 'xmlns' || name.startsWith('xmlns:'); }

  private checkWhitespace(node: Node): void {
    if (node.nodeType === 8 || (node.nodeType === 3 && !node.nodeValue?.trim())) return;
    throw new EditorError('unsupported SVG node');
  }

  private length(value: string, name: string): number { return Values.number(value.replace(/px$/, ''), name); }
}
