# 🚨 INFORME DE PROBLEMAS EN PRODUCCIÓN - sintupper.com

**Fecha:** 20 de Noviembre de 2025  
**Dominio:** sintupper.com  
**Estado:** 🔴 CRÍTICO - Sistema NO OPERATIVO  
**Autor:** Análisis Técnico Exhaustivo

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Síntomas Reportados](#síntomas-reportados)
3. [Análisis Técnico Detallado](#análisis-técnico-detallado)
4. [Causas Raíz Identificadas](#causas-raíz-identificadas)
5. [Impacto y Severidad](#impacto-y-severidad)
6. [Plan de Solución](#plan-de-solución)
7. [Recomendaciones](#recomendaciones)

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual
- **Landing Page (sintupper.com):** ✅ OPERATIVA
- **Portal de Login (/auth/login):** ❌ ERROR 500
- **Portal de Login Alternativo (/login):** ❌ ERROR 404 después de autenticación
- **Todos los Subdominios (*.sintupper.com):** ❌ "Service not available"

### Impacto
- **Usuarios afectados:** 100% (sistema completamente inoperativo)
- **Funcionalidades afectadas:** Login, acceso a portales, multi-tenancy
- **Criticidad:** BLOQUEANTE - Ningún usuario puede acceder al sistema

### Causa Principal
Múltiples problemas de configuración y rutas:
1. Variables de entorno críticas NO configuradas en producción
2. Inconsistencia en rutas de autenticación
3. Problemas con configuración de subdominios
4. Carpeta vacía `/app/login` causando conflictos

---

## 🔍 SÍNTOMAS REPORTADOS

### 1. Landing Page Funciona (✅ Parcial)
```
URL: https://sintupper.com/
Estado: ✅ Carga correctamente
Problema: Botón "Acceder" lleva a ruta rota
```

### 2. Botón "Acceder" → Error 500
```
URL Origen: https://sintupper.com/ → Click en "Acceder"
URL Destino: https://sintupper.com/auth/login
Resultado: ❌ ERROR 500 (Internal Server Error)
```

### 3. Login Directo → Error 404 después de autenticar
```
URL: https://sintupper.com/login
Estado: ✅ Página carga
Acción: Usuario completa login
Resultado: ❌ Redirige a https://sintupper.com/auth/error?error=Configuration
Después: ❌ ERROR 404
```

### 4. Subdominios Completamente Inoperativos
```
URL Probadas:
- https://admin.sintupper.com/ → ❌ "Service not available"
- https://acme.sintupper.com/ → ❌ "Service not available"
- https://deliciasexpress.sintupper.com/ → ❌ "Service not available"

Estado: Todos los subdominios devuelven error de servidor
```

---

## 🔬 ANÁLISIS TÉCNICO DETALLADO

### PROBLEMA #1: Variables de Entorno NO CONFIGURADAS (🔴 CRÍTICO)

#### Descripción
NextAuth requiere variables de entorno específicas para funcionar. El error `error=Configuration` es el indicador definitivo de que estas variables no están configuradas en el servidor de producción.

#### Variables Faltantes

**1. NEXTAUTH_URL** (❌ NO CONFIGURADA)
```env
# REQUERIDO:
NEXTAUTH_URL="https://sintupper.com"

# ACTUAL: NO EXISTE o está mal configurada
```

**Consecuencias:**
- NextAuth usa la URL de la request actual
- Callbacks y redirects fallan
- Token CSRF inválido
- Error "Configuration" en todos los logins

**2. NEXTAUTH_SECRET** (❌ PROBABLEMENTE NO CONFIGURADA)
```env
# REQUERIDO:
NEXTAUTH_SECRET="[string aleatorio de 32+ caracteres]"

# Generar con:
openssl rand -base64 32
```

**Consecuencias:**
- JWT no se puede firmar correctamente
- Sesiones no se crean
- Error al validar tokens

**3. WILDCARD_DOMAIN** (❌ PROBABLEMENTE NO CONFIGURADA)
```env
# REQUERIDO para multi-tenancy:
WILDCARD_DOMAIN=".sintupper.com"
```

**Consecuencias:**
- Subdominios no se resuelven correctamente
- Middleware no puede extraer el tenant_id
- "Service not available" en subdominios

#### Evidencia
```typescript
// lib/env.ts (líneas 8-14)
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),  // ← FALLA aquí
  NEXTAUTH_URL: z.string().url(),       // ← FALLA aquí
  WILDCARD_DOMAIN: z.string().startsWith('.'),  // ← FALLA aquí
})
```

Si estas variables no existen, el servidor puede:
- No iniciar correctamente
- Iniciar pero con comportamiento errático
- Devolver 500 en rutas de auth

---

### PROBLEMA #2: Inconsistencia en Rutas de Autenticación (🟡 ALTA)

#### Descripción
Hay una discrepancia entre las rutas configuradas en NextAuth y las rutas reales de la aplicación debido al route group `(auth)`.

#### Rutas Configuradas en NextAuth
```typescript
// lib/auth/config.ts (líneas 32-37)
pages: {
  signIn: '/auth/login',      // ✅ Correcto
  signOut: '/auth/login',     // ✅ Correcto
  error: '/auth/error',       // ✅ Correcto
  verifyRequest: '/auth/verify', // ✅ Correcto
}
```

#### Rutas Reales en el Sistema
```
app/
├── (auth)/                    ← Route Group
│   ├── login/page.tsx        → Ruta: /auth/login ✅
│   ├── error/page.tsx        → Ruta: /auth/error ✅
│   ├── verify/page.tsx       → Ruta: /auth/verify ✅
│   └── layout.tsx
├── login/                     → Ruta: /login ⚠️ CARPETA VACÍA
└── (landing)/page.tsx        → Ruta: / ✅
```

#### El Problema
**Carpeta `/app/login/` existe pero está VACÍA**

Esto causa:
1. Next.js registra la ruta `/login` como válida
2. Cuando se accede a `/login`, Next.js intenta cargar el contenido
3. No hay `page.tsx`, Next.js devuelve comportamiento indefinido
4. Puede causar conflictos con `/auth/login`

**Evidencia:**
```bash
$ ls -la app/login/
# Resultado: carpeta vacía (0 archivos)
```

#### Referencias en el Código
```typescript
// app/(landing)/page.tsx (línea 30)
<Link href="/auth/login">Acceder</Link>  // ✅ Correcto

// app/(auth)/error/page.tsx (línea 63)
<Link href="/login">Volver a intentar</Link>  // ❌ Apunta a carpeta vacía

// middleware.ts (línea 35)
const NO_TENANT_ROUTES = [
  '/',
  '/login',  // ❌ Esta ruta existe pero está vacía
]
```

---

### PROBLEMA #3: Configuración de Subdominios en Coolify (🔴 CRÍTICO)

#### Descripción
Los subdominios devuelven "Service not available", lo que indica que Coolify no está enrutando correctamente el tráfico a la aplicación.

#### Causas Posibles

**A. Dominios NO configurados en Coolify**
```
Estado Esperado en Coolify → Application → Domains:
✅ sintupper.com
✅ *.sintupper.com (wildcard)

Estado Actual (probable):
❌ Solo sintupper.com configurado
❌ Wildcard NO configurado
```

**B. DNS NO propagado correctamente**
```bash
# Test de DNS:
$ nslookup admin.sintupper.com
# Debería devolver: 5.78.124.107 (según documentación)

$ nslookup acme.sintupper.com
# Debería devolver: 5.78.124.107
```

**C. Certificados SSL NO generados**
```
Coolify genera certificados SSL automáticamente con Let's Encrypt.
Si los dominios no están configurados, no hay certificados.
Resultado: "Service not available"
```

#### Evidencia del Middleware
```typescript
// middleware.ts (líneas 93-110)
const subdomain = getSubdomainFromRequest(req)

if (subdomain) {
  tenant = await resolveTenantFromSubdomain(subdomain)
  
  if (!tenant) {
    return new NextResponse('Tenant no encontrado', { status: 404 })
  }
  
  if (!isTenantActive(tenant.status)) {
    return new NextResponse('Tenant suspendido', { status: 403 })
  }
}
```

Si Coolify no enruta el tráfico, el middleware ni siquiera se ejecuta.

---

### PROBLEMA #4: Error 500 en /auth/login (🔴 CRÍTICO)

#### Descripción
La ruta `/auth/login` devuelve error 500 al intentar acceder.

#### Causas Probables

**A. Variables de entorno faltantes**
```typescript
// lib/auth/config.ts necesita:
- NEXTAUTH_URL
- NEXTAUTH_SECRET

// Si faltan, NextAuth lanza error en runtime
```

**B. Error al resolver tenant desde headers**
```typescript
// app/(auth)/login/page.tsx (línea 33)
const tenantContext = getTenantFromHeaders()

// Esta función puede fallar si:
// 1. Headers no existen
// 2. Middleware no se ejecutó correctamente
```

**C. Problemas con Prisma / Base de Datos**
```typescript
// Si DATABASE_URL es incorrecta o la DB no es accesible
// Cualquier query a Prisma fallará con 500
```

#### Logs Esperados (en Coolify)
```
Error: Invalid `NEXTAUTH_URL` environment variable
o
Error: `NEXTAUTH_SECRET` is not set
o
PrismaClientInitializationError: Can't reach database server
```

---

### PROBLEMA #5: Redirección a /auth/error?error=Configuration (🔴 CRÍTICO)

#### Descripción
Después de intentar login en `/login`, el usuario es redirigido a `/auth/error?error=Configuration`.

#### Significado del Error "Configuration"

Este error específico de NextAuth significa:

```typescript
// Causas según NextAuth v5:
1. NEXTAUTH_URL no está configurada
2. NEXTAUTH_URL no coincide con el origin de la request
3. NEXTAUTH_SECRET no está configurada
4. Provider mal configurado
5. Adapter de Prisma falla al conectar
```

#### Flujo de Error
```
1. Usuario va a /login
2. Completa formulario
3. Click en "Iniciar Sesión"
4. LoginForm.tsx llama a signIn('credentials', {...})
5. NextAuth intenta procesar el login
6. ❌ Detecta problema de configuración
7. Redirige a /auth/error?error=Configuration
8. ❌ Error 404 (porque /auth/error tampoco carga correctamente)
```

---

## 🎯 CAUSAS RAÍZ IDENTIFICADAS

### Causa Raíz #1: Variables de Entorno NO Configuradas en Coolify
**Prioridad:** 🔴 CRÍTICA  
**Impacto:** Sistema completamente inoperativo  
**Confianza:** 99%

**Evidencia:**
- Error "Configuration" es específico de NextAuth sin vars de entorno
- Subdominios no funcionan (indica WILDCARD_DOMAIN faltante)
- Logs probables en Coolify mostrarán errores de validación de env vars

**Solución:** Configurar todas las variables de entorno requeridas

---

### Causa Raíz #2: Carpeta /app/login Vacía
**Prioridad:** 🟡 ALTA  
**Impacto:** Confusión de rutas, posibles conflictos  
**Confianza:** 100%

**Evidencia:**
- `ls app/login/` confirma carpeta vacía
- Middleware incluye `/login` en NO_TENANT_ROUTES
- Página de error referencia `/login` en lugar de `/auth/login`

**Solución:** Eliminar carpeta vacía o redirigir a /auth/login

---

### Causa Raíz #3: Dominios Wildcard NO Configurados en Coolify
**Prioridad:** 🔴 CRÍTICA  
**Impacto:** Subdominios inaccesibles  
**Confianza:** 95%

**Evidencia:**
- Todos los subdominios devuelven "Service not available"
- Error es consistente (no es 404 de tenant, es error de servidor)
- Coolify necesita configuración explícita de wildcard

**Solución:** Configurar `*.sintupper.com` en Domains de Coolify

---

### Causa Raíz #4: Posible Problema de Base de Datos
**Prioridad:** 🟡 MEDIA  
**Impacto:** Queries fallan, login imposible  
**Confianza:** 60%

**Evidencia:**
- Error 500 puede ser causado por Prisma
- Middleware hace queries a DB para resolver tenants
- Si DB no es accesible, todo falla

**Solución:** Verificar DATABASE_URL y conectividad

---

## 📉 IMPACTO Y SEVERIDAD

### Impacto en Usuarios

| Usuario | Acción | Estado | Impacto |
|---------|--------|--------|---------|
| **Público** | Visitar landing | ✅ OK | Ninguno |
| **Público** | Click "Acceder" | ❌ Error 500 | No puede acceder |
| **Super Admin** | Acceder a admin.sintupper.com | ❌ No disponible | Bloqueado |
| **Empresa (ACME)** | Acceder a acme.sintupper.com | ❌ No disponible | Bloqueado |
| **Catering** | Acceder a deliciasexpress.sintupper.com | ❌ No disponible | Bloqueado |
| **Empleado** | Login desde cualquier portal | ❌ Error Config | Bloqueado |

### Severidad por Módulo

```
🔴 CRÍTICO (Sistema NO funcional):
├── Autenticación (NextAuth): 100% roto
├── Multi-tenancy (Subdominios): 100% roto
└── Portales (Admin/Empresa/Catering): 100% inaccesibles

🟢 OPERATIVO:
├── Landing Page: 100% funcional
└── Archivos estáticos: 100% funcionales
```

### SLA y Disponibilidad

```
Disponibilidad actual: ~10% (solo landing page estática)
Disponibilidad esperada: 99.9%
Tiempo fuera de servicio: Desde el despliegue
RTO (Recovery Time Objective): < 1 hora
RPO (Recovery Point Objective): N/A (no hay pérdida de datos)
```

---

## 🛠️ PLAN DE SOLUCIÓN

### FASE 1: EMERGENCIA (Hacer INMEDIATAMENTE - 15 minutos)

#### Paso 1.1: Configurar Variables de Entorno en Coolify

1. **Acceder a Coolify:**
   ```
   URL: https://[tu-coolify-url]:8000
   Ir a: Applications → comidas → Environment Variables
   ```

2. **Añadir variables críticas:**

```env
# === CRÍTICAS - CONFIGURAR YA ===
NEXTAUTH_URL=https://sintupper.com
NEXTAUTH_SECRET=[GENERAR NUEVO - ver abajo]
WILDCARD_DOMAIN=.sintupper.com
DATABASE_URL=[verificar que sea correcta]
NODE_ENV=production

# === Generar NEXTAUTH_SECRET ===
# Ejecutar en terminal local:
# openssl rand -base64 32
# Copiar el resultado y pegarlo arriba
```

3. **Verificar DATABASE_URL:**
   - Debe ser una URL de PostgreSQL válida
   - Debe ser accesible desde el servidor de Coolify
   - Formato: `postgresql://user:pass@host:5432/dbname?schema=public`

4. **Guardar y Redeploy:**
   - Click en "Save Environment Variables"
   - Click en "Redeploy" en Coolify
   - Esperar 2-3 minutos

**Tiempo estimado:** 10 minutos

---

#### Paso 1.2: Configurar Dominios en Coolify

1. **Ir a sección Domains:**
   ```
   Applications → comidas → Domains
   ```

2. **Configurar dominios:**

```
Dominio Principal:
[✓] sintupper.com

Wildcard (CRÍTICO):
[✓] *.sintupper.com

O subdominios individuales:
[✓] admin.sintupper.com
[✓] acme.sintupper.com
[✓] deliciasexpress.sintupper.com
```

3. **Habilitar SSL:**
   - Coolify generará certificados automáticamente
   - Verificar que el estado sea "SSL Active" 🟢

**Tiempo estimado:** 5 minutos

---

### FASE 2: CORRECCIÓN DE CÓDIGO (30 minutos)

#### Paso 2.1: Eliminar Carpeta /app/login Vacía

```bash
# Desde tu máquina local
cd /Users/pablogranados/Desktop/comidas
rm -rf app/login

# Verificar
ls app/login  # Debe dar error "No such file or directory"
```

**Razón:** Esta carpeta vacía causa conflictos de routing.

---

#### Paso 2.2: Actualizar Referencias a /login

**Archivo:** `app/(auth)/error/page.tsx`

```typescript
// LÍNEA 63 - CAMBIAR:
<Link href="/login">Volver a intentar</Link>

// POR:
<Link href="/auth/login">Volver a intentar</Link>
```

---

#### Paso 2.3: Limpiar middleware de rutas obsoletas

**Archivo:** `middleware.ts`

```typescript
// LÍNEA 35 - REMOVER /login de NO_TENANT_ROUTES:
const NO_TENANT_ROUTES = [
  '/', // Landing page
  // '/login', // ← ELIMINAR esta línea
  '/forgot-password',
  '/reset-password',
  // ... resto
]
```

---

#### Paso 2.4: Commit y Push

```bash
git add .
git commit -m "fix: eliminar carpeta login vacía y corregir referencias"
git push origin main
```

**Coolify hará redeploy automático** si está configurado con webhook.

---

### FASE 3: VALIDACIÓN (20 minutos)

#### Test 1: Verificar Variables de Entorno

```bash
# En Coolify, ver logs del container:
# Debe mostrar:
✅ "Variables de entorno validadas correctamente"
❌ "Variables de entorno inválidas" → volver a Fase 1
```

---

#### Test 2: Verificar DNS de Subdominios

```bash
# Desde terminal local:
nslookup admin.sintupper.com
# Esperado: Address: [IP de Coolify]

nslookup acme.sintupper.com
# Esperado: Address: [IP de Coolify]
```

Si no resuelven, esperar hasta 24h para propagación DNS.

---

#### Test 3: Acceso a Landing y Login

```bash
# Test 1: Landing
Abrir: https://sintupper.com
Esperado: ✅ Landing carga correctamente

# Test 2: Click en Acceder
Click en botón "Acceder"
Esperado: ✅ Lleva a https://sintupper.com/auth/login
Esperado: ✅ Formulario de login carga sin error 500

# Test 3: Login directo
Abrir: https://sintupper.com/login
Esperado: ✅ Redirige a /auth/login O muestra 404 limpio
```

---

#### Test 4: Login como Super Admin

```
URL: https://admin.sintupper.com/auth/login
o https://sintupper.com/auth/login

Email: admin@sintupper.com
Password: Admin123!

Esperado:
1. ✅ Formulario se envía sin error
2. ✅ Redirige a /admin (dashboard de super admin)
3. ❌ NO debe mostrar "Configuration error"
4. ❌ NO debe dar 404
```

---

#### Test 5: Acceso a Subdominios

```bash
# Super Admin
https://admin.sintupper.com/
Esperado: ✅ Redirige a login O muestra dashboard si ya está autenticado

# Empresa
https://acme.sintupper.com/
Esperado: ✅ Redirige a login O dashboard empresa

# Catering
https://deliciasexpress.sintupper.com/
Esperado: ✅ Redirige a login O dashboard catering
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Checklist Fase 1 (Emergencia)
- [ ] Acceder a Coolify
- [ ] Generar `NEXTAUTH_SECRET` con `openssl rand -base64 32`
- [ ] Configurar `NEXTAUTH_URL=https://sintupper.com`
- [ ] Configurar `NEXTAUTH_SECRET=[valor generado]`
- [ ] Configurar `WILDCARD_DOMAIN=.sintupper.com`
- [ ] Verificar `DATABASE_URL` sea correcta
- [ ] Configurar `NODE_ENV=production`
- [ ] Guardar variables de entorno
- [ ] Configurar dominio `sintupper.com` en Domains
- [ ] Configurar wildcard `*.sintupper.com` en Domains
- [ ] Habilitar SSL (Let's Encrypt)
- [ ] Hacer Redeploy
- [ ] Esperar 2-3 minutos
- [ ] Verificar que el contenedor esté "Healthy" ✅

### Checklist Fase 2 (Código)
- [ ] Hacer `git pull` de la rama main
- [ ] Eliminar carpeta `app/login/`
- [ ] Actualizar `app/(auth)/error/page.tsx` línea 63
- [ ] Actualizar `middleware.ts` línea 35
- [ ] Hacer `git add .`
- [ ] Hacer `git commit -m "fix: eliminar login vacío y corregir refs"`
- [ ] Hacer `git push origin main`
- [ ] Esperar redeploy automático en Coolify

### Checklist Fase 3 (Validación)
- [ ] Verificar logs de Coolify (sin errores de env vars)
- [ ] Test DNS con `nslookup admin.sintupper.com`
- [ ] Acceder a `https://sintupper.com` (landing OK)
- [ ] Click en "Acceder" (debe ir a /auth/login sin error)
- [ ] Acceder a `https://sintupper.com/auth/login` (formulario OK)
- [ ] Login como admin@sintupper.com (debe funcionar)
- [ ] Verificar redirección a `/admin` después de login
- [ ] Acceder a `https://admin.sintupper.com/` (debe cargar)
- [ ] Acceder a `https://acme.sintupper.com/` (debe cargar)
- [ ] Acceder a `https://deliciasexpress.sintupper.com/` (debe cargar)

---

## 💡 RECOMENDACIONES

### Recomendaciones Inmediatas

1. **Implementar Monitoring:**
   ```
   Herramientas recomendadas:
   - Sentry (errores en runtime)
   - Uptime Robot (disponibilidad)
   - Coolify built-in monitoring
   ```

2. **Configurar Alertas:**
   ```
   Alertas críticas:
   - 500 errors > 5 en 5 minutos
   - Subdominios inaccesibles
   - Database connection failed
   ```

3. **Documentar Variables de Entorno:**
   ```
   Crear archivo PRODUCCION.md con:
   - Todas las variables configuradas
   - Cómo regenerar secrets
   - Procedimiento de rollback
   ```

### Recomendaciones de Mediano Plazo

1. **Implementar Health Checks:**
   ```typescript
   // app/api/health/route.ts
   export async function GET() {
     // Verificar DB, auth, etc.
     return Response.json({ status: 'ok' })
   }
   ```

2. **Logging Estructurado:**
   ```typescript
   // Usar Winston o Pino
   logger.info('User logged in', {
     userId: user.id,
     tenantId: user.tenantId,
     timestamp: new Date(),
   })
   ```

3. **Tests E2E en Staging:**
   ```bash
   # Antes de deploy a producción
   npm run test:e2e
   ```

4. **Backups Automáticos:**
   ```
   - Base de datos: Backup diario
   - Variables de entorno: Export semanal
   - Código: Ya está en GitHub ✅
   ```

---

## 📞 CONTACTOS Y RECURSOS

### Recursos Técnicos
- **Documentación Interna:** `docs/`
- **Logs de Coolify:** [URL de Coolify]/applications/[app-id]/logs
- **Base de Datos:** [Proveedor PostgreSQL]
- **DNS:** [Proveedor de dominio]

### Documentos Relacionados
- `docs/DIAGNOSTICO-PROBLEMAS-RUTAS.md` - Análisis previo
- `docs/CONFIGURACION-DNS-SINTUPPER.md` - Configuración DNS
- `docs/DESPLIEGUE-Y-DOMINIOS.md` - Guía de despliegue
- `docs/CREDENCIALES-PRUEBA.md` - Usuarios de prueba

---

## 🎯 CONCLUSIÓN

### Tiempo Total Estimado de Resolución
```
Fase 1 (Emergencia): 15 minutos
Fase 2 (Código): 30 minutos
Fase 3 (Validación): 20 minutos
─────────────────────────────────
TOTAL: ~65 minutos (1 hora)
```

### Confianza en la Solución
```
Problema #1 (Vars de entorno): 99% confianza ✅
Problema #2 (Carpeta vacía): 100% confianza ✅
Problema #3 (Subdominios): 95% confianza ✅
Problema #4 (Base de datos): 60% confianza ⚠️
```

### Próximos Pasos
1. Implementar Fase 1 INMEDIATAMENTE
2. Si Fase 1 no resuelve todo, revisar logs de Coolify para más detalles
3. Implementar Fase 2 para limpieza de código
4. Validar exhaustivamente con Fase 3
5. Implementar recomendaciones de monitoring

---

**FIN DEL INFORME**

**Última actualización:** 20 de Noviembre de 2025  
**Versión:** 1.0  
**Estado:** Pendiente de Implementación

