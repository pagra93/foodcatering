# 🚀 QA Quick Start - Uso Rápido

## 🎯 ¿Qué es esto?

Sistema de **testing automatizado E2E** para probar toda la funcionalidad de la sección de caterings sin hacer nada manual.

---

## ⚡ Comandos Rápidos

### **1. Probar Todo** (Recomendado)

```bash
pnpm test:caterings
```

**Output:**
```
✓ 24 tests pasaron
✗ 0 tests fallaron
⊗ 3 tests skipped
⏱️  45 segundos
```

### **2. Ver Tests en Acción**

```bash
pnpm test:caterings:ui
```

Abre una interfaz gráfica donde ves el navegador ejecutando los tests en tiempo real.

### **3. Ver Reporte HTML**

```bash
pnpm test:caterings:report
```

Abre un reporte bonito con resultados, screenshots y videos.

---

## 📋 ¿Qué Prueba?

### **Lista de Caterings**
- ✅ Carga página
- ✅ Muestra tabla con datos
- ✅ Búsqueda funciona
- ✅ Filtros funcionan (estado, docs, SLA)
- ✅ Menú de acciones se abre

### **Wizard de Creación**
- ✅ Carga correctamente
- ✅ Navegación entre 7 pasos
- ✅ Botones Anterior/Siguiente
- ✅ Mantiene datos al navegar
- ✅ Agregar zonas dinámicamente

### **Detalle de Catering** (skip hasta tener BD)
- ⊗ 8 tabs (pendiente datos reales)

### **General**
- ✅ Responsive mobile/tablet
- ✅ Performance < 5 segundos
- ✅ Navegación entre páginas

---

## 🎬 Ejemplo de Uso

```bash
# Antes de hacer un commit importante
pnpm test:caterings

# Si todo pasa ✓
git commit -m "feat: nueva funcionalidad"

# Si algo falla ✗
pnpm test:caterings:ui  # Ver qué falló
# Arreglar el problema
pnpm test:caterings     # Re-ejecutar
```

---

## 🐛 Si un Test Falla

1. **Ver el error en terminal**
2. **Ejecutar con UI**: `pnpm test:caterings:ui`
3. **Ver screenshot del fallo** en `test-results/`
4. **Arreglar el código**
5. **Re-ejecutar**: `pnpm test:caterings`

---

## 📝 Agregar Nuevos Tests

Archivo: `tests/e2e/caterings.spec.ts`

```typescript
test('mi nuevo test', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/caterings')
  await expect(page.locator('h1')).toContainText('Caterings')
})
```

---

## ✅ Cuándo Ejecutar

- ✅ Antes de cada commit importante
- ✅ Antes de hacer un PR
- ✅ Antes de deploy a producción
- ✅ Después de refactorizar código
- ✅ Cuando agregues nueva funcionalidad
- ✅ Cuando quieras verificar que todo funciona

---

## 🎉 Resultado

**Con un solo comando**, pruebas automáticamente:
- 24 tests
- 6 categorías
- Múltiples dispositivos
- Performance
- Interacciones de usuario
- Navegación completa

**¡En menos de 1 minuto sabes si todo funciona!** 🚀

---

## 📚 Más Info

Ver documentación completa: `docs/QA-TESTING.md`

