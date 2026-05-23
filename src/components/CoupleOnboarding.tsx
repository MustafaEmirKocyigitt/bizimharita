'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Copy, Check, Share2, Sparkles, Send, Trash2, LogOut } from 'lucide-react'
import confetti from 'canvas-confetti'
import { createClient } from '@/utils/supabase/client'

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  couple_id: string | null
  partner_id: string | null
}

export default function CoupleOnboarding({ initialProfile }: { initialProfile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inputCode, setInputCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Otomatik yenileme / realtime eslesme dinleyicisi
  useEffect(() => {
    // Eger kullanici bir kod olusturduysa, o couple kaydindaki status degisimini realtime dinleyelim
    if (profile.couple_id) {
      const channel = supabase
        .channel('couple_pairing')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'couples',
            filter: `id=eq.${profile.couple_id}`,
          },
          async (payload: any) => {
            if (payload.new.status === 'active') {
              // Eslesme tamamlandi! Konfeti patlat.
              triggerPairingSuccess()
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [profile.couple_id])

  // Sayfa ilk acildiginda kullanicinin zaten aktif veya pending bir daveti var mi kontrol et
  useEffect(() => {
    const fetchExistingInvite = async () => {
      if (profile.couple_id) {
        const { data, error } = await supabase
          .from('couples')
          .select('invite_code, status')
          .eq('id', profile.couple_id)
          .single()

        if (data) {
          if (data.status === 'active') {
            triggerPairingSuccess()
          } else {
            setInviteCode(data.invite_code)
          }
        }
      }
    }
    fetchExistingInvite()
  }, [])

  const triggerPairingSuccess = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#E5989B', '#B56576', '#FFFDF9', '#FFD166']
    })
    
    // 2 saniye sonra sayfayi yenileyerek dashboard'a gecis yap
    setTimeout(() => {
      router.refresh()
    }, 2000)
  }

  // Rastgele benzersiz kod uretme
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Davet Kodu Olusturma
  const handleCreateCouple = async () => {
    setLoading(true)
    setError(null)
    const code = generateCode()

    try {
      // 1. couples tablosuna pending kayit ekle
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .insert({ invite_code: code, status: 'pending' })
        .select()
        .single()

      if (coupleError) {
        setError('Davet kodu oluşturulurken bir hata oluştu.')
        setLoading(false)
        return
      }

      // 2. profiles tablosunda kendi couple_id'mizi guncelle
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ couple_id: coupleData.id })
        .eq('id', profile.id)

      if (profileError) {
        setError('Profil güncellenirken hata oluştu.')
        setLoading(false)
        return
      }

      setInviteCode(code)
      setProfile({ ...profile, couple_id: coupleData.id })
    } catch (err) {
      setError('İşlem sırasında beklenmedik bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Davet Kodunu Girerek Eslesme
  const handleJoinCouple = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputCode.trim()) return

    setLoading(true)
    setError(null)

    const cleanCode = inputCode.trim().toUpperCase()

    try {
      // 1. Bu koda sahip pending bir couple var mi sorgula
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('id, status')
        .eq('invite_code', cleanCode)
        .eq('status', 'pending')
        .single()

      if (coupleError || !coupleData) {
        setError('Geçersiz veya süresi dolmuş davet kodu.')
        setLoading(false)
        return
      }

      // 2. Kod sahibi partnerin profilini bul
      const { data: partnerData, error: partnerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('couple_id', coupleData.id)
        .single()

      if (partnerError || !partnerData) {
        setError('Daveti gönderen partner bulunamadı.')
        setLoading(false)
        return
      }

      // 3. Kendi profilimizi guncelle (couple_id ve partner_id)
      const { error: myProfileError } = await supabase
        .from('profiles')
        .update({ couple_id: coupleData.id, partner_id: partnerData.id })
        .eq('id', profile.id)

      if (myProfileError) {
        setError('Eşleşme kaydedilirken bir hata oluştu.')
        setLoading(false)
        return
      }

      // 4. Partnerin profilini guncelle (partner_id'sini bizim id'miz yap)
      await supabase
        .from('profiles')
        .update({ partner_id: profile.id })
        .eq('id', partnerData.id)

      // 5. couple status'unu active yap
      await supabase
        .from('couples')
        .update({ status: 'active' })
        .eq('id', coupleData.id)

      // Basarili!
      triggerPairingSuccess()
    } catch (err) {
      setError('Eşleşme sırasında beklenmedik bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Olusturulan davet kodunu iptal etme/silme
  const handleCancelInvite = async () => {
    if (!profile.couple_id) return
    setLoading(true)

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ couple_id: null, partner_id: null })
        .eq('id', profile.id)

      if (profileError) {
        setError('Davet iptal edilirken bir hata oluştu.')
        setLoading(false)
        return
      }

      await supabase
        .from('couples')
        .delete()
        .eq('id', profile.couple_id)

      setInviteCode(null)
      setProfile({ ...profile, couple_id: null })
    } catch (err) {
      setError('İşlem iptal edilirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Kopyalama
  const copyToClipboard = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // WhatsApp Paylaşımı
  const shareOnWhatsapp = () => {
    if (!inviteCode) return
    const text = `Aşkımızın anı haritasını oluşturmak için bir uygulama buldum! ❤️ Giriş yapıp bu davet kodunu girerek benimle eşleşebilirsin:\n\nDavet Kodumuz: *${inviteCode}*\n\nHemen eşleşelim: ${window.location.origin}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  // Çıkış yapma
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-tr from-[#FFFDF9] via-[#FFEBE9] to-[#FFF5F5] overflow-x-hidden py-16 sm:py-8">
      
      {/* Cikis Yap Butonu */}
      <motion.button
        onClick={handleSignOut}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center gap-1.5 py-2 px-3 sm:py-2.5 sm:px-4 bg-white hover:bg-[#FFFDF9] border border-white/60 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl transition-all cursor-pointer text-[#3D3A45]/70 hover:text-[#B56576] shadow-clay-card border-stitched"
      >
        <LogOut size={14} className="sm:size-4" />
        <span>Çıkış Yap</span>
      </motion.button>

      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-[#E5989B]/5"
            initial={{ y: 600, opacity: 0, scale: 0.8 }}
            animate={{ y: -100, opacity: [0, 0.3, 0.3, 0], scale: 1.2 }}
            transition={{ duration: 20, repeat: Infinity, delay: i * 5, ease: "linear" }}
            style={{ left: `${20 + i * 20}%` }}
          >
            <Heart size={120} fill="currentColor" />
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="bg-white shadow-clay-card border-stitched rounded-[2.25rem] p-8 md:p-10 text-[#3D3A45] relative">
          
          <div className="text-center mb-8">
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFF5F5] border border-[#FFEBE9]/60 text-[#E5989B] mb-4 shadow-clay-card border-stitched"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ scale: { repeat: Infinity, duration: 2.2, ease: "easeInOut" } }}
            >
              <Heart size={30} fill="currentColor" className="animate-pulse" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-[#3D3A45] mb-2 flex items-center justify-center gap-2">
              Merhaba, {profile.display_name}! 👋
            </h1>
            <p className="text-sm text-[#3D3A45]/70 font-medium">
              Haritanızı oluşturmaya başlamak için partnerinizle eşleşmeniz gerekiyor.
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm shadow-clay-inset"
            >
              <Heart size={16} className="shrink-0" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mt-6">
            
            {/* Secenek A: Davet Kodu Olustur */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col justify-between p-6 rounded-2xl bg-[#FFFDF9] border-stitched shadow-clay-card relative"
            >
              <div>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-[#3D3A45]">
                  1. Davet Et <Sparkles size={16} className="text-[#E5989B]" />
                </h3>
                <p className="text-xs text-[#3D3A45]/70 mb-6 font-medium">
                  Bir davet kodu oluşturun ve eşleşmek üzere partnerinize gönderin.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!inviteCode ? (
                  <motion.button
                    key="create-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleCreateCouple}
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="w-full py-3.5 bg-[#E5989B] hover:bg-[#B56576] text-white font-bold rounded-2xl shadow-clay-button border border-white/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Kod Oluştur</span>
                        <Heart size={16} fill="currentColor" />
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.div
                    key="code-panel"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-3 shadow-clay-inset bg-white rounded-2xl text-center border border-pink-100/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#3D3A45]/50">
                        KODUNUZ
                      </span>
                      <div className="text-2xl font-black tracking-widest text-[#B56576] py-1 select-all">
                        {inviteCode}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <motion.button
                        onClick={copyToClipboard}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.93 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="flex-1 py-3 px-2 bg-white text-[#B56576] font-bold text-xs rounded-xl shadow-clay-card border border-white/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                      </motion.button>

                      <motion.button
                        onClick={shareOnWhatsapp}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.93 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="flex-1 py-3 px-2 bg-white text-[#B56576] font-bold text-xs rounded-xl shadow-clay-card border border-white/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Share2 size={14} />
                        <span>Paylaş</span>
                      </motion.button>
                    </div>

                    <p className="text-[10px] text-center text-[#3D3A45]/50 animate-pulse font-bold">
                      Partnerinizin daveti onaylaması bekleniyor...
                    </p>

                    <motion.button
                      onClick={handleCancelInvite}
                      disabled={loading}
                      whileTap={{ scale: 0.95 }}
                      className="w-full py-2 bg-transparent hover:bg-red-50/60 text-red-500 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>İptal Et</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Secenek B: Davet Kodu Gir */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col justify-between p-6 rounded-2xl bg-[#FFFDF9] border-stitched shadow-clay-card relative"
            >
              <div>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-[#3D3A45]">
                  2. Davete Katıl <Send size={16} className="text-[#E5989B]" />
                </h3>
                <p className="text-xs text-[#3D3A45]/70 mb-6 font-medium">
                  Partnerinizin oluşturup size gönderdiği davet kodunu aşağıya girin.
                </p>
              </div>

              <form onSubmit={handleJoinCouple} className="space-y-4">
                <input
                  type="text"
                  required
                  disabled={!!inviteCode || loading}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="KODU BURAYA YAZIN"
                  className="block w-full text-center tracking-widest font-extrabold text-lg uppercase py-3 shadow-clay-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E5989B]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />

                <motion.button
                  type="submit"
                  disabled={!!inviteCode || loading || !inputCode.trim()}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="w-full py-3.5 bg-[#B56576] hover:bg-[#E5989B] disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-clay-button border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Doğrula & Eşleş</span>
                      <Sparkles size={16} />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

          </div>

        </div>
      </motion.div>
    </main>
  )
}
