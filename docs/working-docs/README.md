# working-docs/

Artefactos de trabajo por feature. Los comandos PM x10 depositan aquí sus
salidas, organizadas en un subdirectorio por feature.

## Estructura esperada

```
working-docs/
├── <feature-name>/
│   ├── design-analysis.md    ← /design-to-prd (si había diseños Pencil)
│   ├── prd.md                ← /design-to-prd o /analyze
│   ├── research.md           ← /analyze (Mom Test, competidores, gaps)
│   ├── jtbds.md              ← /define (Jobs-to-be-Done)
│   ├── stories.md            ← /define (user stories con 6D scoring)
│   └── architecture.md       ← /plan (decisiones técnicas, ADRs)
└── README.md                 ← este documento
```

## Convenciones

- **Nombres de feature en kebab-case**: `auth-impersonation`, `cutoff-automation`, `invoice-pdf`.
- **Un feature ≠ una story**. Un feature puede contener varias stories. Las stories individuales van dentro de `stories.md` del feature.
- **No mezclar features** en el mismo subdirectorio.

## Qué NO va aquí

- Documentación de arquitectura estable (eso va en `docs/arquitectura/`).
- PRD global del producto (eso es `docs/prd.md`).
- Runbook operativo (es `docs/despliegue/RUNBOOK.md`).
- Retrospectivas generales (si se hacen, ir a `docs/archive/`).

## Ciclo de vida

1. Durante el desarrollo de una feature, sus artefactos viven aquí y se
   actualizan con cada comando.
2. Cuando la feature está lista y mergeada, los artefactos se quedan como
   referencia histórica.
3. Si pasado un año la feature ha cambiado tanto que los docs son
   irrelevantes, mover al `docs/archive/` (no borrar, trazabilidad).
