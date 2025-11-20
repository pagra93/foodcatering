/**
 * Endpoint de DEBUG para verificar variables de entorno
 * ⚠️ ELIMINAR después de verificar
 */

import { NextResponse } from 'next/server'

export async function GET() {
  // Solo permitir en desarrollo o con un token secreto
  const isDev = process.env.NODE_ENV === 'development'
  
  // TEMPORAL: Permitir siempre para debug
  // TODO: ELIMINAR este endpoint después de verificar
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env_check: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅ Configurada' : '❌ NO configurada',
      NEXTAUTH_URL_value: process.env.NEXTAUTH_URL || 'undefined',
      
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ Configurada' : '❌ NO configurada',
      NEXTAUTH_SECRET_length: process.env.NEXTAUTH_SECRET?.length || 0,
      
      WILDCARD_DOMAIN: process.env.WILDCARD_DOMAIN ? '✅ Configurada' : '❌ NO configurada',
      WILDCARD_DOMAIN_value: process.env.WILDCARD_DOMAIN || 'undefined',
      
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Configurada' : '❌ NO configurada',
      DATABASE_URL_protocol: process.env.DATABASE_URL?.split(':')[0] || 'undefined',
      
      NODE_ENV: process.env.NODE_ENV || 'undefined',
    }
  })
}

