# Portal del Catering - Guía Visual Rápida

## 🎯 Vista General del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PLATAFORMA COMIDA.COM (Multi-tenant)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  ┌──────────┐ │
│  │   PORTAL     │   │   PORTAL     │   │   PORTAL     │  │  PORTAL  │ │
│  │  SUPERADMIN  │   │   EMPRESA    │   │  EMPLEADO    │  │ CATERING │ │
│  │              │   │              │   │              │  │          │ │
│  │ admin.       │   │ empresa.     │   │ empleado.    │  │ catering.│ │
│  │ comida.com   │   │ comida.com   │   │ comida.com   │  │comida.com│ │
│  └──────────────┘   └──────────────┘   └──────────────┘  └──────────┘ │
│       ✅               ✅                 ✅               🚧 A HACER   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📅 Cronología de un Pedido (Vista Completa)

```
DÍA ANTERIOR
═══════════════════════════════════════════════════════════════════

09:00 │ CATERING          │ Publica menú semanal
      │ DishSchedule      │ Primeros: Lentejas, Crema
      │                   │ Segundos: Pollo, Merluza
      │                   │ Postres: Flan, Fruta
      ▼

10:00 │ EMPLEADO          │ Ve menús disponibles
      │ WeekView          │ Selecciona para mañana:
      │                   │ - Lentejas
      │                   │ - Pollo
      │                   │ - Flan
      ▼

10:30 │ SISTEMA           │ Order.status = CONFIRMED
      │ Order             │ tenantEmpresa + tenantCatering
      │                   │ selection: {first, second, dessert}
      ▼

-------------------------------------------------------------------

HOY (DÍA DE SERVICIO)
═══════════════════════════════════════════════════════════════════

10:55 │ EMPLEADO          │ Puede cancelar hasta 11:00
      │ WeekView          │ (si cancela → status = CANCELLED)
      ▼

11:00 │ CUTOFF 🔒         │ ¡NO MÁS CAMBIOS!
      │ Cron Job          │ Order.status = LOCKED_AFTER_CUTOFF
      │                   │ Order.lockedAt = now()
      ▼

11:05 │ CONSOLIDACIÓN 📊  │ Cron Job ejecuta:
      │ KitchenSheet      │ - generateKitchenSheet()
      │ PackingSheet      │ - Agrupa por plato
      │                   │ - Agrupa por empresa
      │                   │ - Genera signatureHash
      ▼

11:10 │ CATERING          │ Ve "Producción HOY"
      │ ProductionSheet   │ ┌─────────────────────────┐
      │                   │ │ PRIMEROS:               │
      │                   │ │  • Lentejas: 32 uds     │
      │                   │ │  • Crema: 14 uds        │
      │                   │ │                         │
      │                   │ │ SEGUNDOS:               │
      │                   │ │  • Pollo: 28 uds        │
      │                   │ │  • Merluza: 18 uds      │
      │                   │ │                         │
      │                   │ │ POSTRES:                │
      │                   │ │  • Flan: 40 uds         │
      │                   │ │  • Fruta: 6 uds         │
      │                   │ │                         │
      │                   │ │ ⚠️  2 alergias gluten   │
      │                   │ └─────────────────────────┘
      ▼

12:00 │ CATERING          │ Ve "Repartos HOY"
      │ DeliveryRoutes    │ ┌─────────────────────────┐
      │                   │ │ RUTA 1 (Zona Centro)    │
      │                   │ │  → Empresa A: 12 menús  │
      │                   │ │  → Empresa B: 8 menús   │
      │                   │ │                         │
      │                   │ │ RUTA 2 (Zona Norte)     │
      │                   │ │  → Empresa C: 20 menús  │
      │                   │ └─────────────────────────┘
      ▼

12:30 │ REPARTIDOR        │ Marca entregas:
      │ DeliveryProof     │ - Empresa A: ✅ Completada
      │                   │   • Foto subida
      │                   │   • GPS: 40.4168, -3.7038
      │                   │   • Hora: 12:25
      ▼

12:35 │ SISTEMA           │ Order.status = DELIVERED
      │ DeliveryEvent     │ DeliveryProof creado
      │                   │ verificationHash generado
      ▼

13:00 │ EMPLEADO          │ Ve en historial:
      │ HistorialTable    │ "✅ Entregado 12:25"
      │                   │ Puede valorar pedido
      ▼

13:05 │ EMPLEADO          │ Valora pedido: ⭐⭐⭐⭐⭐
      │ OrderRating       │ "Muy buena comida"
      ▼

-------------------------------------------------------------------

FIN DE MES
═══════════════════════════════════════════════════════════════════

01/02 │ FACTURACIÓN 💰    │ Cron Job día 1 mes siguiente
01:00 │ Invoice           │ - generateMonthlyInvoice()
      │                   │ - Consolida Orders DELIVERED
      │                   │ - Aplica ajustes incidencias
      │                   │ - Genera PDF
      ▼

09:00 │ CATERING          │ Ve factura generada
      │ InvoicesTable     │ Status: ISSUED
      │                   │ Puede descargar PDF
      ▼

10:00 │ EMPRESA           │ Recibe notificación
      │ BillingKPIs       │ Descarga factura
      │                   │ Invoice.status = SENT
      ▼

15:00 │ EMPRESA           │ Marca como pagada
      │ InvoiceDetail     │ Invoice.status = PAID
```

