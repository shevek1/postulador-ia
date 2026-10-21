// Shared logic: paths, CSV, validation, send history and account assignment. No browser here.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const PATHS = {
  root: ROOT,
  perfil: path.join(ROOT, 'mi_perfil', 'perfil.json'),
  salida: path.join(ROOT, 'salida'),
  cvs: path.join(ROOT, 'salida', 'cvs'),
  datos: path.join(ROOT, 'datos'),
  historial: path.join(ROOT, 'datos', 'historial.json'),
  cuentas: path.join(ROOT, 'cuentas.json'),
  perfiles: path.join(ROOT, '.perfiles'),
  lock: path.join(ROOT, 'datos', 'programar.lock'),
};
const COLUMNS = ['N', 'Empresa', 'Puesto', 'Email destino', 'Archivo CV', 'Asunto', 'Mensaje'];
// Gmail allows 100 scheduled messages per account at the same time.
const MAX_SCHEDULED = 100;

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const digest = v => sha(JSON.stringify(v));

function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let rowBuf = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { rowBuf.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      rowBuf.push(cell); rows.push(rowBuf); rowBuf = []; cell = '';
    } else cell += c;
  }
  if (cell || rowBuf.length) { rowBuf.push(cell); rows.push(rowBuf); }
  return rows.filter(r => r.some(x => x.trim()));
}

function toCsv(rows) {
  const esc = v => { v = String(v ?? ''); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return rows.map(r => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

function csvObjects(text, required) {
  const [header = [], ...rows] = parseCsv(text);
  const cols = header.map(h => h.trim());
  const missing = required.filter(c => !cols.includes(c));
  if (missing.length) throw Error('Al CSV le faltan estas columnas: ' + missing.join(', ') + '. Debe tener: ' + required.join(', '));
  return rows.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i] ?? ''])));
}

function writeCsv(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '﻿' + toCsv(rows), 'utf8');
}

// Gmail trims trailing spaces, so a line ending in a space would fail the "same message" check.
const cleanBody = t => t.replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim();

const EMAIL = /^[A-Za-z0-9.!#$%&'*+=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

function validateRow(row, pdfRoot) {
  for (const f of ['N', 'Email destino', 'Asunto', 'Mensaje'])
    if (!String(row[f] ?? '').trim()) throw Error('Falta ' + f);
  const recipients = [...new Set(row['Email destino'].split(/[,;]/).map(x => x.trim().toLowerCase()).filter(Boolean))].sort();
  if (!recipients.length || recipients.some(x => !EMAIL.test(x)))
    throw Error('Email inválido. Si son varios, sepáralos con punto y coma.');
  let pdf = null, pdfHash = '';
  const requested = String(row['Archivo CV'] ?? '').trim();
  if (requested) {
    const root = path.resolve(pdfRoot);
    pdf = path.resolve(root, requested);
    if (path.isAbsolute(requested) || path.relative(root, pdf).startsWith('..'))
      throw Error('El PDF debe estar dentro de la carpeta de CVs.');
    if (!fs.existsSync(pdf)) throw Error('No existe el PDF ' + requested);
    const content = fs.readFileSync(pdf);
    if (!content.subarray(0, 5).equals(Buffer.from('%PDF-')) || !content.subarray(-4096).includes('%%EOF'))
      throw Error('El archivo ' + requested + ' no es un PDF válido.');
    pdfHash = sha(content);
  }
  const subject = row['Asunto'].trim();
  if (/[\r\n]/.test(subject)) throw Error('El asunto tiene saltos de línea.');
  const body = cleanBody(row['Mensaje']);
  return { number: String(row['N']).trim(), company: row['Empresa'] || '', role: row['Puesto'] || '', recipients,
    subject, body, pdf, pdf_hash: pdfHash, identity: digest([recipients, subject]),
    fingerprint: digest([recipients, subject, body, pdfHash]) };
}

function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tmp';
  const fd = fs.openSync(temp, 'w');
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2), 'utf8'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(temp, file);
}

class Ledger {
  constructor(file) {
    this.file = file;
    this.data = { version: 1, records: {} };
    if (fs.existsSync(file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (this.data.version !== 1 || typeof this.data.records !== 'object') throw Error();
      } catch { throw Error('El historial (' + file + ') está dañado. No se programa nada; no lo borres.'); }
    }
  }
  get records() { return this.data.records; }
  classify(app) {
    const old = this.records[app.identity];
    if (!old) return 'LISTO';
    if (old.fingerprint !== app.fingerprint) return 'CONFLICTO: ya se programó con otro contenido';
    if (old.state === 'completed') return 'YA PROGRAMADO';
    return 'REVISAR EN GMAIL: resultado incierto';
  }
  record(app, state, when, account, detail = '') {
    this.records[app.identity] = { fingerprint: app.fingerprint, state, scheduled_at: when, account,
      company: app.company, subject: app.subject, recipients: app.recipients, pdf_hash: app.pdf_hash,
      detail, updated_at: new Date().toISOString() };
    this.save();
  }
  release(identity) { delete this.records[identity]; this.save(); }
  pendingFor(account, nowMs) {
    return Object.values(this.records).filter(r => r.account === account && r.state !== 'failed' &&
      Date.parse(r.scheduled_at) > nowMs).length;
  }
  contacted() {
    const out = new Set();
    for (const r of Object.values(this.records)) for (const e of r.recipients) { out.add(e); out.add(e.split('@')[1]); }
    return out;
  }
  save() { atomicWrite(this.file, this.data); }
}

