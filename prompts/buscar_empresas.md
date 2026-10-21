# Prompt — Buscar empresas (en ChatGPT o en claude.ai)

En Claude Code, `/buscar-empresas` te pregunta qué buscas y te da este prompt ya completado. Si lo haces a mano, cambia lo que está entre [corchetes].

Pégalo en ChatGPT (con búsqueda web activada) o en claude.ai. Cuando termine cada bloque escribe **"siguiente"**. Cuando tengas suficientes (200, 300 o más) escribe **"final"**.

---

```
Necesito que me ayudes a buscar empresas para postularme por correo electrónico.

MI PERFIL
- Áreas que busco: [atención al cliente, administración, ventas]
- Modalidad: [remoto / híbrido / presencial]
- Zona o países: [Argentina y resto de Latinoamérica / solo Córdoba / España]
- Jornada: [full time o part time]
- Idiomas: [español nativo, inglés B1]
- Nivel: [junior, sin experiencia, semi senior]

REGLAS (muy importantes)
1. Solo correos PUBLICADOS por la empresa: en el aviso, en su web oficial o en su página de empleo. Nunca inventes ni deduzcas direcciones (nada de "seguro es rrhh@...").
2. Incluye siempre el link donde viste el correo.
3. Un solo correo por empresa. No repitas empresas entre bloques.
4. Nada de avisos que solo se postulan por formulario (LinkedIn Easy Apply, Computrabajo sin correo, Workday, etc.).
5. Prioriza avisos de los últimos 30 días.

BUSCA POR NIVELES (de más a menos directo)
- Nivel 1: avisos actuales que piden enviar el CV a un correo.
- Nivel 2: empresas del rubro con página de empleo que publica un correo para CVs.
- Nivel 3: consultoras de RRHH y agencias de selección que reciben CVs por correo para mis áreas.
- Nivel 4: candidatura espontánea: empresas del rubro que publican un correo de RRHH, empleo o talento en su web.

FORMATO
- Entrega bloques de 25 filas en una tabla con estas columnas:
  empresa | puesto | email | link | pais | modalidad | nivel
- En "puesto", si es candidatura espontánea, pon el área (por ejemplo "Atención al cliente").
- Después de cada bloque espera a que escriba "siguiente".
- Cuando escriba "final", junta TODOS los bloques en un solo bloque de código CSV, separado por comas, con este encabezado exacto y sin filas repetidas:
  empresa,puesto,email,link,pais,modalidad,nivel
```

---

## Qué hago con el CSV

Copia el bloque CSV final y guárdalo como archivo `.csv` dentro de la carpeta `empresas/` del proyecto (por ejemplo `empresas/lista_1.csv`). También puedes pegarlo en Claude Code y pedirle: "guarda esto en empresas/lista_1.csv".

Ejemplo del formato: `plantillas/empresas_ejemplo.csv`.

Consejo: las IAs a veces se equivocan con los correos. El proyecto revisa que el dominio reciba mails y saca repetidos, pero si un correo te parece raro, ábrelo en el link y verifícalo.
