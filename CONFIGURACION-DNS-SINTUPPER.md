# 🌐 Configuración DNS para sintupper.com

## 📋 Tabla de Contenidos

1. [Subdominios Requeridos](#subdominios-requeridos)
2. [Configuración en tu Proveedor DNS](#configuración-en-tu-proveedor-dns)
3. [Configuración en Coolify](#configuración-en-coolify)
4. [Verificación](#verificación)
5. [Credenciales de Acceso](#credenciales-de-acceso)

---

## 🎯 Subdominios Requeridos

Según tu base de datos actual (definida en `prisma/seed.ts`), necesitas configurar estos subdominios:

### 1. **admin.sintupper.com** (Portal Root/Super Admin)
- **Tenant ID:** ROOT
- **Tipo:** Portal de administración general
- **Usuarios:** Super Administrador
- **Función:** Gestión de todos los tenants, configuración global

### 2. **acme.sintupper.com** (Portal Empresa ACME)
- **Tenant ID:** ACME Corporation
- **Tipo:** Portal de empresa
- **Usuarios:** RRHH, Finanzas, Empleados
- **Función:** Gestión de empleados, políticas de comida, dashboard empresa

### 3. **deliciasexpress.sintupper.com** (Portal Catering)
- **Tenant ID:** Delicias Express
- **Tipo:** Portal de catering
- **Usuarios:** Chef, Personal de reparto
- **Función:** Gestión de menús, pedidos, entregas

### 4. **sintupper.com** (Landing Page)
- **Tipo:** Página principal pública
- **Función:** Landing page, información del servicio, registro

---

## ⚙️ Configuración en tu Proveedor DNS

Debes crear registros **A** o **CNAME** en tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.)

### Opción A: Registros A (Recomendado para Coolify)

Agrega estos registros **A** apuntando a la IP de tu servidor Coolify:

```
Tipo    Nombre                  Valor            TTL
────────────────────────────────────────────────────
A       @                       5.78.124.107     3600
A       admin                   5.78.124.107     3600
A       acme                    5.78.124.107     3600
A       deliciasexpress         5.78.124.107     3600
A       *                       5.78.124.107     3600
```

**Explicación:**
- `@` → Dominio raíz (`sintupper.com`)
- `admin` → Subdominio admin (`admin.sintupper.com`)
- `acme` → Subdominio ACME (`acme.sintupper.com`)
- `deliciasexpress` → Subdominio catering (`deliciasexpress.sintupper.com`)
- `*` → Wildcard para futuros subdominios (opcional pero recomendado)

### Opción B: Registro CNAME (Alternativa)

Si tu proveedor no permite A records para subdominios, usa CNAME:

```
Tipo    Nombre                  Valor                           TTL
────────────────────────────────────────────────────────────────────
A       @                       5.78.124.107                    3600
CNAME   admin                   sintupper.com                   3600
CNAME   acme                    sintupper.com                   3600
CNAME   deliciasexpress         sintupper.com                   3600
```

### 📸 Ejemplo Visual (Cloudflare)

```
┌────────────────────────────────────────────────────────────┐
│ DNS Records                                                 │
├────────┬─────────────────┬──────────────────┬─────────────┤
│ Type   │ Name            │ Content          │ Proxy       │
├────────┼─────────────────┼──────────────────┼─────────────┤
│ A      │ @               │ 5.78.124.107     │ DNS only    │
│ A      │ admin           │ 5.78.124.107     │ DNS only    │
│ A      │ acme            │ 5.78.124.107     │ DNS only    │
│ A      │ deliciasexpress │ 5.78.124.107     │ DNS only    │
│ A      │ *               │ 5.78.124.107     │ DNS only    │
└────────┴─────────────────┴──────────────────┴─────────────┘
```

⚠️ **IMPORTANTE:** Si usas Cloudflare, asegúrate de:
- Desactivar el proxy (nube gris) para todos los registros
- SSL/TLS Mode: "Full" o "Full (Strict)"

---

## 🚀 Configuración en Coolify

### 1. Actualizar Variables de Entorno

En la configuración de tu aplicación en Coolify, actualiza:

```env
# Variable WILDCARD_DOMAIN
WILDCARD_DOMAIN=.sintupper.com

# NextAuth URL (opcional, se puede detectar automáticamente)
NEXTAUTH_URL=https://sintupper.com
```

### 2. Configurar Dominios en Coolify

En la sección **Domains** de tu aplicación:

1. **Dominio Principal:**
   ```
   sintupper.com
   ```

2. **Dominios Adicionales** (opcional, Coolify puede usar wildcard):
   ```
   admin.sintupper.com
   acme.sintupper.com
   deliciasexpress.sintupper.com
   *.sintupper.com
   ```

### 3. Habilitar HTTPS

- Coolify generará automáticamente certificados SSL con Let's Encrypt
- Espera 2-5 minutos después de configurar los dominios
- Verifica que el estado sea "SSL Active" 🟢

---

## ✅ Verificación

### 1. Verificar Propagación DNS

Espera 5-10 minutos (a veces hasta 24h) y verifica:

```bash
# Verificar dominio principal
nslookup sintupper.com

# Verificar subdominios
nslookup admin.sintupper.com
nslookup acme.sintupper.com
nslookup deliciasexpress.sintupper.com
```

**Resultado esperado:**
```
Name:   admin.sintupper.com
Address: 5.78.124.107
```

### 2. Verificar en Navegador

Accede a cada URL y verifica que cargue:

✅ **Landing Page:**
```
https://sintupper.com
```
→ Debería mostrar la landing page

✅ **Portal Admin:**
```
https://admin.sintupper.com/login
```
→ Debería mostrar el login

✅ **Portal ACME:**
```
https://acme.sintupper.com/empleado
```
→ Debería mostrar el portal de empleado

✅ **Portal Catering:**
```
https://deliciasexpress.sintupper.com/catering
```
→ Debería mostrar el portal de catering

---

## 🔑 Credenciales de Acceso

### Super Administrador (admin.sintupper.com)
```
URL:      https://admin.sintupper.com/login
Email:    admin@sintupper.com
Password: Admin123!
```

### ACME Corporation (acme.sintupper.com)

**RRHH:**
```
Email:    rrhh@acme.com
Password: Rrhh123!
```

**Finanzas:**
```
Email:    finanzas@acme.com
Password: Finanzas123!
```

**Empleado 1:**
```
Email:    laura.gomez@acme.com
Password: Empleado123!
```

**Empleado 2:**
```
Email:    pedro.martinez@acme.com
Password: Empleado123!
```

### Delicias Express (deliciasexpress.sintupper.com)

**Chef:**
```
Email:    chef@deliciasexpress.com
Password: Chef123!
```

**Reparto:**
```
Email:    reparto@deliciasexpress.com
Password: Reparto123!
```

---

## 🔧 Solución de Problemas

### Error: "Tenant no encontrado"

**Causa:** El subdominio no está en la base de datos o DNS no resuelve correctamente.

**Solución:**
1. Verifica que el DNS esté propagado: `nslookup admin.sintupper.com`
2. Verifica que el subdominio exista en la tabla `tenants`:
   ```sql
   SELECT subdomain, name, status FROM tenants;
   ```
3. Si el tenant no existe, añádelo en Coolify o ejecuta el seed nuevamente.

### Error: "502 Bad Gateway"

**Causa:** La aplicación no está corriendo o Coolify no puede enrutar el tráfico.

**Solución:**
1. Verifica que el contenedor esté activo en Coolify (estado: Healthy ✅)
2. Revisa los logs del contenedor
3. Verifica que `WILDCARD_DOMAIN` esté configurado correctamente

### Error: "SSL Certificate Error"

**Causa:** Certificado SSL no generado o no válido.

**Solución:**
1. En Coolify, fuerza la regeneración del certificado
2. Verifica que los registros DNS apunten correctamente
3. Espera 5-10 minutos para que Let's Encrypt genere el certificado

---

## 📝 Checklist de Implementación

- [ ] Configurar registros DNS (A o CNAME)
- [ ] Esperar propagación DNS (5-10 min)
- [ ] Actualizar `WILDCARD_DOMAIN` en Coolify
- [ ] Configurar dominios en Coolify
- [ ] Habilitar HTTPS (Let's Encrypt)
- [ ] Verificar acceso a `sintupper.com`
- [ ] Verificar acceso a `admin.sintupper.com`
- [ ] Verificar acceso a `acme.sintupper.com`
- [ ] Verificar acceso a `deliciasexpress.sintupper.com`
- [ ] Hacer login con cada usuario de prueba
- [ ] Verificar que cada portal muestre su contenido correcto

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu aplicación estará accesible en:

- 🌐 **Landing:** https://sintupper.com
- 👨‍💼 **Admin:** https://admin.sintupper.com
- 🏢 **Empresa (ACME):** https://acme.sintupper.com
- 🍴 **Catering:** https://deliciasexpress.sintupper.com

**¿Necesitas añadir más tenants?**

1. Accede al panel admin: `https://admin.sintupper.com`
2. Login con `admin@sintupper.com`
3. Ve a la sección **Tenants**
4. Crea un nuevo tenant con su subdominio
5. Configura el subdominio en DNS (si no usas wildcard `*`)

---

**Última actualización:** Noviembre 2024
**Dominio:** sintupper.com
**Servidor:** 5.78.124.107

