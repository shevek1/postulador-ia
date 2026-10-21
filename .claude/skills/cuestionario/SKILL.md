---
name: cuestionario
description: Entrevista estilo test psicotécnico para conocer a la persona (qué busca, cómo trabaja, fortalezas reales, logros, tono). Guarda las respuestas en mi_perfil/respuestas.md. Usar después de cargar el CV o cuando la persona quiere rehacer sus preferencias.
---

# /cuestionario

Objetivo: que los CVs y mensajes suenen a la persona y destaquen lo que realmente sabe hacer. **No es un examen**: dilo en una línea al empezar ("No hay respuestas correctas, es para que tus mails suenen a ti").

## Cómo preguntar

- Lee antes el CV en `mi_perfil/` para no preguntar lo que ya está claro.
- Usa **AskUserQuestion** con opciones para tocar. Máximo 2 preguntas por llamada. La opción "Otra" ya está incluida: no la agregues.
- Entre 10 y 14 preguntas en total. Muestra el avance ("Pregunta 4 de 12").
- Preguntas abiertas solo para el logro concreto y para aclarar contradicciones con el CV.

## Bloques

**A. Qué busca** (multiSelect donde tenga sentido)
1. Áreas o puestos (hasta 3). Propón opciones a partir del CV.
2. Modalidad: remoto, híbrido, presencial.
3. Jornada: full time, part time, freelance o por proyecto.
4. Zona: su ciudad, su país, Latinoamérica, España, remoto mundial.

**B. Situaciones (estilo psicotécnico)** — 3 preguntas adaptadas al área elegida, con 4 opciones plausibles. Ejemplos:
- Atención al cliente: "Un cliente llega enojado por un error que no fue tuyo. ¿Qué haces primero?"
- Administración: "Encuentras una diferencia de dinero al cerrar la caja. ¿Qué haces?"
- Ventas: "Un cliente dice 'lo pienso y te aviso'. ¿Qué haces?"
- Tecnología: "Algo se rompe en producción un viernes a la tarde. ¿Qué haces primero?"
- Logística/operaciones: "Un envío urgente no va a llegar a tiempo. ¿Qué haces?"

**C. Estilo de trabajo** — elección forzada ("¿Qué te describe más?"):
- "Me organizo con listas y horarios" / "Resuelvo sobre la marcha".
- "Prefiero trabajar en equipo" / "Prefiero objetivos claros y trabajar solo/a".
- "Me gusta hablar con gente todo el día" / "Me gusta concentrarme en tareas".

**D. Evidencia**
- Herramientas o programas que maneja con soltura (multiSelect, opciones según el área).
- Idiomas con nivel real ("¿Podrías tener una entrevista en inglés hoy?" → sí / con esfuerzo / no).
- Un logro concreto del que esté orgulloso/a, con números si los hay (abierta).

**E. Preferencias**
- Qué NO quiere hacer o condiciones que descarta.
- Tono de los mensajes: formal ("Estimados") o cercano ("Hola, equipo").
- ¿Foto en el CV?

## Al terminar

1. Guarda `mi_perfil/respuestas.md` con cada pregunta y respuesta, más una sección "Conclusiones".
2. Muestra el resultado así (es el momento "wow", hazlo prolijo y honesto, sin inflar):

```
🧭 Tu perfil
• Buscas: ...
• Tus 3 fortalezas (con la prueba de cada una): ...
• Cómo trabajas: ...
• Tono de tus mensajes: ...
• Lo que vamos a aclarar con honestidad: ...
```

3. Pregunta si algo no le representa y corrígelo. Después sigue con `/mejorar-cv`.
