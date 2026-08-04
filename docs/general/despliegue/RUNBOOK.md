# Runbook operativo

Comandos copy-paste por escenario. Si algo no está aquí y lo usas más de una
vez, añádelo.

Arquitectura asumida: la descrita en `ARQUITECTURA-ENTORNOS.md` (dev =
`comidas_dev` en Hetzner, prod = `comidas_prod` en Coolify).

---

## 0. Me han avisado de que algo va mal

Checklist ordenado de triaje. No saltes pasos: cada uno acota dónde está el
problema antes de tocar nada.

**1. ¿Responde la app y la BD?**

```bash
curl -s https://www.plati.es/api/health
```

Cómo interpretar la respuesta:

- `"ok": true` → app arriba, BD accesible y sin migraciones a medias. El
  problema es funcional → salta al paso 4.
- `"db": false` (HTTP 503) → la app no llega a Postgres: container de BD
  caído, red interna o credenciales. Mira los logs del container de BD (§9).
- `"unfinishedMigrations" > 0` (HTTP 503) → deploy roto a mitad de migración
  → ve directo a §13.
- `"sha"` → SHA del build que está corriendo (lo usa el paso 2).
- El curl no responde nada → Coolify/Traefik/DNS caídos (§9, §10).

**2. ¿Qué SHA corre vs qué hay en main?**

```bash
curl -s https://www.plati.es/api/health   # campo "sha" = lo que corre
git ls-remote origin main                  # lo último mergeado en main
```

Si no coinciden (comparando prefijos), hay un deploy pendiente o fallido: lo
que ves en el código puede no ser lo que corre.

**3. Últimos deploys en Coolify**: panel → service "comidas" → Deployments.
¿El último es "Success"? ¿Coincide su hora con el inicio del problema? Un
deploy fallido deja corriendo la versión anterior (y explica el paso 2).

**4. Logs por requestId**: el middleware inyecta `x-request-id` en cada
petición y las rutas lo incluyen en sus logs. Pide el requestId del error (o
míralo en la cabecera `x-request-id` de la respuesta fallida) y correla:

```bash
APP=$(docker ps --format "{{.ID}} {{.Names}}" | grep comidas | awk '{print $1}')
docker logs "$APP" 2>&1 | grep <requestId>
```

