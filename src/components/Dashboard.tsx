'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Map as MapIcon, Clock, Star, User, Sparkles, LogOut, Plus, Coffee, Utensils, Trees, Compass, Bed, Ticket, Landmark, Camera, AlertTriangle, HeartCrack } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { compressImage } from '@/utils/imageCompressor'

// Next.js SSR hatasini onlemek icin harita bilesenini dynamic import (ssr: false) ile yukluyoruz
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#f4ede2] text-[#E5989B]">
      <div className="text-center flex flex-col items-center gap-3">
        <Heart className="animate-pulse" size={40} fill="currentColor" />
        <span className="text-xs font-semibold tracking-wider animate-pulse">Pastel Harita Hazırlanıyor...</span>
      </div>
    </div>
  ),
})

// Diger bilesenler
import AddEntryDrawer from '@/components/AddEntryDrawer'
import PlaceDetailDrawer from '@/components/PlaceDetailDrawer'
import TimelineComponent from '@/components/TimelineComponent'
import WishlistComponent from '@/components/WishlistComponent'

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  couple_id: string | null
  partner_id: string | null
}

interface PlaceEntry {
  id: string
  title: string
  description: string | null
  category: string
  latitude: number
  longitude: number
  visited_at: string
  rating: number
  mood: string | null
  created_by: string
}

const CATEGORIES = [
  { id: 'all', label: 'Hepsi', icon: MapIcon, color: '#B56576' },
  { id: 'cafe', label: 'Kafe', icon: Coffee, color: '#E5989B' },
  { id: 'restaurant', label: 'Restoran', icon: Utensils, color: '#B56576' },
  { id: 'nature', label: 'Doğa', icon: Trees, color: '#6B9080' },
  { id: 'travel', label: 'Seyahat', icon: Compass, color: '#8ECAE6' },
  { id: 'hotel', label: 'Otel', icon: Bed, color: '#A24857' },
  { id: 'event', label: 'Etkinlik', icon: Ticket, color: '#E07A5F' },
  { id: 'museum', label: 'Müze', icon: Landmark, color: '#9B5DE5' },
  { id: 'special', label: 'Özel Gün', icon: Sparkles, color: '#FFB703' },
]