---

## 🏗️ Arquitectura de Datos (Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│                         TENANT (type: CATERING)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • id, name, subdomain                                     │  │
│  │ • primaryColor, logoUrl                                   │  │
│  │ • contactEmail, contactPhone                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ├─────────────┐                    │
│                              ▼             ▼                    │
│                    ┌─────────────┐   ┌──────────┐              │
│                    │ RESTAURANT  │   │   USER   │              │
│                    │             │   │          │              │
│                    │ • capacity  │   │ • roles  │              │
│                    │ • cutoff    │   │ • perms  │              │
│                    │ • zones     │   └──────────┘              │
│                    └─────────────┘                              │
│                         │                                       │
│                         ├──────────┬──────────┐                │
│                         ▼          ▼          ▼                │
│                   ┌──────┐   ┌──────┐   ┌─────────┐           │
│                   │ DISH │   │ DOCS │   │ AUDITS  │           │
│                   │      │   │      │   │         │           │
│                   │• name│   │• RC  │   │• scores │           │
│                   │•course│  │• sanit│  │• reports│           │
│                   │•price│   └──────┘   └─────────┘           │
│                   └──────┘                                     │
│                      │                                         │
│                      ▼                                         │
│              ┌────────────────┐                                │
│              │ DISH_SCHEDULE  │ ◄─── Menús publicados         │
│              │                │                                │
│              │ • date         │                                │
│              │ • status       │                                │
│              │ • visible_to   │                                │
│              └────────────────┘                                │
│                      │                                         │
│                      │ (referenciado por Orders)               │
└──────────────────────┼─────────────────────────────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │       ORDER            │ ◄─── Del Empleado
          │                        │
          │ • tenantEmpresa        │
          │ • tenantCatering  ◄────┤─── Multi-tenant link
          │ • employeeId           │
          │ • selection (JSON)     │
          │ • status (FSM)         │
          │ • integrityHash        │
          └────────────────────────┘
                    │
                    ├─────────┬──────────┬──────────┐
                    ▼         ▼          ▼          ▼
           ┌────────────┐ ┌───────┐ ┌──────┐ ┌────────┐
           │ KITCHEN    │ │PACKING│ │DELIV.│ │INVOICE │
           │ SHEET      │ │SHEET  │ │PROOF │ │        │
           └────────────┘ └───────┘ └──────┘ └────────┘
              (Cocina)    (Reparto)  (Evid.) (Factura)
