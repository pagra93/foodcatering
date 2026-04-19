# Runbook operativo

Comandos copy-paste por escenario. Si algo no está aquí y lo usas más de una
vez, añádelo.

Arquitectura asumida: la descrita en `ARQUITECTURA-ENTORNOS.md` (dev =
`comidas_dev` en Hetzner, prod = `comidas_prod` en Coolify).

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
Verifica en `https://sintupper.com` y revisa los logs del service en Coolify
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
      email: 'admin@sintupper.com',
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

Via panel super admin en `https://sintupper.com/admin/tenants/new`. El
formulario:

1. Nombre de la empresa/catering.
2. Subdominio (`acme` → `acme.sintupper.com`).
3. Tipo (`EMPRESA` o `CATERING`).
4. Datos de contacto.

Al guardar, se crea el `Tenant` + su `Company` / `Restaurant` asociado con
defaults mínimos. Luego hay que completar `legalName`, `cif`,
`billingAddress` desde el detalle del tenant.

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
