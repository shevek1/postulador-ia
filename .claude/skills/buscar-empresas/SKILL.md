---
name: buscar-empresas
description: Arma la búsqueda de empresas según lo que busca la persona (modalidad, rubro, zona, jornada, nivel, cantidad) y la ejecuta con ChatGPT o con Claude, en bloques de 25, hasta terminar en un CSV dentro de empresas/. Usar cuando la persona quiere buscar empresas, avisos o correos para postularse.
---

# /buscar-empresas

## 1. Qué busca

**No repitas preguntas ya respondidas.** Lee `mi_perfil/respuestas.md` y `mi_perfil/perfil.json`. Todo lo que ya figura ahí (modalidad, áreas, zona, jornada, nivel, idioma) se usa directo.

Si ya están, muestra un resumen de 1 línea ("Busco: remoto o híbrido · Paid Media, Marketing técnico, Desarrollo web · Argentina y Latinoamérica · part time · junior") y haz **una sola** llamada a AskUserQuestion con lo que falta:
- **Cuántas empresas**: 100 · 200 · 300 · Más de 300.
- **¿Dónde buscamos?** (opciones de abajo).
- **¿Busco con esto?**: "Sí, así está bien" · "Quiero cambiar algo". Solo si elige cambiar, pregunta qué y pide únicamente eso.

Si es una tanda nueva y ya existe `empresas/PROMPT_BUSQUEDA.md`, ofrece reutilizarlo tal cual.

Solo si falta información (no hay cuestionario), usa **AskUserQuestion** en 2 llamadas, preguntando únicamente lo que falte:

Llamada 1:
- **Modalidad** (multiSelect): Remoto · Híbrido · Presencial.
- **Rubro o áreas** (multiSelect): opciones a partir de su perfil (por ejemplo Atención al cliente · Administración · Ventas · Desarrollo web).
- **Zona**: Mi ciudad · Mi país · Latinoamérica · España.
- **Cuántas empresas**: 100 · 200 · 300 · Más de 300.

Llamada 2:
- **Jornada** (multiSelect): Full time · Part time · Freelance.
- **Nivel**: Sin experiencia · Junior · Semi senior · Senior.
- **Idioma de los avisos**: Solo español · Español e inglés.
- **¿Dónde buscamos?**:
  - "Claude, acá mismo (recomendado)": busca en la web de cada empresa y solo guarda correos que ve publicados. Gasta uso de tu plan.
  - "ChatGPT": no gasta tu uso de Claude, pero suele inventar correos. Igual los verifico todos antes de usarlos.
  - "claude.ai en el navegador": igual que ChatGPT, con tu cuenta de Claude.

Si eligió una ciudad, pregunta cuál (abierta).

## 2. Armar el prompt

Toma el bloque de `prompts/buscar_empresas.md`, reemplaza todo lo que está entre [corchetes] con sus respuestas y agrega al final: "Objetivo total: <cantidad> empresas (<cantidad/25> bloques)." Guárdalo en `empresas/PROMPT_BUSQUEDA.md`.

## 3A. Si busca en ChatGPT o claude.ai

1. Muestra el prompt completo en un bloque de código para copiar.
2. Instrucciones en 4 líneas:
   1. Abre chatgpt.com (o claude.ai), activa la búsqueda web y pega el prompt.
   2. Cuando termine cada bloque de 25, escribe **siguiente**.
   3. Cuando llegues a la cantidad, escribe **final**: te da todo en un CSV.
   4. Copia el CSV y pégalo acá (o guárdalo en `empresas/lista_1.csv`).
3. Cuando lo pegue, guárdalo en `empresas/lista_<n>.csv` (UTF-8, encabezado `empresa,puesto,email,link,pais,modalidad,nivel`; corrige separadores si vino con `|` o `;`). Muestra cuántas filas tiene.
4. Verifícalo enseguida con `npm run verificar -- empresas/lista_<n>.csv` (ver sección 4). Si faltan muchas, ofrece completar con la búsqueda de 3B.

## 3B. Si busca Claude acá mismo

