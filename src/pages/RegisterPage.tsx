import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { User, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../hooks/useTranslation'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useUIStore()

  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      addToast("Les mots de passe ne correspondent pas", "error")
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (error) throw error
      
      if (data.user) {
        addToast(t('common.success'), 'success')
        navigate('/wizard')
      }
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = () => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const strength = getPasswordStrength()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] bg-surface border border-border rounded-2xl p-8 shadow-2xl z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-accent rounded-full flex items-center justify-center text-white font-extrabold text-[22px] shadow-lg shadow-accent/20">
              N
            </div>
            <span className="text-xl font-bold text-text">Nook OS</span>
          </div>
          <p className="text-sm text-text2 mt-1.5">Créer un nouveau compte propriétaire</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            placeholder="Nom complet"
            autoComplete="name"
            icon={<User size={16} />}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            type="email"
            autoComplete="email"
            placeholder={t('auth.email')}
            icon={<Mail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="space-y-2">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.password')}
              icon={<Lock size={16} />}
              rightElement={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-text3 hover:text-text transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex gap-[3px] h-[3px] px-1 mt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-[2px] transition-colors ${
                    i < strength
                      ? strength <= 2 ? 'bg-error' : strength === 3 ? 'bg-warning' : 'bg-success'
                      : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </div>

          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirmer le mot de passe"
            icon={<Shield size={16} />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          
          <Button type="submit" className="w-full h-12" isLoading={isLoading}>
            {t('auth.register')}
          </Button>
          
          <p className="text-center text-[13px] text-text2 pt-2">
            {t('auth.already_account')}
            <Link to="/login" className="text-accent2 hover:underline font-medium ml-1">
              {t('auth.login_link')}
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