```

---

## 🎭 Roles y Vistas del Portal Catering

```
┌──────────────────────────────────────────────────────────────────┐
│                    ADMIN_CATERING (Coordinador)                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dashboard:     KPIs completos + Alertas + Quick Actions        │
│  Platos:        CRUD completo + Gestión alérgenos               │
│  Menús:         Editor semanal + Publicación                    │
│  Producción:    Vista completa + Alertas alergias               │
│  Repartos:      Organización rutas + Gestión global             │
│  Empresas:      Lista todas + Detalle + SLAs                    │
│  Incidencias:   Responder + Resolver + Compensar                │
│  Facturación:   Generar + Descargar + Gestión completa          │
│  Auditoría:     Logs completos + Trails                         │
│  Configuración: Editar todo                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        CHEF / COCINERO                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dashboard:     Foco en producción                              │
│  Platos:        Ver + Editar recetas                            │
│  Menús:         Editar + Publicar                               │
│  Producción:    ⭐ Vista principal (what to cook)               │
│  Repartos:      No acceso                                       │
│  Empresas:      Ver asignadas                                   │
│  Incidencias:   Ver + Responder (calidad)                       │
│  Facturación:   No acceso                                       │
│  Auditoría:     No acceso                                       │
│  Configuración: Solo lectura                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         REPARTIDOR                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dashboard:     Foco en repartos                                │
│  Platos:        No acceso                                       │
│  Menús:         No acceso                                       │
│  Producción:    No acceso                                       │
│  Repartos:      ⭐ Vista principal + Marcar entregas            │
│  Empresas:      Ver asignadas (contactos)                       │
│  Incidencias:   Crear (problemas en entrega)                    │
│  Facturación:   No acceso                                       │
│  Auditoría:     No acceso                                       │
│  Configuración: No acceso                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      FINANZAS_CATERING                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dashboard:     KPIs financieros                                │
│  Platos:        No acceso                                       │
│  Menús:         No acceso                                       │
│  Producción:    No acceso                                       │
│  Repartos:      No acceso                                       │
│  Empresas:      Ver todas (facturación)                         │
│  Incidencias:   Ver (impacto en factura)                        │
│  Facturación:   ⭐ Vista principal + Generar + Descargar        │
│  Auditoría:     Ver completa                                    │
│  Configuración: Solo lectura                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Estados de un Order (FSM)

```
                    ┌──────────┐
                    │  DRAFT   │ ◄── Empleado selecciona pero no confirma
                    └────┬─────┘
                         │ confirm()
                         ▼
                  ┌─────────────┐
                  │  CONFIRMED  │ ◄── Empleado confirma pedido
                  └─────┬───┬───┘
                        │   │
        ┌───────────────┘   └────────────────┐
        │ cancel() (antes 11:00)              │ cutoff 11:00
        ▼                                     ▼
┌─────────────────────┐          ┌──────────────────────┐
│ CANCELLED_BEFORE_   │          │ LOCKED_AFTER_CUTOFF  │ ◄── No más cambios
│     CUTOFF          │          └──────────┬───────────┘
└─────────────────────┘                     │
                                            │ delivery complete
                           ┌────────────────┼────────────┐
                           │                │            │
                           ▼                ▼            ▼
                    ┌───────────┐    ┌──────────┐  ┌──────────┐
                    │ DELIVERED │    │ NO_SHOW  │  │  ISSUE   │
                    │     ✅     │    │    ❌     │  │ REPORTED │
                    └───────────┘    └──────────┘  └────┬─────┘
                                                         │
                                           ┌─────────────┼──────────┐
                                           │                        │
                                           ▼                        ▼
                                    ┌─────────────┐         ┌──────────┐
                                    │ COMPENSATED │         │ REJECTED │
                                    │      💰      │         │    ✖️     │
                                    └─────────────┘         └──────────┘

LEYENDA:
✅ DELIVERED    = Entrega exitosa, facturable al 100%
❌ NO_SHOW      = Empleado no recogió, facturable según policy
⚠️ ISSUE_REPORTED = Problema reportado, en investigación
💰 COMPENSATED  = Compensación aplicada, ajuste en factura
✖️ REJECTED     = Incidencia rechazada, no hay compensación
```

---

## 🍽️ Estructura de un Menú Diario

