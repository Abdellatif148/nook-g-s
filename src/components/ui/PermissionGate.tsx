import React from 'react'
import { useAuthStore } from '../../stores/authStore'
import { Navigate } from 'react-router-dom'

interface PermissionGateProps {
  permission: 'reports' | 'clients' | 'settings'
  children: React.ReactNode
}

export const PermissionGate = ({ permission, children }: PermissionGateProps) => {
  const { type, staff } = useAuthStore()

  if (type === 'owner') return <>{children}</>

  if (type === 'staff') {
    const perms = staff?.permissions as any
    if (perms?.[permission]) return <>{children}</>
  }

  return null
}
