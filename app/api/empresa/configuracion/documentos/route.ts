/**
 * API Route: POST /api/empresa/configuracion/documentos
 * Subir documentos de la empresa
 * 
 * TODO: Integrar servicio de almacenamiento (AWS S3, Cloudinary, etc.)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { permittedAction } from '@/lib/auth/permissions'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth()
    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // 2. Verificar rol
    const allowedRoles = ['ADMIN_EMPRESA', 'RRHH', 'FINANZAS']
    if (!permittedAction(session.user.permissions, session.user.role, 'emp-config-document:upload', allowedRoles)) {
      return apiError(403, 'Sin permisos')
    }

    // 3. Obtener datos
    const formData = await request.formData().catch(() => null)
    if (formData === null) {
      return apiError(400, 'Formulario inválido')
    }
    const file = formData.get('file') as File | null
    const documentType = formData.get('documentType') as string

    if (!file) {
      return apiError(400, 'Archivo requerido')
    }

    // 4. Validar archivo
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return apiError(400, 'Archivo muy grande (máx 10MB)')
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return apiError(400, 'Tipo de archivo no permitido')
    }

    // =============================================================================
    // TODO: IMPLEMENTAR SUBIDA A SERVICIO DE ALMACENAMIENTO
    // =============================================================================
    //
    // Opciones:
    // 
    // 1. AWS S3:
    //    import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
    //    const buffer = Buffer.from(await file.arrayBuffer())
    //    const key = `documents/${session.user.tenantId}/${documentType}/${Date.now()}-${file.name}`
    //    await s3Client.send(new PutObjectCommand({
    //      Bucket: process.env.AWS_S3_BUCKET,
    //      Key: key,
    //      Body: buffer,
    //      ContentType: file.type,
    //    }))
    //    const documentUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`
    //
    // 2. Cloudinary:
    //    import { v2 as cloudinary } from 'cloudinary'
    //    const buffer = Buffer.from(await file.arrayBuffer())
    //    const uploadResult = await new Promise((resolve, reject) => {
    //      cloudinary.uploader.upload_stream({ folder: 'documents' }, (error, result) => {
    //        if (error) reject(error)
    //        else resolve(result)
    //      }).end(buffer)
    //    })
    //    const documentUrl = uploadResult.secure_url
    //
    // 3. Vercel Blob:
    //    import { put } from '@vercel/blob'
    //    const blob = await put(`documents/${file.name}`, file, {
    //      access: 'public',
    //    })
    //    const documentUrl = blob.url
    //
    // =============================================================================

    // Por ahora, simulamos URL (reemplazar con lógica real)
    const documentUrl = `https://storage.example.com/${session.user.tenantId}/${documentType}/${file.name}`

    // 5. Actualizar en base de datos
    const tenantId = session.user.tenantId
    const company = await prisma.company.findUnique({
      where: { tenantId },
    })

    if (!company) {
      return apiError(404, 'Empresa no encontrada')
    }

    // Actualizar campo correspondiente según tipo de documento
    const updateData: any = {}
    
    switch (documentType) {
      case 'contract':
        updateData.contractUrl = documentUrl
        updateData.contractSignedAt = new Date()
        break
      case 'cif':
        updateData.cifDocumentUrl = documentUrl
        break
      case 'certificate':
        updateData.digitalCertificateUrl = documentUrl
        break
      case 'annex':
        // Añadir a array de anexos
        const currentAnnexes = (company.contractAnnexes as any[]) || []
        updateData.contractAnnexes = [...currentAnnexes, file.name]
        break
      default:
        return apiError(400, 'Tipo de documento inválido')
    }

    await prisma.company.update({
      where: { tenantId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      url: documentUrl,
      message: 'Documento subido correctamente',
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'POST /api/empresa/configuracion/documentos',
      requestId: requestIdFrom(request),
      fallback: 'Error al subir el documento',
    })
  }
}

