// Usage: npm run limpiar -- empresas/lista.csv
// Cleans a company list: invalid emails, repeated companies, already contacted, domains that do not receive mail.
// Writes empresas/limpias.csv and empresas/descartadas.csv (with the reason).
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const core = require('./core');

const { PUBLIC } = core;
const companyKey = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\b(s\.?a\.?s?|s\.?r\.?l\.?|s\.?l\.?|inc|llc|ltda?|sa de cv|group|grupo)\b/g, '').replace(/[^a-z0-9]/g, '');

function triage(rows, contacted, noMx) {
  const keep = [], drop = [], seenCompany = new Set(), seenDomain = new Set();
  for (const row of rows) {
    const email = String(row.email || '').trim().toLowerCase();
    const domain = email.split('@')[1] || '';
    const isPublic = PUBLIC.has(domain);
    const company = companyKey(row.empresa);
    let motivo = '';
    if (!core.EMAIL.test(email)) motivo = 'email inválido';
    else if (contacted.has(email) || (!isPublic && contacted.has(domain))) motivo = 'ya contactada antes';
    else if (seenCompany.has(company) || (!isPublic && seenDomain.has(domain))) motivo = 'misma empresa repetida (un correo por empresa)';
    else if (noMx.has(domain)) motivo = 'el dominio no recibe correos';
    if (motivo) { drop.push({ ...row, email, motivo }); continue; }
    seenCompany.add(company); if (!isPublic) seenDomain.add(domain);
    keep.push({ ...row, email });
  }
  return { keep, drop };
}

// cache maps domain -> receives mail (true/false). A slow DNS answer counts as fine: better to keep a company than drop it.
async function domainsWithoutMx(domains, cache = {}, resolve = d => dns.resolveMx(d), timeoutMs = 4000) {
  const bad = new Set(), list = [...domains].filter(d => !(d in cache));
  const check = async d => {
    const timeout = new Promise(ok => setTimeout(() => ok('timeout'), timeoutMs).unref());
    try {
      const mx = await Promise.race([resolve(d), timeout]);
      if (mx !== 'timeout') cache[d] = mx.length > 0;
    } catch (e) { if (['ENOTFOUND', 'ENODATA', 'ESERVFAIL'].includes(e.code)) cache[d] = false; }
  };
  for (let i = 0; i < list.length; i += 25) await Promise.all(list.slice(i, i + 25).map(check));
  for (const d of domains) if (cache[d] === false) bad.add(d);
  return bad;
}

async function limpiar(file) {
  const src = path.resolve(core.PATHS.root, file);
  const rows = core.csvObjects(fs.readFileSync(src, 'utf8'), ['empresa', 'email']);
  const ledger = new core.Ledger(core.PATHS.historial);
  // DNS only for the companies that survive the other checks, with results kept for next time.
  const contacted = ledger.contacted();
  const domains = new Set(triage(rows, contacted, new Set()).keep.map(r => r.email.split('@')[1]));
  console.log(`Revisando ${rows.length} filas y ${domains.size} dominios...`);
  const cacheFile = path.join(path.dirname(src), 'dominios.json');
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch {}
  const noMx = await domainsWithoutMx(domains, cache);
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  const { keep, drop } = triage(rows, contacted, noMx);
  const cols = Object.keys(rows[0] || { empresa: '', email: '' });
  const dir = path.dirname(src);
  core.writeCsv(path.join(dir, 'limpias.csv'), [cols, ...keep.map(r => cols.map(c => r[c]))]);
  core.writeCsv(path.join(dir, 'descartadas.csv'), [[...cols, 'motivo'], ...drop.map(r => [...cols.map(c => r[c]), r.motivo])]);
  console.log(`✔ Quedan ${keep.length} empresas → ${path.relative(core.PATHS.root, path.join(dir, 'limpias.csv'))}`);
  const counts = drop.reduce((m, d) => (m[d.motivo] = (m[d.motivo] || 0) + 1, m), {});
  for (const [m, n] of Object.entries(counts)) console.log(`  descartadas: ${n} · ${m}`);
  return keep.length;
}

async function main() {
  if (!process.argv[2]) throw Error('Uso: npm run limpiar -- empresas/tu_lista.csv');
  await limpiar(process.argv[2]);
}

module.exports = { triage, companyKey, PUBLIC, limpiar, domainsWithoutMx };
if (require.main === module) main().catch(e => { console.error('✖ ' + e.message); process.exitCode = 1; });
