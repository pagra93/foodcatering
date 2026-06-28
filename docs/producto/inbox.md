# Inbox — buzón de ideas

Buzón libre para capturar ideas, tareas pendientes, observaciones. Cualquiera (tú, los agentes) puede añadir entradas. El PM las procesa al ejecutar `/pm inbox` o `/pm` (modo default).

## Cómo añadir entradas

Tres formatos válidos:

### Formato 1: sección con título (preferido)

```markdown
## Idea: añadir login con Google

Notas opcionales sobre la idea, contexto, urgencia, etc.
Se puede mencionar dependencias: "depende de tener el sistema de auth básico"
Se puede mencionar criticality: "urgente" / "cuando se pueda"
```

### Formato 2: línea simple

```markdown
- Investigar competencia en Stripe vs Adyen para pagos recurrentes
- Bug: el formulario de registro permite emails inválidos en mobile
- Reescribir el README con ejemplos concretos
```

### Formato 3: con metadata explícita (avanzado)

```markdown
## Migrar tests de Jest a Vitest

```yaml
type: epic
criticality: medium
depends_on: []
```

Razón: bundle size y velocidad de tests.
```

### Formato 4: con `feature:` para enlazar con `/design-to-prd` (V3.2)

Si la idea va a tener diseños en Pencil y luego pasarás por `/design-to-prd`, añade el campo `feature: <slug>` para que el PM **vincule** la épica del inbox con la feature folder que se creará. Sin esto, podrías tener épicas duplicadas (una del inbox + otra del design-to-prd).

```markdown
## Idea: avisos push de pedidos
feature: notif-push
30% del soporte es 'dónde está mi pedido'.
```

Pasos típicos:
1. Escribes esto en inbox.md
2. `/pm inbox` → crea `EPIC-XXX` con `feature: notif-push`, `origin: inbox`
3. Diseñas en Pencil
4. `/design-to-prd` → detecta que `EPIC-XXX` ya existe con `feature: notif-push` → vincula las HUs nuevas a ella (no duplica). Las HUs tienen `origin: design`.

El `<slug>` debe ser **kebab-case lowercase** y coincidir exactamente con el nombre de la carpeta que `/design-to-prd` creará en `docs/producto/features/<slug>/`.

## Qué hace el PM al procesar

Para cada entrada:
1. Clasifica el tipo: épica (feature grande), tarea (unidad de trabajo), subtarea
2. Detecta dependencias por palabras clave ("después de X", "depende de Y")
3. Detecta criticality por palabras clave ("urgente", "crítico", "cuando se pueda")
4. Sugiere qué agente la trabajaría primero
5. Asigna ID estable (HU-XXX, EPIC-XXX) y la añade a `tasks.json` con estado `backlog_sin_priorizar`
6. Vacía la línea/sección consumida

Si no puede clasificar una entrada con confianza, la deja en el inbox marcada con `<!-- pendiente: razón -->` y la pasa al humano.

## Ejemplos de entradas que funcionan bien

```markdown
## Implementar onboarding para usuarios nuevos
Después de que se complete el sistema de autenticación.
Idea: tour guiado de 4 pasos.

## Bug urgente: el carrito pierde items al refrescar
Reportado por 3 usuarios en Slack esta semana.

## Investigar accesibilidad WCAG AA
Cuando se pueda. No hay deadline.
```

## Ejemplos de entradas que el PM dejará pendientes

```markdown
## Cosas
- algo de auth
- mirar lo de la base de datos
```

(Demasiado vago — el PM no clasifica estas. Se quedan en el inbox con marca de pendiente.)

---
