const test = require('node:test');
const assert = require('node:assert');
const { progress } = require('../src/estado');

const done = p => p.steps.map(s => s.done);

test('progress points to the first missing step', () => {
  const empty = progress({ perfil: ['.gitkeep'], cuentas: false, empresas: ['.gitkeep'] });
  assert.deepStrictEqual(done(empty), [false, false, false, false, false, false]);
  assert.strictEqual(empty.next, 'cv');

  const cvOnly = progress({ perfil: ['mi_cv.pdf'], cuentas: false, empresas: [] });
  assert.strictEqual(cvOnly.next, '/cuestionario');

  const noList = progress({ perfil: ['mi_cv.pdf', 'respuestas.md', 'perfil.json'], cuentas: true,
    empresas: ['limpias.csv', 'descartadas.csv', 'verificadas.csv', 'progreso.csv'] });
  assert.strictEqual(noList.next, '/buscar-empresas');

  const all = progress({ perfil: ['cv.docx', 'respuestas.md', 'perfil.json'], cuentas: true, empresas: ['lista_claude.csv'] });
  assert.strictEqual(all.next, '/programar');
  assert.match(all.line, /^✔ 1\. CV {3}✔ 2\. Cuestionario .*▸ 6\. Programar$/);
});
