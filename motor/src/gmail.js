// Drives Gmail's own "Programar envío" (scheduled send). It never sends immediately.
// Requires Gmail in Spanish: the buttons are located by their visible names.
const fs = require('fs');
const path = require('path');
const { sha } = require('./core');

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const GMAIL = 'https://mail.google.com/mail/u/0/';

const normBody = t => t.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
// With a Gmail signature the editor holds the message, then the untouched signature block.
function sameBody(got, expected, sig) {
  const g = normBody(got), e = normBody(expected);
  return sig ? g.startsWith(e) && g.endsWith(normBody(sig)) : g === e;
}
const localDay = ms => new Date(ms).toLocaleDateString('en-CA');
function dateText(when) { const [y, m, d] = when.slice(0, 10).split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; }
// Gmail's receipt says "hoy"/"mañana" for near dates instead of the explicit day.
function receiptMatches(text, when, nowMs) {
  const [, m, d] = when.slice(0, 10).split('-').map(Number);
  const day = when.slice(0, 10);
  const dateOk = text.includes(`${d} ${MONTHS[m - 1]}`) ||
    ((/\bhoy\b/i.test(text) || /para:\s*\d{1,2}:\d{2}\s*$/i.test(text.trim())) && localDay(nowMs) === day) ||
    (/mañana/i.test(text) && localDay(nowMs + 86400000) === day);
  return dateOk && text.includes(when.slice(11, 16).replace(/^0/, ''));
}

function assertPayload(app) {
  if (app.pdf && sha(fs.readFileSync(app.pdf)) !== app.pdf_hash) throw Error('El PDF cambió después de la revisión.');
  if (!app.recipients.length || !app.subject || !app.body) throw Error('Postulación incompleta.');
}

async function waitInbox(page, email) {
  try { await page.getByRole('button', { name: 'Redactar', exact: true }).waitFor({ state: 'visible', timeout: 120000 }); }
  catch {
    throw Error('No veo Gmail listo en español. Revisa: 1) que la sesión esté iniciada (npm run login -- <cuenta>), ' +
      '2) que Gmail esté en español (Configuración → Idioma).');
  }
  await page.locator('#loading').waitFor({ state: 'hidden', timeout: 240000 }).catch(() => {});
  const re = new RegExp('Cuenta de Google:.*' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'si');
  if (await page.getByRole('button', { name: re }).count() !== 1)
    throw Error(`Este perfil no tiene iniciada la cuenta ${email}. Corre otra vez npm run login.`);
}

