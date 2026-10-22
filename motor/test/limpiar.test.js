const test = require('node:test');
const assert = require('node:assert');
const { triage, domainsWithoutMx } = require('../src/limpiar');

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

test('domainsWithoutMx uses the cache, runs lookups in parallel and never drops a domain on a slow answer', async () => {
  const asked = [];
  const resolve = async d => {
    asked.push(d);
    if (d === 'slow.com') return new Promise(() => {});
    if (d === 'dead.com') { const e = Error('x'); e.code = 'ENOTFOUND'; throw e; }
    return [{ exchange: 'mx.' + d }];
  };
  const cache = { 'old.com': false };
  const bad = await domainsWithoutMx(new Set(['old.com', 'ok.com', 'dead.com', 'slow.com']), cache, resolve, 50);
  assert.deepStrictEqual([...bad].sort(), ['dead.com', 'old.com']);
  assert.deepStrictEqual(asked.sort(), ['dead.com', 'ok.com', 'slow.com']);
  assert.deepStrictEqual(cache, { 'old.com': false, 'ok.com': true, 'dead.com': false });
});
