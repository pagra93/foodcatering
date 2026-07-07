# Runbook de producción — remediación de seguridad (Fase 0 + Fase 1)

Rama: **`fix/seguridad-fase-0`** · verificado en dev (type-check, lint, 153 tests, **build de producción ✓**).

Todo está hecho y probado en **dev**. Aquí está **lo que tienes que hacer tú en producción**, casi todo desde Coolify. No hay downtime; elige un momento tranquilo porque el último paso obliga a que todos vuelvan a iniciar sesión una vez.

## Resumen (4 pasos)
1. Desplegar la rama (Coolify) — la migración de BD se aplica sola.
2. Backup de la BD.
3. Un comando en la terminal de Coolify (cifra la PII antigua + arregla roles).
4. Cambiar el secreto de sesión (Coolify) — re-login global.

---

## Paso 1 — Desplegar (Coolify)
Lleva `fix/seguridad-fase-0` a producción como despliegas siempre (merge a `main` o apuntar el servicio a la rama → Deploy).
- Al arrancar, el contenedor ejecuta `prisma migrate deploy`: **la migración nueva (columnas `token_version` e `impersonator_id`) se aplica sola.**
- Es seguro aunque los datos sigan en claro: la app los lee bien hasta que los cifres en el paso 3. Sin downtime.
- Comprueba que en Coolify sigue puesta `PII_ENCRYPTION_KEY` (la que ya configuraste).

## Paso 2 — Backup de `comidas_prod`
Antes de tocar datos, un backup (tu método habitual / `scripts/backup-prod.sh` / la función de backup de Coolify). Es la red de seguridad para el paso 3.

## Paso 3 — Un comando en la terminal de Coolify
En Coolify, abre la **terminal / consola del servicio** (Execute Command) y ejecuta:
```
ALLOW_PROD=1 node scripts/prod-seguridad-migracion.mjs
```
No tienes que pasar `DATABASE_URL` ni `PII_ENCRYPTION_KEY`: ya están en el entorno del contenedor. Este comando, de una sola vez y **idempotente** (puedes repetirlo sin problema):
- **Cifra** los nombres/teléfonos que aún estén en texto plano.
- **Asigna el rol** a los usuarios que se hubieran creado sin él (evita que se queden bloqueados).

Verás algo como: `roleId asignado a N usuarios` y `PII cifrada: N nombres, M teléfonos`.

## Paso 4 — Re-login global (Coolify)
En Coolify → tu servicio → *Environment Variables* → cambia **`NEXTAUTH_SECRET`** por un valor nuevo (genera uno con `openssl rand -base64 32`) y redespliega.
- Efecto: todas las sesiones actuales caducan y **cada usuario inicia sesión una vez más**. No pierden datos.
- Esto activa del todo el modelo de permisos nuevo (todas las sesiones pasan a llevar los permisos desde la BD).

## Paso 5 — Validar
- Entra como un usuario de cada portal (admin, empresa, catering, empleado): todo accesible con normalidad.
- Los nombres se ven bien (la app los descifra al mostrarlos).
- Como super admin, prueba una impersonación: funciona y queda registrada a tu nombre.

---

## ⚠️ Importante
- **No borres ni cambies `PII_ENCRYPTION_KEY`** después: dejaría los datos cifrados ilegibles. El backup del paso 2 cubre el resto.
- Si el paso 3 falla a medias, vuelve a lanzarlo (es idempotente). Si algo raro, restaura el backup.

## Para más adelante (no de esta ventana)
- **Bloqueo duro de aislamiento (guard H9):** ya está desplegado en modo "aviso" (registra en logs cualquier lectura multi-tenant sin filtro). Cuando quieras el bloqueo real, revisa esos logs unos días y avísame: preparo el escape para las lecturas legítimas del panel admin y entonces se pone `TENANT_GUARD_ENFORCE=true`.
- **Fase 2 (dinero/facturación):** IVA de comida 21→10% (H3), IRPF por día (H4), comisión sobre facturas emitidas (H5), M1/M2/M3, y empresa-sin-plan obligatoria (M4). Sin tocar todavía.
