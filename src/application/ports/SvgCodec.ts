import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export interface SvgCodec {
  encode(document: SvgDocument): string;
  decode(source: string): { readonly document: SvgDocument; readonly warnings: readonly string[] };
}
