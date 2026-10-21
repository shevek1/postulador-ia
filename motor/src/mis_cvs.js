// Usage: npm run mis-cvs
// Writes one improved general CV per template to mi_perfil/cvs_mejorados/, ready to use anywhere.
const fs = require('fs');
const path = require('path');
const core = require('./core');
const cv = require('./cv');
const { printPdfs } = require('./browser');
const { photoUri } = require('./generar');

async function main() {
  const perfil = core.readJson(core.PATHS.perfil, 'tu perfil');
  const keys = Object.keys(perfil.plantillas || {});
  if (!keys.length) throw Error('perfil.json no tiene plantillas.');
  const dir = path.join(path.dirname(core.PATHS.perfil), 'cvs_mejorados');
  fs.mkdirSync(dir, { recursive: true });
  const photo = photoUri(perfil);
  const jobs = keys.map(k => {
    const spec = cv.buildSpec(perfil, { n: '0', empresa: '', puesto: '', email: 'cv@example.com', plantilla: k });
    return { html: cv.renderHtml(perfil, spec, photo), file: path.join(dir, `CV_${cv.slug(perfil.nombre)}_${cv.slug(k)}.pdf`) };
  });
  await printPdfs(jobs);
  const long = jobs.filter(j => cv.pdfPages(fs.readFileSync(j.file)) !== 1);
  for (const j of jobs) console.log('✔ ' + j.file);
  if (long.length) { console.log('⚠ Ocupan más de 1 página: ' + long.map(j => path.basename(j.file)).join(', ')); process.exitCode = 2; }
}

main().catch(e => { console.error('✖ ' + e.message); process.exitCode = 1; });
