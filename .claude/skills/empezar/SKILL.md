---
name: empezar
description: Punto de partida del proyecto. Prepara la computadora (Node, Chrome, dependencias), revisa en qué paso está la persona y la lleva al siguiente. Usar cuando la persona saluda, dice "empezar", "sigamos", "qué hago ahora" o abre el proyecto por primera vez.
---

# /empezar

## 1. Bienvenida (solo la primera vez)

Si `mi_perfil/` está vacío, saluda en 3 líneas como máximo:
- Qué hace el proyecto: CVs y mensajes adaptados a cada empresa, con su experiencia real, programados en su Gmail.
- Son 5 pasos y cada uno tiene su comando: `/cuestionario`, `/mejorar-cv`, `/conectar-gmail`, `/buscar-empresas`, `/programar`.
- Tú haces los comandos técnicos; la persona solo responde.

## 2. Preparar la computadora (en silencio si ya está)

1. `node --version` (hace falta 18 o más). Si falta: Windows `winget install OpenJS.NodeJS.LTS`; Mac `brew install node` (sin Homebrew: https://nodejs.org). En Windows puede hacer falta cerrar y abrir la terminal y volver a correr `claude`: avísale.
2. Google Chrome instalado. Si no, pide que lo instale desde https://www.google.com/chrome.
3. Si falta `motor/node_modules/`: `npm install` dentro de `motor/`, después `npm test`. Muestra solo "✔ Todo listo" o el error.

## 3. Ver en qué paso está

| Si falta… | Siguiente comando |
|---|---|
| CV o texto en `mi_perfil/` | pide el CV (abajo) |
| `mi_perfil/respuestas.md` | `/cuestionario` |
| `mi_perfil/perfil.json` | `/mejorar-cv` |
| `cuentas.json` | `/conectar-gmail` |
| una lista `.csv` en `empresas/` (que no sea limpias/descartadas) | `/buscar-empresas` |
| todo | `/programar` |

Muestra el avance así, marcando lo hecho:

```
✔ 1. CV   ✔ 2. Cuestionario   ▸ 3. CV mejorado   · 4. Gmail   · 5. Empresas   · 6. Programar
```

## 4. Pedir el CV

Si no hay CV: pide que copie su CV en la carpeta `mi_perfil/` (PDF, Word .docx o .txt) o que lo pegue en el chat. Opcional: una foto `mi_perfil/foto.jpg` (cara visible, fondo liso). Si no tiene CV, completa con la persona `plantillas/cv_base.md` en la conversación y guárdalo en `mi_perfil/mi_cv.md`.

Lee el CV una sola vez. Si es .docx y no puedes leerlo, pide que lo guarde como PDF o pegue el texto.

Después sigue directo con el paso que corresponda, sin esperar a que la persona escriba el comando.
