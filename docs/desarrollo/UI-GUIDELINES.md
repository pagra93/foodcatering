# 🎨 UI Guidelines - shadcn/ui

## 📋 Regla Principal

**TODA la plataforma DEBE usar componentes de shadcn/ui. NUNCA usar elementos HTML nativos para UI.**

---

## ✅ Componentes Instalados

Estos componentes YA están disponibles en `/components/ui/`:

| Componente | Uso | Ejemplo |
|------------|-----|---------|
| `Button` | Botones | `<Button variant="default">Click</Button>` |
| `Input` | Campos de texto | `<Input type="email" placeholder="Email" />` |
| `Label` | Etiquetas de formulario | `<Label htmlFor="email">Email</Label>` |
| `Textarea` | Área de texto | `<Textarea placeholder="Descripción" />` |
| `Select` | Dropdowns | `<Select><SelectTrigger>...</SelectTrigger></Select>` |
| `Checkbox` | Checkboxes | `<Checkbox checked={true} />` |
| `Badge` | Insignias | `<Badge variant="success">Activo</Badge>` |
| `Card` | Tarjetas | `<Card><CardHeader>...</CardHeader></Card>` |
| `Table` | Tablas | `<Table><TableHeader>...</TableHeader></Table>` |
| `Tabs` | Pestañas | `<Tabs><TabsList><TabsTrigger>...</TabsTrigger></TabsList></Tabs>` |
| `Dialog` | Modales | `<Dialog><DialogTrigger>...</DialogTrigger></Dialog>` |
| `DropdownMenu` | Menús desplegables | `<DropdownMenu>...</DropdownMenu>` |
| `Alert` | Alertas | `<Alert variant="destructive">Error</Alert>` |
| `Avatar` | Avatares | `<Avatar><AvatarImage src="..." /></Avatar>` |
| `Skeleton` | Carga placeholder | `<Skeleton className="h-4 w-full" />` |
| `Separator` | Separadores | `<Separator />` |
| `Form` | Formularios | `<Form {...form}><FormField>...</FormField></Form>` |

---

## ❌ NO USAR (HTML Nativo)

### ❌ Inputs nativos
```tsx
// ❌ MAL - HTML nativo
<input 
  type="email" 
  className="mt-1 block w-full rounded-lg..." 
/>

// ✅ BIEN - shadcn/ui
import { Input } from '@/components/ui/input'
<Input type="email" />
```

### ❌ Botones nativos
```tsx
// ❌ MAL
<button className="rounded bg-blue-500...">
  Click
</button>

// ✅ BIEN
import { Button } from '@/components/ui/button'
<Button>Click</Button>
```

### ❌ Labels nativos
```tsx
// ❌ MAL
<label htmlFor="email" className="block text-sm...">
  Email
</label>

// ✅ BIEN
import { Label } from '@/components/ui/label'
<Label htmlFor="email">Email</Label>
```

### ❌ Textareas nativos
```tsx
// ❌ MAL
<textarea className="block w-full..." />

// ✅ BIEN
import { Textarea } from '@/components/ui/textarea'
<Textarea />
```

---

## 📦 Componentes por Instalar (Recomendados)

Estos componentes son **MUY útiles** y deberían instalarse:

### 1. **Toast / Sonner** (Notificaciones)
```bash
npx shadcn@latest add sonner
```

**Uso:**
```tsx
import { toast } from 'sonner'

toast.success('Catering creado correctamente')
toast.error('Error al guardar')
toast.loading('Guardando...')
```

### 2. **Sheet** (Sidebar/Drawer)
```bash
npx shadcn@latest add sheet
```

**Uso:**
```tsx
<Sheet>
  <SheetTrigger>Abrir menú</SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Menú</SheetTitle>
    </SheetHeader>
    ...
  </SheetContent>
</Sheet>
```

### 3. **Command** (Command Palette / Search)
```bash
npx shadcn@latest add command
```

