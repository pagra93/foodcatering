import { ModuleUnderDevelopment } from '@/components/admin/ModuleUnderDevelopment'

export default function MenuTemplatesPage() {
  return (
    <ModuleUnderDevelopment
      title="Menús Tipo"
      breadcrumb={['Catálogos Globales']}
      backHref="/admin/catalogs"
      backLabel="Volver a Catálogos"
      purpose="Plantillas de menú semanal reutilizables. Cuando se incorpora un catering nuevo, puede clonar una plantilla como punto de partida y adaptarla. Útil también para eventos especiales (semana de cocina saludable, navidad, fin de curso)."
      plannedFeatures={[
        'CRUD de plantillas con nombre, descripción y tags.',
        'Editor de plantilla: 5 días × 3 cursos con platos genéricos (sin tenant).',
        'Botón "Aplicar a catering": clona como DishSchedule con fechas ajustadas.',
        'Plantillas del sistema (globales) vs plantillas personales del catering.',
        'Versionado: mantener histórico de plantillas anteriores.',
      ]}
      dataSources={[
        'MenuTemplate (nuevo modelo Prisma)',
        'DishSchedule (destino al clonar)',
      ]}
      eta="Sprint 7"
    />
  )
}
