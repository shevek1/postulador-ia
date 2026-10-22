const test = require('node:test');
const assert = require('node:assert');
const { buildTanda, parseMap } = require('../src/tanda');

const rows = [
  { empresa: 'Acme', puesto: 'Paid Media', email: 'RRHH@acme.com' },
  { empresa: 'Beta', puesto: 'Desarrollo web', email: 'jobs@beta.io' },
  { empresa: 'Gamma', puesto: 'Ventas', email: 'cv@gamma.com' },
  { empresa: 'Delta', puesto: 'Paid Media', email: 'hola@delta.com' },
  { empresa: 'Acme Two', puesto: 'Paid Media', email: 'rrhh@acme.com' },
];
const plantillas = { paid: {}, dev: {} };

test('parseMap reads "Puesto=clave" pairs separated by semicolons', () => {
  assert.deepStrictEqual(parseMap('Paid Media=paid; Desarrollo web = dev'), { 'paid media': 'paid', 'desarrollo web': 'dev' });
  assert.throws(() => parseMap('Paid Media'), /Puesto=clave/);
});

test('buildTanda maps each puesto to a template and skips unmapped, contacted and repeated rows', () => {
  const contacted = new Set(['delta.com']);
  const { tanda, skipped } = buildTanda(rows, parseMap('Paid Media=paid;Desarrollo web=dev'), plantillas, contacted);
  assert.deepStrictEqual(tanda, [
    { n: 1, empresa: 'Acme', puesto: 'Paid Media', email: 'rrhh@acme.com', plantilla: 'paid', extra: '' },
    { n: 2, empresa: 'Beta', puesto: 'Desarrollo web', email: 'jobs@beta.io', plantilla: 'dev', extra: '' },
  ]);
  assert.deepStrictEqual(skipped.map(s => [s.empresa, s.motivo]), [
    ['Gamma', 'sin plantilla para "Ventas"'],
    ['Delta', 'ya contactada antes'],
    ['Acme Two', 'correo repetido'],
  ]);
});

test('buildTanda uses the only template for every puesto and rejects unknown template keys', () => {
  const { tanda } = buildTanda(rows.slice(0, 3), {}, { general: {} }, new Set());
  assert.deepStrictEqual(tanda.map(t => t.plantilla), ['general', 'general', 'general']);
  assert.throws(() => buildTanda(rows, parseMap('Paid Media=nope'), plantillas, new Set()), /plantilla "nope" no existe/);
});
