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

Avisa en una línea que gasta uso de su plan (menos que lo normal, porque busca un modelo más liviano) y que puede frenar cuando quiera. Sirve para cualquier rubro.

**Quién busca.** Cada bloque lo hace el subagente `buscador-empresas` (modelo Haiku): junta webs de empresas, y el comando `extraer` saca los correos y escribe las filas. Tú no buscas ni escribes filas: preparas el pedido y muestras el avance. Así los resultados de búsqueda no llenan esta conversación.

1. **Prepara el pedido una sola vez**, desde `mi_perfil/respuestas.md` y `perfil.json`:
   - Áreas o puestos, y para cada uno de 3 a 5 rubros: tipos de empresa que contratan ese puesto (para "atención al cliente": call centers, e-commerce, bancos, prepagas; para "Paid Media": agencias de marketing digital, de performance, e-commerce).
   - Zonas concretas para buscar, de la más cercana a la más amplia (por ejemplo "Quilmes", "CABA", "Buenos Aires", "Argentina", "Uruguay", "España").
   - País para la columna `pais` de cada zona.
2. **Por cada bloque**, en orden y de a uno (escriben en el mismo archivo), lanza el subagente con Agent (`subagent_type: "buscador-empresas"`) y este pedido:
   ```
   Bloque <n> de <total de bloques>. Objetivo: que empresas/lista_claude.csv llegue a <n × 25> filas.
   Áreas y rubros: <puesto 1>: <rubros> · <puesto 2>: <rubros>
   Zonas (de cerca a lejos): <zona> (<país>), ...
   Nivel: <nivel> · Modalidad: <modalidad>
   ```
3. Cuando vuelve, muestra una línea: "Bloque 3/8 ✔ 75 empresas". Si el estado es "completo", sigue con el siguiente bloque sin preguntar.
4. Si vuelve "frenado", di cuántas lleva y propone **una** ampliación concreta (más zonas, otro rubro u otra modalidad) con una sola pregunta. Con la respuesta, actualiza el pedido y relanza ese bloque.
5. La persona puede pedir frenar en cualquier momento: lo ya guardado queda en `empresas/lista_claude.csv`.

## 4. Cierre

Desde `motor/`, corre en orden y muestra el resultado de cada uno en una línea:
1. `npm run verificar -- empresas/<archivo>.csv` (también para `lista_claude.csv`): abre cada link y deja solo los correos que aparecen escritos en esa página → `empresas/verificadas.csv` (las otras, con el motivo, en `no_verificadas.csv`).
2. `npm run limpiar -- empresas/verificadas.csv`: saca repetidas, ya contactadas y dominios que no reciben correo → `empresas/limpias.csv`.

Si quedan menos de las pedidas, dilo y ofrece completar con 3B. Después sigue con `/programar`.
