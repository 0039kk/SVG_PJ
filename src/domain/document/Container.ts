import type { Shape } from '../shapes/Shape.js';

export interface Container {
  readonly shape: Shape | undefined;
  readonly label: string;
  readonly parent: Container | undefined;
  readonly children: readonly Shape[];
  insert(shape: Shape, index?: number): void;
  remove(shape: Shape): void;
}