**5. Estado de los jobs** (si el síntoma es "no se facturó / no se cerraron
pedidos", el problema es un job, no la web — ver §17):

```bash
PG=$(docker ps --filter "name=fws4wwks04kwkg8ss0sk004c" --format '{{.ID}}' | head -1)
docker exec -i $PG psql -U postgres -d comidas_prod \
  -c 'SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 20;'
```

---

## 1. Hice un cambio de código (sin schema), quiero desplegarlo

```bash
# Local
pnpm type-check && pnpm lint && pnpm exec vitest run && pnpm build
# Todo verde →
git add .
git commit -m "feat/fix: <descripción breve>"
git push origin main
```

Coolify detecta el push y redeployea automáticamente. Tarda 2-5 minutos.
Verifica en `https://plati.es` y revisa los logs del service en Coolify
si algo no carga.

---

## 2. Hice un cambio de schema Prisma

```bash
# Local, con .env apuntando a comidas_dev
pnpm prisma migrate dev --name <nombre_descriptivo>
# → aplica el cambio a comidas_dev y crea prisma/migrations/YYYYMMDD..._nombre/migration.sql
#
# Editar código que dependa del nuevo schema, ajustar tests.
pnpm type-check && pnpm exec vitest run && pnpm build

git add prisma/migrations/ prisma/schema.prisma <archivos de código>
git commit -m "feat: <descripción>"
git push origin main
```

Al redeployar, el `docker-entrypoint.sh` corre `prisma migrate deploy`
dentro del contenedor de prod, aplicando *solo* las migraciones pendientes.
Comidas_prod queda al día sin que toques nada.

---

## 3. Rollback — algo rompió producción

```bash
# Revertir el último commit
git revert HEAD
git push origin main
```

Coolify redeploya la versión anterior. Normalmente es instantáneo.

**Si el commit revertido incluía una migración destructiva** (muy raro;
todas nuestras migraciones hasta ahora son aditivas):

```bash
# 1. Restaurar backup previo
docker exec -i $PG psql -U postgres -c 'DROP DATABASE comidas_prod_broken;' || true
docker exec -i $PG psql -U postgres -c 'ALTER DATABASE comidas_prod RENAME TO comidas_prod_broken;'
docker exec -i $PG psql -U postgres -c 'CREATE DATABASE comidas_prod OWNER postgres;'
gunzip -c /var/backups/comidas/<backup_previo>.sql.gz | \
  docker exec -i $PG psql -U postgres -d comidas_prod
# 2. Forzar re-grant del usuario prod
docker exec -i $PG psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE comidas_prod TO comidas_prod_user;"
```

Una vez verificado que prod vuelve a funcionar, puedes borrar
`comidas_prod_broken`.

---

## 4. Crear un backup manual de prod

Desde el servidor Hetzner (SSH):

```bash
bash /ruta/al/repo/scripts/backup-prod.sh
# Deja el .sql.gz en /var/backups/comidas/
```

O one-liner directo:

```bash
PG=fws4wwks04kwkg8ss0sk004c
docker exec -i $PG pg_dump -U postgres -d comidas_prod | \
  gzip > /var/backups/comidas/manual-$(date +%Y%m%d_%H%M).sql.gz
```

---

## 5. Restaurar desde un backup

```bash
# Servidor Hetzner
PG=fws4wwks04kwkg8ss0sk004c
BACKUP=/var/backups/comidas/20260418_0300.sql.gz   # ejemplo

# 1. Asegurar que no hay conexiones (Coolify: pausar service "comidas")

# 2. Restaurar sobre una BD nueva primero (seguridad)
docker exec -i $PG psql -U postgres -c 'CREATE DATABASE comidas_restore OWNER postgres;'
gunzip -c "$BACKUP" | docker exec -i $PG psql -U postgres -d comidas_restore

# 3. Validar que el restore está ok (contar filas, mirar tablas clave)
docker exec -i $PG psql -U postgres -d comidas_restore -c 'SELECT COUNT(*) FROM tenants;'

# 4. Swap (renombrar BDs)
docker exec -i $PG psql -U postgres -c 'ALTER DATABASE comidas_prod RENAME TO comidas_prod_pre_restore;'
docker exec -i $PG psql -U postgres -c 'ALTER DATABASE comidas_restore RENAME TO comidas_prod;'

# 5. Re-grant al usuario prod
docker exec -i $PG psql -U postgres -c 'GRANT ALL PRIVILEGES ON DATABASE comidas_prod TO comidas_prod_user;'

# 6. Reanudar service en Coolify
```

Mantén `comidas_prod_pre_restore` unas 48 h por si hace falta volver atrás;
luego `DROP DATABASE comidas_prod_pre_restore;`.

---

## 6. Resetear mi dev porque se ensució

```bash
# Local, .env apuntando a comidas_dev
bash scripts/reset-db.sh   # tiene guardia: aborta si detecta _prod en el DSN
```

Deja `comidas_dev` con el schema fresh + los seeds.

---

## 7. Crear un super-admin en prod (primera vez)

Cuando desplegamos prod vacía, necesitas un usuario inicial para acceder al
panel admin. **Haz esto una sola vez**:

```bash
# Servidor Hetzner o Coolify "Execute Command"
docker exec -it <container_de_la_app> pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const rootTenant = await prisma.tenant.create({
    data: { type: 'ROOT', name: 'Root', subdomain: 'admin' },
  });
  const user = await prisma.user.create({
    data: {
      tenantId: rootTenant.id,
      email: 'admin@plati.es',
      passwordHash: await bcrypt.hash('<PASSWORD_FUERTE>', 10),
      nameEnc: 'Super Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('Super admin creado:', user.email);
}
main().finally(() => prisma.\$disconnect());
"
```

Cambia la password en el primer login.

---

## 8. Invitar un tenant nuevo (empresa / catering)

Via panel super admin en `https://plati.es/admin/tenants/new`. El
formulario:

1. Nombre de la empresa/catering.
2. Subdominio (`acme` → `acme.plati.es`).
3. Tipo (`EMPRESA` o `CATERING`).
4. Datos de contacto.

Al guardar, se crea el `Tenant` + su `Company` / `Restaurant` asociado con
defaults mínimos. Luego hay que completar `legalName`, `cif`,
`billingAddress` desde el detalle del tenant.

### ⚠️ Paso obligatorio: dar de alta el subdominio en Coolify

Crear el tenant en la app **no** hace que `<slug>.plati.es` funcione. Hace
falta un paso manual en infraestructura:

1. **DNS**: ya está cubierto. El registro wildcard `*.plati.es → 5.78.124.107`
   resuelve cualquier subdominio nuevo automáticamente. **No hay que tocar el
   DNS** por cada tenant.
2. **Coolify → service "comidas" → Domains**: añadir el subdominio nuevo a la
   lista (separados por coma), por ejemplo:

   ```
   https://plati.es,https://admin.plati.es,https://acme.plati.es
   ```

   Al guardar, Traefik pide a Let's Encrypt el certificado del subdominio
   (challenge HTTP-01) y, como el DNS ya resuelve, lo emite en segundos.

**Cómo saber si falta este paso**: si al abrir `https://<slug>.plati.es` ves
un error de certificado SSL, el subdominio no está en Domains. Verifícalo:

```bash
echo | openssl s_client -servername <slug>.plati.es -connect 5.78.124.107:443 2>/dev/null \
  | openssl x509 -noout -subject
# "CN=TRAEFIK DEFAULT CERT"  → falta añadirlo en Coolify Domains
# "CN=<slug>.plati.es"       → ya está OK
```

> **Mejora futura (opcional)**: montar un certificado wildcard `*.plati.es`
> vía **DNS-01 challenge** en Coolify elimina este paso manual — cualquier
> `<slug>.plati.es` funcionaría sin tocar Domains. Tiene más setup inicial
> (Coolify necesita credenciales de API del DNS para resolver el challenge).
> Mientras haya pocos tenants, listar el subdominio a mano es más simple.

---

## 9. Ver qué está pasando en prod

Panel Coolify → service "comidas" → **Logs** (tiempo real).

Desde el servidor:

```bash
docker logs -f $(docker ps --format "{{.ID}} {{.Names}}" | grep comidas | awk '{print $1}') | tail -n 200
```

---

## 10. Parar temporalmente prod (ventana de mantenimiento)

Panel Coolify → service "comidas" → **Stop**.

Cuando termines: **Start**. Los usuarios verán un error de conexión mientras
está parado (5-30 segundos al reiniciar).

---

## 11. Variables de entorno — cambiar NEXTAUTH_SECRET / rotar credenciales

1. Panel Coolify → service "comidas" → Environment Variables.
2. Editar el valor.
3. Click "Redeploy" (el contenedor tiene que reiniciar para leer la nueva
   var).

**Ojo**: cambiar `NEXTAUTH_SECRET` invalida todas las sesiones — los
usuarios tendrán que volver a hacer login. Sólo hacer si sospechas leak.

---

## 12. "¿Puedo correr un `pnpm db:seed` contra prod?"

**No.** Nunca. El seed es para dev, no es idempotente al 100% para datos
reales y te duplica contenido o lo borra según el caso.

Si necesitas poblar prod con datos iniciales, escribe un script ad-hoc en
`scripts/` que haga sólo lo que necesites, con confirmación explícita, y lo
ejecutas una vez desde el panel Coolify "Execute Command".

---

## 13. Migración fallida / pendiente

**Síntoma**: `/api/health` devuelve 503 con `unfinishedMigrations > 0`, o el
deploy falla y el log del entrypoint termina en "No se pudieron aplicar las
migraciones" con salida del contenedor.

> El entrypoint de prod ahora **ABORTA** si `prisma migrate deploy` falla
> (fail-fast deliberado): mejor que Coolify conserve la versión anterior
> corriendo que arrancar un contenedor "sano" que sirve 500 con el schema
> desactualizado.

**Diagnóstico** — desde la terminal del contenedor en Coolify (el de la
versión anterior sigue corriendo) o `docker exec` en el servidor:

```bash
prisma migrate status
# → dice qué migración quedó "failed" o pendiente
```

**Resolución** según lo que veas en la BD:

```bash
# a) La migración falló A MEDIAS y quieres que se reintente desde cero
#    (verifica antes que sus cambios NO quedaron aplicados en la BD):
prisma migrate resolve --rolled-back <nombre_de_la_migracion>

# b) La migración SÍ quedó aplicada (solo falló el registro del historial):
prisma migrate resolve --applied <nombre_de_la_migracion>
```

**Reintentar el deploy**: panel Coolify → service "comidas" → Redeploy. El
entrypoint vuelve a correr `prisma migrate deploy` (aplica solo lo
pendiente). Verifica con `/api/health`: `ok: true` y sin
`unfinishedMigrations`.

---

## 14. Restore parcial (un tenant / una tabla)

Para recuperar datos concretos SIN pisar todo prod: restaurar el backup en
una BD auxiliar y copiar solo lo que interesa. Nuestros backups son SQL plano
(`pg_dump | gzip`), así que se restauran con `psql` — `pg_restore` solo
aplica al formato custom, que no usamos.

Ejemplo: recuperar los `orders` de una empresa de un día concreto.

```bash
PG=$(docker ps --filter "name=fws4wwks04kwkg8ss0sk004c" --format '{{.ID}}' | head -1)
BACKUP=/var/backups/comidas/comidas_prod_20260801_0300.sql.gz   # ejemplo

# 1. Restaurar el backup completo en la BD auxiliar
docker exec -i $PG psql -U postgres -c 'CREATE DATABASE comidas_restore OWNER postgres;'
gunzip -c "$BACKUP" | docker exec -i $PG psql -U postgres -d comidas_restore

# 2. Exportar SOLO las filas que interesan a un CSV (en el /tmp DEL CONTAINER)
docker exec -i $PG psql -U postgres -d comidas_restore -c \
  "\copy (SELECT * FROM orders WHERE tenant_empresa = '<TENANT_ID>' AND service_date = '2026-08-01') TO '/tmp/orders_parcial.csv' WITH CSV"

# 3. Cargarlas en prod vía tabla puente (así no chocan con filas que ya existen)
docker exec -i $PG psql -U postgres -d comidas_prod -c \
  'CREATE TABLE orders_restore_tmp (LIKE orders INCLUDING DEFAULTS);'
docker exec -i $PG psql -U postgres -d comidas_prod -c \
  "\copy orders_restore_tmp FROM '/tmp/orders_parcial.csv' WITH CSV"
docker exec -i $PG psql -U postgres -d comidas_prod -c \
  'INSERT INTO orders SELECT * FROM orders_restore_tmp ON CONFLICT (id) DO NOTHING;'

# 4. Verificar
docker exec -i $PG psql -U postgres -d comidas_prod -c \
  "SELECT COUNT(*) FROM orders WHERE tenant_empresa = '<TENANT_ID>' AND service_date = '2026-08-01';"

# 5. Limpieza
docker exec -i $PG psql -U postgres -d comidas_prod -c 'DROP TABLE orders_restore_tmp;'
docker exec -i $PG psql -U postgres -c 'DROP DATABASE comidas_restore;'
docker exec -i $PG rm -f /tmp/orders_parcial.csv
```

Notas:

- Postgres NO permite `INSERT INTO … SELECT` entre dos bases de datos: por
  eso el paso intermedio con `\copy` y la tabla puente.
- `orders` no tiene columna `tenant_id`: sus columnas de tenant son
  `tenant_empresa` y `tenant_catering`. En la mayoría de tablas multi-tenant
  el filtro es `tenant_id` — confirma los nombres reales (`@@map`) en
  `prisma/schema.prisma` antes de escribir el WHERE.
- Si la tabla tiene hijas por FK (p. ej. líneas de pedido), restaura primero
  la padre y repite la receta con cada hija.

---

## 15. Incidente de datos / posible fuga entre tenants

Orden: **contener → acotar → preservar evidencia → notificar**. Apunta la
hora de cada paso: la necesitarás para el registro de la brecha.

**Contener** (elige según gravedad):

- Ventana de mantenimiento desde el admin: `/admin/operations/maintenance`.
  Los usuarios ven un 503 con mensaje; SUPER_ADMIN sigue entrando.
- El cerrojo de tenant ya bloquea por defecto: con `TENANT_GUARD_ENFORCE`
  activo, una lectura de lista sin filtro de tenant da error en vez de fugar
  datos. Verifica en Coolify que NO esté puesto a `"false"`.
- Caso extremo (fuga activa confirmada): Coolify → service "comidas" → Stop.

**Acotar con `audit_logs`** (quién vio/tocó qué y cuándo):

```sql
-- Actividad de un usuario sospechoso en las últimas 72 h
SELECT timestamp, tenant_id, action, entity, entity_id, ip
FROM audit_logs
WHERE actor_id = '<USER_ID>' AND timestamp >= now() - interval '72 hours'
ORDER BY timestamp DESC;

-- Todo lo ocurrido sobre un tenant en una franja concreta
SELECT timestamp, actor_id, impersonator_id, action, entity, entity_id
FROM audit_logs
WHERE tenant_id = '<TENANT_ID>'
  AND timestamp BETWEEN '2026-08-01 00:00' AND '2026-08-02 00:00'
ORDER BY timestamp;
```

**Evidencia** — antes de tocar nada más:

```bash
bash scripts/backup-prod.sh                    # foto de la BD
APP=$(docker ps --format "{{.ID}} {{.Names}}" | grep comidas | awk '{print $1}')
docker logs "$APP" > /var/backups/comidas/incidente-$(date +%Y%m%d_%H%M).log 2>&1
```

**Plazos RGPD**:

- Si la brecha supone riesgo para las personas (datos personales vistos por
  quien no debía): notificación a la **AEPD en ≤ 72 h** desde que se tuvo
  constancia (sede electrónica de la AEPD).
- Si el riesgo es alto, además hay que informar a los afectados sin dilación.
- Haya o no notificación, documenta el incidente en el **registro de
  brechas**: qué pasó, cuándo, a quién afecta, qué se hizo y cuándo. Las
  horas apuntadas arriba son exactamente eso.

---

## 16. Baseline de migraciones (operación SUPERVISADA — no ejecutar en solitario)

**El problema**: `comidas_prod` nació de `prisma db push` — las tablas núcleo
no las crea ninguna migración; el historial de `prisma/migrations` solo cubre
los cambios posteriores. Consecuencia: un entorno nuevo desde cero NO es
reconstruible con `prisma migrate deploy` (asumiría tablas que ninguna
migración crea).

**La solución** es un squash a baseline: una migración `0_init` que crea TODO
el schema, marcada como ya aplicada en las BDs existentes.

```bash
# 1. Congelar deploys (no mergear nada a main durante la operación)

# 2. Backup
bash scripts/backup-prod.sh

# 3. Generar el baseline desde el schema actual
mkdir -p prisma/migrations_nuevas/0_init
pnpm prisma migrate diff --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations_nuevas/0_init/migration.sql

# 4. Sustituir el historial por el baseline
mv prisma/migrations prisma/migrations_antiguas    # conservar hasta verificar
mv prisma/migrations_nuevas prisma/migrations

# 5. Marcar el baseline como YA APLICADO — en dev Y en prod, ANTES del
#    siguiente deploy:
pnpm prisma migrate resolve --applied 0_init       # local → comidas_dev
# …y en la terminal del contenedor en Coolify:
prisma migrate resolve --applied 0_init            # prod → comidas_prod

# 6. Verificación
pnpm prisma migrate status   # "Database schema is up to date!" en ambos
# + smoke tras el siguiente deploy: /api/health con ok:true, login y un par
#   de pantallas con datos reales.
```

> ⚠️ **Por qué es supervisado**: si el baseline llega a main SIN haber hecho
> antes el `resolve --applied` en prod, el siguiente deploy intentará
> ejecutar `0_init` sobre una BD que ya tiene todas las tablas,
> `migrate deploy` fallará y el entrypoint abortará el arranque (el fail-fast
> de §13). El paso 5 en prod tiene que ocurrir **antes** de que el commit del
> baseline se despliegue.

---

## 17. Cron de jobs de aplicación

Los jobs viven DENTRO de la app, en `/api/cron/<job>`, protegidos con
`Authorization: Bearer $CRON_SECRET` (env var en Coolify; ver `env.example`).
El host solo dispara cada endpoint con `curl` — misma mecánica que el cron
del backup (§4).

| Job | Ruta | Cadencia |
|---|---|---|
| Cierre de pedidos | `/api/cron/lock-orders` | cada 5 min |
| Facturación mensual | `/api/cron/monthly-billing` | día 1, 02:00 |
| Snapshot MRR | `/api/cron/mrr-snapshot` | diario, 23:50 |
| Retención de datos | `/api/cron/retention` | domingo, 04:00 |

Crontab en el servidor (`crontab -e`, el mismo host que el cron del backup):

```cron
CRON_SECRET=<el mismo valor que en Coolify>

*/5 * * * * curl -fsS -m 300 -H "Authorization: Bearer $CRON_SECRET" https://www.plati.es/api/cron/lock-orders >/dev/null
0 2 1 * *   curl -fsS -m 300 -H "Authorization: Bearer $CRON_SECRET" https://www.plati.es/api/cron/monthly-billing >/dev/null
50 23 * * * curl -fsS -m 300 -H "Authorization: Bearer $CRON_SECRET" https://www.plati.es/api/cron/mrr-snapshot >/dev/null
0 4 * * 0   curl -fsS -m 300 -H "Authorization: Bearer $CRON_SECRET" https://www.plati.es/api/cron/retention >/dev/null
```

Ver el resultado de las ejecuciones (tabla `job_runs`):

```bash
PG=$(docker ps --filter "name=fws4wwks04kwkg8ss0sk004c" --format '{{.ID}}' | head -1)
docker exec -i $PG psql -U postgres -d comidas_prod \
  -c 'SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 20;'
```

Problemas típicos:

- `curl` devuelve 401 → el `CRON_SECRET` del crontab no coincide con el de
  Coolify.
- Un job no aparece en `job_runs` → el cron del host no lo está disparando:
  revisa `crontab -l` y el log del cron del sistema.

---

## 18. Particionado de tablas de histórico (PREPARADO — ejecutar solo con volumen real)

`audit_logs`, `order_history` y `notifications` crecen sin cota (~3M filas/año
por tabla con 3.000 pedidos/día). El job `retention` (§17) ya poda
`notifications` y `order_history` según las políticas de admin; el particionado
solo compensa cuando la poda no basta (retenciones legales largas + volumen
alto). **Señal para ejecutarlo:** cualquiera de las tres tablas supera ~5M
filas o el visor de auditoría/compliance se degrada pese a los índices.

Postgres NO permite convertir una tabla existente en particionada: hay que
recrear y copiar. Procedimiento (misma filosofía que el restore del §5 —
reversible en cada paso, y SUPERVISADO como el §16):

1. Congelar deploys + backup (§4).
2. Crear la tabla nueva particionada por rango mensual sobre la columna de
   fecha (`timestamp` / `changed_at` / `created_at`):
   `CREATE TABLE audit_logs_p (LIKE audit_logs INCLUDING ALL) PARTITION BY RANGE ("timestamp");`
   + una partición por mes existente y la `DEFAULT`.
3. Copiar por lotes (`INSERT INTO audit_logs_p SELECT * FROM audit_logs WHERE
   timestamp >= ... AND timestamp < ...` mes a mes, con pausas).
4. En ventana de mantenimiento (§10): copiar el delta desde el inicio de la
   copia, `ALTER TABLE audit_logs RENAME TO audit_logs_old;` +
   `ALTER TABLE audit_logs_p RENAME TO audit_logs;`, re-`GRANT` al usuario de
   la app, smoke del visor de auditoría.
5. Conservar `audit_logs_old` 48 h y borrarla después.
6. Mantenimiento continuo: crear la partición del mes siguiente por
   adelantado (añadir al cron mensual) y archivar/`DETACH` particiones
   antiguas a almacenamiento frío si aplica.

Prisma no gestiona particiones: quedan fuera del schema (como los índices
parciales) y las migraciones futuras sobre esas tablas deben revisarse a mano.
