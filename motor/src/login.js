// Usage: npm run login -- cuenta1 tuemail@gmail.com
// Opens a normal Chrome window with its own profile for this account. Google blocks sign-in from automated
// browsers, so sign-in happens here, in plain Chrome; the automation reuses the saved session later.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const core = require('./core');
const { findChrome, openProfile } = require('./browser');
const { GMAIL } = require('./gmail');

async function verify(acc) {
  const ctx = await openProfile(path.join(core.PATHS.perfiles, acc.alias));
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(GMAIL, { timeout: 180000, waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Redactar', exact: true }).waitFor({ state: 'visible', timeout: 120000 })
      .catch(() => { throw Error('No veo el botón "Redactar". ¿Iniciaste sesión y Gmail está en español? (Configuración → Idioma)'); });
    const re = new RegExp('Cuenta de Google:.*' + acc.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'si');
    if (await page.getByRole('button', { name: re }).count() !== 1)
      throw Error(`La sesión abierta no es ${acc.email}. Repite el login con esa cuenta.`);
  } finally { await ctx.close(); }
}

async function main() {
  const [alias, email] = process.argv.slice(2);
  if (!alias || !email || !core.EMAIL.test(email) || !/^[\w-]+$/.test(alias))
    throw Error('Uso: npm run login -- cuenta1 tuemail@gmail.com');
  const list = fs.existsSync(core.PATHS.cuentas) ? JSON.parse(fs.readFileSync(core.PATHS.cuentas, 'utf8')) : [];
  const acc = { alias, email: email.toLowerCase() };
  const others = list.filter(c => c.alias !== alias);
  if (others.some(c => c.email === acc.email)) throw Error(`${email} ya está configurada con otro nombre.`);
  fs.writeFileSync(core.PATHS.cuentas, JSON.stringify([...others, acc].sort((x, y) => x.alias.localeCompare(y.alias)), null, 2));

  const profile = path.join(core.PATHS.perfiles, alias);
  fs.mkdirSync(profile, { recursive: true });
  console.log(`\nSe abre Chrome para ${email}.\n  1. Inicia sesión en Gmail con esa cuenta.\n` +
    '  2. Si Gmail no está en español: rueda ⚙ → Ver todos los ajustes → Idioma → Español → Guardar.\n' +
    '  3. CIERRA esa ventana de Chrome para continuar.\n');
  await new Promise((resolve, reject) => {
    const p = spawn(findChrome(), [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', GMAIL],
      { stdio: 'ignore' });
    p.on('error', reject); p.on('exit', resolve);
  });
  console.log('Verificando la sesión...');
  await verify(acc);
  console.log(`✔ ${email} lista como "${alias}". Cuentas configuradas: ${others.length + 1}.`);
}

main().catch(e => { console.error('✖ ' + e.message); process.exitCode = 1; });
