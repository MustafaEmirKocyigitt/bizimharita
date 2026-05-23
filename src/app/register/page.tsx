'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Mail, Lock, User, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Girdiğiniz şifreler birbiriyle eşleşmiyor.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Şifreniz en az 6 karakterden oluşmalıdır.')
      setLoading(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      // Supabase'de varsayılan olarak e-posta doğrulaması açıksa kullanıcıya bilgi verilir,
      // değilse doğrudan oturum açılır ve yönlendirme yapılır.
      if (data.session) {
        router.push('/')
        router.refresh()
      } else {
        setSuccess(true)
        setLoading(false)
      }
    } catch (err) {
      setError('Kayıt oluşturulurken beklenmedik bir hata oluştu.')
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
        <div className="absolute inset-0 bg-[#E5989B]/10 blur-3xl rounded-3xl -z-10" />

        {/* Form Karti */}
        <div className="backdrop-blur-md bg-white/70 border border-white/40 shadow-[0_8px_32px_0_rgba(229,152,155,0.08)] rounded-3xl p-8 md:p-10 text-[#3D3A45]">
          
          {/* Logo / Baslik */}
          <div className="text-center mb-8">
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFF5F5] border border-[#FFEBE9] text-[#E5989B] mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Heart size={32} fill="currentColor" className="animate-pulse" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-[#3D3A45] mb-2 flex items-center justify-center gap-2">
              Bizim Harita <Sparkles size={20} className="text-[#E5989B]" />
            </h1>
            <p className="text-sm text-[#3D3A45]/70">
              Ortak anı arşivinizi oluşturmak için ilk adımı atın.
            </p>
          </div>

          {/* Basari Durumu */}
          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 mb-4">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-lg font-bold mb-2">Harika! Kayıt Oluşturuldu.</h3>
              <p className="text-sm text-[#3D3A45]/70 mb-6">
                Hesabınızı doğrulamak için e-posta kutunuzu (gelen veya spam kutusunu) kontrol edin. Doğrulama adımından sonra giriş yapabilirsiniz.
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3.5 px-6 bg-[#E5989B] hover:bg-[#B56576] text-white font-semibold rounded-2xl transition-all text-center"
              >
                Giriş Ekranına Git
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Hata Mesaji */}
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
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                    Adınız (Partnerinizin Göreceği İsim)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3A45]/40">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Leyla / Mecnun"
                      className="block w-full pl-11 pr-4 py-3.5 bg-white/90 border border-white/50 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all"
                    />
                  </div>
                </div>

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
                      placeholder="leyla@mecnun.com"
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                    Şifrenizi Onaylayın
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3A45]/40">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-11 pr-4 py-3.5 bg-white/90 border border-white/50 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full py-4 px-6 mt-4 bg-[#E5989B] hover:bg-[#B56576] active:bg-[#B56576] text-white font-semibold rounded-2xl shadow-[0_4px_20px_0_rgba(229,152,155,0.3)] hover:shadow-[0_4px_25px_0_rgba(181,101,118,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 overflow-hidden"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Kaydol ve Başla</span>
                      <Heart size={16} fill="currentColor" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Alt Bilgi */}
              <div className="text-center mt-8 pt-6 border-t border-[#3D3A45]/5 text-sm text-[#3D3A45]/70">
                Zaten bir hesabınız var mı?{' '}
                <Link href="/login" className="font-semibold text-[#B56576] hover:text-[#E5989B] transition-colors pl-1">
                  Giriş Yapın
                </Link>
              </div>
            </>
          )}

        </div>
      </motion.div>
    </main>
  )
}
