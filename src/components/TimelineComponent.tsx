'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Calendar, Smile, User, Sparkles, MapPin, Search, Maximize2, X, ChevronLeft, ChevronRight, Filter, ArrowUpDown } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

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

interface TimelineComponentProps {
  entries: PlaceEntry[]
  myId: string
  partnerName: string | null
}

const CATEGORIES: { [key: string]: { label: string; color: string; icon: string } } = {
  cafe: { label: 'Kafe', color: '#E5989B', icon: '☕' },
  restaurant: { label: 'Restoran', color: '#B56576', icon: '🍽️' },
  nature: { label: 'Doğa', color: '#6B9080', icon: '🌳' },
  travel: { label: 'Seyahat', color: '#8ECAE6', icon: '✈️' },
  hotel: { label: 'Otel', color: '#A24857', icon: '🏨' },
  event: { label: 'Etkinlik', color: '#E07A5F', icon: '🎭' },
  museum: { label: 'Müze', color: '#9B5DE5', icon: '🏛️' },
  special: { label: 'Özel Gün', color: '#FFB703', icon: '✨' },
}

const MOODS: { [key: string]: string } = {
  romantic: 'Romantik 💖',
  cozy: 'Huzurlu 🧘',
  fun: 'Eğlenceli 🎉',
  adventure: 'Macera 🧗',
  happy: 'Keyifli 😄',
}

const MONTHS = [
  { id: 0, name: 'Ocak' },
  { id: 1, name: 'Şubat' },
  { id: 2, name: 'Mart' },
  { id: 3, name: 'Nisan' },
  { id: 4, name: 'Mayıs' },
  { id: 5, name: 'Haziran' },
  { id: 6, name: 'Temmuz' },
  { id: 7, name: 'Ağustos' },
  { id: 8, name: 'Eylül' },
  { id: 9, name: 'Ekim' },
  { id: 10, name: 'Kasım' },
  { id: 11, name: 'Aralık' },
]