```
┌───────────────────────────────────────────────────────────────┐
│              MENÚ DEL DÍA - Miércoles 15 Enero               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  PRIMEROS (elige 1):                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🥣 Lentejas estofadas              [32 pedidos]         │ │
│  │    • Alérgenos: -                                       │ │
│  │    • Kcal: 280                                          │ │
│  │    • Precio: 3.50€                                      │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 🥣 Crema de calabaza               [14 pedidos]         │ │
│  │    • Alérgenos: Lactosa                                 │ │
│  │    • Kcal: 150                                          │ │
│  │    • Precio: 3.00€                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  SEGUNDOS (elige 1):                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🍗 Pollo asado con patatas         [28 pedidos]         │ │
│  │    • Alérgenos: -                                       │ │
│  │    • Kcal: 450                                          │ │
│  │    • Precio: 5.50€                                      │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 🐟 Merluza al horno                [18 pedidos]         │ │
│  │    • Alérgenos: Pescado                                 │ │
│  │    • Kcal: 320                                          │ │
│  │    • Precio: 6.00€                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  POSTRES (elige 1):                                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🍮 Flan casero                     [40 pedidos]         │ │
│  │    • Alérgenos: Huevo, Lactosa                          │ │
│  │    • Kcal: 180                                          │ │
│  │    • Precio: 2.00€                                      │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 🍎 Fruta de temporada              [6 pedidos]          │ │
│  │    • Alérgenos: -                                       │ │
│  │    • Kcal: 80                                           │ │
│  │    • Precio: 1.50€                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  TOTAL MENÚS: 46                                             │
│  CUTOFF: 11:00h                                              │
│  STATUS: ✅ PUBLICADO                                        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 🚚 Vista de Repartos

```
┌─────────────────────────────────────────────────────────────────┐
│                   REPARTOS HOY - 15 Enero 2024                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📍 RUTA 1 - ZONA CENTRO (12:00 - 13:00)                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  1️⃣  EMPRESA A - Oficinas Centro                         │ │
│  │      📦 12 menús                                          │ │
│  │      📍 Calle Gran Vía, 28                                │ │
│  │      📞 Carlos García - 600 123 456                       │ │
│  │      ⏰ 12:15 - 12:30                                     │ │
│  │      [ Marcar entregado ] [ Ver detalle ] [ Incidencia ] │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  2️⃣  EMPRESA B - Coworking Sol                          │ │
│  │      📦 8 menús                                           │ │
│  │      📍 Plaza del Sol, 5                                  │ │
│  │      📞 María López - 600 789 012                         │ │
│  │      ⏰ 12:35 - 12:50                                     │ │
│  │      [ Marcar entregado ] [ Ver detalle ] [ Incidencia ] │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  📍 RUTA 2 - ZONA NORTE (12:00 - 13:30)                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  3️⃣  EMPRESA C - Tech Hub Norte                         │ │
│  │      📦 20 menús                                          │ │
│  │      📍 Paseo de la Castellana, 120                       │ │
│  │      📞 Juan Martínez - 600 345 678                       │ │
│  │      ⏰ 12:15 - 12:45                                     │ │
│  │      [ Marcar entregado ] [ Ver detalle ] [ Incidencia ] │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  📍 RUTA 3 - ZONA SUR (13:00 - 14:00)                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  4️⃣  EMPRESA D - Parque Empresarial Sur                 │ │
│  │      📦 6 menús                                           │ │
│  │      📍 Polígono Industrial, Nave 12                      │ │
│  │      📞 Ana Sánchez - 600 901 234                         │ │
│  │      ⏰ 13:15 - 13:30                                     │ │
│  │      [ Marcar entregado ] [ Ver detalle ] [ Incidencia ] │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  RESUMEN:                                                       │
│  • Total menús: 46                                             │
│  • Total empresas: 4                                           │
│  • Total rutas: 3                                              │
│  • Completadas: 0/46 (0%)                                      │
│                                                                 │
│  [ 🖨️ Imprimir etiquetas ] [ 📄 Descargar PackingSheets ]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💰 Vista de Factura

