// Locates the installed Google Chrome and opens it with Playwright. No browser download needed.
const fs = require('fs');
const path = require('path');

function findChrome() {
  const env = process.env;
  const candidates = {
    win32: [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean)
      .map(d => path.join(d, 'Google', 'Chrome', 'Application', 'chrome.exe')),
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      path.join(env.HOME || '', 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome'],
  }[process.platform] || [];
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) throw Error('No encuentro Google Chrome. Instálalo desde https://www.google.com/chrome y vuelve a intentar.');
  return found;
}

function playwright() {
  try { return require('playwright-core'); }
  catch { throw Error('Faltan dependencias. Dentro de la carpeta motor corre: npm install'); }
}

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Gmail profile per account. Chrome restores old Gmail tabs on start, which piles up and stalls it, so drop sessions first.
async function openProfile(profileDir, { headless = false } = {}) {
  for (const dir of ['Sessions', 'Sessions_Encrypted'])
    fs.rmSync(path.join(profileDir, 'Default', dir), { recursive: true, force: true });
  const { chromium } = playwright();
  return chromium.launchPersistentContext(profileDir, { executablePath: findChrome(), headless,
    viewport: { width: 1280, height: 900 }, locale: 'es-419', timezoneId: timeZone(), timeout: 300000 });
}

async function printPdfs(jobs) {
  const { chromium } = playwright();
  const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
  try {
    const page = await browser.newPage();
    for (const { html, file } of jobs) {
      await page.setContent(html, { waitUntil: 'load' });
      await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
    }
  } finally { await browser.close(); }
}

module.exports = { findChrome, openProfile, printPdfs, timeZone };