async function scheduleOne(page, app) {
  const subject = page.locator('input[name="subjectbox"]');
  // A slow Gmail shows "Cargando..." and may swallow the click; opening compose is safe to retry.
  for (let attempt = 1; ; attempt++) {
    await page.getByText('Cargando...', { exact: true }).waitFor({ state: 'hidden', timeout: 180000 }).catch(() => {});
    if (!(await subject.count())) await page.getByRole('button', { name: 'Redactar', exact: true }).click();
    try { await subject.first().waitFor({ state: 'attached', timeout: 150000 }); break; }
    catch (e) { if (attempt >= 3) throw e; }
  }
  await subject.first().waitFor({ state: 'visible' });
  if (await subject.count() !== 1) throw Error('Se abrió más de un correo nuevo. Ciérralos y vuelve a intentar.');
  const compose = page.locator('[role="dialog"]').filter({ has: subject });
  if (await compose.count() !== 1) throw Error('No pude identificar un único correo nuevo.');
  const to = compose.getByRole('combobox', { name: /Destinatarios/ });
  for (const r of app.recipients) { await to.fill(r); await to.press('Enter'); }
  await subject.fill(app.subject);
  const body = compose.getByRole('textbox', { name: 'Cuerpo del mensaje', exact: true });
  // Gmail inserts the account signature asynchronously; keep it and write the message above it.
  const sigBox = compose.locator('[data-smartmail="gmail_signature"]');
  await sigBox.first().waitFor({ state: 'attached', timeout: 4000 }).catch(() => {});
  const hasSig = await sigBox.count() === 1;
  const sigText = hasSig ? await sigBox.first().innerText() : '';
  // Gmail enforces Trusted Types, so the signature is moved as cloned nodes instead of HTML text.
  if (hasSig) await body.evaluate(n => { window.__keptSignature = [...n.childNodes].map(c => c.cloneNode(true)); });
  await body.fill(app.body);
  if (hasSig) await body.evaluate(n => { for (const c of window.__keptSignature) n.appendChild(c); delete window.__keptSignature; });
  if (app.pdf) {
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'),
      compose.getByRole('button', { name: 'Adjuntar archivos', exact: true }).click()]);
    // Uploaded under a clean name: the recruiter never sees the batch number of salida/cvs.
    const name = app.attachName || path.basename(app.pdf);
    await chooser.setFiles({ name, mimeType: 'application/pdf', buffer: fs.readFileSync(app.pdf) });
    await compose.getByRole('link').filter({ hasText: name }).waitFor({ state: 'visible', timeout: 120000 });
    await compose.getByRole('progressbar').waitFor({ state: 'hidden', timeout: 120000 });
  }
  const recipients = await compose.locator('[email]').evaluateAll(ns => [...new Set(ns.map(x => x.getAttribute('email').toLowerCase()))].sort());
  if (JSON.stringify(recipients) !== JSON.stringify(app.recipients)) throw Error('Los destinatarios del borrador no coinciden.');
  if (await subject.inputValue() !== app.subject || !sameBody(await body.innerText(), app.body, sigText))
    throw Error('El asunto o el mensaje no quedaron iguales en Gmail.');
  const attachments = compose.getByRole('button', { name: /Quitar archivo adjunto|Eliminar archivo adjunto/ });
  if (await attachments.count() !== (app.pdf ? 1 : 0)) throw Error(app.pdf ? 'No pude verificar el adjunto.' : 'El correo tiene adjuntos inesperados.');
  await compose.getByRole('button', { name: 'Más opciones de envío', exact: true }).click();
  await page.getByRole('menuitem', { name: /^Programar envío/ }).click();
  const schedule = page.getByRole('dialog', { name: 'Programar envío', exact: true });
  await schedule.getByRole('menuitem', { name: 'Elegir fecha y hora', exact: true }).click();
  const custom = page.getByRole('dialog', { name: 'Elegir fecha y hora', exact: true });
  const date = custom.getByRole('textbox', { name: 'Fecha', exact: true });
  const time = custom.getByRole('textbox', { name: 'Hora', exact: true });
  const hhmm = app.when.slice(11, 16);
  await date.fill(dateText(app.when)); await time.fill(hhmm); await time.press('Tab');
  if (await date.inputValue() !== dateText(app.when) || ![hhmm, hhmm.replace(/^0/, '')].includes(await time.inputValue()))
    throw Error('La fecha u hora no quedó como se pidió.');
  const button = custom.getByRole('button', { name: 'Programar envío', exact: true });
  if (!await button.isEnabled()) throw Error('Gmail no acepta esta fecha y hora.');
  assertPayload(app);
  // The only scheduling click. Never retried automatically: the caller checks Gmail first.
  await button.click();
  const receipt = page.getByText(/^Envío programado para:/);
  await receipt.waitFor({ state: 'visible', timeout: 120000 });
  const text = await receipt.innerText();
  if (!receiptMatches(text, app.when, Date.now())) throw Error(`El comprobante de Gmail no coincide (${text}). Revisa Programados.`);
  await receipt.waitFor({ state: 'hidden', timeout: 120000 }).catch(() => {});
  return text;
}

// Schedules apps in order. Each one is recorded as in_flight before touching Gmail, so a crash never causes a blind resend.
async function scheduleBatch(context, { account, email, apps, ledger, log, errorShot }) {
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(120000);
  try {
    await page.goto(GMAIL + '#scheduled', { timeout: 180000, waitUntil: 'domcontentloaded' });
    await waitInbox(page, email);
    if (await page.locator('[name="subjectbox"]').count()) throw Error('Hay un borrador abierto. Ciérralo y vuelve a intentar.');
    for (const app of apps) {
      assertPayload(app);
      if (Date.parse(app.when) <= Date.now() + 60000) throw Error('La fecha está demasiado cerca o ya pasó.');
      log(`[${account}] Preparando ${app.number} · ${app.company}`);
      ledger.record(app, 'in_flight', app.when, account, 'Preparación iniciada; revisar Gmail antes de repetir.');
      const text = await scheduleOne(page, app);
      ledger.record(app, 'completed', app.when, account, text);
      log(`[${account}] ✔ Programada ${app.number} · ${app.company}`);
    }
  } catch (e) {
    if (errorShot) await page.screenshot({ path: errorShot }).catch(() => {});
    throw e;
  }
}

// Read-only: how many scheduled messages go to this recipient. Returns null when Gmail's answer is ambiguous.
async function countScheduled(context, email, recipient) {
  const page = context.pages()[0] || await context.newPage();
  await page.goto(GMAIL + '#search/' + encodeURIComponent(`in:scheduled to:${recipient}`), { timeout: 180000, waitUntil: 'domcontentloaded' });
  await waitInbox(page, email);
  const main = page.getByRole('main');
  // Gmail renders search results late; poll until it shows rows or its explicit empty message.
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    const rows = await page.locator('tr.zA:visible').count();
    if (rows) return rows;
    if (/No hay mensajes que coincidan|No hay ningún mensaje que coincida|No se encontraron|ningún mensaje/i.test(await main.innerText().catch(() => '')))
      return 0;
  }
  return null;
}

module.exports = { scheduleBatch, countScheduled, receiptMatches, dateText, sameBody, GMAIL };
