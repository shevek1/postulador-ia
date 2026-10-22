---
name: programar
description: Arma una tanda de postulaciones desde una lista de empresas (un CV y un mensaje por empresa) y la programa en Gmail repartida entre las cuentas, con revisión y confirmación previa. Usar cuando la persona tiene una lista en empresas/ y quiere enviar o programar postulaciones.
argument-hint: "[archivo.csv] [fecha] [hora]"
---

# /programar

Necesita `mi_perfil/perfil.json`, `cuentas.json` y una lista en `empresas/`. Si falta algo, manda al comando que corresponde (`/mejorar-cv`, `/conectar-gmail`, `/buscar-empresas`).

Argumentos opcionales: $ARGUMENTS

Todo lo de este comando lo hacen scripts en segundos: no leas los CSV ni escribas filas a mano. Corre cada comando desde `motor/` y muestra solo su resumen.

## 1. Preparar la lista

`npm run preparar`. Verifica todas las listas de `empresas/` juntas (lo que ya encontró la búsqueda de Claude no se vuelve a abrir) y deja `empresas/limpias.csv` sin repetidas ni empresas ya contactadas. Muestra cuántas quedan.

## 2. Armar la tanda

1. `npm run tanda`. Si `perfil.json` tiene una sola plantilla, ya escribe `salida/tanda.json`. Si tiene varias, lista los puestos con su cantidad y las plantillas disponibles.
2. Decide qué plantilla va con cada puesto (pocos, no hace falta preguntar si es obvio; `-` deja ese puesto afuera) y corre:
   `npm run tanda -- --plantillas "Paid Media=paid;Desarrollo web=dev"`
3. Muestra el resumen ("✔ 34 empresas · paid: 9 · dev: 18…" y las que quedaron afuera con el motivo).
4. Solo si la persona lo pide: agrega en `salida/tanda.json` un `extra` (una frase honesta: un requisito que no cumple o algo del aviso que encaja muy bien) o, para un aviso en inglés, `asunto` y `mensaje` en inglés en esa fila. Edita solo esas filas.

## 3. Generar y mostrar

1. `npm run generar`. Crea los CVs y muestra 3 mensajes de ejemplo. Si avisa CVs de más de 1 página, corrige `perfil.json` y repite.
2. Muestra los 3 ejemplos tal cual y la ruta de la carpeta `salida/cvs/`.

## 4. Revisar el plan

Pregunta con AskUserQuestion:
- **Fecha y hora**: próximo día hábil 09:00 (recomendado) · próximo día hábil 08:00 · otra.
- **Cuentas** (multiSelect): las de `cuentas.json`.

Corre `npm run revisar -- --fecha DD/MM/AAAA --hora HH:MM [--cuentas a,b]` y muestra el reparto.

## 5. Programar (solo con confirmación explícita)

Pregunta "¿Programo estas N postulaciones?" (Sí / No). Si dice que sí:
1. Avisa: tarda cerca de 1 minuto por correo y cuenta, no uses Chrome ni apagues la computadora; después Gmail envía solo aunque la PC esté apagada.
2. Corre `npm run programar -- --fecha DD/MM/AAAA --hora HH:MM [--cuentas a,b]` en segundo plano y espera a que termine. Con 2 o más cuentas agrega `--paralelo`: programa todas a la vez y tarda la mitad o menos, pero abre un Chrome por cuenta. Si la computadora tiene poca memoria (o ya se cortó una vez), no uses `--paralelo` y sugiere correr el comando en una terminal aparte.
3. Al terminar, informa cuántas quedaron programadas por cuenta y pide que lo confirme en Gmail → **Programados**.
4. Si quedaron sin lugar (más de 100 por cuenta), explica que se programan cuando salgan las actuales: el mismo comando con otra fecha sigue donde quedó.

## Si se corta

Que Claude Code deje de seguir el comando (por ejemplo, por poca memoria) no significa que se haya cortado: el motor puede seguir trabajando solo. Antes de decir que se cortó, corre `npm run programar -- --en-curso`:
- **"Sí: hay una programación en curso"**: sigue trabajando. Dilo, pide que no use Chrome y que espere; no lo vuelvas a lanzar (el motor no deja correr dos a la vez). Para ver cuándo termina, repite `--en-curso` cada tanto.
- **"No hay ninguna programación en curso"**: ahí sí se detuvo. Volver a correr el mismo comando: el motor revisa en Gmail lo que quedó a medias y no duplica. Si se detiene de nuevo, mira `datos/error_<cuenta>.png` y explica qué pasó.

El adjunto le llega a la empresa como `CV_<Nombre>_<Puesto>.pdf`; el número de los archivos de `salida/cvs/` es solo para ordenarlos.
