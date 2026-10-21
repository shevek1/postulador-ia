---
name: conectar-gmail
description: Conecta de 1 a 3 cuentas de Gmail para programar los envíos (abre Chrome, la persona inicia sesión, se verifica). Usar cuando la persona quiere agregar, cambiar o revisar sus cuentas de envío.
---

# /conectar-gmail

## Explicar (corto)

- Cada cuenta permite **100 envíos programados** a la vez (límite de Gmail). 1 cuenta = 100 por tanda; 3 cuentas = 300.
- Mejor cuentas con nombre profesional. Una cuenta recién creada conviene usarla de a poco (20-30 la primera vez) para no caer en spam.
- En las cuentas secundarias, recomienda configurar "Responder a" con la principal: Gmail → ⚙ → Ver todos los ajustes → Cuentas → "Enviar como" → editar → "Especificar otra dirección para responder".
- La sesión queda guardada solo en esta computadora, en `.perfiles/`. Nunca hay que compartir esa carpeta.

## Conectar

1. Pregunta cuántas cuentas (AskUserQuestion: 1, 2 o 3) y la dirección de cada una.
2. Para cada una, desde `motor/` (timeout de 10 minutos, espera a que termine):
   `npm run login -- cuenta1 correo@gmail.com` (después `cuenta2`, `cuenta3`).
3. Antes de correrlo, avisa: "Se abre Chrome. Inicia sesión con <correo>. Si Gmail no está en español: ⚙ → Ver todos los ajustes → Idioma → Español → Guardar. Después **cierra esa ventana de Chrome**."
4. El comando verifica la sesión. Si falla, muestra el motivo y repite.

Al terminar muestra las cuentas conectadas y sigue con `/buscar-empresas`.
