'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Search, Calendar, Smile, X, Upload, Check, AlertCircle, MapPin, Camera } from 'lucide-react'
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
  { id: 'cafe', label: 'Kafe', color: '#E5989B' },
  { id: 'restaurant', label: 'Restoran', color: '#B56576' },
  { id: 'nature', label: 'Doğa', color: '#6B9080' },
  { id: 'travel', label: 'Seyahat', color: '#8ECAE6' },
  { id: 'hotel', label: 'Otel', color: '#A24857' },
  { id: 'event', label: 'Etkinlik', color: '#E07A5F' },
  { id: 'museum', label: 'Müze', color: '#9B5DE5' },
  { id: 'special', label: 'Özel Gün', color: '#FFB703' },
]

const MOODS = [
  { id: 'romantic', label: 'Romantik 💖' },
  { id: 'cozy', label: 'Huzurlu 🧘' },
  { id: 'fun', label: 'Eğlenceli 🎉' },
  { id: 'adventure', label: 'Macera 🧗' },
  { id: 'happy', label: 'Keyifli 😄' },
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

    // Debounced search to avoid Nominatim rate limiting (1 request per second is polite)
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
    // Sadece mekan ismini veya kisa adini almak icin:
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
          // Resmi canvas ile WebP yapip sıkıstır
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

          // Resim path'ini entry_photos tablosuna ekle
          await supabase.from('entry_photos').insert({
            entry_id: entryData.id,
            storage_path: uploadData.path,
          })
        }
      }

      // Formu temizle ve basari callback'ini tetikle
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

  // Haritadan secilen konumu sifirla ve normal aramaya don
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
            className="fixed inset-0 bg-[#3D3A45]/30 backdrop-blur-xs z-50"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-[#FFFDF9] rounded-t-3xl border-t border-white/50 shadow-[0_-8px_32px_rgba(61,58,69,0.12)] p-6 z-50 max-h-[92vh] overflow-y-auto flex flex-col text-[#3D3A45]"
          >
            {/* Ust Tutacak / Çizgi */}
            <div className="mx-auto w-12 h-1.5 rounded-full bg-gray-300/60 mb-5 shrink-0" onClick={onClose} />

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Yeni Bir Anı Ekle <Heart size={20} fill="#E5989B" className="text-[#E5989B] animate-pulse" />
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100/80 transition-colors cursor-pointer text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs shrink-0">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Form Gövdesi */}
            <form onSubmit={handleSubmit} className="space-y-5 flex-1 pb-4">
              
              {/* Konum Arama veya Özel Konum Ekleme */}
              <div className="space-y-2">
                {latitude !== null && longitude !== null ? (
                  /* Haritadan veya Onboarding/Wishlist'ten konum secilmisse */
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pl-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60">
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
                      placeholder="Mekana özel bir isim verin (Örn: Bizim Bankımız, İlk Kahve İçtiğimiz Yer)..."
                      className="block w-full px-4 py-3 bg-white border border-[#E5989B]/30 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all"
                    />
                    
                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl text-[11px] text-emerald-800 leading-relaxed flex items-start gap-2">
                      <span className="text-sm">📍</span>
                      <div>
                        <span className="font-bold">Özel Nokta Haritadan Seçildi!</span> Koordinatlar: <span className="font-mono bg-emerald-100/50 px-1 rounded">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>. 
                        Arama motorunda çıkmayan gizli sığınaklarınızı veya özel yerlerinizi bu sayede özgürce kaydedebilirsiniz. ❤️
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Normal Konum Arama Modu */
                  <div className="relative space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                      Mekan / Konum Arama *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3A45]/40">
                        <Search size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Mekan, sokak veya şehir adı aratın..."
                        className="block w-full pl-11 pr-4 py-3 bg-white border border-white/60 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all"
                      />
                      {searching && (
                        <div className="absolute right-4 top-3.5 w-4 h-4 border-2 border-[#E5989B] border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {/* Autocomplete Dropdown Listesi */}
                    <AnimatePresence>
                      {showDropdown && searchResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-lg z-50 p-2 space-y-1"
                        >
                          {searchResults.map((result, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectLocation(result)}
                              className="w-full text-left p-3 hover:bg-[#FFF5F5] rounded-xl text-xs flex items-start gap-2.5 transition-colors cursor-pointer"
                            >
                              <MapPin size={14} className="text-[#E5989B] mt-0.5 shrink-0" />
                              <div>
                                <span className="font-semibold text-[#3D3A45]">
                                  {result.display_name.split(',')[0]}
                                </span>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                  {result.display_name}
                                </p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="p-3.5 bg-[#FFF5F5]/40 border border-[#FFEBE9]/50 rounded-2xl text-[11px] text-[#B56576] leading-relaxed flex items-start gap-2">
                      <span className="text-sm">💡</span>
                      <div>
                        <span className="font-bold">Aradığınız yeri bulamadınız mı?</span> Türkiye'deki yerel işletmeler arama listesinde görünmüyorsa; harita üzerinde anınızın geçtiği noktaya **tıklayarak** da konumu kolayca seçebilir ve dilediğiniz özel ismi verebilirsiniz!
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Kategori Seçici */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                  Kategori Seçin
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 cursor-pointer border transition-all ${
                        category === cat.id
                          ? 'border-[#B56576] text-white shadow-sm'
                          : 'border-white/50 bg-white hover:bg-gray-50 text-[#3D3A45]/70'
                      }`}
                      style={{
                        backgroundColor: category === cat.id ? cat.color : undefined,
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarih ve Duygu Seçici */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                    Ziyaret Tarihi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3A45]/40">
                      <Calendar size={16} />
                    </div>
                    <input
                      type="date"
                      required
                      value={visitedAt}
                      onChange={(e) => setVisitedAt(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-white border border-white/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                    Nasıl Hissettiniz?
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3A45]/40">
                      <Smile size={16} />
                    </div>
                    <select
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-white border border-white/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all appearance-none"
                    >
                      {MOODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Kalp Rating (1-5 Puan) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                  Aşk Puanınız (Derece)
                </label>
                <div className="flex gap-2 py-1 items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-[#E5989B] cursor-pointer"
                    >
                      <Heart
                        size={28}
                        fill={star <= rating ? '#E5989B' : 'transparent'}
                        strokeWidth={2}
                      />
                    </motion.button>
                  ))}
                  <span className="text-xs font-bold text-[#B56576] pl-2">
                    {rating === 5 ? 'Kusursuz! ❤️' : `${rating}/5`}
                  </span>
                </div>
              </div>

              {/* Anı Notu */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                  Anı Notu & Deneyimleriniz
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Birlikte neler yaptınız? Mekan hakkında partnerinle unutmak istemediğin ufak detaylar..."
                  rows={3}
                  className="block w-full px-4 py-3 bg-white border border-white/60 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all resize-none"
                />
              </div>

              {/* Çoklu Görsel Yükleme */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                  Fotoğraflar Ekleyin
                </label>
                
                {/* Sürükle bırak / Secici Kart */}
                <div className="grid grid-cols-4 gap-3">
                  {/* Foto Ekleme Butonu */}
                  <label className="aspect-square border border-dashed border-[#E5989B]/40 hover:border-[#E5989B] bg-white rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-[#B56576] hover:bg-[#FFF5F5]/30">
                    <Camera size={20} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Ekle</span>
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
                      className="group relative aspect-square rounded-2xl border border-white/40 bg-gray-50 overflow-hidden"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Anı Resmi"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-1 right-1 p-1 bg-[#3D3A45]/70 hover:bg-[#3D3A45] rounded-full text-white cursor-pointer transition-colors"
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
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-[#E5989B] hover:bg-[#B56576] text-white font-semibold rounded-2xl shadow-[0_4px_20px_0_rgba(229,152,155,0.25)] hover:shadow-[0_4px_25px_0_rgba(181,101,118,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-semibold">
                      {uploading ? 'Görseller Sıkıştırılıyor & Yükleniyor...' : 'Anı Kaydediliyor...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <span>Haritaya Ekle</span>
                    <Heart size={16} fill="currentColor" />
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
