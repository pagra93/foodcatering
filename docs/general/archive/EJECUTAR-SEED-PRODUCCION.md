# 🌱 Ejecutar Seed en Producción

## ¿Qué hace el seed?

El seed completo crea **datos realistas** para testing:

- ✅ **3 tenants**: Root, ACME Corporation, Delicias Express
- ✅ **10 empleados** de ACME con datos variados
- ✅ **12 platos** del catering (primeros, segundos, postres)
- ✅ **~140 pedidos históricos** (últimos 20 días laborables)
- ✅ **Ratings y feedback** en el 60% de los pedidos
- ✅ **3 incidencias** resueltas de ejemplo
- ✅ **Relación activa** ACME ↔ Delicias Express
- ✅ **Company policy y settings** configurados

---

## 📋 Paso 1: Conectar a Coolify

```bash
ssh root@5.78.124.107
```

---

## 📋 Paso 2: Encontrar el Contenedor

```bash
# Listar contenedores de tu aplicación
docker ps | grep comidas

# O buscar por nombre
docker ps -a | grep sintupper
```

Copia el **CONTAINER ID** o **NAME** (algo como `comidas-app-xxxxx`).

---

## 📋 Paso 3: Ejecutar Seed

### Opción A: Seed Completo (Recomendado para primera vez)

```bash
# Entrar al contenedor
docker exec -it CONTAINER_ID sh

# Dentro del contenedor:
npx prisma migrate reset --force --skip-seed
npx prisma db push --accept-data-loss
npm run db:seed

# Salir
exit
```

### Opción B: Solo Seed (si ya hay schema)

```bash
docker exec -it CONTAINER_ID sh
npm run db:seed
exit
```

### Opción C: Comando Directo (Una línea)

```bash
docker exec -it CONTAINER_ID npm run db:seed
```

---

## 📋 Paso 4: Verificar

Accede a la aplicación y verifica:

### 1. Login Admin

```
URL: https://sintupper.com/login
Email: admin@sintupper.com
Password: Admin123!
```

### 2. Login Empresa ACME

```
URL: https://acme.sintupper.com/login
Email: rrhh@acme.com
Password: Rrhh123!
```

**Verifica que veas:**
- ✅ Dashboard con KPIs poblados
- ✅ Empleados (10 empleados)
- ✅ Pedidos (~140 pedidos históricos)
- ✅ Facturación con datos
- ✅ Incidencias (3 incidencias)
- ✅ Actividad reciente

### 3. Login Catering

```
URL: https://deliciasexpress.sintupper.com/login
Email: chef@deliciasexpress.com
Password: Chef123!
```

---

## 🔑 Credenciales Completas

### Root (Admin Plataforma)
- 📧 `admin@sintupper.com` / `Admin123!`

### ACME Corporation (Empresa)
- 📧 `rrhh@acme.com` / `Rrhh123!` (RRHH)
- 📧 `finanzas@acme.com` / `Finanzas123!` (Finanzas)
- 📧 `laura.gomez@acme.com` / `Empleado123!` (Empleado)
- 📧 `pedro.martinez@acme.com` / `Empleado123!` (Empleado)
- 📧 `ana.rodriguez@acme.com` / `Empleado123!` (Empleado)
- ... +7 empleados más (todos con `Empleado123!`)

### Delicias Express (Catering)
- 📧 `chef@deliciasexpress.com` / `Chef123!` (Chef)
- 📧 `reparto@deliciasexpress.com` / `Reparto123!` (Repartidor)

---

## ⚠️ Troubleshooting

### Error: "prisma command not found"

```bash
# El seed se ejecuta desde /app en el contenedor
docker exec -it CONTAINER_ID sh
cd /app
npm run db:seed
```

### Error: "DATABASE_URL not set"

La variable debe estar configurada en Coolify. Verifica en:
**Coolify → Tu App → Environment Variables → DATABASE_URL**

### Error: "Permission denied"

```bash
# Ejecuta como root
docker exec -u root -it CONTAINER_ID sh
```

### Quiero borrar TODO y empezar de cero

```bash
docker exec -it CONTAINER_ID sh
npx prisma migrate reset --force --skip-seed
npx prisma db push --accept-data-loss
npm run db:seed
exit
```

---

## 📊 Datos Generados

| Tabla | Registros |
|-------|-----------|
| Tenants | 3 |
| Users | 13 |
| Employees | 10 |
| Dishes | 12 |
| Orders | ~140 |
| Delivery Proofs | ~133 |
| Order Ratings | ~80 |
| Incidents | 3 |
| Restaurant Documents | 2 |
| Company Sites | 1 |
| Company Policies | 1 |
| Company Settings | 1 |
| Catering Assignments | 1 |

---

## ✅ Siguiente Paso

Una vez ejecutado el seed, **refresca la aplicación** y navega por:

1. **Dashboard** → Deberías ver KPIs con datos reales
2. **Empleados** → 10 empleados listados
3. **Pedidos** → ~140 pedidos con filtros funcionales
4. **Facturación** → Gráficas con datos
5. **Incidencias** → 3 incidencias resueltas
6. **Catering** → Info de Delicias Express

¡Todo debería funcionar con datos reales! 🎉

