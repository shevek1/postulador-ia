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

Sirve para cualquier rubro. **Antes de arrancar**, corre `npm run estimar -- <total pedido>` (desde `motor/`) y avisa en 2 líneas:
- Cuánto tarda, con el número que dio (por ejemplo "faltan 108 empresas, 5 bloques, unos 45 min") y que puede dejarla trabajando: sigue sola bloque por bloque y solo le pregunta al final.
- Que gasta uso de su plan, poco porque busca un modelo más liviano (Haiku); lo ve en la barra de abajo como `5h`. Puede frenar cuando quiera.

**Quién busca.** Cada bloque lo hace el subagente `buscador-empresas` (modelo Haiku): junta webs de empresas, y el comando `extraer` saca los correos y escribe las filas. Tú no buscas ni escribes filas: preparas el pedido y muestras el avance. Así los resultados de búsqueda no llenan esta conversación.

1. **Prepara el pedido una sola vez**, desde `mi_perfil/respuestas.md` y `perfil.json`:
   - Áreas o puestos, y para cada uno de 3 a 5 rubros: tipos de empresa que contratan ese puesto (para "atención al cliente": call centers, e-commerce, bancos, prepagas; para "Paid Media": agencias de marketing digital, de performance, e-commerce).
   - Zonas concretas para buscar, de la más cercana a la más amplia (por ejemplo "Quilmes", "CABA", "Buenos Aires", "Argentina", "Uruguay", "España").
   - País para la columna `pais` de cada zona.
2. **Por cada bloque**, en orden y de a uno (escriben en el mismo archivo), lanza el subagente con Agent (`subagent_type: "buscador-empresas"`) y este pedido:
   ```
   Bloque <n> de <total de bloques>. Objetivo: que empresas/lista_claude.csv llegue a <n × 25> filas.
   Raíz del proyecto: <ruta absoluta del proyecto>
   Áreas y rubros: <puesto 1>: <rubros> · <puesto 2>: <rubros>
   Zonas (de cerca a lejos): <zona> (<país>), ...
   Seniority: <junior, semi senior...> · Modalidad: <modalidad>
   ```
3. Cuando vuelve, corre `npm run estimar -- <total pedido>` y muestra una línea: "Bloque 3/8 ✔ 75 empresas · faltan unos 50 min". Si el estado es "completo", sigue con el siguiente bloque sin preguntar.
4. **Sin preguntar en el medio.** Si vuelve "frenado (pocas empresas nuevas)", amplía tú el pedido con lo que todavía no se usó (la zona siguiente, rubros vecinos, consultoras de RRHH, otra modalidad compatible con lo que pidió), dilo en una línea y relanza ese bloque. Si ya no queda nada razonable para ampliar, termina y ve a la sección 4.
5. Si vuelve "frenado (límite de búsquedas)", la sesión agotó las búsquedas web que permite. No lo relances: di cuántas lleva y que lo retome más tarde con `/buscar-empresas` (sigue desde donde quedó, sin repetir webs). Mientras, puede seguir con la sección 4 con lo que ya hay.
6. La persona puede pedir frenar en cualquier momento: lo ya guardado queda en `empresas/lista_claude.csv`.

En la lista, la columna `nivel` es el nivel de búsqueda (1 a 4, ver `prompts/buscar_empresas.md`), no el seniority: no la cambies.

## 4. Cierre

Desde `motor/`, corre en orden y muestra el resultado de cada uno en una línea:
1. `npm run verificar -- empresas/<archivo>.csv` (también para `lista_claude.csv`): abre cada link y deja solo los correos que aparecen escritos en esa página → `empresas/verificadas.csv` (las otras, con el motivo, en `no_verificadas.csv`).
2. `npm run limpiar -- empresas/verificadas.csv`: saca repetidas, ya contactadas y dominios que no reciben correo → `empresas/limpias.csv`.

Si quedan menos de las pedidas, dilo y ofrece completar con 3B. Después sigue con `/programar`.
