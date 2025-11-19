import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración de Playwright para tests E2E
 * Tests críticos: aislamiento tenant, cutoff, consolidación, facturación
 */

const PORT = process.env.PORT || 3000
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  
  // Configuración de timeouts
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  // Ejecutar tests en paralelo
  fullyParallel: true,
  
  // Fallar si se deja un test.only
  forbidOnly: !!process.env.CI,
  
  // Reintentos en CI
  retries: process.env.CI ? 2 : 0,
  
  // Workers (paralelismo)
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  
  // Configuración global
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts de navegación
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // Proyectos (browsers) - Solo Chrome por ahora para testing rápido
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web Server (levanta Next.js antes de los tests)
  // Comentado porque usamos el servidor que ya está corriendo
  // Descomentar si quieres que Playwright levante el servidor automáticamente
  // webServer: {
  //   command: 'pnpm dev',
  //   url: baseURL,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  //   env: {
  //     NODE_ENV: 'test',
  //     DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL!,
  //     NEXTAUTH_SECRET: 'test-secret-e2e',
  //     ENABLE_CRON_JOBS: 'false', // Deshabilitar cron en tests
  //   },
  // },
})

