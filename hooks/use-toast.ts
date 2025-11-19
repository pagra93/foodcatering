/**
 * Toast Hook
 * Hook para mostrar notificaciones toast usando sonner
 */

import { toast as sonnerToast } from 'sonner'

type ToastProps = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  action?: {
    label: string
    onClick: () => void
  }
}

export function useToast() {
  const toast = ({ title, description, variant, action }: ToastProps) => {
    if (variant === 'destructive') {
      sonnerToast.error(title || 'Error', {
        description,
        action: action ? {
          label: action.label,
          onClick: action.onClick,
        } : undefined,
      })
    } else {
      sonnerToast.success(title || 'Éxito', {
        description,
        action: action ? {
          label: action.label,
          onClick: action.onClick,
        } : undefined,
      })
    }
  }

  return { toast }
}

