const test = require('node:test');
const assert = require('node:assert');
const { receiptMatches, dateText, sameBody } = require('../src/gmail');

const at = s => new Date(s).getTime();

test('dateText uses Gmail Spanish month names', () => {
  assert.strictEqual(dateText('2026-09-28T08:00'), '28 sept 2026');
  assert.strictEqual(dateText('2026-10-02T09:00'), '2 oct 2026');
});

test('receipt accepts explicit day, "mañana" and "hoy", with or without leading zero', () => {
  assert.ok(receiptMatches('Envío programado para: 28 sept, 8:00', '2026-09-28T08:00', at('2026-09-20T10:00')));
  assert.ok(receiptMatches('Envío programado para: mañana, 9:00', '2026-10-22T09:00', at('2026-10-21T10:00')));
  assert.ok(receiptMatches('Envío programado para: hoy, 23:30', '2026-10-21T23:30', at('2026-10-21T10:00')));
  assert.ok(receiptMatches('Envío programado para: 23:30', '2026-10-21T23:30', at('2026-10-21T10:00')));
});

test('receipt rejects a different day or time', () => {
  assert.ok(!receiptMatches('Envío programado para: 29 sept, 8:00', '2026-09-28T08:00', at('2026-09-20T10:00')));
  assert.ok(!receiptMatches('Envío programado para: 28 sept, 9:00', '2026-09-28T08:00', at('2026-09-20T10:00')));
  assert.ok(!receiptMatches('Envío programado para: mañana, 8:00', '2026-09-28T08:00', at('2026-09-20T10:00')));
});

test('sameBody tolerates Gmail blank-line doubling and keeps the signature at the end', () => {
  assert.ok(sameBody('Hola\n\n\n\nchau', 'Hola\n\nchau'));
  assert.ok(sameBody('Hola\n\nchau\n\n--\nAna', 'Hola\n\nchau', '--\nAna'));
  assert.ok(!sameBody('Hola\n\notra\n\n--\nAna', 'Hola\n\nchau', '--\nAna'));
});
