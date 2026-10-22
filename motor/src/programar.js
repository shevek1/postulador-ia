// Usage: npm run programar -- --fecha 22/10/2026 --hora 09:00 [--cuentas cuenta1,cuenta2] [--paralelo] [--csv ruta] [--pdfs ruta]
//        npm run revisar   -- --fecha 22/10/2026 --hora 09:00   (shows the plan, touches nothing)
// Splits the ready rows across accounts (max 100 scheduled per account) and schedules them in Gmail.
const path = require('path');
const fs = require('fs');
const core = require('./core');
const { openProfile } = require('./browser');
const { scheduleBatch, countScheduled } = require('./gmail');

const MAX_RUNS = 20, MAX_IDLE = 3;
const log = m => console.log(`${core.hhmm(new Date())} ${m}`);
let touchedGmail = false;

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--revisar') out.revisar = true;
    else if (argv[i] === '--en-curso') out.enCurso = true;
    else if (argv[i] === '--paralelo') out.paralelo = true;
    else if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
  }
  return out;
}

// After a stop, the single in-flight application is looked up in Gmail: found -> completed, absent -> retry later.
async function resolveInFlight(acc, ledger) {
  const stuck = Object.entries(ledger.records).filter(([, r]) => r.state === 'in_flight' && r.account === acc.alias);
  if (!stuck.length) return;
  if (stuck.length > 1) throw Error(`Hay ${stuck.length} postulaciones con resultado incierto en ${acc.alias}. Revisa Programados en Gmail.`);
  const [id, rec] = stuck[0];
  const ctx = await openProfile(path.join(core.PATHS.perfiles, acc.alias));
  let count;
  try { count = await countScheduled(ctx, acc.email, rec.recipients[0]); } finally { await ctx.close(); }
  if (count === 1) {
    Object.assign(rec, { state: 'completed', detail: 'Verificada en Programados tras un corte.', updated_at: new Date().toISOString() });
    ledger.save(); log(`[${acc.alias}] Verificada en Gmail: ${rec.company}`);
  } else if (count === 0) {
    ledger.release(id); log(`[${acc.alias}] No había quedado programada, se reintenta: ${rec.company}`);
  } else throw Error(`No pude confirmar si ${rec.company} quedó programada (${count}). Revisa Programados en Gmail de ${acc.email}.`);
}

async function runAccount(acc, apps, ledger) {
  let idle = 0;
  for (let run = 1; run <= MAX_RUNS; run++) {
    await resolveInFlight(acc, ledger);
    const todo = apps.filter(a => ledger.classify(a) === 'LISTO');
    if (!todo.length) return;
    const before = todo.length;
    const ctx = await openProfile(path.join(core.PATHS.perfiles, acc.alias));
    try {
      await scheduleBatch(ctx, { account: acc.alias, email: acc.email, apps: todo, ledger, log,
        errorShot: path.join(core.PATHS.datos, `error_${acc.alias}.png`) });
    } catch (e) {
      log(`[${acc.alias}] Se cortó: ${e.message}`);
      // Login or language problems will not fix themselves by retrying.
      if (/npm run login|español/.test(e.message)) throw e;
    } finally { await ctx.close().catch(() => {}); }
    await resolveInFlight(acc, ledger);
    const left = apps.filter(a => ledger.classify(a) === 'LISTO').length;
    idle = left < before ? 0 : idle + 1;
    if (idle >= MAX_IDLE) throw Error(`[${acc.alias}] Sin avances en ${MAX_IDLE} intentos seguidos. Revisa datos/error_${acc.alias}.png`);
  }
}

