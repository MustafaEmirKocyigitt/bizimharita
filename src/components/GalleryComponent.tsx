'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Search, Calendar, X, Camera, Compass, Coffee, Utensils, Trees, Bed, Ticket, Landmark, Sparkles, HeartCrack, ChevronRight, Eye } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

// Kategori eşlemeleri ve renkleri (Dashboard ile uyumlu)
const CATEGORIES = [
  { id: 'all', label: 'Hepsi', icon: Compass, color: '#B56576' },
  { id: 'cafe', label: 'Kafe', icon: Coffee, color: '#E5989B' },
  { id: 'restaurant', label: 'Restoran', icon: Utensils, color: '#B56576' },
  { id: 'nature', label: 'Doğa', icon: Trees, color: '#6B9080' },
  { id: 'travel', label: 'Seyahat', icon: Compass, color: '#8ECAE6' },
  { id: 'hotel', label: 'Otel', icon: Bed, color: '#A24857' },
  { id: 'event', label: 'Etkinlik', icon: Ticket, color: '#E07A5F' },
  { id: 'museum', label: 'Müze', icon: Landmark, color: '#9B5DE5' },
  { id: 'special', label: 'Özel Gün', icon: Sparkles, color: '#FFB703' },
]

interface GalleryItem {
  photoId: string
  url: string
  storagePath: string
  entryId: string
  entryTitle: string
  entryDescription: string | null
  visitedAt: string
  category: string
  rating: number
  mood: string | null
  latitude: number
  longitude: number
  rawEntry: any
}

interface GalleryComponentProps {
  coupleId: string
  onShowOnMap?: (lat: number, lng: number) => void
  onActiveTabChange?: (tab: 'map' | 'timeline' | 'add' | 'wishlist' | 'profile') => void
  onSelectEntry?: (entry: any) => void
  onOpenDetail?: (isOpen: boolean) => void
}

