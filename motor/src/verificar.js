// Usage:
//   npm run verificar -- empresas/lista.csv      keeps only rows whose email is written on the linked page
//   npm run extraer -- https://acme.com ...      lists the emails a site publishes (home + contact/careers pages)
//   npm run extraer -- empresas/sitios.txt       same, one URL per line
//   npm run extraer -- empresas/sitios.txt --agregar empresas/lista.csv [--puesto X] [--pais Y]
//     also appends one row per new company (best email first) and logs the sites in sitios_vistos.txt
// verificar writes verificadas.csv and no_verificadas.csv (with the reason) next to the list.
const fs = require('fs');
const path = require('path');
const core = require('./core');
const { companyKey, PUBLIC } = require('./limpiar');
const { findChrome } = require('./browser');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const FOUND = /[a-z0-9][a-z0-9._%+-]*@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;
// Every label needs a letter and the TLD is letters only, so 'bootstrap@5.2.0' or 'jquery@3.6.0.min' never count.
const DOMAIN = /^(?:[a-z0-9-]*[a-z][a-z0-9-]*\.)+[a-z]{2,}$/;
const NOT_TLD = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mp4|webm|pdf)$/i;
const FAKE_DOMAINS = /(^|\.)(example\.(com|org|net)|ejemplo\.com|dominio\.com|domain\.com|tudominio\.com|yourdomain\.com|email\.com|correo\.com|sentry\.io|wixpress\.com|sentry-next\.wixpress\.com)$/i;
const FAKE_LOCALS = /^(tu|tuemail|tucorreo|nombre|name|user|usuario|email|correo|ejemplo|example|your|yourname)$/i;
const CONTACT = /contact|empleo|trabaj|career|jobs?\b|rrhh|recursos-humanos|talent|unete|únete|sumate|súmate|postula|\bcv\b|join|equipo/i;
const GENERIC = /^(inicio|home|bienvenid[oa]s?|contacto|contact|p[aá]gina principal|sitio oficial|web oficial)$/i;
const LIST_COLS = ['empresa', 'puesto', 'email', 'link', 'pais', 'modalidad', 'nivel'];
const HR_FIRST = /rrhh|hr@|talent|empleo|empleos|jobs|careers|career|cv@|seleccion|selección|recruit|people|trabaja/i;

const decodeCfEmail = hex => {
  const key = parseInt(hex.slice(0, 2), 16);
  let out = '';
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
};