**Uso:**
```tsx
<Command>
  <CommandInput placeholder="Buscar..." />
  <CommandList>
    <CommandGroup heading="Caterings">
      <CommandItem>Catering Delicious</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

### 4. **Popover** (Tooltips mejorados)
```bash
npx shadcn@latest add popover
```

**Uso:**
```tsx
<Popover>
  <PopoverTrigger>Más info</PopoverTrigger>
  <PopoverContent>
    <p>Información adicional</p>
  </PopoverContent>
</Popover>
```

### 5. **Switch** (Toggle)
```bash
npx shadcn@latest add switch
```

**Uso:**
```tsx
<Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
```

### 6. **Progress** (Barra de progreso)
```bash
npx shadcn@latest add progress
```

**Uso:**
```tsx
<Progress value={66} />
```

### 7. **Calendar / DatePicker** (Selector de fechas)
```bash
npx shadcn@latest add calendar
```

**Uso:**
```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
/>
```

---

## 🎨 Variantes de Componentes

### Button Variants
```tsx
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

### Button Sizes
```tsx
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Badge Variants
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Alert Variants
```tsx
<Alert variant="default">Info</Alert>
<Alert variant="destructive">Error</Alert>
```

---

## 📝 Patrones de Formularios

### Formulario con react-hook-form + Zod

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

export function LoginForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tu@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormDescription>
                Mínimo 8 caracteres
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Iniciar sesión
        </Button>
      </form>
    </Form>
  )
}
```

---

## 🚫 Errores Comunes a Evitar

### 1. ❌ Mezclar HTML nativo con shadcn
```tsx
// ❌ MAL - Mezcla inconsistente
<form>
  <input type="text" />  {/* Nativo */}
  <Button>Submit</Button>  {/* shadcn */}
</form>

// ✅ BIEN - Todo shadcn
<form>
  <Input type="text" />
  <Button>Submit</Button>
</form>
```

### 2. ❌ Styling manual en lugar de variantes
```tsx
// ❌ MAL
<Button className="bg-red-500 text-white hover:bg-red-600">
  Delete
</Button>

// ✅ BIEN
<Button variant="destructive">
  Delete
</Button>
```

### 3. ❌ Crear componentes custom en lugar de usar shadcn
```tsx
// ❌ MAL
export function CustomCard({ children }) {
  return (
    <div className="rounded-lg border p-4">
      {children}
    </div>
  )
}

// ✅ BIEN
import { Card, CardContent } from '@/components/ui/card'

<Card>
  <CardContent>
    {children}
  </CardContent>
</Card>
```

---

## 📚 Recursos

- **Documentación oficial:** https://ui.shadcn.com
- **Componentes:** https://ui.shadcn.com/docs/components
- **Temas:** https://ui.shadcn.com/themes
- **Ejemplos:** https://ui.shadcn.com/examples

---

## ✅ Checklist de Migración

Para migrar una página/componente a shadcn:

- [ ] Reemplazar `<input>` por `<Input>`
- [ ] Reemplazar `<button>` por `<Button>`
- [ ] Reemplazar `<label>` por `<Label>`
- [ ] Reemplazar `<textarea>` por `<Textarea>`
- [ ] Reemplazar `<select>` por `<Select>`
- [ ] Usar `<Form>` de shadcn con react-hook-form
- [ ] Usar `<Alert>` para mensajes de error
- [ ] Usar `<Card>` para contenedores
- [ ] Usar `toast()` para notificaciones
- [ ] Verificar variantes correctas (no styling manual)

---

## 🎯 Prioridades de Migración

1. **Alta prioridad** (migrar primero):
   - Login / Auth pages
   - Formularios principales
   - Dashboard / KPIs
   - Tablas de datos

2. **Media prioridad**:
   - Páginas de configuración
   - Modales y diálogos
   - Componentes de listado

3. **Baja prioridad**:
   - Páginas de error
   - Páginas estáticas
   - Documentación interna

---

**Recuerda:** shadcn/ui es la única librería de UI permitida en esta plataforma. **TODO debe usar shadcn.**

