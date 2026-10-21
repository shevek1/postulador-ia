const test = require('node:test');
const assert = require('node:assert');
const { extractEmails, decodeCfEmail, contactLinks, verifyRows } = require('../src/verificar');

// Cloudflare email protection: first byte is the XOR key, the rest is the address XORed with it.
const cf = email => {
  const key = 0x42;
  return [key, ...Buffer.from(email)].map((b, i) => (i ? b ^ key : b).toString(16).padStart(2, '0')).join('');
};

test('extractEmails finds plain, mailto, entity-encoded and obfuscated addresses', () => {
  const html = `<p>Mandá tu CV a RRHH@Acme.com.ar.</p>
    <a href="mailto:talento%40beta.com?subject=CV">Escribinos</a>
    <span>empleo&#64;gamma.io</span> <span>jobs&#x40;delta.com</span>
    <p>cv [at] epsilon [dot] com</p> <p>hola(arroba)zeta.com</p>`;
  assert.deepStrictEqual(extractEmails(html).sort(),
    ['cv@epsilon.com', 'empleo@gamma.io', 'hola@zeta.com', 'jobs@delta.com', 'rrhh@acme.com.ar', 'talento@beta.com']);
});

test('extractEmails decodes Cloudflare-protected addresses', () => {
  assert.strictEqual(decodeCfEmail(cf('rrhh@acme.com')), 'rrhh@acme.com');
  const html = `<a class="__cf_email__" data-cfemail="${cf('cv@agencia.com')}">[email protected]</a>
    <a href="/cdn-cgi/l/email-protection#${cf('jobs@otra.com')}">mail</a>`;
  assert.deepStrictEqual(extractEmails(html).sort(), ['cv@agencia.com', 'jobs@otra.com']);
});

test('extractEmails ignores image names, placeholders and tracking addresses', () => {
  const html = '<img src="logo@2x.png"> tu@email.com ejemplo@ejemplo.com 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d@sentry.wixpress.com nombre@dominio.com bootstrap@5.2.0 jquery@3.6.0.min';
  assert.deepStrictEqual(extractEmails(html), []);
});

test('contactLinks keeps same-site contact and careers pages only', () => {
  const html = `<a href="/contacto">Contacto</a> <a href="https://acme.com/trabaja-con-nosotros/">Trabajá con nosotros</a>
    <a href="/blog/post">Blog</a> <a href="https://facebook.com/acme/contact">FB</a> <a href="/careers">Careers</a>
    <a href="/contacto">Contacto otra vez</a>`;
  assert.deepStrictEqual(contactLinks('https://acme.com/', html),
    ['https://acme.com/contacto', 'https://acme.com/trabaja-con-nosotros/', 'https://acme.com/careers']);
});

test('verifyRows keeps only rows whose email is written on the linked page, and explains every discard', async () => {
  const pages = {
    'https://a.com/empleo': '<p>CV a rrhh@a.com</p>',
    'https://b.com/': '<a href="/contacto">Contacto</a>',
    'https://b.com/contacto': '<p>talento@b.com</p>',
    'https://c.com/': '<p>info@c.com</p>',
  };
  const getPage = async url => { if (!(url in pages)) throw Error('404'); return pages[url]; };
  const rows = [
    { empresa: 'A', email: 'RRHH@a.com', link: 'https://a.com/empleo' },
    { empresa: 'B', email: 'talento@b.com', link: 'https://b.com/' },
    { empresa: 'C', email: 'rrhh@c.com', link: 'https://c.com/' },
    { empresa: 'D', email: 'x@d.com', link: 'https://d.com/' },
    { empresa: 'E', email: 'x@e.com', link: '' },
  ];
  const { ok, bad } = await verifyRows(rows, getPage);
  assert.deepStrictEqual(ok.map(r => r.email), ['rrhh@a.com', 'talento@b.com']);
  assert.strictEqual(ok[1].link, 'https://b.com/contacto');
  const why = Object.fromEntries(bad.map(r => [r.empresa, r.motivo]));
  assert.match(why.C, /no aparece/);
  assert.match(why.D, /no se pudo abrir/);
  assert.match(why.E, /sin link/);
});

test('companyName picks the title part that matches the domain, skipping generic words', () => {
  const { companyName } = require('../src/verificar');
  assert.strictEqual(companyName('Inicio | Develops Software', 'https://develops.ar'), 'Develops Software');
  assert.strictEqual(companyName('Digital Marketing Agency in Pakistan | WeProms Digital', 'https://weproms.com/'), 'WeProms Digital');
  assert.strictEqual(companyName('Agencia Africa | Diseño Web, Branding', 'https://agenciaafrica.com.ar'), 'Agencia Africa');
  assert.strictEqual(companyName('', 'https://www.nextcommerce.com.ar/contact'), 'Nextcommerce');
});

test('siteRow takes the HR email first and marks the level; addRows skips companies already listed', () => {
  const { siteRow, addRows } = require('../src/verificar');
  const site = { title: 'Acme', pages: [
    { url: 'https://acme.com/', emails: ['info@acme.com'] },
    { url: 'https://acme.com/empleo', emails: ['rrhh@acme.com'] }] };
  assert.deepStrictEqual(siteRow('https://acme.com/', site, { puesto: 'Ventas', pais: 'Argentina' }),
    { empresa: 'Acme', puesto: 'Ventas', email: 'rrhh@acme.com', link: 'https://acme.com/empleo', pais: 'Argentina', modalidad: '', nivel: '2' });
  assert.strictEqual(siteRow('https://b.com/', { title: 'B', pages: [{ url: 'https://b.com/', emails: ['hola@b.com'] }] }, {}).nivel, '4');
  const careers = siteRow('https://d.com/', { title: 'D', pages: [
    { url: 'https://d.com/contact', emails: ['ana@d.com'] }, { url: 'https://d.com/ar/career/', emails: ['s.p@d.com'] }] }, {});
  assert.deepStrictEqual([careers.email, careers.nivel], ['s.p@d.com', '2']);
  assert.strictEqual(siteRow('https://c.com/',{ title: 'C', pages: [{ url: 'https://c.com/', emails: [] }] }, {}), null);
  const existing = [{ empresa: 'Acme', email: 'rrhh@acme.com' }];
  const added = addRows(existing, [
    { empresa: 'Acme SA', email: 'jobs@acme.com' }, { empresa: 'Beta', email: 'cv@beta.com' },
    { empresa: 'Beta Group', email: 'otro@beta.com' }, { empresa: 'Gamma', email: 'yo@gmail.com' }]);
  assert.deepStrictEqual(added.map(r => r.email), ['cv@beta.com', 'yo@gmail.com']);
});