function extractEmails(html) {
  let text = String(html);
  const found = new Set();
  for (const m of text.matchAll(/data-cfemail="([0-9a-f]+)"|email-protection#([0-9a-f]+)/gi)) found.add(decodeCfEmail(m[1] || m[2]));
  text = text
    .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/%40/g, '@')
    .replace(/\s*[[(]\s*(at|arroba)\s*[\])]\s*/gi, '@')
    .replace(/\s*[[(]\s*(dot|punto)\s*[\])]\s*/gi, '.');
  for (const m of text.matchAll(FOUND)) found.add(m[0]);
  return [...found].map(e => e.toLowerCase()).filter(e => {
    const [local, domain] = e.split('@');
    return core.EMAIL.test(e) && DOMAIN.test(domain) && !NOT_TLD.test(domain) && !FAKE_DOMAINS.test(domain) && !FAKE_LOCALS.test(local)
      && !/^[0-9a-f]{24,}$/.test(local);
  });
}

// Same-site links that look like contact or careers pages, in page order, without repeats.
function contactLinks(baseUrl, html, max = 5) {
  const host = u => u.hostname.replace(/^www\./, '');
  const base = new URL(baseUrl);
  const out = [];
  for (const m of String(html).matchAll(/<a\b[^>]*href=["']([^"'#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url;
    try { url = new URL(m[1], base); } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || host(url) !== host(base)) continue;
    const text = m[2].replace(/<[^>]+>/g, ' ');
    if (!CONTACT.test(decodeURIComponent(url.pathname)) && !CONTACT.test(text)) continue;
    url.hash = '';
    if (url.href !== base.href && !out.includes(url.href)) out.push(url.href);
    if (out.length >= max) break;
  }
  return out;
}

// Emails a site publishes: the page itself first, then its contact/careers pages.
async function crawl(url, getPage) {
  const pages = [];
  const html = await getPage(url);
  pages.push({ url, emails: extractEmails(html) });
  for (const link of contactLinks(url, html)) {
    try { pages.push({ url: link, emails: extractEmails(await getPage(link)) }); } catch { /* broken subpage: skip */ }
  }
  return { pages, title: (String(html).match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim() || '' };
}

const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', raquo: '»', laquo: '«', ndash: '–', mdash: '—', middot: '·' };
// Titles come raw from the HTML: decode entities and undo UTF-8 read as Latin-1 ("LÃBERIT" -> "LÄBERIT").
function cleanTitle(title) {
  let s = String(title)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
  if (/[\u00c2-\u00f4][\u0080-\u00bf]/.test(s) && !/[^\u0000-\u00ff]/.test(s)) {
    const fixed = Buffer.from(s, 'latin1').toString('utf8');
    if (!fixed.includes('\ufffd')) s = fixed;
  }
  return s;
}

// Company name from the page title: the part that matches the domain, else the domain itself.
function companyName(title, url) {
  const root = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
  const parts = cleanTitle(title).split(/\s+[|–—·»«-]\s+|:\s+/).map(p => p.trim()).filter(p => p && !GENERIC.test(p));
  const hit = parts.find(p => norm(p).includes(norm(root)) || norm(root).includes(norm(p)));
  return hit || root.charAt(0).toUpperCase() + root.slice(1);
}

// One list row per site: an HR-looking email or one on a careers page first (level 2), any other otherwise (level 4).
const CAREERS = /empleo|trabaj|career|jobs?\b|rrhh|talent|unete|únete|sumate|súmate|postula/i;
function siteRow(url, site, { puesto = '', pais = '', modalidad = '' } = {}) {
  const found = site.pages.flatMap(p => p.emails.map(email => ({ email, link: p.url,
    hr: HR_FIRST.test(email) || CAREERS.test(decodeURIComponent(new URL(p.url).pathname)) })));
  if (!found.length) return null;
  const best = found.find(f => f.hr) || found[0];
  return { empresa: companyName(site.title, url), puesto, email: best.email, link: best.link, pais, modalidad,
    nivel: best.hr ? '2' : '4' };
}

// Minutes per company measured on the test run (25 companies in about 10 minutes), used until there is real data.
const DEFAULT_MIN_PER_COMPANY = 0.4;
// Pace from empresas/progreso.csv. Gaps longer than 30 minutes are pauses between sessions and do not count.
function estimate(log, objetivo, enLista = 0) {
  let minutes = 0, gained = 0;
  for (let i = 1; i < log.length; i++) {
    const gap = (Date.parse(log[i].fecha) - Date.parse(log[i - 1].fecha)) / 60000;
    if (gap > 0 && gap <= 30) { minutes += gap; gained += Number(log[i].total) - Number(log[i - 1].total); }
  }
  const total = Math.max(log.length ? Number(log[log.length - 1].total) : 0, enLista);
  const faltan = Math.max(0, objetivo - total);
  const medido = gained > 0;
  const perCompany = medido ? minutes / gained : DEFAULT_MIN_PER_COMPANY;
  return { total, faltan, medido, minutos: Math.round(faltan * perCompany), bloques: Math.ceil(faltan / 25) };
}

// Rows whose company or (non-public) domain is not in the list yet.
function addRows(existing, rows) {
  const companies = new Set(), domains = new Set(), out = [];
  const remember = r => {
    const domain = String(r.email).toLowerCase().split('@')[1] || '';
    companies.add(companyKey(r.empresa));
    if (!PUBLIC.has(domain)) domains.add(domain);
  };
  existing.forEach(remember);
  for (const r of rows) {
    const domain = String(r.email).toLowerCase().split('@')[1] || '';
    if (companies.has(companyKey(r.empresa)) || domains.has(domain)) continue;
    remember(r);
    out.push(r);
  }
  return out;
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

async function verifyRows(rows, getPage, concurrency = 6) {
  const results = await pool(rows, concurrency, async row => {
    const email = String(row.email || '').trim().toLowerCase();
    const link = String(row.link || '').trim();
    if (!/^https?:\/\//i.test(link)) return { ...row, email, motivo: 'sin link donde verificar el correo' };
    let site;
    try { site = await crawl(link, getPage); } catch { return { ...row, email, motivo: 'no se pudo abrir el link' }; }
    const hit = site.pages.find(p => p.emails.includes(email));
    return hit ? { ...row, email, link: hit.url } : { ...row, email, motivo: 'el correo no aparece en el link' };
  });
  return { ok: results.filter(r => !r.motivo), bad: results.filter(r => r.motivo) };
}

// Rows already verified, or added by extraer (which read the email on that page), are not opened again.
const cacheKey = r => `${String(r.email || '').trim().toLowerCase()}|${String(r.link || '').trim()}`;
async function verifyLists(lists, getPage, cache = {}) {
  const rows = lists.flat();
  const known = rows.filter(r => cache[cacheKey(r)] === 'ok').map(r => ({ ...r, email: String(r.email).trim().toLowerCase() }));
  const pending = rows.filter(r => cache[cacheKey(r)] !== 'ok').map(r => ({ ...r, _key: cacheKey(r) }));
  const { ok, bad } = await verifyRows(pending, getPage);
  const strip = ({ _key, ...r }) => r;
  for (const r of ok) cache[r._key] = 'ok';
  return { ok: [...known, ...ok.map(strip)], bad: bad.map(strip) };
}
const readCache = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };

// Plain fetch first; if it fails or shows no email, render the page in headless Chrome (sites built with JS).
function pageReader() {
  const cache = new Map();
  let browser;
  const fetchHtml = async url => {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': UA, accept: 'text/html,*/*', 'accept-language': 'es-AR,es;q=0.9,en;q=0.8' } });
    if (!res.ok) throw Error(`HTTP ${res.status}`);
    if (!/html|text/i.test(res.headers.get('content-type') || '')) throw Error('no es una página');
    return (await res.text()).slice(0, 3e6);
  };
  const render = async url => {
    if (!browser) {
      const { chromium } = require('playwright-core');
      browser = chromium.launch({ executablePath: findChrome(), headless: true });
    }
    const context = await (await browser).newContext({ userAgent: UA, locale: 'es-419' });
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);
      return await page.content();
    } finally { await context.close(); }
  };
  const read = async url => {
    let html, error;
    try { html = await fetchHtml(url); if (extractEmails(html).length) return html; } catch (e) { error = e; }
    try { return await render(url); } catch (e) { if (html !== undefined) return html; throw error || e; }
  };
  return {
    getPage: url => { if (!cache.has(url)) cache.set(url, read(url)); return cache.get(url); },
    close: async () => { if (browser) await (await browser).close().catch(() => {}); },
  };
}

// All the lists go into one verificadas.csv, so verifying a second list never drops the first one.
async function verificar(files, reader) {
  const srcs = files.map(f => path.resolve(core.PATHS.root, f));
  const lists = srcs.map(src => core.csvObjects(fs.readFileSync(src, 'utf8'), ['empresa', 'email', 'link']));
  const total = lists.flat().length;
  const dir = path.dirname(srcs[0]);
  const cacheFile = path.join(dir, 'verificacion.json');
  const cache = readCache(cacheFile);
  console.log(`Verificando ${total} correos de ${srcs.length} lista(s) en sus páginas...`);
  const { ok, bad } = await verifyLists(lists, reader.getPage, cache);
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  const cols = [...new Set(lists.flat().flatMap(r => Object.keys(r)))];
  core.writeCsv(path.join(dir, 'verificadas.csv'), [cols, ...ok.map(r => cols.map(c => r[c] ?? ''))]);
  core.writeCsv(path.join(dir, 'no_verificadas.csv'), [[...cols, 'motivo'], ...bad.map(r => [...cols.map(c => r[c] ?? ''), r.motivo])]);
  console.log(`✔ ${ok.length} de ${total} verificadas → ${path.relative(core.PATHS.root, path.join(dir, 'verificadas.csv'))}`);
  const counts = bad.reduce((m, r) => (m[r.motivo] = (m[r.motivo] || 0) + 1, m), {});
  for (const [m, n] of Object.entries(counts)) console.log(`  descartadas: ${n} · ${m}`);
}

async function extraer(argv, reader) {
  const flags = {}, args = [];
  for (let i = 0; i < argv.length; i++) {
    if (/^--(agregar|puesto|pais|modalidad)$/.test(argv[i])) flags[argv[i].slice(2)] = argv[++i] || '';
    else args.push(argv[i]);
  }
  const rows = [];
  const urls = args.flatMap(a => fs.existsSync(path.resolve(core.PATHS.root, a))
    ? fs.readFileSync(path.resolve(core.PATHS.root, a), 'utf8').split(/\r?\n/) : [a])
    .map(s => s.trim()).filter(s => /^https?:\/\//i.test(s) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(s))
    .map(s => (/^https?:/i.test(s) ? s : `https://${s}`));
  if (!urls.length) throw Error('Uso: npm run extraer -- https://empresa.com [otra.com ...] o un .txt con una URL por línea');
  await pool(urls, 8, async url => {
    let site;
    try { site = await crawl(url, reader.getPage); } catch { console.log(`✖ ${url} · no se pudo abrir`); return; }
    const seen = new Map();
    for (const p of site.pages) for (const e of p.emails) if (!seen.has(e)) seen.set(e, p.url);
    const emails = [...seen].sort(([a], [b]) => HR_FIRST.test(b) - HR_FIRST.test(a));
    if (!emails.length) { console.log(`✖ ${url} · sin correo publicado`); return; }
    rows.push(siteRow(url, site, flags));
    console.log(`✔ ${url} · ${site.title.slice(0, 60)}`);
    for (const [e, page] of emails.slice(0, 4)) console.log(`    ${e}  ${page}`);
  });
  if (flags.agregar) {
    const file = path.resolve(core.PATHS.root, flags.agregar);
    const existing = fs.existsSync(file) ? core.csvObjects(fs.readFileSync(file, 'utf8'), ['empresa', 'email']) : [];
    const added = addRows(existing, rows);
    const all = [...existing, ...added];
    core.writeCsv(file, [LIST_COLS, ...all.map(r => LIST_COLS.map(c => r[c] || ''))]);
    fs.appendFileSync(path.join(path.dirname(file), 'sitios_vistos.txt'), urls.join('\n') + '\n');
    // extraer read each added email on its page, so verificar does not need to open it again.
    const cacheFile = path.join(path.dirname(file), 'verificacion.json');
    const cache = readCache(cacheFile);
    for (const r of added) cache[cacheKey(r)] = 'ok';
    fs.writeFileSync(cacheFile, JSON.stringify(cache));
    const progress = path.join(path.dirname(file), 'progreso.csv');
    if (!fs.existsSync(progress)) fs.writeFileSync(progress, 'fecha,nuevas,total\n');
    fs.appendFileSync(progress, `${new Date().toISOString()},${added.length},${all.length}\n`);
    console.log(`＋ ${added.length} empresas nuevas · total ${all.length} en ${path.relative(core.PATHS.root, file)}`);
  }
}

// Usage: npm run estimar -- 200   → how long the rest of the search should take at the measured pace.
function estimar([objetivo]) {
  const n = Number(objetivo);
  if (!(n > 0)) throw Error('Uso: npm run estimar -- <cantidad de empresas que querés en total>');
  const file = path.join(core.PATHS.root, 'empresas', 'progreso.csv');
  const log = fs.existsSync(file) ? core.csvObjects(fs.readFileSync(file, 'utf8'), ['fecha', 'total']) : [];
  const list = path.join(core.PATHS.root, 'empresas', 'lista_claude.csv');
  const enLista = fs.existsSync(list) ? core.csvObjects(fs.readFileSync(list, 'utf8'), ['empresa', 'email']).length : 0;
  const e = estimate(log, n, enLista);
  const time = e.minutos >= 60 ? `${Math.floor(e.minutos / 60)} h ${e.minutos % 60} min` : `${e.minutos} min`;
  if (!e.faltan) return console.log(`Ya hay ${e.total} de ${n}: no falta buscar.`);
  console.log(`Hay ${e.total} de ${n} · faltan ${e.faltan} (${e.bloques} bloques) · unos ${time}` +
    (e.medido ? ' al ritmo medido.' : ' (estimado; se ajusta después del primer bloque).'));
}

async function main() {
  const [first, ...rest] = process.argv.slice(2);
  if (first === '--estimar') return estimar(rest);
  const reader = pageReader();
  try {
    if (first === '--extraer') await extraer(rest, reader);
    else if (first) await verificar([first, ...rest], reader);
    else throw Error('Uso: npm run verificar -- empresas/tu_lista.csv');
  } finally { await reader.close(); }
}

module.exports = { extractEmails, decodeCfEmail, contactLinks, verifyRows, verifyLists, companyName, siteRow, addRows, estimate, verificar, pageReader };
if (require.main === module) main().catch(e => { console.error('✖ ' + e.message); process.exitCode = 1; });
