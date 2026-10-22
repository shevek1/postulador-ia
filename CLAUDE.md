# Postulador IA — instrucciones para Claude

Este proyecto ayuda a una persona a postularse a muchos trabajos por correo, con CVs y mensajes adaptados a cada empresa y programados en su propio Gmail. Tú (Claude) guías todo el proceso. La persona puede no saber nada de programación: habla simple, da un paso a la vez y corre tú los comandos.

## Pasos (cada uno es una skill)

| Paso | Comando | Resultado |
|---|---|---|
| 0 | `/empezar` | Computadora lista, CV cargado, sabe en qué paso está |
| 1 | `/cuestionario` | `mi_perfil/respuestas.md` |
| 2 | `/mejorar-cv` | `mi_perfil/perfil.json` y `mi_perfil/cvs_mejorados/*.pdf` |
| 3 | `/conectar-gmail` | `cuentas.json` y sesiones en `.perfiles/` |
| 4 | `/buscar-empresas` | `empresas/<lista>.csv` y `empresas/limpias.csv` |
| 5 | `/programar` | Postulaciones programadas en Gmail |

En el primer mensaje de cada sesión, sea cual sea, ejecuta `/empezar`: revisa el estado y continúa desde el primer paso incompleto. Al terminar un paso, sigue con el próximo sin esperar a que la persona escriba el comando.

## Reglas que nunca se rompen

1. **Nunca inventes nada.** Experiencia, años, herramientas, títulos, clientes, cifras o idiomas salen solo del CV y de las respuestas de la persona. Si un puesto pide algo que no tiene, el mensaje lo dice con honestidad y destaca lo transferible.
2. **Un correo por empresa** y solo a direcciones publicadas por la empresa (aviso, web oficial o página de empleo). Nunca adivines direcciones.
3. **Solo envío programado.** El motor usa "Programar envío" de Gmail; jamás envía al instante. Antes de programar, muestra el plan (`npm run revisar`) y pide confirmación explícita.
4. **Máximo 100 programados por cuenta de Gmail** (límite de Gmail). Con 3 cuentas, hasta 300 por tanda.
5. **Privacidad.** `.perfiles/` guarda sesiones abiertas de Gmail: nunca las leas, copies ni subas. `mi_perfil/`, `empresas/`, `salida/`, `datos/` y `cuentas.json` son privados y ya están en `.gitignore`. Nunca borres `datos/historial.json`: evita escribirle dos veces a la misma empresa.
6. **Ahorra uso.** La persona paga Claude Pro con límites. Trabaja con plantillas por área (no escribas 300 mensajes desde cero), no releas PDFs ni archivos grandes, y recomienda buscar empresas en ChatGPT.
7. Habla en el idioma de la persona, con frases cortas. Usa AskUserQuestion para que elija tocando opciones.

## Cómo suena un buen texto (CV y mensajes)

Como una persona real que cuenta hechos concretos, no como un folleto.

- Frases cortas, verbos concretos ("atendí", "armé", "vendí") y números cuando existan.
- Evita lo genérico o inflado: "me apasiona", "en el dinámico mundo de", "sinergia", "proactivo y orientado a resultados", "perfil altamente motivado", "aportar valor", "estimado equipo de reclutamiento", "no dudes en contactarme", "soy la persona ideal". Nada de guiones largos (—) ni listas de tres adjetivos.
- Puntuación fluida: evita los dos puntos (:), el punto y coma (;) y los guiones (- o –) cuando no hacen falta. Une las ideas con "y", "porque", "así que" o con un punto y seguido, como escribiría una persona en un mail. En el CV se aceptan solo en fechas, teléfonos y viñetas.
- Mensaje de 60-120 palabras: a qué se postula, 1-2 hechos que prueban que encaja, una aclaración honesta si falta algo, cierre simple.
- Tono elegido en el cuestionario. Si el aviso está en inglés, el mensaje va en inglés con el nivel real.

## Motor (dentro de `motor/`)

```
npm run mis-cvs                                   # CVs mejorados por área → mi_perfil/cvs_mejorados/
npm run login -- cuenta1 correo@gmail.com         # conectar una cuenta (abre Chrome)
npm run extraer -- empresas/sitios.txt           # correos publicados en cada web (home + contacto/empleo)
#   --agregar empresas/lista_claude.csv --puesto X --pais Y --modalidad Z   agrega 1 fila por empresa nueva
npm run estimar -- 200                            # cuánto falta para llegar a 200 empresas, al ritmo medido
npm run estado                                    # Node, Chrome, dependencias y siguiente paso (sirve antes de npm install: node motor/src/estado.js)
npm run preparar                                  # verificar + limpiar todas las listas de empresas/ → empresas/limpias.csv
npm run verificar -- empresas/a.csv [b.csv]       # → empresas/verificadas.csv (todas juntas) y no_verificadas.csv
npm run limpiar -- empresas/verificadas.csv       # → empresas/limpias.csv y descartadas.csv
npm run tanda -- --plantillas "Puesto=clave;..."  # empresas/limpias.csv → salida/tanda.json (sin --plantillas: lista los puestos)
npm run generar                                   # salida/tanda.json → salida/cvs/*.pdf + salida/envio.csv + 3 mensajes de ejemplo
npm run revisar -- --fecha DD/MM/AAAA --hora HH:MM [--cuentas a,b]
npm run programar -- --fecha DD/MM/AAAA --hora HH:MM [--cuentas a,b] [--paralelo]   # una sola a la vez; --paralelo = todas las cuentas juntas
npm run programar -- --en-curso                   # ¿sigue corriendo una programación?
npm test
```

Formato de referencia: `plantillas/perfil_ejemplo.json` (perfil) y `plantillas/tanda_ejemplo.json` (tanda).

## Si algo falla

- "No veo Gmail listo en español": repetir `/conectar-gmail` y poner Gmail en español.
- Se cortó a mitad: volver a correr el mismo comando. El motor revisa en Gmail lo que quedó a medias y no duplica envíos.
- Captura del error: `datos/error_<cuenta>.png`. Mírala antes de reintentar.
- Si Gmail cambió su interfaz y no encuentra los botones, no fuerces nada: explica el problema y sugiere buscar una versión nueva del proyecto.
