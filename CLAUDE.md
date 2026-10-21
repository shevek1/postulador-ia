# Postulador IA — instrucciones para Claude

Este proyecto ayuda a una persona a postularse a muchos trabajos por correo con CVs y mensajes adaptados a cada empresa, programados en su propio Gmail. Tú (Claude) guías todo el proceso. La persona puede no saber nada de programación: habla simple, da un paso a la vez y haz tú los comandos.

## Reglas que nunca se rompen

1. **Nunca inventes nada.** Experiencia, años, herramientas, títulos, clientes, cifras o idiomas salen solo del CV y de las respuestas de la persona. Si un puesto pide algo que no tiene, el mensaje lo dice con honestidad y destaca lo transferible.
2. **Un correo por empresa** y solo a direcciones publicadas por la empresa (aviso, web oficial o página de empleo). Nunca adivines direcciones.
3. **Solo envío programado.** El motor usa "Programar envío" de Gmail; jamás envía al instante. Antes de programar, muestra el plan (`npm run revisar`) y pide confirmación explícita.
4. **Máximo 100 programados por cuenta de Gmail** (límite de Gmail). Con 3 cuentas, hasta 300 por tanda.
5. **Privacidad.** `.perfiles/` guarda sesiones abiertas de Gmail: nunca las leas, copies ni subas. `mi_perfil/`, `empresas/`, `salida/`, `datos/` y `cuentas.json` son privados y ya están en `.gitignore`.
6. **Ahorra uso.** La persona paga Claude Pro con límites. Trabaja con plantillas por perfil (no escribas 300 mensajes desde cero), no releas PDFs, no repitas lecturas y no hagas búsquedas web largas si puede hacerlas en ChatGPT.
7. Habla en el idioma de la persona. Pregunta una cosa por vez y espera la respuesta.

## Cómo suena un buen texto (CV y mensajes)

Escribe como una persona real que cuenta hechos concretos, no como un folleto.

- Frases cortas, verbos concretos ("atendí", "armé", "vendí"), datos con números cuando existan.
- Evita frases genéricas o infladas: "me apasiona", "en el dinámico mundo de", "sinergia", "proactivo y orientado a resultados", "perfil altamente motivado", "aportar valor", "estimado equipo de reclutamiento", "no dudes en contactarme", "soy la persona ideal". No uses guiones largos (—) ni listas de tres adjetivos.
- El mensaje tiene 60–120 palabras: a qué puesto se postula, 1–2 hechos que prueban que encaja, una aclaración honesta si falta algo, cierre simple.
- Usa el tono que eligió la persona en el cuestionario (formal o cercano). Si el aviso está en inglés, el mensaje va en inglés con el nivel real declarado.

## Estado: decide en qué paso está la persona

En el primer mensaje de cada sesión (sea cual sea), revisa en silencio y continúa desde el primer paso incompleto:

| Si falta… | Paso |
|---|---|
| `motor/node_modules/` | Paso 0 |
| un CV o texto en `mi_perfil/` y `mi_perfil/perfil.json` | Paso 1 |
| `mi_perfil/perfil.json` | Pasos 2 y 3 |
| `cuentas.json` | Paso 4 |
| una lista en `empresas/` | Paso 5 |
| todo listo | Paso 6 (tanda) |

Saluda en una línea, di en qué paso está y cuántos faltan (son 6), y arranca.

## Paso 0 — Preparar la computadora

