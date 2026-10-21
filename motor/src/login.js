// Usage: npm run login -- cuenta1 tuemail@gmail.com
// Opens a normal Chrome window with its own profile for this account. Google blocks sign-in from automated
// browsers, so sign-in happens here, in plain Chrome; the automation reuses the saved session later.
// Waits until that window is closed (up to 30 minutes), then verifies the session.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const core = require('./core');
const { findChrome, openProfile } = require('./browser');
const { GMAIL } = require('./gmail');

// Google also rejects sign-in ("No puedes acceder... navegador no seguro") when Chrome runs as a child of the
// terminal that launched it, so the OS shell starts it instead, exactly as if the person opened it.
function launchDetached(profile) {
  const args = [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', GMAIL];
  if (process.platform === 'win32') {
    fs.mkdirSync(core.PATHS.datos, { recursive: true });
    const cmd = path.join(core.PATHS.datos, 'abrir_chrome.cmd');
    fs.writeFileSync(cmd, `@start "" "${findChrome()}" ${args.map(a => `"${a}"`).join(' ')}\r\n`);
    spawn('explorer.exe', [cmd], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', ['-na', 'Google Chrome', '--args', ...args], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn(findChrome(), args, { detached: true, stdio: 'ignore' }).unref();
  }
}

// Chrome holds an exclusive "lockfile" (Windows) or a "SingletonLock" symlink (Mac/Linux) while the profile is open.
function profileOpen(profile) {
  if (process.platform !== 'win32') {
    try { fs.lstatSync(path.join(profile, 'SingletonLock')); return true; } catch { return false; }
  }
  try { fs.closeSync(fs.openSync(path.join(profile, 'lockfile'), 'r+')); return false; }
  catch (e) { return e.code === 'EBUSY' || e.code === 'EPERM'; }
}

async function waitFor(check, ms) {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise(r => setTimeout(r, 1000))) if (check()) return true;
  return false;
}

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
  } finally { await ctx.close().catch(() => {}); }
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
  launchDetached(profile);
  if (!await waitFor(() => profileOpen(profile), 60000)) throw Error('Chrome no se abrió. Ábrelo una vez a mano y repite.');
  await waitFor(() => !profileOpen(profile), 30 * 60000);
  if (profileOpen(profile)) throw Error('Pasaron 30 minutos y Chrome sigue abierto. Ciérralo y repite.');
  console.log('Verificando la sesión...');
  await verify(acc);
  console.log(`✔ ${email} lista como "${alias}". Cuentas configuradas: ${others.length + 1}.`);
}

main().catch(e => { console.error('✖ ' + e.message); process.exitCode = 1; });