```
┌─────────────────────────────────────────────────────────────────┐
│                       FACTURA FE-2024-001                       │
│                   Periodo: Enero 2024                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EMISOR:                                                        │
│  La Cocina Gourmet S.L.                                        │
│  CIF: B12345678                                                │
│  C/ Ejemplo, 123 - 28001 Madrid                                │
│                                                                 │
│  CLIENTE:                                                       │
│  Tech Solutions S.L.                                           │
│  CIF: B87654321                                                │
│  C/ Gran Vía, 28 - 28013 Madrid                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  DETALLE:                                                       │
│                                                                 │
│  Fecha      │ Empleado      │ Concepto         │ Importe       │
│  ──────────────────────────────────────────────────────────── │
│  03/01/2024 │ Juan Pérez    │ Lentejas + ...   │   11.00 €    │
│  03/01/2024 │ María García  │ Crema + ...      │   10.50 €    │
│  04/01/2024 │ Juan Pérez    │ Pasta + ...      │   11.00 €    │
│  04/01/2024 │ María García  │ Arroz + ...      │   11.00 €    │
│  ...        │ ...           │ ...              │    ...       │
│  31/01/2024 │ Juan Pérez    │ Gazpacho + ...   │   11.00 €    │
│                                                                 │
│  ──────────────────────────────────────────────────────────── │
│  SUBTOTAL (220 menús x 11€):                      2,420.00 €   │
│  Ajuste incidencia #INC-045:                        -11.00 €   │
│  ──────────────────────────────────────────────────────────── │
│  BASE IMPONIBLE:                                  2,409.00 €   │
│  IVA (10%):                                         240.90 €   │
│  ──────────────────────────────────────────────────────────── │
│  TOTAL:                                           2,649.90 €   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Estado: ✅ EMITIDA                                            │
│  Fecha emisión: 01/02/2024                                     │
│  Vencimiento: 15/02/2024                                       │
│                                                                 │
│  [ 📥 Descargar PDF ] [ 📧 Enviar por email ]                  │
│  [ ✏️ Marcar como pagada ]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Checklist Rápido por Fase

```
FASE 1: Layout + Dashboard (3 días)
├─ [ ] Rutas configuradas
├─ [ ] CateringNavbar
├─ [ ] CateringSidebar
├─ [ ] Dashboard con KPIs
├─ [ ] Alertas
└─ [ ] Quick actions

FASE 2: Platos (4 días)
├─ [ ] CRUD completo
├─ [ ] Subida imágenes
├─ [ ] Gestión alérgenos
├─ [ ] Validaciones Zod
└─ [ ] Testing CRUD

FASE 3: Menús (4 días)
├─ [ ] Vista calendario
├─ [ ] Editor por día
├─ [ ] Publicación
├─ [ ] Validaciones
└─ [ ] Bloqueo post-cutoff

FASE 4: Producción (4 días)
├─ [ ] Consolidado
├─ [ ] Vista cocina
├─ [ ] Alertas alergias
├─ [ ] Cron job 11:05
└─ [ ] Testing consolidado

FASE 5: Repartos (4 días)
├─ [ ] Rutas
├─ [ ] Marcar entregas
├─ [ ] Evidencias
├─ [ ] Etiquetas PDF
└─ [ ] Testing entregas

FASE 6: Empresas + Incidencias (4 días)
├─ [ ] Lista empresas
├─ [ ] Board incidencias
├─ [ ] Responder
├─ [ ] Resolver
└─ [ ] Compensar

FASE 7: Facturación + Auditoría + Config (5 días)
├─ [ ] Facturación automática
├─ [ ] PDF facturas
├─ [ ] Logs auditoría
├─ [ ] Configuración
└─ [ ] Cron mensual

FASE 8: Testing (2 días)
├─ [ ] E2E flujos
├─ [ ] Performance
├─ [ ] Seguridad
└─ [ ] Deploy
```

---

## 🚀 Quick Start - Orden de Implementación

```
1️⃣  EMPEZAR POR AQUÍ
    └─ /app/(catering)/layout.tsx
    └─ /components/catering/CateringNavbar.tsx
    └─ /components/catering/CateringSidebar.tsx

2️⃣  DASHBOARD
    └─ /app/(catering)/catering/page.tsx
    └─ /components/catering/dashboard/CateringDashboard.tsx
    └─ /api/catering/dashboard/route.ts
    └─ /lib/db/queries/catering-dashboard.ts

3️⃣  PLATOS
    └─ /app/(catering)/catering/platos/page.tsx
    └─ /components/catering/platos/DishesTable.tsx
    └─ /components/catering/platos/DishForm.tsx
    └─ /api/catering/platos/route.ts
    └─ /lib/db/queries/catering-dishes.ts

... Y ASÍ SUCESIVAMENTE SIGUIENDO LAS FASES
```

---

**Estado**: ✅ Documentación visual completa  
**Próximo paso**: Iniciar FASE 1 - Layout + Dashboard  
**Duración total estimada**: 28-30 días


