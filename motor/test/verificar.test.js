const test = require('node:test');
const assert = require('node:assert');
const v = require('../src/verificar');
const { extractEmails, decodeCfEmail, contactLinks, verifyRows } = v;

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

test('siteRow fills modalidad from the request and keeps nivel as the search level', () => {
  const site = { title: 'Acme', pages: [{ url: 'https://acme.com/contacto', emails: ['info@acme.com'] }] };
  const r = v.siteRow('https://acme.com', site, { puesto: 'Dev', pais: 'Argentina', modalidad: 'Remoto' });
  assert.strictEqual(r.modalidad, 'Remoto');
  assert.strictEqual(r.nivel, '4');
});

test('estimate uses the measured pace and skips long pauses between sessions', () => {
  const t0 = Date.parse('2026-10-21T17:30:00');
  const min = m => new Date(t0 + m * 60000).toISOString();
  const log = [[min(0), 0, 32], [min(10), 18, 50], [min(20), 25, 75], [min(26), 17, 92], [min(300), 0, 92]];
  const e = v.estimate(log.map(([fecha, nuevas, total]) => ({ fecha, nuevas, total })), 200);
  assert.strictEqual(e.total, 92);
  assert.strictEqual(e.faltan, 108);
  assert.strictEqual(e.medido, true);
  assert.strictEqual(e.minutos, Math.round(108 * 26 / 60));
  const d = v.estimate([], 100);
  assert.deepStrictEqual([d.total, d.faltan, d.medido, d.minutos], [0, 100, false, 40]);
  const old = v.estimate([], 200, 92);
  assert.deepStrictEqual([old.total, old.faltan, old.bloques], [92, 108, 5]);
});

test('extractEmails decodes backslash-u escapes instead of keeping their letters', () => {
  const bs = String.fromCharCode(92);
  const html = `x = "${bs}u300c@te.com"; y = "${bs}u003cinfo@acme.com${bs}u003e";`;
  assert.deepStrictEqual(v.extractEmails(html), ['info@acme.com']);
});

test('companyName decodes HTML entities and repairs mojibake in titles', () => {
  assert.strictEqual(v.companyName('Digital JUMP! &raquo; Born to JUMP', 'https://digitaljump.com.ar'), 'Digital JUMP!');
  assert.strictEqual(v.companyName('Elatre marketing &amp; software agency', 'https://elatre.com'), 'Elatre marketing & software agency');
  assert.strictEqual(v.companyName('Pulso Digital &#8211; Agencia Creativa Integral', 'https://pulsodigital.co'), 'Pulso Digital');
  const broken = 'L' + String.fromCharCode(0xc3, 0x84) + 'BERIT', fixed = 'L' + String.fromCharCode(0xc4) + 'BERIT';
  assert.strictEqual(v.companyName(broken, 'https://laberit.com'), fixed);
});

test('verifyLists merges several lists and skips rows already verified', async () => {
  const opened = [];
  const getPage = async url => { opened.push(url); return url.includes('a.com') ? 'escribinos a cv@a.com' : 'nada'; };
  const lists = [
    [{ empresa: 'A', email: 'cv@a.com', link: 'https://a.com' }],
    [{ empresa: 'B', email: 'rrhh@b.com', link: 'https://b.com' }, { empresa: 'C', email: 'hola@c.com', link: 'https://c.com' }],
  ];
  const cache = { 'hola@c.com|https://c.com': 'ok' };
  const { ok, bad } = await v.verifyLists(lists, getPage, cache);
  assert.deepStrictEqual(ok.map(r => r.empresa).sort(), ['A', 'C']);
  assert.deepStrictEqual(bad.map(r => r.empresa), ['B']);
  assert.deepStrictEqual(opened.sort(), ['https://a.com', 'https://b.com']);
  assert.strictEqual(cache['cv@a.com|https://a.com'], 'ok');
});
