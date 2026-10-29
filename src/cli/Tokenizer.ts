import type { InputToken } from '../application/InputToken.js';

export class Tokenizer {
  tokenize(line: string): readonly InputToken[] {
    if (/^\s*(?:#|$)/.test(line)) return [];
    const result: InputToken[] = [];
    let index = 0;
    while (index < line.length) {
      while (/\s/.test(line[index] ?? '') && index < line.length) index++;
      if (index === line.length) break;
      let value = '';
      const quoted = line[index] === '"';
      if (quoted) {
        index++;
        let closed = false;
        while (index < line.length) {
          const character = line[index++]!;
          if (character === '"') { closed = true; break; }
          if (character === '\\' && (line[index] === '"' || line[index] === '\\')) value += line[index++]!;
          else value += character;
        }
        if (!closed) throw new Error('unterminated double quote');
        if (index < line.length && !/\s/.test(line[index]!)) throw new Error('expected whitespace after quoted argument');
      } else {
        while (index < line.length && !/\s/.test(line[index]!)) {
          if (line[index] === '"') throw new Error('quote must start an argument');
          value += line[index++]!;
        }
      }
      result.push({ value, quoted });
    }
    return result;
  }
}
