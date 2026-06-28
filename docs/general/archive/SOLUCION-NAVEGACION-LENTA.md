# 🐌 SOLUCIÓN - Navegación lenta "No abre de primeras"

**Problema**: Al hacer click en "Añadir empleado", "Ver detalle" o "Editar", la navegación no se ejecuta inmediatamente. Parece que no responde, pero si abres en otra pestaña sí funciona.

---

## 🔍 CAUSA

**Next.js Link prefetch + navegación client-side**

Cuando haces click en un `<Link>`:
1. Next.js intenta prefetch de la ruta
2. Si la ruta es pesada (Server Component con queries), puede tardar
3. NO hay feedback visual → parece que no funciona
4. Abrir en nueva pestaña funciona porque es navegación del navegador (más rápida visualmente)

---

## ✅ SOLUCIÓN 1: LoadingLink Component (IMPLEMENTADA)

He creado `components/ui/loading-link.tsx` que:
- Muestra un spinner al hacer click
- Usa `useTransition` de React para navegación optimista
- Da feedback visual inmediato

```tsx
<LoadingLink href="/empresa/empleados/nuevo" variant="button">
  <Plus className="mr-2 h-4 w-4" />
  Añadir Empleado
</LoadingLink>
```

---

## ✅ SOLUCIÓN 2: Prefetch=false (ALTERNATIVA)

Desactivar prefetch en Links problemáticos:

```tsx
<Link href="/empresa/empleados/nuevo" prefetch={false}>
  Añadir Empleado
</Link>
```

Esto hace que la navegación sea más rápida (no prefetch), pero sin feedback visual.

---

## ✅ SOLUCIÓN 3: useRouter en onClick (RECOMENDADA PARA TU CASO)

Dado que ya tienes muchos botones con `asChild`, la solución más simple es:

### Para el botón "Añadir Empleado"

En `app/(empresa)/empresa/empleados/page.tsx`:

```tsx
// Crear un client component wrapper
'use client'

import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AddEmployeeButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = () => {
    setIsLoading(true)
    router.push('/empresa/empleados/nuevo')
  }

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && <Plus className="mr-2 h-4 w-4" />}
      Añadir Empleado
    </Button>
  )
}
```

---

## 🎯 RECOMENDACIÓN

Para tu caso específico, te recomiendo:

### Opción A: Crear componentes wrapper (más limpio)
```
components/
  empresa/
    empleados/
      AddEmployeeButton.tsx
      ViewEmployeeButton.tsx
      EditEmployeeButton.tsx
```

Cada uno con su propio loading state.

### Opción B: Usar LoadingLink (más rápido)
Reemplazar todos los `Link` en `EmployeesTable.tsx` por `LoadingLink`.

### Opción C: Dejar como está + prefetch={false}
Agregar `prefetch={false}` a todos los `Link` problemáticos.

---

## ⚡ LA MÁS RÁPIDA (5 MINUTOS)

Si quieres arreglarlo YA, agrega `prefetch={false}` a los Links:

**En `app/(empresa)/empresa/empleados/page.tsx`**:
```tsx
<Link href="/empresa/empleados/nuevo" prefetch={false}>
  <Plus className="mr-2 h-4 w-4" />
  Añadir Empleado
</Link>
```

**En `components/empresa/empleados/EmployeesTable.tsx`**:
```tsx
<DropdownMenuItem asChild>
  <Link href={`/empresa/empleados/${employee.id}`} prefetch={false}>
    <Eye className="mr-2 h-4 w-4" />
    Ver detalle
  </Link>
</DropdownMenuItem>
```

Esto eliminará el delay visual inmediatamente.

---

## 📊 COMPARACIÓN

| Solución | Pros | Contras | Esfuerzo |
|----------|------|---------|----------|
| **prefetch={false}** | ✅ Rápido, simple | ⚠️ Sin feedback visual | 5 min |
| **LoadingLink** | ✅ Feedback visual | ⚠️ Requiere cambios en todos los Links | 20 min |
| **Wrapper components** | ✅ Más control, reutilizable | ⚠️ Más archivos | 30 min |
| **useRouter + onClick** | ✅ Máximo control | ⚠️ Más código | 40 min |

---

## 🚀 ¿QUÉ QUIERES HACER?

1. **Arreglo rápido (5 min)**: Agrego `prefetch={false}` a todos los Links
2. **Arreglo completo (20 min)**: Uso `LoadingLink` en todos lados
3. **Arreglo profesional (40 min)**: Creo componentes wrapper con loading states

**Dime cuál prefieres y lo implemento ahora.**

