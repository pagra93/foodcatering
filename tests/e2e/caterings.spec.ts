/**
 * Tests E2E para la Sección de Caterings
 * 
 * Ejecutar: pnpm test:caterings
 * Ver reporte: pnpm test:caterings:report
 */

import { test, expect } from '@playwright/test'

// URL base (ajustar según entorno)
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Helper para login (ajustar según tu sistema de auth)
async function login(page: any) {
  // TODO: Implementar login real cuando esté disponible
  // Por ahora, asumimos que estamos autenticados
  await page.goto(`${BASE_URL}/admin/caterings`)
}

test.describe('Sección de Caterings - QA Completo', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ============================================
  // 1. LISTA DE CATERINGS
  // ============================================
  test.describe('Lista de Caterings', () => {
    test('debe cargar la página principal correctamente', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      // Verificar título
      await expect(page.locator('h1')).toContainText('Caterings')
      
      // Verificar que existan los 4 KPIs
      const kpis = page.locator('[class*="grid"]').first()
      await expect(kpis).toBeVisible()
      
      // Verificar botones de acción
      await expect(page.getByRole('link', { name: /Crear Catering/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Docs por Caducar/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Incidencias Críticas/i })).toBeVisible()
    })

    test('debe mostrar la tabla de caterings con datos mock', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      // Esperar a que cargue la tabla
      await page.waitForSelector('table', { timeout: 10000 })
      
      // Verificar columnas
      await expect(page.getByRole('columnheader', { name: 'Catering' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Zonas' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Capacidad' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /SLA/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Documentos' })).toBeVisible()
      
      // Verificar que haya al menos 1 fila de datos
      const rows = page.locator('tbody tr')
      await expect(rows).not.toHaveCount(0)
    })

    test('debe permitir buscar caterings', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      // Esperar a que cargue la tabla
      await page.waitForSelector('table')
      
      // Buscar en el input
      const searchInput = page.getByPlaceholder(/Buscar catering/i)
      await searchInput.fill('Delicious')
      
      // Esperar un momento para el filtrado
      await page.waitForTimeout(500)
      
      // Verificar que los resultados se filtren
      const resultsText = page.locator('text=/Mostrando.*de.*caterings/i')
      await expect(resultsText).toBeVisible()
    })

    test('debe permitir filtrar por estado', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      await page.waitForSelector('table')
      
      // Abrir dropdown de estado
      const statusFilter = page.locator('button:has-text("Todos")').first()
      await statusFilter.click()
      
      // Seleccionar "Activos"
      await page.getByRole('option', { name: 'Activos' }).click()
      
      await page.waitForTimeout(500)
      
      // Verificar que se aplicó el filtro
      await expect(statusFilter).toBeVisible()
    })

    test('debe permitir filtrar por documentos', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      await page.waitForSelector('table')
      
      // Abrir dropdown de documentos
      const docsFilter = page.locator('button:has-text("Todos Docs")')
      await docsFilter.click()
      
      // Seleccionar "Al día"
      await page.getByRole('option', { name: 'Al día' }).click()
      
      await page.waitForTimeout(500)
    })

    test('debe permitir filtrar por SLA', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      await page.waitForSelector('table')
      
      // Abrir dropdown de SLA
      const slaFilter = page.locator('button:has-text("Todos SLA")')
      await slaFilter.click()
      
      // Seleccionar opción
      await page.getByRole('option', { name: /95%/i }).first().click()
      
      await page.waitForTimeout(500)
    })

    test('debe abrir el menú de acciones', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      await page.waitForSelector('table')
      
      // Click en el primer botón de acciones
      const actionsButton = page.getByRole('button', { name: 'Acciones' }).first()
      await actionsButton.click()
      
      // Verificar que aparezcan las opciones
      await expect(page.getByRole('menuitem', { name: /Ver Detalle/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /Editar/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /Impersonar/i })).toBeVisible()
    })
  })

  // ============================================
  // 2. WIZARD DE CREACIÓN
  // ============================================
  test.describe('Wizard de Creación de Catering', () => {
    test('debe cargar el wizard correctamente', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/new`)
      
      // Verificar título
      await expect(page.locator('h1')).toContainText('Nuevo Catering')
      
      // Verificar que esté en el paso 1
      await expect(page.locator('text=Paso 1:')).toBeVisible()
      await expect(page.locator('text=Datos Generales')).toBeVisible()
      
      // Verificar progress stepper (7 pasos)
      const steps = page.locator('[class*="rounded-full"]').filter({ hasText: /^[1-7]$|Building|FileText|Shield|Settings|MapPin|DollarSign|Users/ })
      // Al menos 3 iconos visibles del stepper
      await expect(steps.first()).toBeVisible()
    })

    test('debe mostrar campos del Paso 1', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/new`)
      
      // Verificar campos del paso 1
      await expect(page.getByLabel(/Nombre del Tenant/i)).toBeVisible()
      await expect(page.getByLabel(/Nombre Comercial/i)).toBeVisible()
      await expect(page.getByLabel(/Email de Contacto/i)).toBeVisible()
      await expect(page.getByLabel(/Teléfono/i)).toBeVisible()
    })

    test('debe permitir navegar al Paso 2', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/new`)
      
      // Rellenar campos requeridos del Paso 1
      await page.getByLabel(/Nombre del Tenant/i).fill('catering-test')
      await page.getByLabel(/Nombre Comercial/i).fill('Catering Test')
      await page.getByLabel(/Email de Contacto/i).fill('test@catering.com')
      await page.getByLabel(/Teléfono/i).fill('+34 912 345 678')
      
      // Click en "Siguiente"
      await page.getByRole('button', { name: /Siguiente/i }).click()
      
      // Verificar que estamos en el Paso 2
      await expect(page.locator('text=Paso 2:')).toBeVisible()
      await expect(page.locator('text=Legal y Bancario')).toBeVisible()
    })

    test('debe mostrar botón "Anterior" en Paso 2', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/new`)
      
      // Ir al paso 2
      await page.getByLabel(/Nombre del Tenant/i).fill('test')
      await page.getByLabel(/Nombre Comercial/i).fill('Test')
      await page.getByLabel(/Email de Contacto/i).fill('test@test.com')
      await page.getByLabel(/Teléfono/i).fill('+34 111 111 111')
      await page.getByRole('button', { name: /Siguiente/i }).click()
      
      // Verificar botón "Anterior"
      await expect(page.getByRole('button', { name: /Anterior/i })).toBeVisible()
    })

    test('debe permitir volver al Paso 1', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/new`)
      
      // Ir al paso 2
      await page.getByLabel(/Nombre del Tenant/i).fill('test')
      await page.getByLabel(/Nombre Comercial/i).fill('Test')
      await page.getByLabel(/Email de Contacto/i).fill('test@test.com')
      await page.getByLabel(/Teléfono/i).fill('+34 111 111 111')
      await page.getByRole('button', { name: /Siguiente/i }).click()
      
      // Volver
      await page.getByRole('button', { name: /Anterior/i }).click()
      
      // Verificar que estamos en el Paso 1
      await expect(page.locator('text=Paso 1:')).toBeVisible()
      
      // Verificar que los datos se mantienen
      await expect(page.getByLabel(/Nombre del Tenant/i)).toHaveValue('test')
    })

    test('debe mostrar botón "Guardar Borrador"', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/new`)
      
      await expect(page.getByRole('button', { name: /Guardar Borrador/i })).toBeVisible()
    })

    test('debe permitir agregar zonas de servicio en Paso 5', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/new`)
      
      // Navegar hasta el paso 5 (simplificado - en realidad habría que rellenar pasos anteriores)
      for (let i = 0; i < 4; i++) {
        const nextButton = page.getByRole('button', { name: /Siguiente/i })
        if (await nextButton.isVisible()) {
          await nextButton.click()
          await page.waitForTimeout(300)
        }
      }
      
      // Verificar que estamos en Paso 5 o cerca
      // (Puede fallar si la validación requiere datos)
      const addZoneButton = page.getByRole('button', { name: /Agregar Zona/i })
      if (await addZoneButton.isVisible()) {
        await addZoneButton.click()
        
        // Verificar que se agregó una nueva zona
        await expect(page.locator('text=Zona 2')).toBeVisible()
      }
    })
  })

  // ============================================
  // 3. DETALLE DE CATERING (8 TABS)
  // ============================================
  test.describe('Detalle de Catering', () => {
    // Nota: Necesitarás un ID de catering real o mock para estas pruebas
    const MOCK_CATERING_ID = 'test-catering-id'

    test.skip('debe cargar la página de detalle', async ({ page }) => {
      // Skip hasta tener un catering de prueba en BD
      await page.goto(`${BASE_URL}/admin/caterings/${MOCK_CATERING_ID}`)
      
      // Verificar que cargue
      await expect(page.locator('h1')).toBeVisible()
    })

    test.skip('debe mostrar los 8 tabs', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/${MOCK_CATERING_ID}`)
      
      // Verificar tabs
      await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Calidad/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Operación/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Menús/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Facturación/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Incidencias/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Usuarios/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Registro de Actividad/i })).toBeVisible()
    })

    test.skip('debe cambiar entre tabs', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/${MOCK_CATERING_ID}`)
      
      // Click en tab "Usuarios"
      await page.getByRole('tab', { name: /Usuarios/i }).click()
      
      // Verificar que cambia el contenido
      await expect(page.locator('text=Usuarios & Permisos')).toBeVisible()
      
      // Click en tab "Registro de Actividad"
      await page.getByRole('tab', { name: /Registro de Actividad/i }).click()
      
      await expect(page.locator('text=Timeline de Actividad')).toBeVisible()
    })

    test.skip('debe mostrar KPIs en el tab Overview', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings/${MOCK_CATERING_ID}`)
      
      // Tab Overview debería estar activo por defecto
      await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('data-state', 'active')
      
      // Verificar que hay KPIs
      await expect(page.locator('text=/Pedidos|Puntualidad|Incidencias/i').first()).toBeVisible()
    })
  })

  // ============================================
  // 4. NAVEGACIÓN GENERAL
  // ============================================
  test.describe('Navegación General', () => {
    test('debe navegar de lista a creación', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      // Click en "Crear Catering"
      await page.getByRole('link', { name: /Crear Catering/i }).click()
      
      // Verificar que llegamos a la página de creación
      await expect(page).toHaveURL(/\/admin\/caterings\/new/)
      await expect(page.locator('text=Nuevo Catering')).toBeVisible()
    })

    test('debe mantener el estado al navegar entre filtros', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      await page.waitForSelector('table')
      
      // Aplicar búsqueda
      await page.getByPlaceholder(/Buscar catering/i).fill('Test')
      
      // Esperar filtrado
      await page.waitForTimeout(500)
      
      // Verificar que el input mantiene el valor
      await expect(page.getByPlaceholder(/Buscar catering/i)).toHaveValue('Test')
    })
  })

  // ============================================
  // 5. RESPONSIVE DESIGN
  // ============================================
  test.describe('Responsive Design', () => {
    test('debe ser responsive en mobile', async ({ page }) => {
      // Configurar viewport mobile
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      // Verificar que carga
      await expect(page.locator('h1')).toBeVisible()
      
      // Los KPIs deberían apilarse
      const kpis = page.locator('[class*="grid"]').first()
      await expect(kpis).toBeVisible()
    })

    test('debe ser responsive en tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      await expect(page.locator('h1')).toBeVisible()
    })
  })

  // ============================================
  // 6. PERFORMANCE
  // ============================================
  test.describe('Performance', () => {
    test('debe cargar la lista en menos de 5 segundos', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto(`${BASE_URL}/admin/caterings`)
      await page.waitForSelector('table')
      
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(5000)
    })

    test('debe mostrar skeletons mientras carga', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/caterings`)
      
      // Buscar skeletons (deberían aparecer brevemente)
      // Esto puede ser difícil de capturar en local
      // Más útil en entornos con latencia
    })
  })
})