// Anı kartı için iç resim yükleme ve galeri alt bileşeni
function MemoryCardPhotos({ entryId, onPhotoClick }: { entryId: string; onPhotoClick: (urls: string[], idx: number) => void }) {
  const supabase = createClient()
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data } = await supabase
          .from('entry_photos')
          .select('storage_path')
          .eq('entry_id', entryId)

        if (data && data.length > 0) {
          const urls = data.map((p) => 
            supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl
          )
          setPhotos(urls)
        }
      } catch (err) {
        console.error('Error fetching photos:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPhotos()
  }, [entryId])

  if (loading) {
    return <div className="h-24 bg-gray-50 rounded-2xl animate-pulse" />
  }

  if (photos.length === 0) return null

  if (photos.length === 1) {
    return (
      <div 
        onClick={() => onPhotoClick(photos, 0)}
        className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/40 cursor-zoom-in group"
      >
        <img src={photos[0]} alt="Anı fotoğrafı" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-[#3D3A45]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          <Maximize2 size={20} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.slice(0, 3).map((url, idx) => {
        const isThird = idx === 2
        const hasMore = photos.length > 3

        return (
          <div
            key={idx}
            onClick={() => onPhotoClick(photos, idx)}
            className={`relative aspect-square rounded-xl overflow-hidden border border-white/40 cursor-zoom-in group ${
              idx === 0 ? 'col-span-2 row-span-2 aspect-auto h-full' : ''
            }`}
          >
            <img src={url} alt="Anı fotoğrafı" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            
            {isThird && hasMore ? (
              <div className="absolute inset-0 bg-[#3D3A45]/60 flex items-center justify-center text-white text-xs font-bold">
                +{photos.length - 2}
              </div>
            ) : (
              <div className="absolute inset-0 bg-[#3D3A45]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Maximize2 size={16} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function TimelineComponent({ entries, myId, partnerName }: TimelineComponentProps) {
  const supabase = createClient()
  const [searchTerm, setSearchTerm] = useState('')
  
  // 📆 Filtreleme State'leri
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [showFilters, setShowFilters] = useState(false)

  // 🕒 Manuel Tarih Aralığı State'leri
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Lightbox State'leri
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxActiveIdx, setLightboxActiveIdx] = useState(0)

  // Kullanıcı isimleri eşleşmesi önbelleği
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({ [myId]: 'Sen' })

  // Anılardan yılları dinamik olarak topla
  const availableYears = Array.from(
    new Set(entries.map((e) => new Date(e.visited_at).getFullYear()))
  ).sort((a, b) => b - a)

  useEffect(() => {
    const fetchUserNames = async () => {
      const uniqueCreators = Array.from(new Set(entries.map((e) => e.created_by))).filter(id => id !== myId)
      
      for (const creatorId of uniqueCreators) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', creatorId)
          .single()
        
        if (data) {
          setUserNames((prev) => ({ ...prev, [creatorId]: data.display_name || partnerName || 'Sevgilin' }))
        }
      }
    }
    if (entries.length > 0) {
      fetchUserNames()
    }
  }, [entries])

  // Arama, Yıl, Ay, Manuel Tarih Aralığı ve Sıralama filtrelerini uygula
  const filteredEntries = entries
    .filter((e) => {
      // 1. Arama Filtresi
      const query = searchTerm.toLowerCase()
      const catLabel = CATEGORIES[e.category.toLowerCase()]?.label.toLowerCase() || ''
      const matchesSearch = 
        e.title.toLowerCase().includes(query) ||
        (e.description && e.description.toLowerCase().includes(query)) ||
        catLabel.includes(query)

      if (!matchesSearch) return false

      // 2. Manuel Tarih Aralığı Filtresi (Aktifse yıl/ay filtrelerini ezer)
      const entryTime = new Date(e.visited_at).getTime()
      
      if (startDate) {
        const startTime = new Date(startDate).getTime()
        if (entryTime < startTime) return false
      }
      
      if (endDate) {
        const endTime = new Date(endDate).getTime()
        if (entryTime > endTime) return false
      }

      // Sadece manuel tarih aralığı girilmediyse Hızlı Yıl/Ay filtrelerini kontrol et
      if (!startDate && !endDate) {
        // 3. Yıl Filtresi
        const entryYear = new Date(e.visited_at).getFullYear().toString()
        if (selectedYear !== 'all' && entryYear !== selectedYear) return false

        // 4. Ay Filtresi
        const entryMonth = new Date(e.visited_at).getMonth().toString()
        if (selectedMonth !== 'all' && entryMonth !== selectedMonth) return false
      }

      return true
    })
    .sort((a, b) => {
      // 5. Sıralama Filtresi
      const dateA = new Date(a.visited_at).getTime()
      const dateB = new Date(b.visited_at).getTime()
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })

  // Hızlı yıl filtresi değiştiğinde manuel aralığı temizle
  const handleYearChange = (val: string) => {
    setSelectedYear(val)
    if (val !== 'all') {
      setStartDate('')
      setEndDate('')
    }
  }

  // Hızlı ay filtresi değiştiğinde manuel aralığı temizle
  const handleMonthChange = (val: string) => {
    setSelectedMonth(val)
    if (val !== 'all') {
      setStartDate('')
      setEndDate('')
    }
  }

  // Manuel başlangıç tarihi değiştiğinde hızlı filtreleri temizle
  const handleStartDateChange = (val: string) => {
    setStartDate(val)
    if (val) {
      setSelectedYear('all')
      setSelectedMonth('all')
    }
  }

  // Manuel bitiş tarihi değiştiğinde hızlı filtreleri temizle
  const handleEndDateChange = (val: string) => {
    setEndDate(val)
    if (val) {
      setSelectedYear('all')
      setSelectedMonth('all')
    }
  }

  // Tüm filtreleri temizle
  const handleResetFilters = () => {
    setSelectedYear('all')
    setSelectedMonth('all')
    setStartDate('')
    setEndDate('')
    setSearchTerm('')
  }

  // Anıları ay ve yıla göre grupla
  const groupEntriesByMonth = (items: PlaceEntry[]) => {
    const groups: { [key: string]: PlaceEntry[] } = {}
    items.forEach((item) => {
      const date = new Date(item.visited_at)
      const monthYear = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
      if (!groups[monthYear]) {
        groups[monthYear] = []
      }
      groups[monthYear].push(item)
    })
    return groups
  }

  const groupedEntries = groupEntriesByMonth(filteredEntries)

  const handleOpenLightbox = (images: string[], index: number) => {
    setLightboxImages(images)
    setLightboxActiveIdx(index)
    setLightboxOpen(true)
  }

  const handleNextLightbox = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLightboxActiveIdx((prev) => (prev + 1) % lightboxImages.length)
  }

  const handlePrevLightbox = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLightboxActiveIdx((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)
  }

  const hasActiveFilters = selectedYear !== 'all' || selectedMonth !== 'all' || startDate !== '' || endDate !== '' || searchTerm !== ''

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col text-[#3D3A45] relative">
      
      {/* 🔍 Arama ve Filtreleme Başlık Alanı (UI/UX Pro Max) */}
      <div className="space-y-4.5 mb-8 shrink-0">
        <div className="flex gap-3">
          {/* Arama Girişi */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-[#E5989B]">
              <Search size={16} className="animate-pulse" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Anılarda arama yapın (Örn: kahve, ilk buluşma)..."
              className="block w-full pl-12 pr-11 py-3.5 bg-white/90 border border-pink-100/45 rounded-full text-xs font-semibold text-[#3D3A45] placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/40 focus:border-transparent shadow-[0_4px_15px_rgba(61,58,69,0.02)] focus:shadow-[0_0_18px_rgba(229,152,155,0.22)] transition-all duration-300"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4.5 top-4 text-[#B56576] hover:text-red-500 cursor-pointer transition-colors active:scale-90"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtre Panelini Açma/Kapatma Butonu */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`w-12.5 h-12.5 rounded-full border transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(61,58,69,0.02)] ${
              showFilters || hasActiveFilters
                ? 'bg-gradient-to-tr from-[#E5989B] to-[#B56576] hover:from-[#B56576] hover:to-[#E5989B] text-white border-transparent shadow-[0_4px_15px_rgba(229,152,155,0.35)]'
                : 'bg-white/90 hover:bg-white text-[#3D3A45]/85 border-pink-100/45 hover:shadow-md'
            }`}
          >
            <Filter size={16} />
          </motion.button>
        </div>

        {/* 📆 Gelişmiş Tarih Filtreleme Paneli (UX Pro Max - Glassmorphism) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="backdrop-blur-xl bg-white/75 border border-white/80 p-6 rounded-[2rem] space-y-5 shadow-[0_12px_35px_rgba(61,58,69,0.05)]">
                
                {/* 1. Kısım: Hızlı Seçimler */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Yıl Seçici */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5">
                      Yıl Seçimi
                    </label>
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer appearance-none pr-8"
                      >
                        <option value="all">Tüm Yıllar</option>
                        {availableYears.map((year) => (
                          <option key={year} value={year.toString()}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-3.5 pointer-events-none text-[#3D3A45]/45 text-[10px]">▼</div>
                    </div>
                  </div>

                  {/* Ay Seçici */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5">
                      Ay Seçimi
                    </label>
                    <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer appearance-none pr-8"
                      >
                        <option value="all">Tüm Aylar</option>
                        {MONTHS.map((m) => (
                          <option key={m.id} value={m.id.toString()}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-3.5 pointer-events-none text-[#3D3A45]/45 text-[10px]">▼</div>
                    </div>
                  </div>

                  {/* Sıralama Seçici */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5 flex items-center gap-1">
                      <ArrowUpDown size={8} />
                      Sırala
                    </label>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                        className="block w-full px-3.5 py-2.5 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer appearance-none pr-8"
                      >
                        <option value="newest">En Yeni Önce</option>
                        <option value="oldest">En Eski Önce</option>
                      </select>
                      <div className="absolute right-3.5 top-3.5 pointer-events-none text-[#3D3A45]/45 text-[10px]">▼</div>
                    </div>
                  </div>
                </div>

                {/* 2. Kısım: 📅 Manuel Tarih Aralığı Seçici (UI/UX Pro Max) */}
                <div className="pt-4.5 border-t border-[#3D3A45]/8 flex flex-col sm:flex-row gap-3.5 items-stretch">
                  <div className="flex-1 grid grid-cols-2 gap-3.5">
                    {/* Başlangıç Tarihi */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5 flex items-center gap-1">
                        <Calendar size={10} className="text-[#E5989B]" />
                        Başlangıç Tarihi
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer"
                      />
                    </div>

                    {/* Bitiş Tarihi */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5 flex items-center gap-1">
                        <Calendar size={10} className="text-[#E5989B]" />
                        Bitiş Tarihi
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Sıfırla Butonu */}
                  {hasActiveFilters && (
                    <div className="flex items-end shrink-0 mt-3 sm:mt-0">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleResetFilters}
                        className="w-full sm:w-auto py-2.5 px-4.5 bg-red-50/75 hover:bg-red-100/90 text-red-500 font-extrabold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-red-100/50 shadow-sm"
                      >
                        <X size={12} />
                        <span>Temizle</span>
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Manuel aralık aktifse küçük bilgilendirici yazı */}
                {(startDate || endDate) && (
                  <p className="text-[9px] text-[#B56576] italic font-semibold pl-1">
                    * Manuel tarih aralığı filtrelemesi aktif. Hızlı Yıl/Ay seçimleri geçici olarak devre dışı.
                  </p>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#FFF5F5] border border-[#FFEBE9] text-[#E5989B] mb-4">
            <Heart size={32} />
          </div>
          <h3 className="font-bold text-lg mb-1">Henüz Anınız Yok 🗺️</h3>
          <p className="text-xs opacity-75 max-w-xs">
            Birlikte gittiğiniz yerleri ekleyerek zaman tünelinizi oluşturmaya başlayın! Ortadaki büyük artı butonuna basarak ilk yerinizi ekleyebilirsiniz.
          </p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-10 opacity-70 text-xs">Aradığınız kriterde anı bulunamadı.</div>
      ) : (
        <div className="relative flex-1">
          
          {/* Zaman Tüneli Sol Dikey Kesikli Çizgi */}
          <div className="absolute top-4 bottom-4 left-6 w-[2px] bg-dashed bg-gradient-to-b from-[#E5989B] via-[#B56576] to-[#E5989B]/30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at center, #E5989B 30%, transparent 40%)', backgroundSize: '1px 12px', backgroundRepeat: 'repeat-y' }} />

          {/* Ay Grupları */}
          <div className="space-y-10">
            {Object.entries(groupedEntries).map(([monthYear, items]) => (
              <div key={monthYear} className="space-y-6">
                
                {/* Ay / Yıl Ara Başlığı */}
                <div className="relative flex items-center pl-14 shrink-0">
                  <div className="absolute left-[20px] w-3 h-3 rounded-full bg-[#B56576] ring-4 ring-[#FFFDF9] border border-white" />
                  <h3 className="font-bold text-sm text-[#B56576] bg-[#FFFDF9] pr-3 select-none uppercase tracking-wider">
                    {monthYear}
                  </h3>
                </div>

                {/* Anı Kartları Listesi */}
                <div className="space-y-6">
                  {items.map((entry) => {
                    const catInfo = CATEGORIES[entry.category.toLowerCase()] || { label: entry.category, color: '#B56576', icon: '📍' }
                    const isSpecial = entry.category.toLowerCase() === 'special'
                    
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative pl-14"
                      >
                        {/* Kart Sol Küçük Yuvarlak Bağlantı Noktası */}
                        <div className="absolute left-[22px] top-6 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#E5989B] z-10" />

                        {/* Anı Kartı Tasarımı */}
                        <div 
                          className={`backdrop-blur-md bg-white/75 border rounded-3xl p-5 md:p-6 shadow-[0_4px_20px_rgba(61,58,69,0.02)] transition-all ${
                            isSpecial 
                              ? 'border-[#FFB703] shadow-[0_4px_25px_rgba(255,183,3,0.1)] ring-1 ring-[#FFB703]/20 relative overflow-hidden' 
                              : 'border-white/50'
                          }`}
                        >
                          {isSpecial && (
                            <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#FFB703]/10 rounded-full blur-2xl pointer-events-none" />
                          )}

                          {/* Kart Başlık Alanı */}
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{catInfo.icon}</span>
                                <h4 className="font-bold text-base md:text-lg tracking-tight">
                                  {entry.title}
                                </h4>
                              </div>
                              
                              <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin size={10} className="text-[#E5989B]" />
                                <span>{catInfo.label}</span>
                                <span className="opacity-40">•</span>
                                <span>{new Date(entry.visited_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                              </p>
                            </div>

                            {/* Kalp Rating */}
                            <div className="flex gap-0.5 shrink-0 text-[#E5989B]">
                              {[...Array(5)].map((_, idx) => (
                                <Heart
                                  key={idx}
                                  size={14}
                                  fill={idx < entry.rating ? '#E5989B' : 'transparent'}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Çoklu Fotoğraflar */}
                          <div className="mb-4">
                            <MemoryCardPhotos 
                              entryId={entry.id} 
                              onPhotoClick={handleOpenLightbox} 
                            />
                          </div>

                          {/* Anı Notu Açıklaması */}
                          {entry.description && (
                            <p className="text-xs md:text-sm leading-relaxed text-[#3D3A45]/90 whitespace-pre-line bg-[#FFFDF9]/60 border border-[#3D3A45]/5 p-3.5 rounded-2xl">
                              {entry.description}
                            </p>
                          )}

                          {/* Alt Bilgi Barı */}
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-4 pt-3 border-t border-[#3D3A45]/5">
                            <span className="flex items-center gap-1">
                              <User size={10} className="text-[#E5989B]" />
                              <span>{userNames[entry.created_by] || 'Sevgilin'} ekledi</span>
                            </span>

                            {entry.mood && (
                              <span className="px-2 py-0.5 rounded-md bg-[#FFF5F5] text-[#B56576] font-semibold border border-[#FFEBE9]">
                                {MOODS[entry.mood.toLowerCase()] || entry.mood}
                              </span>
                            )}
                          </div>

                        </div>
                      </motion.div>
                    )
                  })}
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* Lightbox Modalı */}
      <AnimatePresence>
        {lightboxOpen && lightboxImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-99 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-colors z-100"
            >
              <X size={20} />
            </button>

            <div className="relative max-w-4xl max-h-[80vh] aspect-video w-full flex items-center justify-center">
              <motion.img
                key={lightboxActiveIdx}
                src={lightboxImages[lightboxActiveIdx]}
                alt="Tam Ekran Anı"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
              />

              {lightboxImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevLightbox}
                    className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={handleNextLightbox}
                    className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>

                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/70 text-xs font-semibold select-none">
                    {lightboxActiveIdx + 1} / {lightboxImages.length}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
