---
name: mejorar-cv
description: Mejora el CV con buenas prácticas (1 página, ATS, verbos concretos, números, voz humana, sin inventar nada) y arma mi_perfil/perfil.json con una plantilla de CV y mensaje por área. Genera los PDFs mejorados. Usar después del cuestionario o cuando la persona quiere cambiar su CV o sus mensajes.
---

# /mejorar-cv

Necesita el CV en `mi_perfil/` y `mi_perfil/respuestas.md`. Si falta el cuestionario, ofrece hacerlo primero (`/cuestionario`).

## 1. Diagnóstico (mostrarlo, es parte del video)

Antes de escribir, muestra 3 a 6 mejoras concretas en formato antes → después, con el texto real de su CV:

```
❌ "Responsable de atención al cliente"
✅ "Atendí entre 40 y 60 llamadas diarias y registré cada caso en el CRM"
   Por qué: verbo concreto + número = se entiende lo que hiciste.
```

Si para mejorar algo falta un dato (un número, una fecha, una herramienta), pregúntalo. **Nunca lo inventes ni lo estimes.**

## 2. Reglas de redacción

- 1 página. Una columna, texto simple, apto para ATS.
- Perfil de 2-3 líneas con hechos, no adjetivos.
- Cada experiencia: 2-3 puntos con verbo concreto + qué hizo + resultado (si existe).
- Suena a persona real: frases cortas. Prohibido: "me apasiona", "proactivo/a y orientado/a a resultados", "altamente motivado/a", "aportar valor", "sinergia", "en el dinámico mundo de", "trabajo en equipo y bajo presión", tres adjetivos seguidos, guiones largos (—).
- Puntuación fluida: sin dos puntos (:), punto y coma (;) ni guiones (- o –) donde no hacen falta. Une ideas con "y", "porque", "así que" o un punto. Solo se aceptan en fechas, teléfonos y viñetas del CV. En `mensaje` no van nunca.
- Sin DNI, estado civil, dirección exacta ni fecha de nacimiento.
- Lo que no tiene, no aparece. Lo que el área pide y no tiene se aclara en el mensaje con honestidad, nunca en el CV.

## 3. perfil.json

Crea `mi_perfil/perfil.json` con la estructura de `plantillas/perfil_ejemplo.json`:
- `nombre`, `contacto` (email, telefono con código de país, ubicacion, linkedin/portfolio si tiene), `idiomas`, `foto` (archivo en mi_perfil/ o ""), `firma` (nombre, teléfono, correo, en líneas).
- `competencias`, `proyectos`, `experiencia`, `formacion`: solo hechos reales ya redactados.
- `plantillas`: una por cada área elegida en el cuestionario (2 a 5), con clave corta (`atencion`, `admin`, `ventas`, `dev`…). Cada una elige qué competencias, proyectos y experiencias mostrar y tiene `titular`, `perfil`, `asunto` y `mensaje`.
  - `asunto`: "CV de {nombre} para {puesto}".
  - `mensaje`: 60-120 palabras, en el tono elegido. Saludo con `{empresa}`, a qué se postula (`{puesto}`), 1-2 hechos que prueban que encaja, `{extra}` al final de ese párrafo, cierre simple y `{firma}`. Ver `plantillas/mensajes_tipo.md`.
  - Marcadores permitidos: `{empresa}`, `{puesto}`, `{nombre}`, `{extra}`, `{firma}`.

## 4. Generar y revisar

1. En `motor/`: `npm run mis-cvs`. Crea `mi_perfil/cvs_mejorados/CV_<nombre>_<área>.pdf`.
2. Si avisa que alguno pasa de 1 página, acorta y repite.
3. Muestra las rutas completas de los PDFs (se pueden abrir con doble clic) y un mensaje de ejemplo ya completado con una empresa ficticia.
4. Di que esos CVs también sirven para postularse en cualquier otro lado (LinkedIn, formularios, en mano).
5. Pregunta qué cambiaría. Ajusta y regenera hasta que le guste. Después sigue con `/conectar-gmail`.
