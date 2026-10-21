const test = require('node:test');
const assert = require('node:assert');
const cv = require('../src/cv');

const perfil = {
  nombre: 'Ana Pérez',
  contacto: { email: 'ana@mail.com', telefono: '+54 11 0000-0000', ubicacion: 'Córdoba, Argentina' },
  idiomas: 'Español nativo | Inglés B1',
  firma: 'Ana Pérez\n+54 11 0000-0000',
  competencias: { web: { titulo: 'Web', detalle: 'HTML, CSS' }, ventas: { titulo: 'Ventas', detalle: 'Prospección' } },
  proyectos: { tienda: { titulo: 'Tienda', detalle: 'Propio', puntos: ['Hice <la> web'] } },
  experiencia: { kiosco: { titulo: 'Kiosco', detalle: '2023', puntos: ['Atención'] } },
  formacion: [{ titulo: 'Secundario', detalle: '2020' }],
  plantillas: {
    dev: { titular: 'Desarrolladora web', perfil: 'Perfil dev', competencias: ['web'], proyectos: ['tienda'],
      experiencia: ['kiosco'], asunto: 'Postulación {puesto} – {nombre}',
      mensaje: 'Hola, equipo de {empresa}:\n\nMe postulo a {puesto}. {extra}Gracias.\n\n{firma}' },
  },
};

test('buildSpec fills the template placeholders', () => {
  const s = cv.buildSpec(perfil, { n: '7', empresa: 'Acme SA', puesto: 'Frontend Jr', email: 'rrhh@acme.com', plantilla: 'dev', extra: '' });
  assert.strictEqual(s.asunto, 'Postulación Frontend Jr – Ana Pérez');
  assert.strictEqual(s.mensaje, 'Hola, equipo de Acme SA:\n\nMe postulo a Frontend Jr. Gracias.\n\nAna Pérez\n+54 11 0000-0000');
  assert.strictEqual(s.file, '007_Acme_SA_Frontend_Jr.pdf');
});

test('buildSpec keeps the extra sentence and lets a row override template fields', () => {
  const s = cv.buildSpec(perfil, { n: '1', empresa: 'B', puesto: 'Ventas', email: 'a@b.com', plantilla: 'dev',
    extra: 'No uso Figma, pero aprendo rápido.', titular: 'Ejecutiva comercial', competencias: ['ventas'] });
  assert.match(s.mensaje, /Ventas\. No uso Figma, pero aprendo rápido\. Gracias\./);
  assert.strictEqual(s.titular, 'Ejecutiva comercial');
  assert.deepStrictEqual(s.competencias, ['ventas']);
});

test('buildSpec rejects unknown templates, keys and placeholders', () => {
  const base = { n: '1', empresa: 'B', puesto: 'X', email: 'a@b.com' };
  assert.throws(() => cv.buildSpec(perfil, { ...base, plantilla: 'nope' }), /plantilla/);
  assert.throws(() => cv.buildSpec(perfil, { ...base, plantilla: 'dev', proyectos: ['inventado'] }), /inventado/);
  assert.throws(() => cv.buildSpec(perfil, { ...base, plantilla: 'dev', asunto: 'Hola {jefe}' }), /\{jefe\}/);
});

test('renderHtml escapes text and includes every selected section', () => {
  const html = cv.renderHtml(perfil, cv.buildSpec(perfil, { n: '1', empresa: 'B', puesto: 'X', email: 'a@b.com', plantilla: 'dev' }), '');
  assert.match(html, /Hice &lt;la&gt; web/);
  assert.match(html, /ANA PÉREZ|Ana Pérez/);
  assert.match(html, /Desarrolladora web/);
  assert.match(html, /Secundario/);
  assert.doesNotMatch(html, /<img/);
});

test('pdfPages counts pages in a Chromium PDF', () => {
  assert.strictEqual(cv.pdfPages(Buffer.from('<< /Type /Pages >> << /Type /Page >> << /Type/Page >>', 'latin1')), 2);
});
