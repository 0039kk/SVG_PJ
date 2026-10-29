import { EditorError } from './errors/EditorError.js';

export class Values {
  static number(value: string, name: string): number {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
      throw new EditorError(`invalid number for ${name}: ${value}`);
    }
    return this.finite(Number(value), name);
  }

  static finite(value: number, name: string): number {
    if (!Number.isFinite(value)) throw new EditorError(`invalid number for ${name}: ${value}`);
    return Object.is(value, -0) ? 0 : value;
  }

  static nonnegative(value: number, name: string): number {
    this.finite(value, name);
    if (value < 0) throw new EditorError(`${name} must be non-negative`);
    return value;
  }

  static positive(value: number, name: string): number {
    this.finite(value, name);
    if (value <= 0) throw new EditorError(`${name} must be positive`);
    return value;
  }

  static text(value: string): string {
    for (const character of value) {
      const code = character.codePointAt(0)!;
      if (!(code === 9 || code === 10 || code === 13 ||
        (code >= 0x20 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd) ||
        (code >= 0x10000 && code <= 0x10ffff))) {
        throw new EditorError('invalid XML character');
      }
    }
    return value;
  }

  static id(value: string): string {
    this.text(value);
    if (!value || /\s/.test(value)) throw new EditorError(`invalid id: ${value}`);
    return value;
  }
}
