# Postulador IA

Postúlate a cientos de trabajos por correo con un CV y un mensaje adaptados a cada empresa, escritos a partir de **tu** experiencia real y programados en tu propio Gmail.

Claude te guía de principio a fin: armas tu perfil una vez y después cada tanda lleva unos minutos.

> **Hasta 100 postulaciones por cuenta de Gmail por tanda.** Con 2 o 3 cuentas: 200 a 300.

---

## Qué necesitas

| | |
|---|---|
| 💻 Una computadora | Windows o Mac. Desde el celular no funciona. |
| 🌐 Google Chrome | [Descargar](https://www.google.com/chrome) |
| 🤖 Claude Pro (USD 20/mes) | Incluye **Claude Code**, que es lo que usa este proyecto. Te sirve para mucho más que esto: estudiar, escribir, programar, organizar tu búsqueda. |
| 📧 1 a 3 cuentas de Gmail | Con Gmail en español. |

## Instalación (5 minutos)

**1. Instala Claude Code** ([guía oficial](https://code.claude.com/docs/en/setup))

- Windows (10 o más nuevo): abre **PowerShell** y pega:
  ```
  irm https://claude.ai/install.ps1 | iex
  ```
  Recomendado: instala también [Git para Windows](https://git-scm.com).
- Mac: abre **Terminal** y pega:
  ```
  curl -fsSL https://claude.ai/install.sh | bash
  ```

**2. Descarga este proyecto:** botón verde **Code → Download ZIP**, y descomprímelo (por ejemplo en el Escritorio).

**3. Abre la terminal en la carpeta:**
- Windows: clic derecho dentro de la carpeta → **Abrir en Terminal**.
- Mac: clic derecho en la carpeta → **Nuevo Terminal en la carpeta**.

**4. Escribe `claude`**, inicia sesión con tu cuenta Pro y escribe **`/empezar`**. Listo: Claude instala lo que falte y te guía.

## Cómo se usa: 6 comandos

Escribes el comando en Claude Code y él hace el resto. Al terminar cada paso, sigue solo con el próximo.

| Comando | Qué pasa |
|---|---|
| `/empezar` | Prepara tu computadora y te pide el CV (PDF, Word o texto). ¿No tienes? Lo arma contigo con [`cv_base.md`](plantillas/cv_base.md). |
| `/cuestionario` | 10 a 14 preguntas estilo test psicotécnico: situaciones, forma de trabajar, logros, tono. Tocas opciones y al final te muestra tu perfil. |
| `/mejorar-cv` | Te muestra qué cambiaría de tu CV (antes → después) y te arma un **CV mejorado en PDF por cada área** que buscas. Sin inventar nada. |
| `/conectar-gmail` | Conecta 1 a 3 cuentas: se abre Chrome, inicias sesión y lo cierras. |
| `/buscar-empresas` | Te pregunta remoto o presencial, rubro, zona, jornada, nivel y cuántas quieres. Te da el **prompt listo para ChatGPT** o busca él mismo. Bloques de 25 hasta 200, 300 o más, y termina en un CSV. |
| `/programar` | Un CV y un mensaje por empresa, te muestra el plan y, cuando confirmas, los programa con **"Programar envío"** de Gmail. Después puedes apagar la computadora. |

```
/empezar → /cuestionario → /mejorar-cv → /conectar-gmail → /buscar-empresas → /programar → listo
```

Para la siguiente tanda: `/buscar-empresas` y `/programar`. Nunca le escribe dos veces a la misma empresa.

**Sin Claude Code también sirven:** el [prompt para buscar empresas](prompts/buscar_empresas.md) (pégalo en ChatGPT) y el [prompt para mejorar tu CV](prompts/mejorar_cv.md). Más guías: [CV recomendado](plantillas/cv_recomendado.md) · [tipos de mensaje](plantillas/mensajes_tipo.md).

## Límites y buenas prácticas

- **100 programados por cuenta** a la vez (límite de Gmail). Cuando salen, se libera el lugar para la siguiente tanda.
- **Cuenta nueva = ir de a poco.** Una cuenta recién creada que manda 100 correos el primer día puede terminar en spam. Empieza con 20-30 y sube.
- **Un correo por empresa**, solo a direcciones publicadas por la empresa.
- **Nada inventado.** El CV y los mensajes usan solo tu experiencia real. Lo que no tienes se dice con honestidad. Es lo que funciona en la entrevista.
- Mientras programa (~1 minuto por correo) no uses Chrome y no apagues la computadora.
- Responde tú mismo/a a cada respuesta que llegue: eso no se automatiza.

## Privacidad

Todo queda en tu computadora. Tus datos (`mi_perfil/`, `empresas/`, `salida/`, `datos/`, `cuentas.json`) y las sesiones de Gmail (`.perfiles/`) están excluidos de git. **Nunca compartas la carpeta `.perfiles/`:** quien la tenga puede entrar a tu correo.

## Preguntas frecuentes

**¿Sirve para cualquier rubro y país?** Sí, siempre que la empresa reciba CVs por correo. Gmail tiene que estar en español (el motor busca los botones por su nombre).

**¿Puedo usar Outlook?** No, por ahora solo Gmail.

**¿Se cortó a mitad?** Vuelve a correr lo mismo. El proyecto revisa en Gmail qué quedó programado y nunca manda dos veces el mismo correo.

**¿Gastó todo mi uso de Claude?** El proyecto usa plantillas para ahorrar. Si llegas al límite, espera a que se renueve (unas horas) y escribe "sigamos".

**¿Es seguro para mi cuenta?** Usa Gmail como lo usarías tú, con su propio programador de envíos. Respeta los límites y no le escribas a gente que no publicó su correo para recibir CVs.

## Para curiosos: comandos

Claude los corre por ti, pero existen (dentro de `motor/`):

```
npm run mis-cvs                              # CVs mejorados por área → mi_perfil/cvs_mejorados/
npm run login -- cuenta1 tu@gmail.com      # conectar una cuenta
npm run extraer -- empresas/sitios.txt      # correos publicados en cada web
npm run verificar -- empresas/lista.csv     # confirmar que cada correo está en su link
npm run limpiar -- empresas/verificadas.csv # limpiar una lista
npm run generar                              # CVs + envio.csv desde salida/tanda.json
npm run revisar -- --fecha 22/10/2026 --hora 09:00
npm run programar -- --fecha 22/10/2026 --hora 09:00 [--cuentas cuenta1,cuenta2]
npm test
```

## ¿Te sirvió?

Este proyecto es gratis y de código abierto. Si te ayudó y quieres apoyar para que siga sacando herramientas así:

- Sígueme en TikTok: **[@fabri.sistemas](https://www.tiktok.com/@fabri.sistemas)**
- Si vas a pagar Claude Pro, el video fijado explica cómo hacerlo con mi link (si todavía tengo pases disponibles).
- Deja una ⭐ en el repo.

## Licencia

MIT. Úsalo con responsabilidad y respetando los términos de Gmail. Sin garantías: revisa siempre lo que se programa.
