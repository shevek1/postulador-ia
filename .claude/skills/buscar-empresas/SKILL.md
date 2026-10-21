---
name: buscar-empresas
description: Arma la búsqueda de empresas según lo que busca la persona (modalidad, rubro, zona, jornada, nivel, cantidad) y la ejecuta con ChatGPT o con Claude, en bloques de 25, hasta terminar en un CSV dentro de empresas/. Usar cuando la persona quiere buscar empresas, avisos o correos para postularse.
---

# /buscar-empresas

## 1. Qué busca (con opciones para tocar)

Lee `mi_perfil/respuestas.md` y `mi_perfil/perfil.json` si existen y propón esas respuestas como primera opción ("(lo que me dijiste)"). Usa **AskUserQuestion** en 2 llamadas:

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
  - "ChatGPT (recomendado)": no gasta tu uso de Claude.
  - "Claude, acá mismo": más cómodo, pero gasta bastante uso de tu plan.
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

## 3B. Si busca Claude acá mismo

Avisa que gasta uso y que puede frenar cuando quiera. Después, por bloques de 25:
1. Busca con WebSearch siguiendo los niveles del prompt (1: avisos con correo; 2: páginas de empleo con correo; 3: consultoras de RRHH; 4: candidatura espontánea con correo de RRHH publicado).
2. **Solo correos que veas escritos en la página o en el resultado**, con su link. Si dudas, ábrelo con WebFetch y confirma. Nunca deduzcas una dirección.
3. Sin repetir empresas (revisa lo ya guardado y `datos/historial.json`).
4. Agrega el bloque a `empresas/lista_claude.csv` y muestra: "Bloque 3/8 ✔ 75 empresas".
5. Sigue con el siguiente bloque sin preguntar, salvo que la persona pida frenar.

## 4. Cierre

Corre `npm run limpiar -- empresas/<archivo>.csv` desde `motor/` y muestra el resultado (cuántas quedan y por qué se descartaron las otras). Después sigue con `/programar`.
