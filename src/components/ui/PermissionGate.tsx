import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'

interface PermissionGateProps {
  children: React.ReactNode
  permission: 'sessions' | 'reports' | 'clients' | 'settings' | 'rates'
}

export function PermissionGate({ children, permission }: PermissionGateProps) {
  const { type, staff } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)
  const navigate = useNavigate()

  useEffect(() => {
    if (type === 'staff' && staff) {
      const hasPermission = (staff.permissions as any)?.[permission]
      if (!hasPermission) {
        addToast("Accès refusé", 'error')
        navigate('/dashboard', { replace: true })
      }
    }
  }, [type, staff, permission, navigate, addToast])

  if (type === 'owner') {
    return <>{children}</>
  }

  if (type === 'staff' && staff) {
    const hasPermission = (staff.permissions as any)?.[permission]
    if (hasPermission) {
      return <>{children}</>
    }
  }

  return null
}
