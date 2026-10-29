import { describe, it, expect } from 'vitest';
import { ShapeFactory } from '../../src/domain/factories/ShapeFactory.js';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';

describe('rich shape model and document tree', () => {
  const factory = new ShapeFactory();

  it.each([
    ['rect', ['10', '20', '30', '40'], { x: '30', y: '46', width: '60', height: '80' }],
    ['circle', ['10', '20', '30'], { cx: '30', cy: '46', r: '60' }],
    ['ellipse', ['10', '20', '30', '40'], { cx: '30', cy: '46', rx: '60', ry: '80' }],
    ['line', ['10', '20', '30', '40'], { x1: '30', y1: '46', x2: '70', y2: '86' }],
    ['text', ['10', '20', '中文 & text'], { x: '30', y: '46' }],
  ])('moves and scales %s through polymorphism', (type, parameters, expected) => {
    const shape = factory.create(type, 'item', parameters);
    shape.move(5, 3); shape.scale(2);
    expect(shape.attributes).toMatchObject(expected);
    expect(shape.attributes).not.toHaveProperty('fill');
  });

  it('recurses once, keeps explicit styling, and clones without shared references', () => {
    const doc = new SvgDocument();
    doc.add(factory.create('g', 'outer', []));
    doc.add(factory.create('g', 'inner', []), 'outer');
    doc.add(factory.create('rect', 'R', ['1', '2', '3', '4', 'red']), 'inner');
    doc.add(factory.create('rect', 'r', ['5', '6', '7', '8']), 'inner');
    doc.find('R').setAttribute('stroke-width', '2');
    const copy = doc.clone();
    copy.find('outer').move(10, 20); copy.find('outer').scale(2);
    copy.find('outer').setAttribute('fill', 'blue');
    expect(copy.find('R').attributes).toMatchObject({ x: '22', y: '44', fill: 'red', 'stroke-width': '2' });
    expect(doc.find('R').attributes).toMatchObject({ x: '1', y: '2' });
    expect(copy.find('r').attributes).not.toHaveProperty('fill');
    expect(copy.count).toBe(4);
    copy.assertInvariants();
  });

  it('groups by document order across parents and ungroups at the original slot', () => {
    const doc = new SvgDocument();
    for (const id of ['outer', 'a', 'b']) doc.add(factory.create('g', id, []), id === 'outer' ? undefined : 'outer');
    doc.add(factory.create('circle', 'c1', ['0', '0', '1']), 'a');
    doc.add(factory.create('circle', 'c2', ['2', '3', '4']), 'b');
    doc.group('pair', ['c2', 'c1']);
    expect(doc.find('outer').children.map(node => node.id)).toEqual(['pair', 'a', 'b']);
    expect(doc.find('pair').children.map(node => node.id)).toEqual(['c1', 'c2']);
    doc.ungroup('pair');
    expect(doc.find('outer').children.map(node => node.id)).toEqual(['c1', 'c2', 'a', 'b']);
    expect(() => doc.find('pair')).toThrow('no such shape');
    doc.delete('outer');
    expect(doc.count).toBe(0);
  });

  it('rejects cycles, duplicate ids, invalid geometry and unknown attributes', () => {
    const doc = new SvgDocument();
    doc.add(factory.create('g', 'a', []));
    doc.add(factory.create('g', 'b', []), 'a');
    expect(() => doc.group('bad', ['a', 'b'])).toThrow('cannot group a container into its own descendant: a');
    expect(() => doc.addTo('b', 'a')).toThrow('cannot move a container');
    expect(() => doc.ungroup('a')).toThrow('cannot ungroup top-level container: a');
    expect(() => doc.add(factory.create('g', 'a', []))).toThrow('id already exists: a');
    expect(() => factory.create('circle', 'c', ['0', '0', '-1'])).toThrow('r must be non-negative');
    expect(() => doc.find('a').setAttribute('x', '1')).toThrow('unknown attribute: x');
    expect(() => doc.find('b').scale(0)).toThrow('scale factor must be positive');
    expect(() => factory.create('box', 'x', [])).toThrow('unknown shape type: box (is the plugin loaded?)');
    doc.assertInvariants();
  });
});