async function main() {
  const a = args(process.argv.slice(2));
  if (a.enCurso) {
    const r = core.running(core.PATHS.lock);
    return console.log(r ? `Sí: hay una programación en curso (proceso ${r.pid}, desde ${core.hhmm(r.since)}).`
      : 'No hay ninguna programación en curso.');
  }
  if (!a.fecha || !a.hora) throw Error('Falta la fecha y hora. Ejemplo: npm run programar -- --fecha 22/10/2026 --hora 09:00');
  const when = core.parseWhen(a.fecha, a.hora);
  const csvFile = path.resolve(core.PATHS.root, a.csv || 'salida/envio.csv');
  const pdfDir = path.resolve(core.PATHS.root, a.pdfs || 'salida/cvs');
  if (!fs.existsSync(csvFile)) throw Error('No encuentro ' + csvFile + '. Primero corre npm run generar.');
  const all = core.loadAccounts();
  const accounts = a.cuentas ? a.cuentas.split(',').map(x => {
    const acc = all.find(c => c.alias === x.trim());
    if (!acc) throw Error(`La cuenta "${x}" no está en cuentas.json.`);
    return acc;
  }) : all;
  const nombre = core.readJson(core.PATHS.perfil, 'mi_perfil/perfil.json').nombre;
  const ledger = new core.Ledger(core.PATHS.historial);
  if (!a.revisar) {
    const unlock = core.lock(core.PATHS.lock);
    process.on('exit', unlock);
    touchedGmail = true;
    for (const acc of accounts) await resolveInFlight(acc, ledger); }
  const rows = core.csvObjects(fs.readFileSync(csvFile, 'utf8'), core.COLUMNS);
  const items = core.preview(rows, pdfDir, ledger);
  const by = s => items.filter(i => i.status.startsWith(s));
  const problems = items.filter(i => !['LISTO', 'YA PROGRAMADO', 'YA CONTACTADA'].includes(i.status));
  for (const p of problems) console.log(`  ✖ fila ${p.row.N} ${p.row.Empresa}: ${p.status}`);
  const skipped = by('YA CONTACTADA');
  if (skipped.length) console.log(`  Se saltea(n) ${skipped.length} ya contactada(s) antes: ${skipped.map(i => i.row.Empresa).join(', ')}`);
  const ready = by('LISTO').map(i => ({ ...i.app, when, attachName: core.attachmentName(nombre, i.row.Puesto) }));
  const { byAccount, leftover } = core.assign(ready, accounts.map(c => c.alias), ledger, Date.now());
  console.log(`\nFilas: ${items.length} · listas: ${ready.length} · ya programadas: ${by('YA PROGRAMADO').length} · ` +
    `ya contactadas: ${skipped.length} · con problemas: ${problems.length}`);
  console.log(`Envío: ${when.replace('T', ' ')} (hora de esta computadora)`);
  for (const acc of accounts) {
    const n = byAccount.get(acc.alias).length;
    console.log(`  ${acc.alias} (${acc.email}): ${n} nuevas · ya tenía ${ledger.pendingFor(acc.alias, Date.now())} pendientes`);
  }
  if (leftover.length) console.log(`  Sin lugar hoy: ${leftover.length}. Gmail permite ${core.MAX_SCHEDULED} programados por cuenta; ` +
    'cuando salgan, vuelve a correr el mismo comando con otra fecha y sigue desde donde quedó.');
  if (problems.length) throw Error('Corrige las filas con problemas antes de programar (o quítalas del CSV).');
  if (a.revisar) return console.log('\nModo revisar: no se programó nada.');
  // --paralelo opens one Chrome per account at the same time: faster, but needs more memory.
  const busy = accounts.filter(acc => byAccount.get(acc.alias).length);
  await core.eachAccount(busy, acc => runAccount(acc, byAccount.get(acc.alias), ledger), a.paralelo && busy.length > 1);
  const done = ready.filter(x => ledger.classify(x) === 'YA PROGRAMADO').length;
  console.log(`\n✔ Listo: ${done} postulaciones programadas. Revísalas en Gmail → Programados.`);
  core.beep();
}

main().catch(e => {
  console.error('\n✖ ' + e.message + (touchedGmail ? '\nSe detuvo. Revisa Gmail → Programados antes de repetir; lo ya programado no se duplica.' : ''));
  core.beep(1); process.exitCode = 1;
});
