# Screenshots del producto a capturar

**Guidelines**:
- Viewport 1440×900
- Tenant demo dedicado con **data sintética** (NO data real de clientes)
- Exportar PNG + WebP
- Destino: `public/screenshots/`
- Usar en landing con `next/image` + `placeholder="blur"` + `sizes` responsive

## Portal empresa (`demoempresa.sintupper.com`)
| Archivo | Qué captura | Se usa en |
|---|---|---|
| `empresa-dashboard.png` | Dashboard con KPIs (pedidos mes, gasto, adopción %, alertas) | Hero home `/` |
| `empresa-auditoria.png` | Página de auditoría fiscal con dossier mensual | `/compliance`, `/producto` |
| `empresa-importador.png` | Importador CSV con preview + validación | `/producto` (feature onboarding) |

## Portal empleado (`demoempresa.sintupper.com/empleado/menus`)
| Archivo | Qué captura | Se usa en |
|---|---|---|
| `empleado-selector.png` | Selector semanal 5 días × 3 opciones con cards | `/producto`, refuerzo home |
| `empleado-alergenos.png` | Card de plato con badges alérgenos coloreados | `/producto` |

## Portal catering (`democatering.sintupper.com`)
| Archivo | Qué captura | Se usa en |
|---|---|---|
| `catering-kds.png` | Kitchen Display System con consolidación ("45 × Gazpacho") | Hero `/caterings` |
| `catering-rutas.png` | Rutas de reparto con mapa Google Maps | `/caterings`, `/producto` |
| `catering-facturacion.png` | Facturación automática mensual | `/caterings`, `/producto` |

## Cómo capturar
1. Entrar a cada portal con las credenciales demo sembradas en prod (ver `prisma/seed-demo.ts`).
2. Browser en 1440×900 (devtools → responsive → custom).
3. macOS: `Cmd+Shift+4` + barra espaciadora para capturar ventana completa (sin sombra: hold Option).
4. Exportar PNG, convertir a WebP con `cwebp` o similar.
5. Copiar ambos a `public/screenshots/`.

## Alternativa mientras tanto
Mientras no haya screenshots reales, usar `<ScreenshotFrame>` con un placeholder SVG o imagen stub con branding del producto. Nunca inventar UI que no existe.
