# 🔑 Credenciales de Prueba - Plataforma Comidas

## 📋 Resumen General

Este documento contiene todas las credenciales de usuarios de prueba creados por el seed de la base de datos.

---

## 👨‍💼 SUPER ADMINISTRADOR (Root)

**Subdominio:** `admin.sintupper.com`  
**URL:** `https://admin.sintupper.com/login`

| Campo | Valor |
|-------|-------|
| **Email** | `admin@sintupper.com` |
| **Password** | `Admin123!` |
| **Rol** | `SUPER_ADMIN` |
| **Tenant** | ROOT |
| **Estado** | ACTIVE |

**Funciones:**
- Gestión de todos los tenants (empresas y caterings)
- Configuración global de la plataforma
- Acceso completo al sistema

---

## 🏢 EMPRESA: ACME Corporation

**Subdominio:** `acme.sintupper.com`  
**Tenant ID:** ACME Corporation  
**Tipo:** EMPRESA

### 👥 Usuarios de la Empresa

#### 1. RRHH (Recursos Humanos)
| Campo | Valor |
|-------|-------|
| **Email** | `rrhh@acme.com` |
| **Password** | `Rrhh123!` |
| **Rol** | `RRHH` |
| **Nombre** | María García (RRHH) |
| **Estado** | ACTIVE |

**Funciones:**
- Gestión de empleados
- Políticas de comida
- Dashboard empresa

---

#### 2. Finanzas
| Campo | Valor |
|-------|-------|
| **Email** | `finanzas@acme.com` |
| **Password** | `Finanzas123!` |
| **Rol** | `FINANZAS` |
| **Nombre** | Carlos López (Finanzas) |
| **Estado** | ACTIVE |

**Funciones:**
- Gestión de facturación
- Reportes financieros
- Políticas de pago

---

#### 3. Empleado 1
| Campo | Valor |
|-------|-------|
| **Email** | `laura.gomez@acme.com` |
| **Password** | `Empleado123!` |
| **Rol** | `EMPLEADO` |
| **Nombre** | Laura Gómez |
| **Estado** | ACTIVE |

**Preferencias dietéticas:**
- Restricciones: `gluten_free`
- Preferencias: `vegetarian_friendly`
- Alergias: ninguna
- Objetivo calórico: 2000 kcal

**Funciones:**
- Ver menús semanales
- Seleccionar platos diarios
- Ver historial de pedidos

---

#### 4. Empleado 2
| Campo | Valor |
|-------|-------|
| **Email** | `pedro.martinez@acme.com` |
| **Password** | `Empleado123!` |
| **Rol** | `EMPLEADO` |
| **Nombre** | Pedro Martínez |
| **Estado** | ACTIVE |

**Preferencias dietéticas:**
- Restricciones: ninguna
- Preferencias: ninguna
- Alergias: `nuts` (frutos secos)
- Objetivo calórico: 2200 kcal

**Funciones:**
- Ver menús semanales
- Seleccionar platos diarios
- Ver historial de pedidos

---

## 🍴 CATERING: Delicias Express

**Subdominio:** `deliciasexpress.sintupper.com`  
**Tenant ID:** Delicias Express  
**Tipo:** CATERING

### 👥 Usuarios del Catering

#### 1. Chef
| Campo | Valor |
|-------|-------|
| **Email** | `chef@deliciasexpress.com` |
| **Password** | `Chef123!` |
| **Rol** | `CHEF` |
| **Nombre** | Ana Rodríguez (Chef) |
| **Estado** | ACTIVE |

**Funciones:**
- Gestión de platos
- Creación de menús semanales
- Visualización de producción diaria (cocina)
- Gestión de kitchen sheets

---

#### 2. Repartidor
| Campo | Valor |
|-------|-------|
| **Email** | `reparto@deliciasexpress.com` |
| **Password** | `Reparto123!` |
| **Rol** | `REPARTIDOR` |
| **Nombre** | Miguel Torres (Repartidor) |
| **Estado** | ACTIVE |

**Funciones:**
- Ver rutas asignadas
- Confirmar entregas
- Reportar incidencias
- Ver packing sheets

---

## 📊 Datos Adicionales Creados en el Seed

### 🏢 Empresa ACME
- **Razón Social:** ACME Corporation S.L.
- **CIF:** B12345678
- **Dirección:** Calle Gran Vía 1, 28013 Madrid
- **Plan:** GROWTH
- **Sede:** Sede Central Madrid
- **Política:**
  - Cutoff time: 11:00
  - Días activos: Lunes a Jueves
  - Límite por día: 11.00€
  - Copago empresa: 6.00€
  - Copago empleado: 5.00€
  - Regla no-show: NO_CHARGE

### 🍴 Catering Delicias Express
- **Nombre:** Delicias Express Madrid
- **Zonas:** 28001, 28002, 28003, 28013
- **Documentos:** Registro Sanitario y RC (válidos hasta 2025-12-31)
- **Platos creados:** 6
  - **Primeros:** Gazpacho andaluz, Ensalada César
  - **Segundos:** Pollo al horno con patatas, Merluza a la plancha
  - **Postres:** Yogur natural, Fruta de temporada
- **Menús:** Programados para los próximos 4 días (L-J)

---

## 🌐 URLs de Acceso por Portal

### Super Admin
```
https://admin.sintupper.com/login
```

### Portal Empresa (ACME)
```
https://acme.sintupper.com/empresa/dashboard    → RRHH/Finanzas
https://acme.sintupper.com/empleado/menus      → Empleados
```

### Portal Catering (Delicias Express)
```
https://deliciasexpress.sintupper.com/catering/dashboard
```

---

## 🔐 Patrón de Contraseñas

Todas las contraseñas siguen este patrón:
- **Admin:** `Admin123!`
- **RRHH:** `Rrhh123!`
- **Finanzas:** `Finanzas123!`
- **Empleados:** `Empleado123!`
- **Chef:** `Chef123!`
- **Repartidor:** `Reparto123!`

**Formato:** `[Rol]123!` (primera letra mayúscula, resto minúsculas, número 123, signo !)

---

## ⚠️ Notas Importantes

1. **Dominio:** Las credenciales están configuradas para `sintupper.com`. Si usas otro dominio, los emails pueden variar.

2. **MFA:** El usuario Super Admin tiene MFA habilitado (`mfaEnabled: true`), pero en desarrollo puede estar desactivado.

3. **Estado:** Todos los usuarios están en estado `ACTIVE` y listos para usar.

4. **Seed:** Para regenerar estos usuarios, ejecuta:
   ```bash
   pnpm db:seed
   ```

5. **Producción:** ⚠️ **NUNCA** uses estas contraseñas en producción. Cambia todas las contraseñas después del despliegue inicial.

---

## 📝 Checklist de Pruebas

Usa estas credenciales para probar cada funcionalidad:

- [ ] Login como Super Admin
- [ ] Login como RRHH de empresa
- [ ] Login como Finanzas de empresa
- [ ] Login como Empleado 1 (Laura)
- [ ] Login como Empleado 2 (Pedro)
- [ ] Login como Chef del catering
- [ ] Login como Repartidor del catering
- [ ] Verificar que cada usuario ve solo su portal correspondiente
- [ ] Verificar que los empleados ven menús según sus restricciones dietéticas
- [ ] Verificar que el catering puede gestionar platos y menús

---

**Última actualización:** Noviembre 2024  
**Fuente:** `prisma/seed.ts`

