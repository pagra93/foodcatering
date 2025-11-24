'use client'

/**
 * Link con loading state para navegación client-side
 * Soluciona el problema de "no responde de primeras"
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type LoadingLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
  variant?: 'link' | 'button' | 'ghost'
}

export function LoadingLink({ href, children, className, variant = 'link' }: LoadingLinkProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isClicked, setIsClicked] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setIsClicked(true)
    
    startTransition(() => {
      router.push(href)
      // Reset después de un tiempo para evitar estado bloqueado
      setTimeout(() => setIsClicked(false), 3000)
    })
  }

  const isLoading = isPending || isClicked

  const baseClasses = {
    link: 'text-blue-600 hover:text-blue-700 underline',
    button: 'inline-flex items-center justify-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50',
    ghost: 'inline-flex items-center gap-2',
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        baseClasses[variant],
        isLoading && 'cursor-wait opacity-75',
        className
      )}
      aria-disabled={isLoading}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </a>
  )
}

