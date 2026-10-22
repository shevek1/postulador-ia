---
name: empezar
description: Punto de partida del proyecto. Prepara la computadora (Node, Chrome, dependencias), revisa en qué paso está la persona y la lleva al siguiente. Usar cuando la persona saluda, dice "empezar", "sigamos", "qué hago ahora" o abre el proyecto por primera vez.
---

# /empezar

## 1. Bienvenida (solo la primera vez)

Si `mi_perfil/` está vacío, saluda en 3 líneas como máximo:
- Qué hace el proyecto: CVs y mensajes adaptados a cada empresa, con su experiencia real, programados en su Gmail.
- Son 6 pasos: cargar su CV y 5 comandos, `/cuestionario`, `/mejorar-cv`, `/conectar-gmail`, `/buscar-empresas`, `/programar`.
- Tú haces los comandos técnicos; la persona solo responde.

## 2. Preparar la computadora (en silencio si ya está)

1. Corre `node motor/src/estado.js`. Revisa todo en una sola llamada (Node, Chrome, dependencias y en qué paso está) y te dice qué falta.
2. Si `node` no existe o es menor a 18:
   - Windows: `winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements`. Después hay que cerrar y abrir la terminal y volver a correr `claude`: avísale.
   - Mac: pide que baje e instale el "LTS" desde https://nodejs.org (doble clic en el archivo .pkg). Si ya tiene Homebrew, sirve `brew install node`.
3. Si dice que falta Chrome, pide que lo instale desde https://www.google.com/chrome.
4. Si dice que faltan dependencias: `cd motor && npm install && npm test`. Muestra solo "✔ Todo listo" o el error.

## 3. Ver en qué paso está

`estado.js` termina con el avance y el siguiente comando. Muéstralo tal cual:

```
✔ 1. CV   ✔ 2. Cuestionario   ▸ 3. CV mejorado   · 4. Gmail   · 5. Empresas   · 6. Programar
```

Si el siguiente paso es el CV, pídelo (abajo); si no, sigue con el comando que indica.

## 4. Pedir el CV

Si no hay CV: pide que copie su CV en la carpeta `mi_perfil/` (PDF, Word .docx o .txt) o que lo pegue en el chat. Opcional: una foto `mi_perfil/foto.jpg` (cara visible, fondo liso). Si no tiene CV, completa con la persona `plantillas/cv_base.md` en la conversación y guárdalo en `mi_perfil/mi_cv.md`.

Lee el CV una sola vez. Si es .docx y no puedes leerlo, pide que lo guarde como PDF o pegue el texto.

Después sigue directo con el paso que corresponda, sin esperar a que la persona escriba el comando.
