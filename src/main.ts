import { ShapeFactory } from './domain/factories/ShapeFactory.js';
import { NodeFileGateway } from './adapters/filesystem/NodeFileGateway.js';
import { XmlSvgCodec } from './adapters/svg/XmlSvgCodec.js';
import { TextDocumentPresenter } from './adapters/presentation/TextDocumentPresenter.js';
import { EditorSession } from './application/services/EditorSession.js';
import { CommandDispatcher } from './application/services/CommandDispatcher.js';
import { Repl } from './cli/Repl.js';

const factory = new ShapeFactory();
const session = new EditorSession(new NodeFileGateway(), new XmlSvgCodec(factory));
const dispatcher = new CommandDispatcher(session, factory, new TextDocumentPresenter());
await new Repl(dispatcher).run(process.stdin, process.stdout, Boolean(process.stdin.isTTY && process.stdout.isTTY));
