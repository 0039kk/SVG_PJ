import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { DocumentPresenter } from '../ports/DocumentPresenter.js';

export class TreeQuery {
  constructor(private readonly presenter: DocumentPresenter) {}
  execute(document: SvgDocument, id?: string): string { return this.presenter.tree(document, id); }
}
