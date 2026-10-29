import type { DocumentPresenter } from '../../application/ports/DocumentPresenter.js';
import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { Shape } from '../../domain/shapes/Shape.js';
import { SummaryVisitor } from './SummaryVisitor.js';

export class TextDocumentPresenter implements DocumentPresenter {
  private readonly summary = new SummaryVisitor();

  tree(document: SvgDocument, id?: string): string {
    const lines: string[] = [];
    const children = (nodes: readonly Shape[], prefix: string): void => {
      nodes.forEach((node, index) => {
        const last = index === nodes.length - 1;
        lines.push(`${prefix}${last ? '└── ' : '├── '}${this.inline(node)}`);
        children(node.children, prefix + (last ? '    ' : '│   '));
      });
    };
    if (id !== undefined) {
      const shape = document.find(id);
      lines.push(this.inline(shape)); children(shape.children, '');
    } else {
      lines.push(`svg (${document.width}x${document.height})`); children(document.root.children, '');
    }
    return lines.join('\n');
  }

  show(document: SvgDocument, id: string): string {
    const shape = document.find(id);
    const geometry = Object.entries(shape.attributes)
      .filter(([name]) => name !== 'id' && !['fill', 'stroke', 'stroke-width'].includes(name))
      .map(([name, value]) => `${name}=${value}`).join(' ');
    const lines = [`${shape.label}  parent=${shape.parent!.label}`];
    if (geometry) lines.push(`  ${geometry}`);
    if (shape.textContent !== undefined) lines.push(`  text=${JSON.stringify(shape.textContent)}`);
    const styles = this.styles(shape);
    if (styles) lines.push(`  ${styles}`);
    if (shape.children.length) lines.push(`  children=${shape.children.length}`);
    return lines.join('\n');
  }

  private inline(shape: Shape): string {
    return [shape.label, shape.accept(this.summary), this.styles(shape)].filter(Boolean).join('  ');
  }

  private styles(shape: Shape): string {
    const attributes = shape.attributes;
    return ['fill', 'stroke', 'stroke-width']
      .filter(name => attributes[name] !== undefined)
      .map(name => `${name}=${JSON.stringify(attributes[name]).slice(1, -1)}`).join(' ');
  }
}
