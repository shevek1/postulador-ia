// Usage: npm run tanda                                         → lists the puestos and the templates in perfil.json
//        npm run tanda -- --plantillas "Paid Media=paid;Desarrollo web=dev" [--desde empresas/limpias.csv]
// Builds salida/tanda.json from the clean list: one row per company with the template for its puesto.
// Claude only decides the puesto → template map; this script writes every row.
const fs = require('fs');
const path = require('path');
const core = require('./core');

const key = s => String(s).trim().toLowerCase();

function parseMap(text) {
  const map = {};
  for (const pair of String(text || '').split(';').map(s => s.trim()).filter(Boolean)) {
    const at = pair.lastIndexOf('=');
    if (at < 1) throw Error(`"${pair}" no tiene la forma Puesto=clave.`);
    map[key(pair.slice(0, at))] = pair.slice(at + 1).trim();
  }
  return map;
}

// With a single template every puesto uses it. Skips rows with no template, already contacted or a repeated email.
function buildTanda(rows, map, plantillas, contacted) {
  const keys = Object.keys(plantillas);
  for (const k of Object.values(map)) if (k !== '-' && !keys.includes(k)) throw Error(`La plantilla "${k}" no existe en perfil.json (hay: ${keys.join(', ')}).`);
  const tanda = [], skipped = [], seen = new Set();
  for (const r of rows) {
    const email = String(r.email || '').trim().toLowerCase();
    const plantilla = keys.length === 1 ? keys[0] : map[key(r.puesto)];
    let motivo = '';
    if (!plantilla || plantilla === '-') motivo = `sin plantilla para "${r.puesto}"`;
    else if (core.alreadyContacted(contacted, [email])) motivo = 'ya contactada antes';
    else if (seen.has(email)) motivo = 'correo repetido';
    if (motivo) { skipped.push({ empresa: r.empresa, motivo }); continue; }
    seen.add(email);
    tanda.push({ n: tanda.length + 1, empresa: r.empresa, puesto: r.puesto, email, plantilla, extra: '' });
  }
  return { tanda, skipped };
}

function main() {
  const argv = process.argv.slice(2), flags = {};
  for (let i = 0; i < argv.length; i++) if (/^--(plantillas|desde)$/.test(argv[i])) flags[argv[i].slice(2)] = argv[++i];
  const src = path.resolve(core.PATHS.root, flags.desde || 'empresas/limpias.csv');
  if (!fs.existsSync(src)) throw Error(`No encuentro ${path.relative(core.PATHS.root, src)}. Primero corre npm run preparar.`);
  const rows = core.csvObjects(fs.readFileSync(src, 'utf8'), ['empresa', 'email']);
  const plantillas = core.readJson(core.PATHS.perfil, 'tu perfil').plantillas || {};
  const keys = Object.keys(plantillas);
  if (!keys.length) throw Error('perfil.json no tiene plantillas. Corre /mejorar-cv.');
  if (!flags.plantillas && keys.length > 1) {
    const counts = rows.reduce((m, r) => (m[r.puesto] = (m[r.puesto] || 0) + 1, m), {});
    console.log(`Plantillas: ${keys.join(', ')}`);
    for (const [p, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${n} · ${p}`);
    console.log('Elige una plantilla por puesto ("-" para dejarlo afuera) y corre:\n' +
      `  npm run tanda -- --plantillas "${Object.keys(counts).map(p => `${p}=${keys[0]}`).join(';')}"`);
    process.exitCode = 2;
    return;
  }
  const ledger = new core.Ledger(core.PATHS.historial);
  const { tanda, skipped } = buildTanda(rows, parseMap(flags.plantillas), plantillas, ledger.contacted());
  if (!tanda.length) throw Error('No quedó ninguna empresa para la tanda.');
  fs.mkdirSync(core.PATHS.salida, { recursive: true });
  fs.writeFileSync(path.join(core.PATHS.salida, 'tanda.json'), JSON.stringify(tanda, null, 2));
  const byTpl = tanda.reduce((m, t) => (m[t.plantilla] = (m[t.plantilla] || 0) + 1, m), {});
  console.log(`✔ ${tanda.length} empresas en salida/tanda.json (${Object.entries(byTpl).map(([k, n]) => `${k}: ${n}`).join(' · ')})`);
  const why = skipped.reduce((m, s) => (m[s.motivo] = (m[s.motivo] || 0) + 1, m), {});
  for (const [m, n] of Object.entries(why)) console.log(`  afuera: ${n} · ${m}`);
}

module.exports = { buildTanda, parseMap };
if (require.main === module) try { main(); } catch (e) { console.error('✖ ' + e.message); process.exitCode = 1; }
