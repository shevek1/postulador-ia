const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src/core');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'postulador-'));
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n%%EOF\n', 'latin1');

function row(over = {}) {
  return { N: '1', Empresa: 'Acme', Puesto: 'Dev', 'Email destino': 'RRHH@acme.com', 'Archivo CV': '',
    Asunto: 'Postulación', Mensaje: 'Hola  \r\nlínea  \n\n\n\nchau', ...over };
}

test('csv parse handles BOM, quotes, commas and multiline cells', () => {
  const rows = core.parseCsv('﻿a,b\r\n"x, y","línea 1\nlínea ""2"""\r\n');
  assert.deepStrictEqual(rows, [['a', 'b'], ['x, y', 'línea 1\nlínea "2"']]);
});

test('csv stringify round-trips', () => {
  const data = [['N', 'Mensaje'], ['1', 'a,b\n"c"']];
  assert.deepStrictEqual(core.parseCsv(core.toCsv(data)), data);
});

test('csv objects require the expected columns', () => {
  assert.throws(() => core.csvObjects('a,b\n1,2', core.COLUMNS), /columnas/);
  const objs = core.csvObjects('empresa,email\nAcme,a@b.com\n', ['empresa', 'email']);
  assert.deepStrictEqual(objs, [{ empresa: 'Acme', email: 'a@b.com' }]);
});

test('cleanBody strips trailing spaces per line (Gmail trims them and the check fails)', () => {
  assert.strictEqual(core.cleanBody('Hola  \r\nlínea  \n\n\n\nchau  '), 'Hola\nlínea\n\nchau');
});

test('validateRow normalizes recipients and builds identities', () => {
  const app = core.validateRow(row({ 'Email destino': 'b@x.com; A@x.com' }), tmp());
  assert.deepStrictEqual(app.recipients, ['a@x.com', 'b@x.com']);
  assert.strictEqual(app.body, 'Hola\nlínea\n\nchau');
  assert.strictEqual(app.pdf, null);
  assert.ok(app.identity && app.fingerprint);
});

test('validateRow rejects bad emails, missing fields and PDFs outside the folder', () => {
  const dir = tmp();
  assert.throws(() => core.validateRow(row({ 'Email destino': 'a@b.com / c@d.com' }), dir), /inválid/);
  assert.throws(() => core.validateRow(row({ Asunto: ' ' }), dir), /Falta Asunto/);
  assert.throws(() => core.validateRow(row({ 'Archivo CV': '../x.pdf' }), dir), /carpeta/);
});

test('validateRow hashes a real PDF and rejects a fake one', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'cv.pdf'), PDF);
  fs.writeFileSync(path.join(dir, 'fake.pdf'), 'hola');
  assert.match(core.validateRow(row({ 'Archivo CV': 'cv.pdf' }), dir).pdf_hash, /^[0-9a-f]{64}$/);
  assert.throws(() => core.validateRow(row({ 'Archivo CV': 'fake.pdf' }), dir), /PDF/);
});

test('ledger classifies new, scheduled, changed and uncertain applications', () => {
  const ledger = new core.Ledger(path.join(tmp(), 'h.json'));
  const app = core.validateRow(row(), tmp());
  assert.strictEqual(ledger.classify(app), 'LISTO');
  ledger.record(app, 'in_flight', '2099-01-01T09:00', 'cuenta1');
  assert.match(ledger.classify(app), /REVISAR/);
  ledger.record(app, 'completed', '2099-01-01T09:00', 'cuenta1');
  assert.strictEqual(ledger.classify(app), 'YA PROGRAMADO');
  const changed = core.validateRow(row({ Mensaje: 'otro' }), tmp());
  assert.match(ledger.classify(changed), /CONFLICTO/);
  const reloaded = new core.Ledger(ledger.file);
  assert.strictEqual(reloaded.classify(app), 'YA PROGRAMADO');
});

test('ledger refuses a damaged history file', () => {
  const file = path.join(tmp(), 'h.json');
  fs.writeFileSync(file, '{roto');
  assert.throws(() => new core.Ledger(file), /dañado/);
});

test('assign fills each account up to 100 minus what it already has pending', () => {
  const ledger = new core.Ledger(path.join(tmp(), 'h.json'));
  const now = Date.parse('2026-10-21T10:00');
  for (let i = 0; i < 30; i++) {
    const old = core.validateRow(row({ 'Email destino': `old${i}@x.com` }), tmp());
    ledger.record(old, 'completed', '2026-10-22T09:00', 'cuenta1');
  }
  const sent = core.validateRow(row({ 'Email destino': 'sent@x.com' }), tmp());
  ledger.record(sent, 'completed', '2026-10-20T09:00', 'cuenta2');
  const apps = Array.from({ length: 250 }, (_, i) => ({ number: String(i) }));
  const { byAccount, leftover } = core.assign(apps, ['cuenta1', 'cuenta2'], ledger, now);
  assert.strictEqual(byAccount.get('cuenta1').length, 70);
  assert.strictEqual(byAccount.get('cuenta2').length, 100);
  assert.strictEqual(leftover.length, 80);
  assert.strictEqual(byAccount.get('cuenta1')[0].number, '0');
});

test('assign spreads evenly across accounts to protect each sender reputation', () => {
  const ledger = new core.Ledger(path.join(tmp(), 'h.json'));
  const apps = Array.from({ length: 9 }, (_, i) => ({ number: String(i) }));
  const { byAccount, leftover } = core.assign(apps, ['a', 'b', 'c'], ledger, Date.now());
  assert.deepStrictEqual([...byAccount.values()].map(x => x.length), [3, 3, 3]);
  assert.strictEqual(leftover.length, 0);
});

test('parseWhen accepts both date styles and rejects the past', () => {
  const now = Date.parse('2026-10-21T10:00');
  assert.strictEqual(core.parseWhen('22/10/2026', '9:00', now), '2026-10-22T09:00');
  assert.strictEqual(core.parseWhen('2026-10-22', '09:05', now), '2026-10-22T09:05');
  assert.throws(() => core.parseWhen('21/10/2026', '09:00', now), /futura/);
  assert.throws(() => core.parseWhen('32/10/2026', '09:00', now), /Fecha/);
});
