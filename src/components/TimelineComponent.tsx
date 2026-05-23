'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Calendar, Smile, User, Sparkles, MapPin, Search, Maximize2, X, ChevronLeft, ChevronRight, Filter, ArrowUpDown, Compass, Camera } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import GalleryComponent from '@/components/GalleryComponent'

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
  coupleId: string
  onShowOnMap?: (lat: number, lng: number) => void
  onActiveTabChange?: (tab: 'map' | 'timeline' | 'add' | 'wishlist' | 'profile') => void
  onSelectEntry?: (entry: any) => void
  onOpenDetail?: (isOpen: boolean) => void
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

const MOODS: { [key: string]: { label: string; color: string; bg: string } } = {
  romantic: { label: 'Romantik 💖', color: '#B56576', bg: '#FFF5F5' },
  cozy: { label: 'Huzurlu 🧘', color: '#6B9080', bg: '#F4F9F4' },
  fun: { label: 'Eğlenceli 🎉', color: '#D97706', bg: '#FFFBF0' },
  adventure: { label: 'Macera 🧗', color: '#0284C7', bg: '#F0F9FF' },
  happy: { label: 'Keyifli 😄', color: '#9333EA', bg: '#FAF5FF' },
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
    return <div className="h-32 bg-[#FFFDF9]/65 rounded-3xl animate-pulse border border-pink-100/10" />
  }

  if (photos.length === 0) return null

  if (photos.length === 1) {
    return (
      <div 
        onClick={() => onPhotoClick(photos, 0)}
        className="relative w-full aspect-video rounded-[1.8rem] overflow-hidden border border-white shadow-md cursor-zoom-in group transition-transform duration-300 hover:scale-[1.01]"
      >
        <img src={photos[0]} alt="Anı fotoğrafı" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-[#3D3A45]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-xs">
          <Maximize2 size={22} className="drop-shadow-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {photos.slice(0, 3).map((url, idx) => {
        const isThird = idx === 2
        const hasMore = photos.length > 3

        return (
          <div
            key={idx}
            onClick={() => onPhotoClick(photos, idx)}
            className={`relative aspect-square rounded-[1.2rem] overflow-hidden border border-white shadow-sm cursor-zoom-in group transition-all duration-300 hover:scale-[1.02] ${
              idx === 0 ? 'col-span-2 row-span-2 aspect-auto h-full' : ''
            }`}
          >
            <img src={url} alt="Anı fotoğrafı" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            
            {isThird && hasMore ? (
              <div className="absolute inset-0 bg-[#3D3A45]/60 flex items-center justify-center text-white text-xs font-black backdrop-blur-xs select-none">
                +{photos.length - 2} Fotoğraf
              </div>
            ) : (
              <div className="absolute inset-0 bg-[#3D3A45]/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-xs">
                <Maximize2 size={16} className="drop-shadow-md" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function TimelineComponent({ 
  entries, 
  myId, 
  partnerName, 
  coupleId, 
  onShowOnMap, 
  onActiveTabChange, 
  onSelectEntry, 
  onOpenDetail 
}: TimelineComponentProps) {
  const supabase = createClient()
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed')
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
      const query = searchTerm.toLowerCase()
      const catLabel = CATEGORIES[e.category.toLowerCase()]?.label.toLowerCase() || ''
      const matchesSearch = 
        e.title.toLowerCase().includes(query) ||
        (e.description && e.description.toLowerCase().includes(query)) ||
        catLabel.includes(query)

      if (!matchesSearch) return false

      const entryTime = new Date(e.visited_at).getTime()
      
      if (startDate) {
        const startTime = new Date(startDate).getTime()
        if (entryTime < startTime) return false
      }
      
      if (endDate) {
        const endTime = new Date(endDate).getTime()
        if (entryTime > endTime) return false
      }

      if (!startDate && !endDate) {
        const entryYear = new Date(e.visited_at).getFullYear().toString()
        if (selectedYear !== 'all' && entryYear !== selectedYear) return false

        const entryMonth = new Date(e.visited_at).getMonth().toString()
        if (selectedMonth !== 'all' && entryMonth !== selectedMonth) return false
      }

      return true
    })
    .sort((a, b) => {
      const dateA = new Date(a.visited_at).getTime()
      const dateB = new Date(b.visited_at).getTime()
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })

  const handleYearChange = (val: string) => {
    setSelectedYear(val)
    if (val !== 'all') {
      setStartDate('')
      setEndDate('')
    }
  }

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val)
    if (val !== 'all') {
      setStartDate('')
      setEndDate('')
    }
  }

  const handleStartDateChange = (val: string) => {
    setStartDate(val)
    if (val) {
      setSelectedYear('all')
      setSelectedMonth('all')
    }
  }

  const handleEndDateChange = (val: string) => {
    setEndDate(val)
    if (val) {
      setSelectedYear('all')
      setSelectedMonth('all')
    }
  }

  const handleResetFilters = () => {
    setSelectedYear('all')
    setSelectedMonth('all')
    setStartDate('')
    setEndDate('')
    setSearchTerm('')
  }

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
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col text-[#3D3A45] relative scrollbar-none">
      
      {/* 🌟 Görünüm Seçici Başlık Barı (Zaman Tüneli / Galeri) */}
      <div className="flex items-center justify-between mb-6 shrink-0 pt-20 sm:pt-24">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#3D3A45] tracking-tight">Anılarımız</h2>
          <p className="text-[9px] text-[#3D3A45]/50 font-bold uppercase tracking-wider pl-0.5">Aşk arşivimiz</p>
        </div>
        
        {/* Seçici Switch (Framer Motion sliding pill - Dokunsal) */}
        <div className="shadow-clay-inset border-stitched p-1 rounded-full flex gap-1 relative bg-[#FFFDF9]">
          <button
            onClick={() => setViewMode('feed')}
            className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 z-10 ${viewMode === 'feed' ? 'text-white' : 'text-[#3D3A45]/60 hover:text-[#3D3A45]'}`}
          >
            {viewMode === 'feed' && (
              <motion.div
                layoutId="viewModePill"
                className="absolute inset-0 bg-[#E5989B] rounded-full -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            Zaman Tüneli
          </button>
          
          <button
            onClick={() => setViewMode('grid')}
            className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 z-10 ${viewMode === 'grid' ? 'text-white' : 'text-[#3D3A45]/60 hover:text-[#3D3A45]'}`}
          >
            {viewMode === 'grid' && (
              <motion.div
                layoutId="viewModePill"
                className="absolute inset-0 bg-[#E5989B] rounded-full -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            Fotoğraflar
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <motion.div
          key="gallery-view"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="flex-1 -mx-4"
        >
          <GalleryComponent
            coupleId={coupleId}
            onShowOnMap={onShowOnMap}
            onActiveTabChange={onActiveTabChange}
            onSelectEntry={onSelectEntry}
            onOpenDetail={onOpenDetail}
          />
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col">
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

        {/* 📆 Gelişmiş Tarih Filtreleme Paneli (Responsive Tasarım Yenilendi!) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="backdrop-blur-xl bg-white/75 border border-white/80 p-5 sm:p-6 rounded-[2rem] space-y-5 shadow-[0_12px_35px_rgba(61,58,69,0.05)]">
                
                {/* 1. Kısım: Hızlı Seçimler (Responsive Dikey/Yatay Düzenleme) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Yıl Seçici */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#3D3A45]/60 pl-1.5">
                      Yıl Seçimi
                    </label>
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="block w-full px-4 py-3 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer appearance-none pr-8"
                      >
                        <option value="all">Tüm Yıllar</option>
                        {availableYears.map((year) => (
                          <option key={year} value={year.toString()}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-3.5 pointer-events-none text-[#3D3A45]/45 text-[10px]">▼</div>
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
                        className="block w-full px-4 py-3 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer appearance-none pr-8"
                      >
                        <option value="all">Tüm Aylar</option>
                        {MONTHS.map((m) => (
                          <option key={m.id} value={m.id.toString()}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-3.5 pointer-events-none text-[#3D3A45]/45 text-[10px]">▼</div>
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
                        className="block w-full px-4 py-3 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer appearance-none pr-8"
                      >
                        <option value="newest">En Yeni Önce</option>
                        <option value="oldest">En Eski Önce</option>
                      </select>
                      <div className="absolute right-4 top-3.5 pointer-events-none text-[#3D3A45]/45 text-[10px]">▼</div>
                    </div>
                  </div>
                </div>

                {/* 2. Kısım: 📅 Manuel Tarih Aralığı Seçici (Responsive Dikey/Yatay Düzenleme) */}
                <div className="pt-4.5 border-t border-[#3D3A45]/8 flex flex-col sm:flex-row gap-3.5 items-stretch">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                        className="block w-full px-4 py-3 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer"
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
                        className="block w-full px-4 py-3 bg-white/95 border border-pink-100/50 rounded-2xl text-xs font-semibold text-[#3D3A45] focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B]/85 transition-all shadow-sm cursor-pointer"
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
                        className="w-full sm:w-auto py-3 px-5 bg-red-50/75 hover:bg-red-100/90 text-red-500 font-extrabold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-red-100/50 shadow-sm"
                      >
                        <X size={12} />
                        <span>Temizle</span>
                      </motion.button>
                    </div>
                  )}
                </div>

                {(startDate || endDate) && (
                  <p className="text-[9px] text-[#B56576] italic font-semibold pl-1.5">
                    * Manuel tarih aralığı filtrelemesi aktif. Hızlı Yıl/Ay seçimleri geçici olarak devre dışı bırakıldı.
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
        <div className="text-center py-10 opacity-70 text-xs font-bold bg-white/40 border border-pink-100/20 p-8 rounded-3xl shadow-xs leading-relaxed max-w-md mx-auto">
          🔍 Seçtiğiniz kriterlere uygun hiçbir anı bulunamadı. <br />
          <span className="text-[10px] text-[#B56576] font-normal block mt-1.5">Filtreleri sıfırlayarak tüm romantik anılarınızı tekrar görebilirsiniz.</span>
        </div>
      ) : (
        <div className="relative flex-1">
          
          {/* Zaman Tüneli Sol Dikey Premium degrade Çizgisi */}
          <div className="absolute top-4 bottom-4 left-6.5 w-[2px] bg-dashed bg-gradient-to-b from-[#E5989B] via-[#B56576] to-[#E5989B]/15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at center, #E5989B 30%, transparent 40%)', backgroundSize: '1px 14px', backgroundRepeat: 'repeat-y' }} />

          {/* Ay Grupları */}
          <div className="space-y-10">
            {Object.entries(groupedEntries).map(([monthYear, items]) => (
              <div key={monthYear} className="space-y-6">
                
                {/* Ay / Yıl Ara Başlığı (Premium Pill) */}
                <div className="relative flex items-center pl-14.5 shrink-0">
                  <motion.div 
                    whileHover={{ scale: 1.2 }}
                    className="absolute left-[21px] w-3.5 h-3.5 rounded-full bg-[#B56576] ring-4 ring-[#FFFDF9] border-2 border-white shadow-sm z-20 cursor-pointer" 
                  />
                  <h3 className="font-extrabold text-[10px] tracking-widest text-[#B56576] bg-white/80 backdrop-blur-md px-4 py-2 border border-pink-100/40 rounded-full shadow-[0_3px_10px_rgba(61,58,69,0.02)] select-none uppercase">
                    {monthYear}
                  </h3>
                </div>

                {/* Anı Kartları Listesi */}
                <div className="space-y-6">
                  {items.map((entry) => {
                    const catInfo = CATEGORIES[entry.category.toLowerCase()] || { label: entry.category, color: '#B56576', icon: '📍' }
                    const isSpecial = entry.category.toLowerCase() === 'special'
                    const moodInfo = entry.mood ? MOODS[entry.mood.toLowerCase()] : null
                    
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative pl-14.5 group"
                      >
                        {/* Kart Sol Küçük Yuvarlak Bağlantı Noktası (Mikromotion parıltı) */}
                        <motion.div 
                          whileHover={{ scale: 1.3 }}
                          className="absolute left-[24px] top-6.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#E5989B] z-10 transition-colors group-hover:border-[#B56576] group-hover:bg-[#FFF5F5]" 
                        />

                        {/* Anı Kartı Tasarımı (Pro-Max WOW Detayları - Dokunsal & Yaylı) */}
                        <motion.div 
                          whileHover={{ y: -6 }}
                          transition={{ type: "spring", stiffness: 300, damping: 22 }}
                          className={`shadow-clay-card rounded-[2rem] p-5 md:p-6 transition-all duration-300 ${
                            isSpecial 
                              ? 'border-[#FFB703]/60 border-dashed relative overflow-hidden shadow-[inset_0_0_12px_rgba(255,183,3,0.05)]' 
                              : 'border-stitched'
                          }`}
                        >
                          {isSpecial && (
                            <div className="absolute -top-12 -left-12 w-28 h-28 bg-gradient-to-tr from-[#FFB703]/10 to-transparent rounded-full blur-2xl pointer-events-none animate-pulse" />
                          )}

                          {/* Kart Başlık Alanı */}
                          <div className="flex justify-between items-start gap-4 mb-3.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl select-none">{catInfo.icon}</span>
                                <h4 className="font-extrabold text-sm md:text-base tracking-tight text-[#3D3A45]">
                                  {entry.title}
                                </h4>
                              </div>
                              
                              <p className="text-[10px] text-[#3D3A45]/50 flex items-center gap-1.5 mt-1 font-semibold">
                                <MapPin size={10} className="text-[#E5989B]" />
                                <span>{catInfo.label}</span>
                                <span className="opacity-40">•</span>
                                <span>{new Date(entry.visited_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              </p>
                            </div>

                            {/* Kalp Derecelendirmesi (Göz Alıcı İkili Pembe Ton) */}
                            <div className="flex gap-0.5 shrink-0 text-[#E5989B]">
                              {[...Array(5)].map((_, idx) => (
                                <Heart
                                  key={idx}
                                  size={13}
                                  fill={idx < entry.rating ? '#E5989B' : 'transparent'}
                                  className={idx < entry.rating ? 'drop-shadow-sm scale-110' : 'opacity-35'}
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

                          {/* Anı Notu Açıklaması (Polaroid Kart/Mektup benzeri zemin) */}
                          {entry.description && (
                            <p className="text-xs md:text-[13px] leading-relaxed text-[#3D3A45]/90 whitespace-pre-line bg-[#FFFDF9]/80 border border-[#FFEBE9]/50 p-4 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] font-medium">
                              {entry.description}
                            </p>
                          )}

                          {/* Alt Bilgi Barı */}
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-4.5 pt-3 border-t border-[#3D3A45]/8">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1.5 font-semibold text-[#3D3A45]/60">
                                <div className="w-4 h-4 rounded-full bg-[#FFEBE9] flex items-center justify-center text-[8px] font-extrabold text-[#B56576] border border-white">
                                  {userNames[entry.created_by]?.charAt(0).toUpperCase() || 'S'}
                                </div>
                                <span>{userNames[entry.created_by] || 'Sevgilin'} ekledi</span>
                              </span>

                              {/* 🗺️ Konumu Gör Butonu (Lüks Dokunsal & Mikro-animasyonlu) */}
                              {entry.latitude && entry.longitude && (
                                <motion.button
                                  onClick={() => {
                                    if (onShowOnMap) {
                                      onShowOnMap(entry.latitude, entry.longitude);
                                      if (onActiveTabChange) {
                                        onActiveTabChange('map');
                                      }
                                    }
                                  }}
                                  whileHover={{ scale: 1.04 }}
                                  whileTap={{ scale: 0.95 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                  className="flex items-center gap-1 py-1 px-2.5 bg-[#FFF5F5] hover:bg-[#FFEBE9] text-[#B56576] font-bold text-[9px] uppercase tracking-wider rounded-full shadow-clay-button border border-white cursor-pointer transition-colors"
                                >
                                  <MapPin size={9} className="text-[#E5989B]" />
                                  <span>Konumu Gör</span>
                                </motion.button>
                              )}
                            </div>

                            {moodInfo && (
                              <span 
                                className="px-2.5 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border transition-colors shadow-2xs"
                                style={{
                                  backgroundColor: moodInfo.bg,
                                  borderColor: moodInfo.color + '25',
                                  color: moodInfo.color
                                }}
                              >
                                {moodInfo.label}
                              </span>
                            )}
                          </div>

                        </motion.div>
                      </motion.div>
                    )
                  })}
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

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
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-all z-100"
            >
              <X size={20} />
            </button>

            <div className="relative max-w-4xl max-h-[80vh] aspect-video w-full flex items-center justify-center">
              <motion.img
                key={lightboxActiveIdx}
                src={lightboxImages[lightboxActiveIdx]}
                alt="Tam Ekran Anı"
                className="max-w-full max-h-full object-contain rounded-[2rem] shadow-2xl border border-white/10"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
              />

              {lightboxImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevLightbox}
                    className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={handleNextLightbox}
                    className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-all"
                  >
                    <ChevronRight size={24} />
                  </button>

                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/70 text-xs font-bold select-none">
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