Avisa en una línea que gasta uso y que puede frenar cuando quiera. Sirve para cualquier rubro: las búsquedas se arman con sus áreas, puestos y zonas.

**Meta: 25 correos verificados por bloque. No cortes un bloque con menos** salvo que la persona pida frenar o se cumpla el tope del paso 6.

**Dónde están los correos.** Los portales y agregadores (Google Empleos, LinkedIn, Indeed, Computrabajo, Bumeran, ZonaJobs, Glassdoor, BeBee, Jooble, WhatJobs, JobLeads) casi nunca muestran el correo: no los uses como fuente. Los correos están en la web propia de cada empresa ("Trabajá con nosotros", "Empleo", "Contacto") y en algunos avisos que piden el CV por mail.

Por cada bloque:

1. **Junta sitios de empresas** con WebSearch. Rota estas búsquedas con cada área y cada zona (ciudad, provincia, país) del perfil, y no repitas una búsqueda ya hecha:
   - `"trabaja con nosotros" <rubro> <zona>` · `"trabajá con nosotros" <rubro> <zona>` · `"envianos tu CV" <rubro> <zona>`
   - `"rrhh@" <rubro> <zona>` · `"cv@" <rubro> <zona>` · `"empleo@" <rubro> <zona>` · `"talento@" <rubro>`
   - `"enviar CV a" <puesto> <zona>` · `"enviar CV al mail" <puesto>` (avisos con correo)
   - `empresas de <rubro> en <zona>` · `directorio de empresas de <rubro> <zona>` · `mejores <rubro> en <zona>` (listados, cámaras, rankings, directorios como Sortlist o Clutch)
   - `consultora de recursos humanos <zona> "enviar CV"` (nivel 3)
   El rubro es el tipo de empresa que contrata ese puesto: para "atención al cliente" sirven call centers, e-commerce, bancos, prepagas; para "Paid Media", agencias de marketing digital y performance; para "administración", estudios contables, logísticas, pymes. Piensa varios rubros por área.
2. Guarda en `empresas/sitios.txt` (una URL por línea) solo webs propias de empresas o avisos individuales, sin portales ni redes sociales, y sin las que ya estén en `empresas/sitios_vistos.txt`, en las listas ya guardadas o en `datos/historial.json`. Junta al menos 40 por tanda.
3. Corre desde `motor/`: `npm run extraer -- empresas/sitios.txt`. Abre cada sitio y sus páginas de contacto y empleo, y lista los correos publicados (primero los de RRHH o empleo). **No uses WebFetch para esto**: este comando gasta mucho menos uso. Después agrega esas URLs a `empresas/sitios_vistos.txt`.
4. Por empresa elige **un** correo, en este orden: RRHH, empleo, talento o CV; si no hay, el de contacto general (nivel 4). Nunca escribas un correo que no salió en el resultado del comando. El link es la página donde apareció.
5. Agrega las filas a `empresas/lista_claude.csv` y muestra una línea: "Bloque 3/8 · 18 de 25". Si no llegaste a 25, repite desde el paso 1 con búsquedas nuevas: otras zonas del perfil, otros rubros que contraten esas áreas, consultoras.
6. Tope: si después de 6 tandas seguidas el bloque no avanza, frena y dile cuántas llevas y qué propones ampliar (más zonas, más áreas o modalidad). Una sola pregunta.
7. Al completar el bloque, sigue con el siguiente sin preguntar, salvo que la persona pida frenar.

## 4. Cierre

Desde `motor/`, corre en orden y muestra el resultado de cada uno en una línea:
1. `npm run verificar -- empresas/<archivo>.csv`: abre cada link y deja solo los correos que aparecen escritos en esa página → `empresas/verificadas.csv` (las otras, con el motivo, en `no_verificadas.csv`).
2. `npm run limpiar -- empresas/verificadas.csv`: saca repetidas, ya contactadas y dominios que no reciben correo → `empresas/limpias.csv`.

Si quedan menos de las pedidas, dilo y ofrece completar con 3B. Después sigue con `/programar`.
