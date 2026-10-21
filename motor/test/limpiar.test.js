const test = require('node:test');
const assert = require('node:assert');
const { triage } = require('../src/limpiar');

const r = (empresa, email, puesto = 'X') => ({ empresa, email, puesto });

test('triage keeps one valid row per company and explains every discard', () => {
  const rows = [
    r('Acme', 'RRHH@acme.com'),
    r('ACME S.A.', 'jobs@acme.com', 'Otro'),
    r('Beta', 'no-es-mail'),
    r('Gamma', 'cv@gamma.io'),
    r('Delta', 'talento@delta.com'),
    r('Epsilon', 'yo@gmail.com'),
    r('Zeta', 'otra@gmail.com'),
    r('Eta', 'hola@sinmx.xyz'),
  ];
  const contacted = new Set(['delta.com']);
  const noMx = new Set(['sinmx.xyz']);
  const { keep, drop } = triage(rows, contacted, noMx);
  assert.deepStrictEqual(keep.map(x => x.email), ['rrhh@acme.com', 'cv@gamma.io', 'yo@gmail.com', 'otra@gmail.com']);
  const why = Object.fromEntries(drop.map(d => [d.empresa, d.motivo]));
  assert.match(why['ACME S.A.'], /misma empresa/);
  assert.match(why.Beta, /inválido/);
  assert.match(why.Delta, /ya contactad/);
  assert.match(why.Eta, /no recibe/);
});

test('triage only matches contacted public-mail addresses exactly, not the whole gmail.com domain', () => {
  const { keep, drop } = triage([r('A', 'a@gmail.com'), r('B', 'b@gmail.com')], new Set(['a@gmail.com', 'gmail.com']), new Set());
  assert.deepStrictEqual(keep.map(x => x.empresa), ['B']);
  assert.strictEqual(drop[0].empresa, 'A');
});
