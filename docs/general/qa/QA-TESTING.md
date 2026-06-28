# 🧪 Sistema de QA Automatizado - Testing E2E

## 📋 Descripción

Este sistema de QA automatizado utiliza **Playwright** para probar de forma completa y automática toda la funcionalidad de la plataforma. Puedes ejecutar tests cuando quieras para verificar que todo funciona correctamente.

---

## 🚀 Comandos Disponibles

### **1. Testing de Caterings (Completo)**

```bash
# Ejecutar todos los tests de caterings
pnpm test:caterings
```

**¿Qué prueba?**
- ✅ Lista de caterings (KPIs, tabla, filtros)
- ✅ Wizard de creación (7 pasos)
- ✅ Detalle de catering (8 tabs)
- ✅ Navegación entre páginas
- ✅ Búsqueda y filtros
- ✅ Botones y acciones
- ✅ Responsive design
- ✅ Performance

### **2. Testing con UI Visual**

```bash
# Ver los tests ejecutándose en tiempo real
pnpm test:caterings:ui
```

**Características:**
- Interfaz gráfica de Playwright
- Ve el navegador ejecutando los tests
- Pausa y reproduce tests
- Inspecciona cada paso

### **3. Testing en Modo Debug**

```bash
# Debug paso a paso
pnpm test:caterings:debug
```

**Características:**
- Ejecuta paso a paso
- Inspecciona elementos
- Ve el DOM en tiempo real
- Perfecto para encontrar errores

### **4. Ver Reporte de Tests**

```bash
# Ver el último reporte generado
pnpm test:caterings:report
```

**Incluye:**
- Resultados de todos los tests
- Screenshots de fallos
- Logs detallados
- Métricas de performance

---

## 📊 Estructura de Tests

### **Tests Incluidos para Caterings**

#### **1. Lista de Caterings** (7 tests)
```
✓ Cargar página principal
✓ Mostrar tabla con datos mock
✓ Buscar caterings
✓ Filtrar por estado
✓ Filtrar por documentos
✓ Filtrar por SLA
✓ Abrir menú de acciones
```

#### **2. Wizard de Creación** (8 tests)
```
✓ Cargar wizard correctamente
✓ Mostrar campos del Paso 1
✓ Navegar al Paso 2
✓ Mostrar botón "Anterior"
✓ Volver al Paso 1
✓ Mantener datos al navegar
✓ Mostrar botón "Guardar Borrador"
✓ Agregar zonas de servicio
```

#### **3. Detalle de Catering** (4 tests - skip hasta tener BD)
```
⊗ Cargar página de detalle (skip)
⊗ Mostrar 8 tabs (skip)
⊗ Cambiar entre tabs (skip)
⊗ Mostrar KPIs en Overview (skip)
```

#### **4. Navegación General** (2 tests)
```
✓ Navegar de lista a creación
✓ Mantener estado en filtros
```

#### **5. Responsive Design** (2 tests)
```
✓ Responsive en mobile (375px)
✓ Responsive en tablet (768px)
```

#### **6. Performance** (1 test)
```
✓ Cargar lista en < 5 segundos
```

**Total: 24 tests**

---

## 🎯 Cómo Usar el QA

### **Escenario 1: Testing Rápido**

```bash
# Ejecutar tests de caterings
pnpm test:caterings
```

**Output:**
```
Running 24 tests using 1 worker

✓ Lista de Caterings › debe cargar la página principal correctamente (2.1s)
✓ Lista de Caterings › debe mostrar la tabla de caterings (1.8s)
✓ Lista de Caterings › debe permitir buscar caterings (2.3s)
...

24 passed (45s)
```

### **Escenario 2: Ver Tests en Acción**

```bash
# Abrir UI de Playwright
pnpm test:caterings:ui
```

**Te permite:**
1. Ver el navegador ejecutando tests
2. Pausar en cualquier momento
3. Inspeccionar elementos
4. Reproducir tests individuales
5. Ver screenshots y videos

### **Escenario 3: Debugear un Test que Falla**

```bash
# Modo debug
pnpm test:caterings:debug
```

**Pasos:**
1. Se abre el navegador con DevTools
2. El test se pausa en cada paso
3. Puedes inspeccionar el DOM
4. Avanzas paso a paso
5. Identificas dónde falla

### **Escenario 4: Ver Reporte Completo**

```bash
# Generar reporte HTML
pnpm test:caterings:report
```

**Incluye:**
- ✅ Tests que pasaron (verde)
- ❌ Tests que fallaron (rojo)
- ⊗ Tests skipped (gris)
- 📸 Screenshots de fallos
- 📹 Videos de ejecución
- ⏱️ Tiempos de ejecución
- 📊 Gráficas de performance

