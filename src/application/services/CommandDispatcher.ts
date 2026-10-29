import { Values } from '../../domain/Values.js';
import { EditorError } from '../../domain/errors/EditorError.js';
import type { ShapeFactory } from '../../domain/factories/ShapeFactory.js';
import type { InputToken } from '../InputToken.js';
import type { DocumentPresenter } from '../ports/DocumentPresenter.js';
import { CreateCommand } from '../commands/CreateCommand.js';
import { DeleteCommand } from '../commands/DeleteCommand.js';
import { MoveCommand } from '../commands/MoveCommand.js';
import { ScaleCommand } from '../commands/ScaleCommand.js';
import { SetCommand } from '../commands/SetCommand.js';
import { GroupCommand } from '../commands/GroupCommand.js';
import { UngroupCommand } from '../commands/UngroupCommand.js';
import { AddToCommand } from '../commands/AddToCommand.js';
import { FrontCommand } from '../commands/FrontCommand.js';
import { BackCommand } from '../commands/BackCommand.js';
import { TreeQuery } from '../queries/TreeQuery.js';
import { ShowQuery } from '../queries/ShowQuery.js';
import type { EditorSession } from './EditorSession.js';

type Definition = { readonly syntax: string; readonly run: (tokens: readonly InputToken[]) => string | Promise<string> };

export class CommandDispatcher {
  // Phase 1's only command-name dispatch. Future command registration boundary.
  private readonly definitions: Map<string, Definition>;

  constructor(private readonly session: EditorSession, private readonly factory: ShapeFactory, presenter: DocumentPresenter) {
    const tree = new TreeQuery(presenter);
    const show = new ShowQuery(presenter);
    this.definitions = new Map<string, Definition>([
      ['init', { syntax: 'init [w] [h]', run: t => { this.arity(t, 0, 2); return session.init(t[0] ? this.number(t, 0, 'width') : 800, t[1] ? this.number(t, 1, 'height') : 600); } }],
      ['read', { syntax: 'read <file.svg>', run: t => { this.arity(t, 1); return session.read(t[0]!.value); } }],
      ['save', { syntax: 'save [file.svg]', run: t => { this.arity(t, 0, 1); return session.save(t[0]?.value); } }],
      ['canvas', { syntax: 'canvas [w h]', run: t => {
        if (t.length !== 0 && t.length !== 2) throw new EditorError('usage: canvas [w h]');
        return t.length ? session.canvas(this.number(t, 0, 'width'), this.number(t, 1, 'height')) : session.canvas();
      } }],
      ['create', { syntax: 'create <type> <id> [params...] [in <containerId>]', run: t => this.create(t) }],
      ['delete', { syntax: 'delete <id>', run: t => { this.arity(t, 1); return session.edit(new DeleteCommand(t[0]!.value)); } }],
      ['move', { syntax: 'move <id> <dx> <dy>', run: t => { this.arity(t, 3); return session.edit(new MoveCommand(t[0]!.value, this.number(t, 1, 'dx'), this.number(t, 2, 'dy'))); } }],
      ['scale', { syntax: 'scale <id> <factor>', run: t => { this.arity(t, 2); return session.edit(new ScaleCommand(t[0]!.value, this.number(t, 1, 'factor'))); } }],
      ['set', { syntax: 'set <id> <attr> <value>', run: t => { this.arity(t, 3); return session.edit(new SetCommand(t[0]!.value, t[1]!.value, t[2]!.value)); } }],
      ['group', { syntax: 'group <newGid> <id1> [id2...]', run: t => { this.arity(t, 2, Infinity); return session.edit(new GroupCommand(t[0]!.value, t.slice(1).map(token => token.value))); } }],
      ['ungroup', { syntax: 'ungroup <gid>', run: t => { this.arity(t, 1); return session.edit(new UngroupCommand(t[0]!.value)); } }],
      ['addto', { syntax: 'addto <gid> <id>', run: t => { this.arity(t, 2); return session.edit(new AddToCommand(t[0]!.value, t[1]!.value)); } }],
      ['front', { syntax: 'front <id>', run: t => { this.arity(t, 1); return session.edit(new FrontCommand(t[0]!.value)); } }],
      ['back', { syntax: 'back <id>', run: t => { this.arity(t, 1); return session.edit(new BackCommand(t[0]!.value)); } }],
      ['tree', { syntax: 'tree [id]', run: t => { this.arity(t, 0, 1); return tree.execute(session.document, t[0]?.value); } }],
      ['show', { syntax: 'show <id>', run: t => { this.arity(t, 1); return show.execute(session.document, t[0]!.value); } }],
      ['help', { syntax: 'help', run: t => { this.arity(t, 0); return this.help(); } }],
      ['undo', { syntax: 'undo', run: t => { this.arity(t, 0); return session.undo(); } }],
      ['redo', { syntax: 'redo', run: t => { this.arity(t, 0); return session.redo(); } }],
    ]);
  }

  async execute(tokens: readonly InputToken[]): Promise<string> {
    if (!tokens.length) return '';
    const name = tokens[0]!.value;
    const definition = this.definitions.get(name);
    if (!definition) throw new EditorError(`unknown command: ${name}`);
    if (name !== 'help' && name !== 'init' && name !== 'read') this.session.document;
    return definition.run(tokens.slice(1));
  }

  private create(tokens: readonly InputToken[]): string {
    this.arity(tokens, 2, Infinity);
    const parameters = tokens.slice(2);
    let parentId: string | undefined;
    const suffix = parameters.at(-2);
    if (suffix?.value === 'in' && !suffix.quoted) {
      parentId = parameters.at(-1)!.value;
      parameters.splice(-2);
    }
    return this.session.edit(new CreateCommand(this.factory, tokens[0]!.value, tokens[1]!.value,
      parameters.map(token => token.value), parentId));
  }

  private help(): string {
    return [...this.definitions.values()].map(definition => definition.syntax).join('\n') +
      '\nTypes: rect <x> <y> <w> <h> [fill]; circle <cx> <cy> <r> [fill];' +
      '\n       ellipse <cx> <cy> <rx> <ry> [fill]; line <x1> <y1> <x2> <y2> [stroke];' +
      '\n       text <x> <y> "content"; g (no parameters)';
  }

  private arity(tokens: readonly InputToken[], min: number, max = min): void {
    if (tokens.length < min || tokens.length > max) throw new EditorError('invalid number of arguments. use \'help\' for syntax');
  }

  private number(tokens: readonly InputToken[], index: number, name: string): number {
    return Values.number(tokens[index]!.value, name);
  }
}