function preview(rows, pdfRoot, ledger) {
  const seen = new Set();
  return rows.map(row => {
    try {
      const app = validateRow(row, pdfRoot);
      let status = ledger.classify(app);
      if (seen.has(app.identity)) status = 'DUPLICADO EN EL CSV';
      seen.add(app.identity);
      return { row, app, status };
    } catch (e) { return { row, app: null, status: 'ERROR: ' + e.message }; }
  });
}

function assign(apps, accounts, ledger, nowMs, cap = MAX_SCHEDULED) {
  // Round-robin so each account sends a similar amount, never above its free slots.
  const byAccount = new Map(accounts.map(a => [a, []]));
  const free = new Map(accounts.map(a => [a, Math.max(0, cap - ledger.pendingFor(a, nowMs))]));
  let i = 0;
  while (i < apps.length) {
    const open = accounts.filter(a => free.get(a) > 0);
    if (!open.length) break;
    for (const a of open) {
      if (i >= apps.length) break;
      byAccount.get(a).push(apps[i++]); free.set(a, free.get(a) - 1);
    }
  }
  return { byAccount, leftover: apps.slice(i) };
}

// Returns a naive local timestamp "YYYY-MM-DDTHH:MM"; JS parses it in the computer's time zone.
function parseWhen(fecha, hora, nowMs = Date.now()) {
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(fecha.trim());
  let y, mo, d;
  if (m) [, d, mo, y] = m.map(Number);
  else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(fecha.trim()))) [, y, mo, d] = m.map(Number);
  else throw Error('Fecha inválida. Usa DD/MM/AAAA.');
  const t = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!t) throw Error('Hora inválida. Usa HH:MM, por ejemplo 09:00.');
  const p = n => String(n).padStart(2, '0');
  const when = `${y}-${p(mo)}-${p(d)}T${p(t[1])}:${t[2]}`;
  const dt = new Date(when);
  if (isNaN(dt) || dt.getDate() !== d || dt.getMonth() + 1 !== mo || Number(t[1]) > 23)
    throw Error('Fecha u hora inválida: ' + fecha + ' ' + hora);
  if (dt.getTime() <= nowMs + 10 * 60000) throw Error('Elige una fecha y hora futura (al menos 10 minutos desde ahora).');
  return when;
}

function readJson(file, what) {
  if (!fs.existsSync(file)) throw Error('No encuentro ' + what + ' (' + path.relative(ROOT, file) + ').');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadAccounts() {
  const list = fs.existsSync(PATHS.cuentas) ? JSON.parse(fs.readFileSync(PATHS.cuentas, 'utf8')) : [];
  if (!list.length) throw Error('No hay cuentas configuradas. Corre: npm run login -- cuenta1 tuemail@gmail.com');
  return list;
}

const beep = (n = 3) => process.stdout.write('\x07'.repeat(n));

// The recruiter sees this name, not the numbered file kept in salida/cvs.
const words = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
const attachmentName = (nombre, puesto) => ['CV', words(nombre), words(puesto)].filter(Boolean).join('_') + '.pdf';

// 24-hour HH:MM in local time; toLocaleTimeString drops AM/PM on some Windows setups.
const hhmm = d => { const t = new Date(d); return [t.getHours(), t.getMinutes()].map(n => String(n).padStart(2, '0')).join(':'); };

// One programar per project: two runs on the same account could schedule the same application twice.
const isAlive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
function running(file, alive = isAlive) {
  let info;
  try { info = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  return info && alive(info.pid) ? info : null;
}
function lock(file, pid = process.pid, alive = isAlive) {
  const other = running(file, alive);
  if (other && other.pid !== pid)
    throw Error(`Ya hay una programación en curso (proceso ${other.pid}, desde ${hhmm(other.since)}). ` +
      'Espera a que termine o ciérrala antes de repetir.');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ pid, since: new Date().toISOString() }));
  return () => { try { if (JSON.parse(fs.readFileSync(file, 'utf8')).pid === pid) fs.unlinkSync(file); } catch {} };
}

module.exports = { PATHS, COLUMNS, MAX_SCHEDULED, sha, parseCsv, toCsv, csvObjects, writeCsv, cleanBody, validateRow,
  Ledger, preview, assign, parseWhen, readJson, loadAccounts, atomicWrite, beep, EMAIL, attachmentName, lock, running, hhmm };
