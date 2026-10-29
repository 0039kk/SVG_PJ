import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { CommandDispatcher } from '../application/services/CommandDispatcher.js';
import { Tokenizer } from './Tokenizer.js';

export class Repl {
  private readonly tokenizer = new Tokenizer();
  constructor(private readonly dispatcher: CommandDispatcher) {}

  async evaluate(line: string): Promise<string> {
    try { return await this.dispatcher.execute(this.tokenizer.tokenize(line)); }
    catch (error) {
      const message = error instanceof Error ? error.message : 'unexpected failure';
      return `error: ${message.replace(/[\r\n\u2028\u2029]+/g, ' ')}`;
    }
  }

  async run(input: Readable, output: Writable, interactive: boolean): Promise<void> {
    const reader = createInterface({ input, crlfDelay: Infinity, terminal: false });
    output.write("svg-editor 0.1 — type 'help' for commands\n");
    if (interactive) output.write('svg> ');
    for await (const line of reader) {
      const result = await this.evaluate(line);
      if (result) output.write(result + '\n');
      if (interactive) output.write('svg> ');
    }
  }
}