---

## 🔧 Configuración

### **Modificar Tests**

Archivo: `tests/e2e/caterings.spec.ts`

```typescript
test('mi nuevo test', async ({ page }) => {
  await page.goto(`${BASE_URL}/admin/caterings`)
  
  // Tu código de test aquí
  await expect(page.locator('h1')).toContainText('Caterings')
})
```

### **Agregar Nuevos Tests**

```typescript
test.describe('Nueva Funcionalidad', () => {
  test('debe hacer algo específico', async ({ page }) => {
    // ...
  })
})
```

### **Variables de Entorno**

```bash
# .env.test
BASE_URL=http://localhost:3000
TEST_USER_EMAIL=admin@test.com
TEST_USER_PASSWORD=password123
```

---

## 📝 Guía de Comandos de Playwright

### **Navegación**
```typescript
await page.goto('http://localhost:3000/admin/caterings')
await page.goBack()
await page.reload()
```

### **Interacciones**
```typescript
// Click
await page.getByRole('button', { name: 'Crear' }).click()

// Rellenar input
await page.getByLabel('Nombre').fill('Test')

// Seleccionar dropdown
await page.selectOption('select#estado', 'activo')
```

### **Verificaciones**
```typescript
// Verificar texto
await expect(page.locator('h1')).toContainText('Caterings')

// Verificar visibilidad
await expect(page.getByRole('button')).toBeVisible()

// Verificar URL
await expect(page).toHaveURL(/\/admin\/caterings/)
```

### **Esperas**
```typescript
// Esperar elemento
await page.waitForSelector('table')

// Esperar tiempo fijo (evitar si es posible)
await page.waitForTimeout(1000)

// Esperar navegación
await page.waitForURL(/\/admin\/caterings\/new/)
```

---

## 🐛 Tests que Fallan

### **Qué hacer si un test falla:**

1. **Ver el error**
   ```bash
   pnpm test:caterings
   ```

2. **Ver el screenshot**
   - Se guarda automáticamente en `test-results/`
   - Muestra cómo estaba la página cuando falló

3. **Ejecutar en modo debug**
   ```bash
   pnpm test:caterings:debug
   ```

4. **Ver el reporte completo**
   ```bash
   pnpm test:caterings:report
   ```

### **Errores Comunes**

**Error: "Timeout waiting for selector"**
- El elemento no apareció a tiempo
- Verifica que la página carga correctamente
- Aumenta el timeout si es necesario

**Error: "Expected text not found"**
- El texto cambió en la UI
- Actualiza el test con el nuevo texto

**Error: "Element not visible"**
- El elemento está oculto o no renderizado
- Verifica que el elemento exista en el DOM

---

## 📸 Screenshots y Videos

### **Automático en Fallos**
```
test-results/
├── lista-de-caterings-debe-cargar-correctamente/
│   ├── test-failed-1.png
│   └── video.webm
```

### **Manual**
```typescript
test('mi test', async ({ page }) => {
  await page.goto('/admin/caterings')
  
  // Capturar screenshot
  await page.screenshot({ path: 'screenshot.png' })
  
  // Capturar solo un elemento
  await page.locator('table').screenshot({ path: 'table.png' })
})
```

---

## 🚦 CI/CD Integration

### **GitHub Actions**

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:caterings
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📚 Recursos

- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selector Guide](https://playwright.dev/docs/selectors)
- [API Reference](https://playwright.dev/docs/api/class-page)

---

## ✅ Checklist de QA

Antes de deploy a producción:

- [ ] `pnpm test:caterings` pasa al 100%
- [ ] No hay tests skipped sin justificación
- [ ] Performance < 5 segundos en lista
- [ ] Responsive funciona en mobile/tablet
- [ ] Todas las acciones críticas probadas
- [ ] Screenshots sin errores visuales

---

## 🎉 Resultado

Con este sistema de QA puedes:

1. ✅ **Probar toda la sección de caterings** automáticamente
2. ✅ **Ver tests en tiempo real** con UI visual
3. ✅ **Debugear fallos** paso a paso
4. ✅ **Generar reportes** profesionales
5. ✅ **Integrar en CI/CD** para testing continuo
6. ✅ **Documentar funcionalidad** con tests vivos
7. ✅ **Prevenir regresiones** al hacer cambios
8. ✅ **Aumentar confianza** en el código

**¡Ejecuta `pnpm test:caterings` cuando quieras verificar que todo funciona!** 🚀

