import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export interface DocumentPresenter {
  tree(document: SvgDocument, id?: string): string;
  show(document: SvgDocument, id: string): string;
}
