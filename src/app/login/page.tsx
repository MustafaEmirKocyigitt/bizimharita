'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Mail, Lock, Sparkles, AlertCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message === 'Invalid login credentials' 
          ? 'E-posta veya şifre hatalı. Lütfen kontrol edin.' 
          : authError.message)
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError('Giriş yapılırken beklenmedik bir hata oluştu.')
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-[#FFFDF9] via-[#FFEBE9] to-[#FFF5F5] overflow-hidden">
      {/* Romantik Arka Plan Kalpleri */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {mounted && [...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-[#E5989B]/10"
            initial={{ 
              x: Math.random() * 800 - 400, 
              y: Math.random() * 600 + 400,
              scale: Math.random() * 1.5 + 0.5,
              opacity: 0 
            }}
            animate={{ 
              y: -200, 
              opacity: [0, 0.4, 0.4, 0],
              rotate: Math.random() * 360
            }}
            transition={{ 
              duration: Math.random() * 15 + 15, 
              repeat: Infinity, 
              ease: "linear",
              delay: i * 3
            }}
            style={{ 
              left: `${Math.random() * 100}%`,
              bottom: 0
            }}
          >
            <Heart size={80} fill="currentColor" />
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Glow efekti */}
        <div className="absolute inset-0 bg-[#E5989B]/10 blur-3xl rounded-3xl -z-10" />

        {/* Form Karti */}
        <div className="backdrop-blur-md bg-white/70 border border-white/40 shadow-[0_8px_32px_0_rgba(229,152,155,0.08)] rounded-3xl p-8 md:p-10 text-[#3D3A45]">
          
          {/* Logo / Baslik */}
          <div className="text-center mb-8">
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFF5F5] border border-[#FFEBE9] text-[#E5989B] mb-4"
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Heart size={32} fill="currentColor" className="animate-pulse" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-[#3D3A45] mb-2 flex items-center justify-center gap-2">
              Bizim Harita <Sparkles size={20} className="text-[#E5989B]" />
            </h1>
            <p className="text-sm text-[#3D3A45]/70">
              Aşkınızın dijital hafızasına hoş geldiniz. ❤️
            </p>
          </div>

          {/* Hata Karti */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                E-posta Adresiniz
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3A45]/40">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="biz@askimiz.com"
                  className="block w-full pl-11 pr-4 py-3.5 bg-white/90 border border-white/50 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                Şifreniz
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3A45]/40">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-4 py-3.5 bg-white/90 border border-white/50 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="relative w-full py-4 px-6 bg-[#E5989B] hover:bg-[#B56576] active:bg-[#B56576] text-white font-semibold rounded-2xl shadow-[0_4px_20px_0_rgba(229,152,155,0.3)] hover:shadow-[0_4px_25px_0_rgba(181,101,118,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 overflow-hidden"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <Heart size={16} fill="currentColor" />
                </>
              )}
            </motion.button>
          </form>

          {/* Alt Bilgi */}
          <div className="text-center mt-8 pt-6 border-t border-[#3D3A45]/5 text-sm text-[#3D3A45]/70">
            Henüz bir hesabınız yok mu?{' '}
            <Link href="/register" className="font-semibold text-[#B56576] hover:text-[#E5989B] transition-colors pl-1">
              Hemen Kaydolun
            </Link>
          </div>

        </div>
      </motion.div>
    </main>
  )
}
