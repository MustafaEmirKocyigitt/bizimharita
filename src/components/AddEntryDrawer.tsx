'use client'
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Search, Calendar, Smile, X, Upload, Check, AlertCircle, MapPin, Camera, Coffee, Utensils, Trees, Compass, Bed, Ticket, Landmark, Sparkles } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { compressImage } from '@/utils/imageCompressor'

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  couple_id: string | null
  partner_id: string | null
}

interface AddEntryDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  profile: Profile
  initialPlaceName?: string
  initialCategory?: string
  initialCoords?: [number, number]
}

const CATEGORIES = [
  { id: 'cafe', label: 'Kafe', color: '#E5989B', icon: Coffee },
  { id: 'restaurant', label: 'Restoran', color: '#B56576', icon: Utensils },
  { id: 'nature', label: 'Doğa', color: '#6B9080', icon: Trees },
  { id: 'travel', label: 'Seyahat', color: '#8ECAE6', icon: Compass },
  { id: 'hotel', label: 'Otel', color: '#A24857', icon: Bed },
  { id: 'event', label: 'Etkinlik', color: '#E07A5F', icon: Ticket },
  { id: 'museum', label: 'Müze', color: '#9B5DE5', icon: Landmark },
  { id: 'special', label: 'Özel Gün', color: '#FFB703', icon: Sparkles },
]

const MOODS = [
  { id: 'romantic', label: 'Romantik', emoji: '💖', bg: '#FFF5F5', border: '#FFEBE9', text: '#B56576' },
  { id: 'cozy', label: 'Huzurlu', emoji: '🧘', bg: '#F4F9F4', border: '#E8F5E9', text: '#6B9080' },
  { id: 'fun', label: 'Eğlenceli', emoji: '🎉', bg: '#FFFBF0', border: '#FEF3C7', text: '#D97706' },
  { id: 'adventure', label: 'Macera', emoji: '🧗', bg: '#F0F9FF', border: '#E0F2FE', text: '#0284C7' },
  { id: 'happy', label: 'Keyifli', emoji: '😄', bg: '#FAF5FF', border: '#F3E8FF', text: '#9333EA' },
]

