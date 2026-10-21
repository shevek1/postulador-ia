// Usage: npm run generar [-- salida/tanda.json]
// Reads mi_perfil/perfil.json + the batch file and writes salida/cvs/*.pdf and salida/envio.csv.
const fs = require('fs');
const path = require('path');
const core = require('./core');
const cv = require('./cv');
const { printPdfs } = require('./browser');

function photoUri(perfil) {
  if (!perfil.foto) return '';
  const file = path.join(path.dirname(core.PATHS.perfil), perfil.foto);
  if (!fs.existsSync(file)) throw Error('No encuentro la foto mi_perfil/' + perfil.foto + ' (o borra "foto" de perfil.json).');
  const type = /\.png$/i.test(file) ? 'png' : 'jpeg';
  return `data:image/${type};base64,` + fs.readFileSync(file).toString('base64');
}

async function main() {
  const perfil = core.readJson(core.PATHS.perfil, 'tu perfil');
  const batchFile = path.resolve(core.PATHS.root, process.argv[2] || 'salida/tanda.json');
  const rows = core.readJson(batchFile, 'la tanda');
  if (!Array.isArray(rows) || !rows.length) throw Error('La tanda está vacía.');
  const specs = rows.map(r => {
    if (!core.EMAIL.test(String(r.email || '').trim())) throw Error(`Fila ${r.n} (${r.empresa}): email inválido "${r.email}".`);
    return cv.buildSpec(perfil, { ...r, email: r.email.trim().toLowerCase() });
  });
  const seen = new Map();
  for (const s of specs) {
    if (seen.has(s.email)) throw Error(`El email ${s.email} se repite (filas ${seen.get(s.email)} y ${s.n}). Un correo por empresa.`);
    seen.set(s.email, s.n);
  }
  fs.mkdirSync(core.PATHS.cvs, { recursive: true });
  const photo = photoUri(perfil);
  const jobs = specs.map(s => ({ html: cv.renderHtml(perfil, s, photo), file: path.join(core.PATHS.cvs, s.file) }));
  console.log(`Generando ${jobs.length} CVs...`);
  await printPdfs(jobs);
  const long = specs.filter(s => cv.pdfPages(fs.readFileSync(path.join(core.PATHS.cvs, s.file))) !== 1);
  core.writeCsv(path.join(core.PATHS.salida, 'envio.csv'),
    [core.COLUMNS, ...specs.map(s => [s.n, s.empresa, s.puesto, s.email, s.file, s.asunto, s.mensaje])]);
  console.log(`✔ ${specs.length} CVs en salida/cvs y la lista de envío en salida/envio.csv`);
  if (long.length) {
    console.log(`⚠ Estos CVs ocupan más de 1 página: ${long.map(s => s.file).join(', ')}`);
    console.log('  Acorta el perfil o quita algún punto en perfil.json y vuelve a generar.');
    process.exitCode = 2;
  }
}

main().catch(e => { console.error('✖ ' + e.message); process.exitCode = 1; });