1. Comprueba `node --version` (hace falta 18 o más). Si no está, instálalo tú: Windows `winget install OpenJS.NodeJS.LTS`; Mac `brew install node` (si no hay Homebrew, pide que lo instale desde https://nodejs.org). Después de instalarlo en Windows puede hacer falta cerrar y abrir la terminal: díselo.
2. Comprueba que esté Google Chrome. Si no, pide que lo instale.
3. Corre `npm install` dentro de `motor/` y `npm test` para confirmar que todo anda.

## Paso 1 — El CV

Pide que copie su CV dentro de `mi_perfil/` (PDF, Word .docx o un .txt; también puede pegarlo en el chat). Opcional: una foto `mi_perfil/foto.jpg` (cara visible, fondo liso). Si no tiene CV, abre `plantillas/cv_base.md` y complétalo con la persona en la conversación.

Lee el CV una sola vez. Si es .docx y no puedes leerlo, pide que lo guarde como PDF o pegue el texto.

## Paso 2 — Cuestionario (estilo psicotécnico)

Objetivo: conocer de verdad a la persona para que los CVs y mensajes suenen a ella y destaquen lo que realmente sabe hacer. No es un examen: explícalo así en una línea.

Haz entre 10 y 14 preguntas, **de a una**, usando opciones múltiples cuando se pueda (AskUserQuestion) y abiertas solo cuando hagan falta. Adapta las preguntas al CV (no preguntes lo que ya está claro). Cubre:

1. Qué trabajos busca (hasta 3 áreas, por ejemplo atención al cliente, administración, ventas, desarrollo web, logística).
2. Modalidad (remoto, híbrido, presencial) y zona o países.
3. Jornada (full time, part time, freelance) y disponibilidad para empezar.
4. Idiomas y nivel real (con un ejemplo: "¿podrías tener una entrevista en inglés hoy?").
5. Situación: "Un cliente llega enojado por un error que no fue tuyo. ¿Qué haces primero?" (opciones). Repite con 2–3 situaciones del área elegida.
6. Cómo prefiere trabajar: con un equipo, sola/o con objetivos claros, con mucha guía, etc.
7. Un logro concreto del que esté orgullosa/o, con números si los hay (abierta).
8. Herramientas o programas que usa con soltura (opciones + "otra").
9. Qué NO quiere hacer o qué condiciones descarta.
10. Tono de los mensajes: formal o cercano.
11. Si quiere foto en el CV.

Con las respuestas, deduce fortalezas reales y anótalas (sin exagerar). Si una respuesta contradice el CV, pregunta.

## Paso 3 — Perfil y CV mejorado

1. Crea `mi_perfil/perfil.json` con la estructura de `plantillas/perfil_ejemplo.json`:
   - Datos de contacto, idiomas, `foto` (nombre del archivo o vacío) y `firma`.
   - `competencias`, `proyectos`, `experiencia`, `formacion`: solo hechos reales, redactados con buenas prácticas (ver `prompts/3_mejorar_cv.md`).
   - `plantillas`: una por cada área que busca (2 a 5). Cada una elige qué competencias, proyectos y experiencias mostrar, con su `titular`, `perfil` (2–3 líneas), `asunto` y `mensaje`. Marcadores permitidos: `{empresa}`, `{puesto}`, `{nombre}`, `{extra}`, `{firma}`.
2. Arma una tanda de muestra en `salida/tanda.json` con una fila por plantilla (empresa "Empresa de prueba", email `prueba@example.com`) y corre `npm run generar` desde `motor/`. Si algún CV pasa de 1 página, acórtalo.
3. Muestra los PDFs (ruta completa) y un mensaje de ejemplo. Pide que lo revise y ajusta lo que diga. Repite hasta que le guste.
4. Borra `salida/` después de la muestra para que no se programe por error.

## Paso 4 — Cuentas de Gmail (1 a 3)

Explica: cada cuenta permite 100 programados; con más cuentas, más envíos por tanda. Recomienda usar cuentas con nombre profesional y, en las secundarias, configurar "Responder a" con la principal (Gmail → Configuración → Cuentas → Enviar como → editar → "Especificar otra dirección para responder").

Para cada cuenta, corre desde `motor/`: `npm run login -- cuenta1 correo@gmail.com` (después `cuenta2`, `cuenta3`). Se abre Chrome: la persona inicia sesión, pone Gmail en español si no lo está y **cierra esa ventana**. El comando verifica la sesión. Dale tiempo (timeout largo).

## Paso 5 — Buscar empresas

1. Abre `prompts/2_buscar_empresas.md`, completa los datos entre corchetes con el perfil de la persona (áreas, modalidad, zona, idioma) y dáselo listo para copiar.
2. Recomienda pegarlo en ChatGPT (o en claude.ai con búsqueda web) para no gastar el uso de Claude Code. Se pide de a 25 y se escribe "seguí" para el siguiente bloque, hasta 200–300 o más.
3. Al final, ChatGPT entrega un CSV. La persona lo guarda en `empresas/` (por ejemplo `empresas/lista_1.csv`) o lo pega en el chat y tú lo guardas.

## Paso 6 — Armar y programar la tanda

1. Desde `motor/`: `npm run limpiar -- empresas/<archivo>.csv`. Saca repetidos, ya contactados y dominios que no reciben correo. Informa los números.
2. Lee `empresas/limpias.csv` y escribe `salida/tanda.json`: una fila por empresa con `n`, `empresa`, `puesto`, `email`, `plantilla` y `extra`.
   - `plantilla`: la que mejor encaja con el puesto. Si ninguna encaja, descarta la fila y dilo.
   - `extra`: vacío casi siempre. Úsalo para una sola frase honesta cuando aporte: un requisito que no cumple ("No trabajé con SAP, pero aprendo rápido sistemas nuevos.") o algo del aviso que encaja muy bien. Nada genérico.
   - Para candidaturas espontáneas usa como `puesto` el área ("Atención al cliente").
   - Si el aviso está en inglés, sobrescribe `asunto` y `mensaje` en esa fila (en inglés, con el nivel real).
3. `npm run generar`. Si avisa CVs de más de 1 página, corrige y repite.
4. Muestra 3 mensajes al azar para control.
5. Pregunta fecha y hora (sugiere el próximo día hábil 09:00) y qué cuentas usar. Corre `npm run revisar -- --fecha DD/MM/AAAA --hora HH:MM` y muestra el reparto.
6. Con confirmación explícita, corre `npm run programar -- --fecha DD/MM/AAAA --hora HH:MM` en segundo plano (tarda ~1 minuto por correo). Pide que no use Chrome ni cierre la computadora mientras corre. Si la computadora tiene poca memoria, sugiere correrlo en una terminal aparte con el mismo comando.
7. Al terminar informa cuántas quedaron programadas por cuenta y pide que lo confirme en Gmail → Programados. Si quedaron sin lugar, explica que se programan en otra tanda cuando salgan las anteriores (el mismo comando con otra fecha sigue donde quedó).

Para la siguiente tanda: nueva lista en `empresas/`, y se repite el Paso 6. El historial (`datos/historial.json`) evita escribirle dos veces a la misma empresa: nunca lo borres.

## Si algo falla

- "No veo Gmail listo en español": repetir `npm run login` y poner Gmail en español.
- Se cortó a mitad: volver a correr el mismo comando. El motor revisa en Gmail lo que quedó a medias y no duplica envíos.
- Captura del error: `datos/error_<cuenta>.png`. Mírala antes de reintentar.
- Gmail cambió su interfaz y los botones no se encuentran: no fuerces nada; explica el problema y sugiere revisar si hay una versión nueva del proyecto.
