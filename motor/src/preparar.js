// Usage: npm run preparar [-- empresas/lista_1.csv empresas/lista_claude.csv]
// One step before /programar: verifies every list in empresas/ (or the ones given) and cleans the result.
// Emails extraer already read on their page are not opened again, so a Claude-built list is ready in seconds.
const fs = require('fs');
const path = require('path');
const core = require('./core');
const { verificar, pageReader } = require('./verificar');
const { limpiar } = require('./limpiar');

async function main() {
  let files = process.argv.slice(2);
  if (!files.length) {
    const dir = path.join(core.PATHS.root, 'empresas');
    files = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter(core.isListFile).map(f => `empresas/${f}`);
  }
  if (!files.length) throw Error('No hay listas en empresas/. Primero corre /buscar-empresas.');
  const reader = pageReader();
  try { await verificar(files, reader); } finally { await reader.close(); }
  const left = await limpiar(path.join(path.dirname(path.resolve(core.PATHS.root, files[0])), 'verificadas.csv'));
  console.log(`\nListo para /programar: ${left} empresas en empresas/limpias.csv`);
}

if (require.main === module) main().catch(e => { console.error('✖ ' + e.message); process.exitCode = 1; });
