'use client'

/**
 * Hook de paginación con estado local y sincronización con la URL.
 *
 * Usa `URLSearchParams` para mantener el estado en la navegación (back/forward
 * funciona, la URL es compartible). Se integra con Next App Router vía
 * `useRouter` + `useSearchParams`.
 *
 * Uso:
 *
 *   const { page, pageSize, setPage, setPageSize, totalPages } = usePagination({
 *     total,
 *     defaultPageSize: 20,
 *   })
 */

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type UsePaginationOptions = {
  total: number
  defaultPage?: number
  defaultPageSize?: number
}

type UsePaginationResult = {
  page: number
  pageSize: number
  totalPages: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  prevPage: () => void
  canNext: boolean
  canPrev: boolean
}

export function usePagination({
  total,
  defaultPage = 1,
  defaultPageSize = 20,
}: UsePaginationOptions): UsePaginationResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = useMemo(() => {
    const raw = searchParams.get('page')
    const parsed = raw ? parseInt(raw, 10) : defaultPage
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPage
  }, [searchParams, defaultPage])

  const pageSize = useMemo(() => {
    const raw = searchParams.get('pageSize')
    const parsed = raw ? parseInt(raw, 10) : defaultPageSize
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPageSize
  }, [searchParams, defaultPageSize])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null) params.delete(key)
      else params.set(key, value)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const setPage = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(1, next), totalPages)
      updateParam('page', String(clamped))
    },
    [updateParam, totalPages]
  )

  const setPageSize = useCallback(
    (size: number) => {
      updateParam('pageSize', String(size))
      // Al cambiar pageSize volvemos a página 1 para evitar saltos raros.
      updateParam('page', '1')
    },
    [updateParam]
  )

  return {
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    nextPage: () => setPage(page + 1),
    prevPage: () => setPage(page - 1),
    canNext: page < totalPages,
    canPrev: page > 1,
  }
}
