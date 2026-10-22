// Usage (from the project root): node motor/src/estado.js
// One call for /empezar: checks Node, Chrome and dependencies, then shows which step comes next.
// Needs no dependencies, so it also runs before npm install.
const fs = require('fs');
const path = require('path');
const core = require('./core');
const { findChrome } = require('./browser');

const NOT_CV = /^(\.gitkeep|respuestas\.md|perfil\.json|foto\.(jpe?g|png)|cvs_mejorados)$/i;

// files: names inside mi_perfil/ and empresas/, plus whether cuentas.json has accounts.
function progress({ perfil, cuentas, empresas }) {
  const has = name => perfil.includes(name);
  const steps = [
    { label: 'CV', next: 'cv', done: perfil.some(f => !NOT_CV.test(f) && /\.(pdf|docx?|txt|md)$/i.test(f)) },
    { label: 'Cuestionario', next: '/cuestionario', done: has('respuestas.md') },
    { label: 'CV mejorado', next: '/mejorar-cv', done: has('perfil.json') },
    { label: 'Gmail', next: '/conectar-gmail', done: cuentas },
    { label: 'Empresas', next: '/buscar-empresas', done: empresas.some(core.isListFile) },
    { label: 'Programar', next: '/programar', done: false },
  ];
  const current = steps.findIndex(s => !s.done);
  const line = steps.map((s, i) => `${s.done ? '✔' : i === current ? '▸' : '·'} ${i + 1}. ${s.label}`).join('   ');
  return { steps, next: steps[current].next, line };
}

const list = dir => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);

function main() {
  const major = Number(process.versions.node.split('.')[0]);
  console.log(`${major >= 18 ? '✔' : '✖'} Node ${process.version}${major >= 18 ? '' : ' (hace falta 18 o más)'}`);
  try { findChrome(); console.log('✔ Chrome'); } catch { console.log('✖ Falta Google Chrome: https://www.google.com/chrome'); }
  const deps = fs.existsSync(path.join(core.PATHS.root, 'motor', 'node_modules', 'playwright-core'));
  console.log(deps ? '✔ Dependencias' : '✖ Faltan dependencias: cd motor && npm install');
  let cuentas = false;
  try { cuentas = JSON.parse(fs.readFileSync(core.PATHS.cuentas, 'utf8')).length > 0; } catch {}
  const p = progress({ perfil: list(path.dirname(core.PATHS.perfil)), cuentas, empresas: list(path.join(core.PATHS.root, 'empresas')) });
  console.log(p.line);
  console.log(`Siguiente: ${p.next === 'cv' ? 'cargar tu CV en mi_perfil/' : p.next}`);
}

module.exports = { progress };
if (require.main === module) main();
