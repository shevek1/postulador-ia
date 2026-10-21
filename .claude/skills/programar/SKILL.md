---
name: programar
description: Arma una tanda de postulaciones desde una lista de empresas (un CV y un mensaje por empresa) y la programa en Gmail repartida entre las cuentas, con revisión y confirmación previa. Usar cuando la persona tiene una lista en empresas/ y quiere enviar o programar postulaciones.
argument-hint: "[archivo.csv] [fecha] [hora]"
---

# /programar

Necesita `mi_perfil/perfil.json`, `cuentas.json` y una lista en `empresas/`. Si falta algo, manda al comando que corresponde (`/mejorar-cv`, `/conectar-gmail`, `/buscar-empresas`).

Argumentos opcionales: $ARGUMENTS

## 1. Limpiar

Si la lista no tiene su `limpias.csv` actualizado, corre desde `motor/`: `npm run verificar -- empresas/<archivo>.csv` y después `npm run limpiar -- empresas/verificadas.csv`. Muestra cuántas quedan.

## 2. Armar la tanda

Lee `empresas/limpias.csv` y escribe `salida/tanda.json`, una fila por empresa:

```json
{ "n": 1, "empresa": "...", "puesto": "...", "email": "...", "plantilla": "atencion", "extra": "" }
```

- `plantilla`: la que mejor encaja con el puesto. Si ninguna encaja, deja la fila afuera y dilo al final.
- `extra`: vacío casi siempre. Una sola frase honesta cuando aporte: un requisito que no cumple ("No trabajé con SAP, pero aprendo rápido sistemas nuevos.") o algo del aviso que encaja muy bien. Nada genérico ni inventado.
- Candidatura espontánea (nivel 3-4): `puesto` = el área ("Atención al cliente"), y sobrescribe `asunto` con "CV para {puesto} – {nombre}".
- Aviso en inglés: sobrescribe `asunto` y `mensaje` en esa fila, en inglés, con el nivel real.
- Para ahorrar uso, escribe el JSON de una vez; no redactes mensajes completos por fila salvo los de inglés.

## 3. Generar y mostrar

1. `npm run generar`. Si avisa CVs de más de 1 página, corrige y repite.
2. Muestra 3 mensajes al azar completos y la ruta de la carpeta `salida/cvs/`.

## 4. Revisar el plan

Pregunta con AskUserQuestion:
- **Fecha y hora**: próximo día hábil 09:00 (recomendado) · próximo día hábil 08:00 · otra.
- **Cuentas** (multiSelect): las de `cuentas.json`.

Corre `npm run revisar -- --fecha DD/MM/AAAA --hora HH:MM [--cuentas a,b]` y muestra el reparto.

## 5. Programar (solo con confirmación explícita)

Pregunta "¿Programo estas N postulaciones?" (Sí / No). Si dice que sí:
1. Avisa: tarda cerca de 1 minuto por correo, no uses Chrome ni apagues la computadora; después Gmail envía solo aunque la PC esté apagada.
2. Corre `npm run programar -- --fecha DD/MM/AAAA --hora HH:MM [--cuentas a,b]` en segundo plano y espera a que termine. Si la computadora tiene poca memoria, sugiere correr el mismo comando en una terminal aparte.
3. Al terminar, informa cuántas quedaron programadas por cuenta y pide que lo confirme en Gmail → **Programados**.
4. Si quedaron sin lugar (más de 100 por cuenta), explica que se programan cuando salgan las actuales: el mismo comando con otra fecha sigue donde quedó.

## Si se corta

Que Claude Code deje de seguir el comando (por ejemplo, por poca memoria) no significa que se haya cortado: el motor puede seguir trabajando solo. Antes de decir que se cortó, corre `npm run programar -- --en-curso`:
- **"Sí: hay una programación en curso"**: sigue trabajando. Dilo, pide que no use Chrome y que espere; no lo vuelvas a lanzar (el motor no deja correr dos a la vez). Para ver cuándo termina, repite `--en-curso` cada tanto.
- **"No hay ninguna programación en curso"**: ahí sí se detuvo. Volver a correr el mismo comando: el motor revisa en Gmail lo que quedó a medias y no duplica. Si se detiene de nuevo, mira `datos/error_<cuenta>.png` y explica qué pasó.

El adjunto le llega a la empresa como `CV_<Nombre>_<Puesto>.pdf`; el número de los archivos de `salida/cvs/` es solo para ordenarlos.
