import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { EditorError } from '../../domain/errors/EditorError.js';

export abstract class EditCommand {
  private before: SvgDocument | undefined;
  private after: SvgDocument | undefined;
  private feedback = '';
  private reverseFeedback = '';

  execute(document: SvgDocument): { readonly document: SvgDocument; readonly message: string } {
    const working = document.clone();
    const message = this.apply(working);
    working.assertInvariants();
    const reverseMessage = this.describeUndo(document);
    // Publish history only after the entire edit and summary succeeded.
    this.before = document.clone();
    this.after = working.clone();
    this.feedback = message;
    this.reverseFeedback = reverseMessage;
    return { document: working, message };
  }

  undo(): { readonly document: SvgDocument; readonly message: string } {
    if (!this.before) throw new EditorError('command has not been executed');
    return { document: this.before.clone(), message: this.reverseFeedback };
  }

  redo(): { readonly document: SvgDocument; readonly message: string } {
    if (!this.after) throw new EditorError('command has not been executed');
    return { document: this.after.clone(), message: this.feedback };
  }

  protected abstract apply(document: SvgDocument): string;
  protected abstract describeUndo(document: SvgDocument): string;
}