export default function GalleryComponent({
  coupleId,
  onShowOnMap,
  onActiveTabChange,
  onSelectEntry,
  onOpenDetail
}: GalleryComponentProps) {
  const supabase = createClient()
  
  const [items, setItems] = useState<GalleryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  
  // Lightbox
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)

  // Çiftin tüm anılarını ve fotoğraflarını çek
  const fetchGallery = async () => {
    if (!coupleId) return
    setLoading(true)
    
    try {
      // place_entries ve entry_photos join sorgusu
      const { data, error } = await supabase
        .from('place_entries')
        .select(`
          id,
          title,
          description,
          category,
          latitude,
          longitude,
          visited_at,
          rating,
          mood,
          created_by,
          entry_photos (
            id,
            storage_path
          )
        `)
        .eq('couple_id', coupleId)
        .order('visited_at', { ascending: false })

      if (error) throw error

      if (data) {
        // Gelen veriyi düzleştirerek tekil fotoğraflar halinde galeri öğelerine dönüştür
        const galleryList: GalleryItem[] = []
        
        data.forEach((entry: any) => {
          if (entry.entry_photos && entry.entry_photos.length > 0) {
            entry.entry_photos.forEach((photo: any) => {
              const publicUrl = supabase.storage
                .from('photos')
                .getPublicUrl(photo.storage_path).data.publicUrl
                
              galleryList.push({
                photoId: photo.id,
                url: publicUrl,
                storagePath: photo.storage_path,
                entryId: entry.id,
                entryTitle: entry.title,
                entryDescription: entry.description,
                visitedAt: entry.visited_at,
                category: entry.category,
                rating: Number(entry.rating) || 5,
                mood: entry.mood,
                latitude: entry.latitude,
                longitude: entry.longitude,
                rawEntry: entry
              })
            })
          }
        })
        
        setItems(galleryList)
        setFilteredItems(galleryList)
      }
    } catch (err) {
      console.error('Galeri yüklenirken hata oluştu:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGallery()
  }, [coupleId])

  // Arama ve Kategori filtreleme
  useEffect(() => {
    let result = items

    // Arama filtrelemesi
    if (searchTerm.trim() !== '') {
      result = result.filter(item => 
        item.entryTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.entryDescription && item.entryDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.mood && item.mood.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Kategori filtrelemesi
    if (activeCategory !== 'all') {
      result = result.filter(item => item.category.toLowerCase() === activeCategory.toLowerCase())
    }

    setFilteredItems(result)
  }, [searchTerm, activeCategory, items])

  // Tarih formatlama (Estetik)
  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
      return new Date(dateStr).toLocaleDateString('tr-TR', options)
    } catch {
      return dateStr
    }
  }

  // Haritada gösterme ve tab değiştirme
  const handleMapRedirect = (item: GalleryItem) => {
    setSelectedItem(null) // Lightbox'ı kapat
    
    if (onShowOnMap && onActiveTabChange) {
      onShowOnMap(item.latitude, item.longitude)
      onActiveTabChange('map')
    }
  }

  // Anı detayını açma
  const handleViewDetail = (item: GalleryItem) => {
    setSelectedItem(null)
    
    if (onSelectEntry && onOpenDetail) {
      onSelectEntry(item.rawEntry)
      onOpenDetail(true)
    }
  }

  return (
    <div className="w-full min-h-screen pt-24 pb-24 overflow-y-auto px-4 sm:px-6 bg-[#FFFDF9]">
      
      {/* Üst Kısım - Başlık ve Arama (Premium Glassmorphic Tasarım) */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="backdrop-blur-md bg-white/70 border border-white/40 shadow-sm rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3D3A45] tracking-tight flex items-center gap-2">
              Aşkımızın Galerisi <Camera size={26} className="text-[#E5989B] animate-pulse" />
            </h1>
            <p className="text-xs sm:text-sm text-[#3D3A45]/70 mt-1.5">
              Ortak anılarımızın en güzel anlarını tek bir yerde keşfedin.
            </p>
          </div>

          {/* Premium Arama Girişi */}
          <div className="relative w-full md:w-72 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3A45]/40">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Anılarda ara..."
              className="block w-full pl-11 pr-4 py-3 bg-white/90 border border-white/50 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* 🌟 Kategori Filtreleme Slider'ı (Premium Glassmorphic + Soft Pills) */}
      <div className="max-w-6xl mx-auto mb-8 overflow-x-auto pb-2 scrollbar-none flex gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const isActive = activeCategory === cat.id
          
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 py-2.5 px-4 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer shrink-0 border shadow-xs ${
                isActive
                  ? 'bg-gradient-to-r from-[#E5989B] to-[#B56576] text-white border-transparent scale-[1.03] shadow-[0_4px_12px_rgba(229,152,155,0.3)]'
                  : 'bg-white/80 border-white/50 text-[#3D3A45]/60 hover:text-[#3D3A45] hover:bg-white'
              }`}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* Ana Galeri Alanı */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          // Yükleniyor Placeholder'ları
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-white/80 border border-white/50 rounded-3xl animate-pulse shadow-xs"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          // Bulunamadı / Boş Durum
          <div className="text-center py-16 backdrop-blur-md bg-white/40 border border-white/20 rounded-3xl p-8">
            <HeartCrack size={48} className="mx-auto text-[#E5989B]/50 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-[#3D3A45] mb-1">Görsel Bulunamadı</h3>
            <p className="text-sm text-[#3D3A45]/60 max-w-sm mx-auto">
              {searchTerm || activeCategory !== 'all' 
                ? 'Aradığınız kriterlere uygun fotoğraf bulunmuyor. Filtreleri temizlemeyi deneyebilirsiniz.'
                : 'Henüz fotoğraflı bir anı eklemediniz. Harita üzerinden yeni bir anı ekleyerek başlayabilirsiniz!'
              }
            </p>
            {(searchTerm || activeCategory !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}
                className="mt-4 px-5 py-2 bg-[#E5989B] hover:bg-[#B56576] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        ) : (
          // Premium Galeri Izgarası
          <motion.div 
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            <AnimatePresence>
              {filteredItems.map((item) => {
                const catObj = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0]
                const CatIcon = catObj.icon

                return (
                  <motion.div
                    key={item.photoId}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setSelectedItem(item)}
                    className="group relative aspect-square rounded-3xl overflow-hidden border-2 border-white shadow-sm hover:shadow-lg cursor-zoom-in transition-all duration-300 hover:scale-[1.02]"
                  >
                    {/* Arka Plan Görseli */}
                    <img
                      src={item.url}
                      alt={item.entryTitle}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Cam Efektiyle Süzülen Bilgi Alanı (Hover & Touch) */}
                    <div className="absolute inset-0 bg-[#3D3A45]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <div className="backdrop-blur-md bg-white/80 border border-white/30 rounded-2xl p-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-sm text-left">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white mb-1.5 shadow-xs" style={{ backgroundColor: catObj.color }}>
                          <CatIcon size={10} />
                          {catObj.label}
                        </span>
                        
                        <h4 className="text-xs font-bold text-[#3D3A45] truncate">
                          {item.entryTitle}
                        </h4>
                        
                        <div className="flex items-center justify-between mt-1 text-[10px] text-[#3D3A45]/60 font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {item.visitedAt.split('-')[0]} {/* Yıl */}
                          </span>
                          
                          <span className="flex items-center gap-0.5 text-amber-400 font-extrabold">
                            <Heart size={9} fill="currentColor" className="text-[#E5989B]" />
                            {item.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* 🌟 Premium Lüks Lightbox (AnimatePresence & Framer Motion Gestures) */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#3D3A45]/95 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedItem(null)}
          >
            {/* Kapat Butonu */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer z-50"
            >
              <X size={20} />
            </button>

            {/* Lightbox Kartı */}
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()} // Dışarı tıklama kapatmasını önle
              className="w-full max-w-4xl bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row text-[#3D3A45]"
            >
              {/* Sol/Üst: Fotoğraf Alanı */}
              <div className="relative flex-1 bg-black aspect-video md:aspect-auto md:h-[600px] flex items-center justify-center group/img">
                <img
                  src={selectedItem.url}
                  alt={selectedItem.entryTitle}
                  className="max-w-full max-h-full md:h-full w-full object-cover md:object-contain"
                />
              </div>

              {/* Sağ/Alt: Premium Bilgi & Etkileşim Paneli */}
              <div className="w-full md:w-80 shrink-0 p-6 sm:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[#3D3A45]/5 bg-[#FFFDF9]">
                <div className="space-y-5.5 text-left">
                  
                  {/* Kategori Badge & Derece */}
                  <div className="flex items-center justify-between">
                    <span 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-xs"
                      style={{ backgroundColor: (CATEGORIES.find(c => c.id === selectedItem.category) || CATEGORIES[0]).color }}
                    >
                      {React.createElement((CATEGORIES.find(c => c.id === selectedItem.category) || CATEGORIES[0]).icon, { size: 12 })}
                      {(CATEGORIES.find(c => c.id === selectedItem.category) || CATEGORIES[0]).label}
                    </span>

                    {/* Kalp Rating */}
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Heart
                          key={i}
                          size={15}
                          fill={i < selectedItem.rating ? '#E5989B' : 'none'}
                          className={i < selectedItem.rating ? 'text-[#E5989B]' : 'text-[#3D3A45]/20'}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Başlık ve Tarih */}
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-[#3D3A45] leading-tight">
                      {selectedItem.entryTitle}
                    </h2>
                    
                    <div className="flex items-center gap-1.5 text-xs text-[#3D3A45]/60 font-semibold mt-1.5">
                      <Calendar size={13} />
                      <span>{formatDate(selectedItem.visitedAt)}</span>
                    </div>
                  </div>

                  {/* Duygu Etiketi */}
                  {selectedItem.mood && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF5F5] border border-[#FFEBE9] text-[#B56576] rounded-xl text-xs font-extrabold">
                      <Sparkles size={11} fill="currentColor" />
                      <span>{selectedItem.mood}</span>
                    </div>
                  )}

                  {/* Açıklama/Not */}
                  {selectedItem.entryDescription && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3D3A45]/40 pl-0.5">
                        Aşk Notumuz
                      </span>
                      <p className="text-xs leading-relaxed text-[#3D3A45]/75 bg-[#FFFDF9] border border-pink-100/20 rounded-2xl p-3.5 shadow-2xs font-medium max-h-[140px] overflow-y-auto">
                        {selectedItem.entryDescription}
                      </p>
                    </div>
                  )}

                </div>

                {/* UX Etkileşim Butonları */}
                <div className="space-y-2.5 pt-6 mt-6 border-t border-[#3D3A45]/5">
                  {/* Haritada Göster Butonu */}
                  <button
                    onClick={() => handleMapRedirect(selectedItem)}
                    className="w-full py-3.5 px-4 bg-[#E5989B] hover:bg-[#B56576] text-white font-bold text-xs rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Compass size={14} />
                    <span>Haritada Konumu Gör</span>
                  </button>

                  {/* Anı Detayına Git Butonu */}
                  <button
                    onClick={() => handleViewDetail(selectedItem)}
                    className="w-full py-3 px-4 bg-transparent hover:bg-[#3D3A45]/5 text-[#3D3A45] border border-[#3D3A45]/15 font-semibold text-xs rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye size={13} />
                    <span>Anı Detayını İncele</span>
                    <ChevronRight size={12} className="opacity-60" />
                  </button>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
