// Usage: npm run limpiar -- empresas/lista.csv
// Cleans a company list: invalid emails, repeated companies, already contacted, domains that do not receive mail.
// Writes empresas/limpias.csv and empresas/descartadas.csv (with the reason).
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const core = require('./core');

const PUBLIC = new Set(['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com', 'yahoo.com.ar',
  'hotmail.es', 'outlook.es', 'protonmail.com', 'gmx.com']);
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

async function domainsWithoutMx(domains) {
  const bad = new Set(), list = [...domains];
  const check = async d => {
    try { if (!(await dns.resolveMx(d)).length) bad.add(d); }
    catch (e) { if (['ENOTFOUND', 'ENODATA', 'ESERVFAIL'].includes(e.code)) bad.add(d); }
  };
  for (let i = 0; i < list.length; i += 10) await Promise.all(list.slice(i, i + 10).map(check));
  return bad;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw Error('Uso: npm run limpiar -- empresas/tu_lista.csv');
  const src = path.resolve(core.PATHS.root, file);
  const rows = core.csvObjects(fs.readFileSync(src, 'utf8'), ['empresa', 'email']);
  const ledger = new core.Ledger(core.PATHS.historial);
  const domains = new Set(rows.map(r => String(r.email).trim().toLowerCase().split('@')[1]).filter(Boolean));
  console.log(`Revisando ${rows.length} filas y ${domains.size} dominios...`);
  const { keep, drop } = triage(rows, ledger.contacted(), await domainsWithoutMx(domains));
  const cols = Object.keys(rows[0] || { empresa: '', email: '' });
  const dir = path.dirname(src);
  core.writeCsv(path.join(dir, 'limpias.csv'), [cols, ...keep.map(r => cols.map(c => r[c]))]);
  core.writeCsv(path.join(dir, 'descartadas.csv'), [[...cols, 'motivo'], ...drop.map(r => [...cols.map(c => r[c]), r.motivo])]);
  console.log(`✔ Quedan ${keep.length} empresas → ${path.relative(core.PATHS.root, path.join(dir, 'limpias.csv'))}`);
  const counts = drop.reduce((m, d) => (m[d.motivo] = (m[d.motivo] || 0) + 1, m), {});
  for (const [m, n] of Object.entries(counts)) console.log(`  descartadas: ${n} · ${m}`);
}

module.exports = { triage, companyKey, PUBLIC };
if (require.main === module) main().catch(e => { console.error('✖ ' + e.message); process.exitCode = 1; });
