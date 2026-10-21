// Turns mi_perfil/perfil.json + one batch row into a one-page CV (HTML -> PDF) plus subject and message.
// The CV can only show items that exist in perfil.json: nothing is invented here.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

function fill(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in vars)) throw Error('Marcador desconocido ' + m + '. Usa {empresa}, {puesto}, {nombre}, {extra} o {firma}.');
    return vars[k];
  }).split('\n').map(l => l.replace(/ {2,}/g, ' ').trimEnd()).join('\n');
}

function pick(perfil, section, keys) {
  return keys.map(k => {
    if (!perfil[section]?.[k]) throw Error(`"${k}" no existe en ${section} de perfil.json.`);
    return k;
  });
}

function buildSpec(perfil, row) {
  const tpl = perfil.plantillas?.[row.plantilla];
  if (!tpl) throw Error(`La plantilla "${row.plantilla}" no existe en perfil.json (fila ${row.n}).`);
  const get = k => row[k] ?? tpl[k];
  const extra = String(row.extra ?? '').trim();
  const vars = { empresa: row.empresa, puesto: row.puesto, nombre: perfil.nombre, firma: perfil.firma ?? perfil.nombre,
    extra: extra ? extra + ' ' : '' };
  return {
    n: String(row.n), empresa: row.empresa, puesto: row.puesto, email: row.email,
    titular: fill(get('titular'), vars), perfil: fill(get('perfil'), vars),
    competencias: pick(perfil, 'competencias', get('competencias') || []),
    proyectos: pick(perfil, 'proyectos', get('proyectos') || []),
    experiencia: pick(perfil, 'experiencia', get('experiencia') || []),
    asunto: fill(get('asunto'), vars).trim(), mensaje: fill(get('mensaje'), vars).trim(),
    file: `${String(row.n).padStart(3, '0')}_${slug(row.empresa)}_${slug(row.puesto)}.pdf`,
  };
}

const CSS = `
@page { size: A4; margin: 11mm 14mm 10mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 9.3pt; line-height: 1.3; margin: 0; }
header { display: flex; gap: 18px; align-items: center; margin-bottom: 8px; }
header img { width: 26mm; height: 26mm; object-fit: cover; border-radius: 2mm; }
h1 { font-size: 21pt; color: #1f3b5c; margin: 0; letter-spacing: .5px; }
.headline { font-size: 11.5pt; color: #555; margin: 3px 0 6px; }
.contact { margin: 0; }
h2 { font-size: 11pt; color: #1f5a8c; border-bottom: 1px solid #1f5a8c; padding-bottom: 2px; margin: 9px 0 4px; text-transform: uppercase; }
p { margin: 0; }
table { border-collapse: collapse; width: 100%; }
td { padding: 1px 0; vertical-align: top; }
td.k { font-weight: bold; width: 42mm; }
.item { margin-bottom: 4px; page-break-inside: avoid; }
.t { font-weight: bold; }
.s { color: #666; font-style: italic; }
ul { margin: 1px 0 0 14px; padding: 0; }
.edu p { margin-bottom: 2px; }`;

const item = it => `<div class="item"><div class="t">${esc(it.titulo)}</div><div class="s">${esc(it.detalle)}</div>` +
  `<ul>${(it.puntos || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>`;

function renderHtml(perfil, spec, photoUri) {
  const c = perfil.contacto || {};
  const contact = [c.telefono && 'Tel. ' + c.telefono, c.email, c.linkedin, c.portfolio].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ');
  const section = (title, body) => body ? `<h2>${title}</h2>${body}` : '';
  const edu = (perfil.formacion || []).map(f => `<p><b>${esc(f.titulo)}</b> ${esc(f.detalle)}</p>`).join('');
  const skills = spec.competencias.map(k => perfil.competencias[k])
    .map(s => `<tr><td class="k">${esc(s.titulo)}</td><td>${esc(s.detalle)}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>CV ${esc(perfil.nombre)}</title><style>${CSS}</style></head><body>
<header>${photoUri ? `<img src="${photoUri}" alt="">` : ''}
<div><h1>${esc(perfil.nombre.toUpperCase())}</h1><div class="headline">${esc(spec.titular)}</div>
<p class="contact">${contact}</p><p>${esc([c.ubicacion, perfil.idiomas && 'Idiomas: ' + perfil.idiomas].filter(Boolean).join(' | '))}</p></div></header>
${section('Perfil', `<p>${esc(spec.perfil)}</p>`)}
${section('Competencias', skills && `<table>${skills}</table>`)}
${section('Proyectos', spec.proyectos.map(k => item(perfil.proyectos[k])).join(''))}
${section('Experiencia', spec.experiencia.map(k => item(perfil.experiencia[k])).join(''))}
${section('Formación', edu && `<div class="edu">${edu}</div>`)}
</body></html>`;
}

const pdfPages = buf => (buf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;

module.exports = { fill, buildSpec, renderHtml, pdfPages, slug, esc };
