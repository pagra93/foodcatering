import { ModuleUnderDevelopment } from '@/components/admin/ModuleUnderDevelopment'

export default function ZonesPage() {
  return (
    <ModuleUnderDevelopment
      title="Zonas y Logística"
      breadcrumb={['Catálogos Globales']}
      backHref="/admin/catalogs"
      backLabel="Volver a Catálogos"
      purpose="Zonas de reparto de los caterings con códigos postales asociados. Hoy viven como JSON en Restaurant.zones; se normalizarán a tabla dedicada para permitir búsquedas, compartir zonas entre caterings y asignar repartidores por zona."
      plannedFeatures={[
        'Listado de zonas por catering con códigos postales cubiertos.',
        'Buscador: "¿qué catering cubre 28001?" → devuelve zonas y assignments.',
        'Mapa interactivo mostrando cobertura geográfica.',
        'Operator por defecto (repartidor asignado) por zona.',
        'Migración automática desde Restaurant.zones JSON.',
      ]}
      dataSources={[
        'DeliveryZone (nuevo modelo Prisma)',
        'Restaurant.zones (JSON, deprecated tras migración)',
        'CompanyCateringAssignment.zones (array existente)',
      ]}
      eta="Sprint 7"
    />
  )
}