export default function AddEntryDrawer({
  isOpen,
  onClose,
  onSuccess,
  profile,
  initialPlaceName = '',
  initialCategory = 'cafe',
  initialCoords,
}: AddEntryDrawerProps) {
  const supabase = createClient()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Form State
  const [title, setTitle] = useState(initialPlaceName)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [visitedAt, setVisitedAt] = useState(new Date().toISOString().split('T')[0])
  const [rating, setRating] = useState(5)
  const [mood, setMood] = useState('romantic')
  const [latitude, setLatitude] = useState<number | null>(initialCoords ? initialCoords[0] : null)
  const [longitude, setLongitude] = useState<number | null>(initialCoords ? initialCoords[1] : null)
  
  // Konum Arama State'leri
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Resim Yukleme State'leri
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Eger initial degerler degisirse form state'lerini guncelle
  useEffect(() => {
    setTitle(initialPlaceName)
    setCategory(initialCategory)
    if (initialCoords) {
      setLatitude(initialCoords[0])
      setLongitude(initialCoords[1])
    }
  }, [initialPlaceName, initialCategory, initialCoords])

  // OpenStreetMap Nominatim ile Ucretsiz Konum Arama (Autocomplete)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setTitle(val) // Mekan adi olarak da yazilabilir

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!val.trim() || val.length < 3) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    setSearching(true)
    setShowDropdown(true)

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=5`,
          {
            headers: {
              'User-Agent': 'BizimHaritaApp/1.0',
            },
          }
        )
        const data = await response.json()
        setSearchResults(data)
      } catch (err) {
        console.error('Geocoding error:', err)
      } finally {
        setSearching(false)
      }
    }, 800)
  }

  const handleSelectLocation = (loc: any) => {
    const shortName = loc.display_name.split(',')[0]
    setTitle(shortName)
    setSearchQuery(shortName)
    setLatitude(parseFloat(loc.lat))
    setLongitude(parseFloat(loc.lon))
    setShowDropdown(false)
  }

  // Fotoğraf Secme
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles((prev) => [...prev, ...files])
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Formu Gonder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.couple_id) return

    if (!title.trim()) {
      setError('Lütfen bir mekan ismi girin veya aratarak seçin.')
      return
    }

    if (latitude === null || longitude === null) {
      setError('Lütfen listeden geçerli bir konum seçin (Arama çubuğunu kullanın).')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Mekan girisini place_entries tablosuna ekle
      const { data: entryData, error: entryError } = await supabase
        .from('place_entries')
        .insert({
          couple_id: profile.couple_id,
          created_by: profile.id,
          title,
          description,
          category,
          latitude,
          longitude,
          visited_at: visitedAt,
          rating,
          mood,
        })
        .select()
        .single()

      if (entryError) {
        setError(entryError.message)
        setLoading(false)
        return
      }

      // 2. Eger secilen fotograf varsa, onlari sıkıstırıp Supabase Storage bucket'ina yukle
      if (selectedFiles.length > 0) {
        setUploading(true)
        
        for (const file of selectedFiles) {
          const compressedBlob = await compressImage(file, 1200, 0.8)
          const fileName = `${profile.couple_id}/${entryData.id}/${crypto.randomUUID()}.webp`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, compressedBlob, {
              contentType: 'image/webp',
              cacheControl: '3600',
            })

          if (uploadError) {
            console.error('Photo upload error:', uploadError)
            continue
          }

          await supabase.from('entry_photos').insert({
            entry_id: entryData.id,
            storage_path: uploadData.path,
          })
        }
      }

      // Formu temizle
      setTitle('')
      setDescription('')
      setCategory('cafe')
      setRating(5)
      setMood('romantic')
      setLatitude(null)
      setLongitude(null)
      setSearchQuery('')
      setSelectedFiles([])
      
      onSuccess()
    } catch (err) {
      setError('Anı kaydedilirken beklenmedik bir hata oluştu.')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const handleResetCoords = () => {
    setLatitude(null)
    setLongitude(null)
    setTitle('')
    setSearchQuery('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Karartilmis Arka Plan (Overlay) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#3D3A45]/35 backdrop-blur-xs z-50"
          />

          {/* Drawer Panel (Pro-Max Design) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 210 }}
            className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-[#FFFDF9]/95 backdrop-blur-xl rounded-t-[2.5rem] border-t border-white/80 shadow-[0_-12px_40px_rgba(61,58,69,0.1)] p-6 z-50 max-h-[94vh] overflow-y-auto overflow-x-hidden flex flex-col text-[#3D3A45] scrollbar-none"
          >
            {/* Ust Tutacak / Çizgi */}
            <div className="mx-auto w-12 h-1.5 rounded-full bg-gray-300/60 mb-5 shrink-0 cursor-grab active:cursor-grabbing" onClick={onClose} />

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2.5 font-outfit">
                Yeni Bir Anı Ekle 
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  className="p-1 bg-[#FFF5F5] rounded-full text-[#E5989B]"
                >
                  <Heart size={16} fill="#E5989B" />
                </motion.div>
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-red-50 text-[#B56576] hover:text-red-500 transition-all cursor-pointer active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs shrink-0 shadow-sm animate-pulse">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Form Gövdesi */}
            <form onSubmit={handleSubmit} className="space-y-6 flex-1 pb-6">
              
              {/* Konum Arama veya Özel Konum Ekleme */}
              <div className="space-y-2">
                {latitude !== null && longitude !== null ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pl-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60">
                        Mekan / Konum Adı *
                      </label>
                      <button
                        type="button"
                        onClick={handleResetCoords}
                        className="text-[10px] font-bold text-[#B56576] hover:text-[#E5989B] transition-colors cursor-pointer"
                      >
                        Konumu Değiştir / Arama Yap
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        setSearchQuery(e.target.value)
                      }}
                      placeholder="Mekana özel bir isim verin..."
                      className="block w-full px-4.5 py-3 bg-white border border-[#E5989B]/40 rounded-2xl text-xs font-semibold placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
                    />
                    
                    <div className="p-4 bg-emerald-50/60 border border-emerald-100/50 rounded-2xl text-[11px] text-emerald-800 leading-relaxed flex items-start gap-2.5 shadow-sm">
                      <span className="text-sm">📍</span>
                      <div>
                        <span className="font-bold">Gizli Nokta Haritadan Seçildi!</span> Koordinatlar: <span className="font-mono bg-emerald-100/50 px-1.5 py-0.5 rounded text-[10px]">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>. 
                        Aramalarda çıkmayan gizli banklarınızı, orman sığınaklarınızı veya ilk sarıldığınız yeri özgürce kaydedebilirsiniz! ❤️
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Normal Konum Arama Modu */
                  <div className="relative space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                      Mekan / Konum Arama *
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#E5989B]">
                        <Search size={16} className="animate-pulse" />
                      </div>
                      <input
                        type="text"
                        required
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Mekan, sokak veya şehir adı aratın..."
                        className="block w-full pl-11 pr-11 py-3.5 bg-white border border-pink-100/45 rounded-full text-xs font-semibold text-[#3D3A45] placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-transparent transition-all shadow-[0_4px_15px_rgba(61,58,69,0.01)] focus:shadow-[0_0_18px_rgba(229,152,155,0.2)]"
                      />
                      {searching && (
                        <div className="absolute right-4 top-3.5 w-4.5 h-4.5 border-2 border-[#E5989B] border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {/* Autocomplete Dropdown Listesi */}
                    <AnimatePresence>
                      {showDropdown && searchResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -12, scale: 0.98 }}
                          className="absolute left-0 right-0 mt-2 max-h-52 overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_12px_45px_rgba(61,58,69,0.12)] z-50 p-2.5 space-y-1.5"
                        >
                          {searchResults.map((result, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectLocation(result)}
                              className="w-full text-left p-3 hover:bg-[#FFF5F5] rounded-2xl text-[11px] flex items-start gap-2.5 transition-all cursor-pointer hover:translate-x-0.5"
                            >
                              <div className="mt-0.5 p-1 bg-[#FFF5F5] text-[#E5989B] rounded-lg shrink-0">
                                <MapPin size={13} />
                              </div>
                              <div>
                                <span className="font-bold text-[#3D3A45] text-xs">
                                  {result.display_name.split(',')[0]}
                                </span>
                                <p className="text-[9px] text-[#3D3A45]/60 truncate mt-0.5">
                                  {result.display_name}
                                </p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="p-3.5 bg-[#FFF5F5]/60 border border-[#FFEBE9]/50 rounded-2xl text-[11px] text-[#B56576] leading-relaxed flex items-start gap-2 shadow-xs">
                      <span className="text-sm">💡</span>
                      <div>
                        <span className="font-bold">Arama listesinde çıkmıyor mu?</span> Hiç dert etmeyin! Harita üzerinde anınızın geçtiği noktaya **uzun dokunarak / tıklayarak** da koordinatları seçebilir ve oraya dilediğiniz özel romantik ismi verebilirsiniz! ❤️
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Kategori Seçici (Pro-Max SVG Icons & Smooth Select) */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5">
                  Kategori Seçin
                </label>
                <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-2 px-2 scrollbar-none">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    const isSelected = category === cat.id
                    
                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`px-4.5 py-3 rounded-full text-xs font-bold shrink-0 cursor-pointer border transition-all duration-300 flex items-center gap-1.5 shadow-[0_3px_12px_rgba(61,58,69,0.01)] ${
                          isSelected
                            ? 'border-transparent text-white shadow-[0_4px_18px_rgba(181,101,118,0.25)]'
                            : 'border-pink-100/40 bg-white hover:bg-gray-50 text-[#3D3A45]/85'
                        }`}
                        style={{
                          backgroundColor: isSelected ? cat.color : undefined,
                        }}
                      >
                        <Icon size={13} className={isSelected ? 'text-white' : 'opacity-70 text-[#3D3A45]'} />
                        <span className={isSelected ? 'text-white' : 'text-[#3D3A45]/85'}>{cat.label}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Tarih ve Duygu Seçici (Duygular Emoji Kart Yapıldı!) */}
              <div className="space-y-4">
                {/* Ziyaret Tarihi */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5 flex items-center gap-1">
                    <Calendar size={10} className="text-[#E5989B]" />
                    Ziyaret Tarihi
                  </label>
                  <input
                    type="date"
                    required
                    value={visitedAt}
                    onChange={(e) => setVisitedAt(e.target.value)}
                    className="block w-full px-4 py-3 bg-white border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-[0_4px_12px_rgba(61,58,69,0.01)] cursor-pointer"
                  />
                </div>

                {/* Nasıl Hissettiniz? (Premium Emoji Cards) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5 flex items-center gap-1">
                    <Smile size={10} className="text-[#E5989B]" />
                    Nasıl Hissettiniz?
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {MOODS.map((m) => {
                      const isSelected = mood === m.id
                      
                      return (
                        <motion.button
                          key={m.id}
                          type="button"
                          onClick={() => setMood(m.id)}
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          className="py-3.5 px-1 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-sm"
                          style={{
                            backgroundColor: isSelected ? m.bg : 'white',
                            borderColor: isSelected ? m.border : '#FFF0F0',
                            color: m.text
                          }}
                        >
                          <span className="text-xl md:text-2xl">{m.emoji}</span>
                          <span className="text-[8px] font-extrabold uppercase tracking-wider opacity-85">{m.label}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Kalp Rating (1-5 Puan) */}
              <div className="space-y-1.5 bg-white/40 border border-pink-100/25 p-4 rounded-3xl">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1 flex items-center gap-1">
                  Aşk Puanınız (Derece)
                </label>
                <div className="flex flex-wrap gap-2.5 py-1 items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      whileHover={{ scale: 1.25 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-[#E5989B] cursor-pointer"
                    >
                      <Heart
                        size={30}
                        fill={star <= rating ? '#E5989B' : 'transparent'}
                        strokeWidth={2.2}
                      />
                    </motion.button>
                  ))}
                  <span className="text-xs font-black text-[#B56576] pl-2 select-none">
                    {rating === 5 ? 'Aşk Dolu! 💖' : rating === 4 ? 'Çok Keyifli! 🥰' : rating === 3 ? 'Harika! 😊' : rating === 2 ? 'Güzeldi ✨' : 'Ortalama 💫'}
                  </span>
                </div>
              </div>

              {/* Anı Notu */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5">
                  Anı Notu & Deneyimleriniz
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Birlikte neler yaptınız? Ortak günlüğünüze unutmak istemediğiniz tüm romantik ve tatlı detayları karalayın..."
                  rows={4}
                  className="block w-full px-4.5 py-3.5 bg-white border border-pink-100/40 rounded-3xl text-xs font-semibold placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
                />
              </div>

              {/* Çoklu Görsel Yükleme */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5">
                  Fotoğraflar Ekleyin
                </label>
                
                {/* Sürükle bırak / Secici Kart */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {/* Foto Ekleme Butonu */}
                  <label className="aspect-square border-2 border-dashed border-[#E5989B]/30 bg-[#FFF5F5]/10 hover:bg-[#FFF5F5]/30 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-300 text-[#B56576] hover:scale-102 active:scale-97">
                    <Camera size={22} className="animate-pulse" />
                    <span className="text-[8px] font-extrabold uppercase tracking-wider">Ekle</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* Secilen Resimler */}
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square rounded-2xl border border-[#FFF0F0] bg-gray-50 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Anı Resmi"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-[#3D3A45]/80 hover:bg-[#3D3A45] rounded-full text-white cursor-pointer transition-all active:scale-90 shadow-md"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kaydet Butonu */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4.5 bg-gradient-to-tr from-[#E5989B] to-[#B56576] hover:from-[#B56576] hover:to-[#E5989B] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-[0_6px_25px_0_rgba(229,152,155,0.35)] hover:shadow-[0_6px_30px_0_rgba(181,101,118,0.45)] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-extrabold tracking-wider">
                      {uploading ? 'Görseller WebP Sıkıştırılıyor...' : 'Anı Kaydediliyor...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <span>Haritaya Ekle</span>
                    <Heart size={14} fill="currentColor" className="animate-pulse" />
                  </>
                )}
              </motion.button>

            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