export default function Dashboard({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  // Durumlar
  const [myProfile, setMyProfile] = useState<Profile>(profile)
  const [activeTab, setActiveTab] = useState<'map' | 'timeline' | 'add' | 'wishlist' | 'profile'>('map')
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingAvatar, setUpdatingAvatar] = useState(false)
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false)
  const [unpairing, setUnpairing] = useState(false)
  const [avatarVersion, setAvatarVersion] = useState<number>(Date.now())

  // Mekan Verileri State'leri
  const [entries, setEntries] = useState<PlaceEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<PlaceEntry[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // Harita Konum & Zoom State'leri
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.92077, 32.85411]) // Türkiye Coğrafi Merkezi
  const [mapZoom, setMapZoom] = useState<number>(6)

  // Drawer Modallari Açık/Kapalı State'leri
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<PlaceEntry | null>(null)

  // Wishlist -> Anıya Çevirme: Başlangıç verileri
  const [convertInitialName, setConvertInitialName] = useState('')
  const [convertInitialCategory, setConvertInitialCategory] = useState('cafe')
  const [convertInitialCoords, setConvertInitialCoords] = useState<[number, number] | undefined>(undefined)

  // Partner profilini cek
  useEffect(() => {
    const fetchPartner = async () => {
      if (myProfile.partner_id) {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, couple_id, partner_id')
          .eq('id', myProfile.partner_id)
          .single()

        if (data) {
          setPartnerProfile(data)
        }
      } else {
        setPartnerProfile(null)
      }
    }
    fetchPartner()
  }, [myProfile.partner_id])

  // Veritabanindan tum anilari (Place Entries) cek
  const fetchEntries = async () => {
    if (!myProfile.couple_id) return

    try {
      const { data, error } = await supabase
        .from('place_entries')
        .select('*')
        .eq('couple_id', myProfile.couple_id)
        .order('visited_at', { ascending: false })

      if (data) {
        setEntries(data)
        setFilteredEntries(data)

        // Eger daha once eklenen anilar varsa, haritayi en son aniya odakla
        if (data.length > 0) {
          setMapCenter([data[0].latitude, data[0].longitude])
          setMapZoom(12)
        }
      }
    } catch (err) {
      console.error('Error loading place entries:', err)
    } finally {
      setLoading(false)
    }
  }

  // İlk yukleme
  useEffect(() => {
    fetchEntries()
  }, [myProfile.couple_id])

  // Realtime Ekleme/Silme/Guncelleme Takibi (Supabase Realtime)
  useEffect(() => {
    if (!myProfile.couple_id) return

    const channel = supabase
      .channel('place_entries_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'place_entries',
          filter: `couple_id=eq.${myProfile.couple_id}`,
        },
        () => {
          fetchEntries() // Veritabaninda degisiklik oldugunda listeyi aninda yenile!
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myProfile.couple_id])

  // Realtime Presence (Partner Online Durumu)
  useEffect(() => {
    if (!myProfile.couple_id) return

    const channel = supabase.channel(`couple_presence_${myProfile.couple_id}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineUserIds = Object.values(state).flatMap((presences: any) =>
          presences.map((p: any) => p.user_id)
        )
        const isPartnerOnline = onlineUserIds.includes(myProfile.partner_id)
        setPartnerOnline(isPartnerOnline)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: myProfile.id, online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myProfile.couple_id, myProfile.partner_id])

  // Realtime Kendi Profil Değişiklikleri Dinleyicisi (Eşleşme İptali durumunda anında onboarding'e yönlendirir)
  useEffect(() => {
    const channel = supabase
      .channel(`my_profile_realtime_${myProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${myProfile.id}`,
        },
        (payload: any) => {
          const updatedProfile = payload.new as Profile
          // Eğer couple_id veya partner_id null olduysa (yani eşleşme iptal edildiyse!)
          if (!updatedProfile || !updatedProfile.couple_id) {
            window.location.href = '/' // Sayfayı sıfırdan yükle ve onboarding'e at!
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myProfile.id])

  // Kategori Filtreleme
  const handleCategoryFilter = (catId: string) => {
    setActiveCategory(catId)
    if (catId === 'all') {
      setFilteredEntries(entries)
    } else {
      setFilteredEntries(entries.filter((e) => e.category.toLowerCase() === catId.toLowerCase()))
    }
  }

  // Haritada pine tiklandiginda alt drawer'i ac
  const handlePinClick = (entry: PlaceEntry) => {
    setSelectedEntry(entry)
    setIsDetailOpen(true)
  }

  // Yeni anı eklendiginde tetiklenir
  const handleAddSuccess = () => {
    setIsAddOpen(false)
    fetchEntries() // Anıları yenile
  }

  // Wishlist öğesini anıya çevirme akışını başlat
  const handleConvertWishlistToEntry = (item: { title: string; category: string; latitude: number | null; longitude: number | null }) => {
    setConvertInitialName(item.title)
    setConvertInitialCategory(item.category)
    setConvertInitialCoords(
      item.latitude !== null && item.longitude !== null
        ? [item.latitude, item.longitude]
        : undefined
    )
    setIsAddOpen(true)
    setActiveTab('map')
  }

  // Haritaya tiklanarak konum secildiginde tetiklenir
  const handleMapClick = (lat: number, lng: number) => {
    setConvertInitialName("") // Bos birakilir ki kullanici kendisi mekan ismi yazabilsin
    setConvertInitialCategory("cafe")
    setConvertInitialCoords([lat, lng])
    setIsAddOpen(true)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Profil Fotoğrafı Yükleme (Avatar)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUpdatingAvatar(true)

    try {
      // 1. Resmi canvas yardımıyla sıkıştırıp WebP formatına dönüştür
      const compressedBlob = await compressImage(file, 400, 0.8)
      const filePath = `avatars/${myProfile.id}.webp`

      // 2. Storage avatars bucket'ına yükle (Varsa üzerine yazar)
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, {
          contentType: 'image/webp',
          cacheControl: '300',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // 3. Resmin public URL adresini al
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 4. Profiles tablosunda kendi avatar_url alanını güncelle
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', myProfile.id)

      if (profileError) throw profileError

      // 5. Arayüzü anında güncelle
      setMyProfile({ ...myProfile, avatar_url: publicUrl })
      setAvatarVersion(Date.now())
    } catch (err) {
      console.error('Profil fotoğrafı güncellenirken hata:', err)
    } finally {
      setMyProfile({ ...myProfile }) // Yenileme tetikleme garantisi
      setUpdatingAvatar(false)
    }
  }

  // Eşleşmeyi İptal Etme (Bağlantı Koparma)
  const handleUnpair = async () => {
    if (!myProfile.couple_id) return
    setUnpairing(true)

    try {
      // Supabase RPC fonksiyonu ile güvenli ve atomik eşleşme iptali
      const { error } = await supabase.rpc('unpair_couple')

      if (error) throw error

      // Başarılı! Sayfayı tazeleyerek onboarding'e yönlenmesini sağla
      window.location.href = '/'
    } catch (err) {
      console.error('Eşleşme sonlandırılırken hata:', err)
    } finally {
      setUnpairing(false)
      setShowUnpairConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-[#FFFDF9] text-[#E5989B]">
        <div className="text-center flex flex-col items-center gap-4">
          <Heart size={40} fill="currentColor" className="animate-pulse text-[#E5989B]" />
          <span className="text-sm font-semibold tracking-wider animate-pulse">Ortak Alan Yükleniyor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF9] text-[#3D3A45] relative">
      
      {/* Üst Bar (Header) - Yüzen Premium Navbar (UI/UX Pro Max) */}
      <header className="absolute top-4 left-4 right-4 bg-white/85 backdrop-blur-xl border border-white/80 px-4.5 py-3.5 flex items-center justify-between z-30 rounded-3xl shadow-[0_10px_35px_rgba(61,58,69,0.06)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(61,58,69,0.08)]">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="flex items-center justify-center p-1.5 bg-[#FFF5F5] rounded-full text-[#E5989B]"
          >
            <Heart size={18} fill="#E5989B" className="text-[#E5989B]" />
          </motion.div>
          <span className="font-bold tracking-tight text-xs sm:text-sm md:text-base text-[#3D3A45] font-outfit max-w-[140px] sm:max-w-[200px] truncate">
            {myProfile.display_name && partnerProfile?.display_name 
              ? `${myProfile.display_name} & ${partnerProfile.display_name}`
              : "Bizim Harita"
            }
          </span>
        </div>

        {/* Çift Avatarları & Presence Neon Halka (UX Pro-Max) */}
        <div className="flex items-center gap-3">
          <div className="flex gap-2 items-center">
            {/* Benim Profilim */}
            <motion.div 
              whileHover={{ scale: 1.08, zIndex: 10 }}
              className="w-9 h-9 rounded-full border-2 border-white bg-[#FFEBE9] overflow-hidden flex items-center justify-center text-xs font-bold text-[#B56576] shadow-md transition-all cursor-pointer"
            >
              {myProfile.avatar_url ? (
                <img src={`${myProfile.avatar_url}?t=${avatarVersion}`} alt={myProfile.display_name || ''} className="w-full h-full object-cover" />
              ) : (
                myProfile.display_name?.charAt(0).toUpperCase()
              )}
            </motion.div>

            {/* Partnerin Profili */}
            <div className="relative">
              <motion.div 
                whileHover={{ scale: 1.08, zIndex: 10 }}
                className={`w-9 h-9 rounded-full border-2 border-white bg-[#FFF5F5] overflow-hidden flex items-center justify-center text-xs font-bold text-[#E5989B] shadow-md transition-all duration-300 cursor-pointer ${partnerOnline ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.7)]' : ''}`}
              >
                {partnerProfile?.avatar_url ? (
                  <img src={`${partnerProfile.avatar_url}?t=${avatarVersion}`} alt={partnerProfile.display_name || ''} className="w-full h-full object-cover" />
                ) : (
                  partnerProfile?.display_name?.charAt(0).toUpperCase() || 'P'
                )}
              </motion.div>
              
              {partnerOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
              )}
            </div>
          </div>
          
          <div className="hidden sm:block text-xs font-extrabold text-[#3D3A45]/85 pl-1.5 border-l border-[#3D3A45]/10">
            {myProfile.display_name} <span className="text-[#E5989B]">❤️</span> {partnerProfile?.display_name || 'Partner'}
          </div>
        </div>
      </header>

      {/* Ana Ekran Gövdesi - Haritanın tam ekran süzülmesi için */}
      <main className="flex-1 relative w-full h-screen overflow-hidden">
        
        {/* 🌟 Yatay Kategori Filtreleme Barı (Premium Glassmorphic + Framer Motion Slider) */}
        {activeTab === 'map' && (
          <div className="absolute top-22 left-4 right-4 z-20 flex gap-2.5 overflow-x-auto pb-3.5 scrollbar-none -mx-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id
              
              return (
                <motion.button
                  key={cat.id}
                  onClick={() => handleCategoryFilter(cat.id)}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative px-5 py-3 rounded-full text-xs font-bold shrink-0 shadow-[0_4px_15px_rgba(61,58,69,0.03)] border transition-all duration-300 cursor-pointer flex items-center gap-2 overflow-hidden ${
                    isActive
                      ? 'border-transparent text-white shadow-[0_6px_20px_rgba(181,101,118,0.3)]'
                      : 'border-white/60 bg-white/90 backdrop-blur-md text-[#3D3A45] hover:bg-white hover:shadow-[0_6px_18px_rgba(61,58,69,0.05)]'
                  }`}
                  style={{
                    backgroundColor: isActive ? cat.color : undefined,
                  }}
                >
                  <Icon size={14} className={isActive ? 'animate-pulse text-white' : 'opacity-70 text-[#3D3A45]'} />
                  <span className={isActive ? 'text-white' : 'text-[#3D3A45]/85'}>{cat.label}</span>
                  
                  {/* Aktiflik parıltısı efekti */}
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryGlow"
                      className="absolute inset-0 bg-white/12"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div
              key="map-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full pb-16 sm:pb-0"
            >
              {/* Harita */}
              <MapComponent
                entries={filteredEntries}
                onPinClick={handlePinClick}
                onMapClick={handleMapClick}
                center={mapCenter}
                zoom={mapZoom}
              />
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div
              key="timeline-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full h-full pt-24 pb-24 overflow-y-auto"
            >
              <TimelineComponent
                entries={entries}
                myId={myProfile.id}
                partnerName={partnerProfile?.display_name || null}
              />
            </motion.div>
          )}

          {activeTab === 'wishlist' && (
            <motion.div
              key="wishlist-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full h-full pt-24 pb-24 overflow-y-auto"
            >
              <WishlistComponent
                profile={myProfile}
                partnerName={partnerProfile?.display_name || null}
                onConvertToEntry={handleConvertWishlistToEntry}
              />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-start p-6 pt-24 pb-24 overflow-y-auto h-full"
            >
              <div className="w-full max-w-md backdrop-blur-md bg-white/70 border border-white/50 p-8 rounded-3xl shadow-sm space-y-6 text-center relative overflow-hidden my-auto">
                <AnimatePresence mode="wait">
                  {!showUnpairConfirm ? (
                    /* 👤 NORMAL PROFİL GÖRÜNÜMÜ */
                    <motion.div
                      key="normal-profile"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      {/* Profil Resmi Yükleme/Güncelleme Alanı */}
                      <div className="relative inline-block group cursor-pointer">
                        <label className="block relative w-24 h-24 rounded-full border-4 border-white bg-[#FFEBE9] shadow-sm overflow-hidden flex items-center justify-center text-3xl font-bold text-[#B56576] mx-auto cursor-pointer">
                          {updatingAvatar ? (
                            <div className="w-6 h-6 border-2 border-[#E5989B] border-t-transparent rounded-full animate-spin" />
                          ) : myProfile.avatar_url ? (
                            <img src={`${myProfile.avatar_url}?t=${avatarVersion}`} alt={myProfile.display_name || ''} className="w-full h-full object-cover" />
                          ) : (
                            myProfile.display_name?.charAt(0).toUpperCase()
                          )}

                          {/* Hover Kamera Efekti */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer">
                            <Camera size={20} />
                          </div>

                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            disabled={updatingAvatar}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xl font-bold">{myProfile.display_name}</h3>
                        <p className="text-sm opacity-70">Eşleştiği Kişi: {partnerProfile?.display_name || 'Partner'}</p>
                      </div>

                      <div className="p-4 bg-[#FFFDF9] border border-[#FFEBE9] rounded-2xl text-xs space-y-2 text-left">
                        <div className="flex justify-between">
                          <span className="opacity-75">Bağlantı Durumu:</span>
                          <span className="font-semibold text-emerald-500">Aktif Eşleşme ✨</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-75">Ortak Alan Kimliği:</span>
                          <span className="font-mono text-[10px] select-all">{myProfile.couple_id?.slice(0, 8)}...</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          onClick={handleSignOut}
                          className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-[#3D3A45] font-semibold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <LogOut size={16} />
                          <span>Oturumu Kapat</span>
                        </button>
                        
                        <button
                          onClick={() => setShowUnpairConfirm(true)}
                          className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-500 font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <HeartCrack size={16} />
                          <span>Eşleşmeyi İptal Et</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* 💔 EŞLEŞMEYİ İPTAL ETME ÇİFT ONAY KARTI */
                    <motion.div
                      key="unpair-confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-5 py-4"
                    >
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-500">
                        <AlertTriangle size={28} />
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-lg font-bold">Eşleşmeyi Sonlandır? 💔</h3>
                        <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                          Bu işlem eşinizle olan bağlantınızı koparacaktır. Ortak anılarınız veritabanında saklanır ancak birbirinizin haritalarını artık göremezsiniz.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setShowUnpairConfirm(false)}
                          disabled={unpairing}
                          className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-[#3D3A45] font-semibold text-xs rounded-2xl transition-colors cursor-pointer"
                        >
                          Vazgeç
                        </button>
                        
                        <button
                          onClick={handleUnpair}
                          disabled={unpairing}
                          className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {unpairing ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <HeartCrack size={13} />
                              <span>Bağlantıyı Kopar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Alt Navigasyon Barı (Bottom Navigation) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-[#3D3A45]/5 px-6 py-2 flex justify-around items-center z-40 shadow-[0_-4px_24px_rgba(61,58,69,0.04)] shrink-0">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'map' ? 'text-[#B56576]' : 'text-[#3D3A45]/60 hover:text-[#3D3A45]'}`}
        >
          <MapIcon size={20} className={activeTab === 'map' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] font-semibold">Harita</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'timeline' ? 'text-[#B56576]' : 'text-[#3D3A45]/60 hover:text-[#3D3A45]'}`}
        >
          <Clock size={20} className={activeTab === 'timeline' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] font-semibold">Timeline</span>
        </button>

        {/* Ekleme Butonu (Ortada, drawer'i tetikler) */}
        <button
          onClick={() => setIsAddOpen(true)}
          className="relative -top-5 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#E5989B] to-[#B56576] hover:from-[#B56576] hover:to-[#E5989B] text-white shadow-[0_4px_20px_0_rgba(229,152,155,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer z-50"
        >
          <Plus size={24} />
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'wishlist' ? 'text-[#B56576]' : 'text-[#3D3A45]/60 hover:text-[#3D3A45]'}`}
        >
          <Star size={20} className={activeTab === 'wishlist' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] font-semibold">Wishlist</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'profile' ? 'text-[#B56576]' : 'text-[#3D3A45]/60 hover:text-[#3D3A45]'}`}
        >
          <User size={20} className={activeTab === 'profile' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] font-semibold">Profil</span>
        </button>
      </nav>

      {/* Drawer Pencereleri */}
      <AddEntryDrawer
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false)
          setConvertInitialName('')
          setConvertInitialCategory('cafe')
          setConvertInitialCoords(undefined)
        }}
        onSuccess={handleAddSuccess}
        profile={myProfile}
        initialPlaceName={convertInitialName}
        initialCategory={convertInitialCategory}
        initialCoords={convertInitialCoords}
      />

      <PlaceDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedEntry(null)
        }}
        onDeleteSuccess={fetchEntries}
        entry={selectedEntry}
        myId={myProfile.id}
        partnerName={partnerProfile?.display_name || null}
      />

    </div>
  )
}
