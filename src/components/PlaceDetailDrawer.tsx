'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Calendar, Smile, X, MapPin, Sparkles, ChevronLeft, ChevronRight, User, Trash2, AlertTriangle } from 'lucide-react'
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

interface PlaceDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  onDeleteSuccess?: () => void
  entry: PlaceEntry | null
  myId: string
  partnerName: string | null
}

const CATEGORIES: { [key: string]: { label: string; color: string } } = {
  cafe: { label: 'Kafe ☕', color: '#E5989B' },
  restaurant: { label: 'Restoran 🍽️', color: '#B56576' },
  nature: { label: 'Doğa 🌳', color: '#6B9080' },
  travel: { label: 'Seyahat ✈️', color: '#8ECAE6' },
  hotel: { label: 'Otel 🏨', color: '#A24857' },
  event: { label: 'Etkinlik 🎭', color: '#E07A5F' },
  museum: { label: 'Müze 🏛️', color: '#9B5DE5' },
  special: { label: 'Özel Gün ✨', color: '#FFB703' },
}

const MOODS: { [key: string]: string } = {
  romantic: 'Romantik 💖',
  cozy: 'Huzurlu 🧘',
  fun: 'Eğlenceli 🎉',
  adventure: 'Macera 🧗',
  happy: 'Keyifli 😄',
}

export default function PlaceDetailDrawer({ 
  isOpen, 
  onClose, 
  onDeleteSuccess, 
  entry, 
  myId, 
  partnerName 
}: PlaceDetailDrawerProps) {
  const supabase = createClient()

  const [photos, setPhotos] = useState<string[]>([])
  const [photoPaths, setPhotoPaths] = useState<string[]>([])
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [creatorName, setCreatorName] = useState<string | null>(null)
  
  // Silme Onay State'leri
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Pine ait fotograflari ve ekleyen kisinin ismini cek
  useEffect(() => {
    if (!entry) return

    const fetchDetailData = async () => {
      setLoading(true)
      setActivePhotoIdx(0)
      setShowConfirm(false)
      
      try {
        // 1. Fotograflari sorgula
        const { data: photoData } = await supabase
          .from('entry_photos')
          .select('storage_path')
          .eq('entry_id', entry.id)

        if (photoData) {
          setPhotoPaths(photoData.map((p) => p.storage_path))
          const urls = photoData.map((p) => 
            supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl
          )
          setPhotos(urls)
        } else {
          setPhotos([])
          setPhotoPaths([])
        }

        // 2. Ekleyen kisinin ismini profiles tablosundan al
        if (entry.created_by === myId) {
          setCreatorName('Sen')
        } else {
          const { data: userData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', entry.created_by)
            .single()
          setCreatorName(userData?.display_name || partnerName || 'Sevgilin')
        }
      } catch (err) {
        console.error('Error fetching entry details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetailData()
  }, [entry])

  if (!entry) return null

  const categoryInfo = CATEGORIES[entry.category.toLowerCase()] || { label: entry.category, color: '#B56576' }
  const moodLabel = entry.mood ? MOODS[entry.mood.toLowerCase()] || entry.mood : null

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActivePhotoIdx((prev) => (prev + 1) % photos.length)
  }

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActivePhotoIdx((prev) => (prev - 1 + photos.length) % photos.length)
  }

  // Anıyı Kalıcı Olarak Sil
  const handleDeleteEntry = async () => {
    setDeleting(true)

    try {
      // 1. Storage'daki görselleri temizle
      if (photoPaths.length > 0) {
        await supabase.storage.from('photos').remove(photoPaths)
      }

      // 2. Veritabanından place_entry kaydını sil (Cascade kuralı gereği entry_photos'lar da otomatik silinir)
      const { error } = await supabase
        .from('place_entries')
        .delete()
        .eq('id', entry.id)

      if (error) throw error

      // Başarılı!
      setShowConfirm(false)
      onClose()
      if (onDeleteSuccess) {
        onDeleteSuccess()
      }
    } catch (err) {
      console.error('Anı silinirken hata oluştu:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Karartilmis Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#3D3A45]/30 backdrop-blur-xs z-50"
          />

          {/* Detail Drawer Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-[#FFFDF9] rounded-t-3xl border-t border-white/50 shadow-[0_-8px_32px_rgba(61,58,69,0.12)] p-6 z-50 max-h-[88vh] overflow-y-auto flex flex-col text-[#3D3A45]"
          >
            {/* Ust Çizgi */}
            <div className="mx-auto w-12 h-1.5 rounded-full bg-gray-300/60 mb-5 shrink-0 cursor-pointer" onClick={onClose} />

            <AnimatePresence mode="wait">
              {!showConfirm ? (
                /* 🔍 ANILARIN DETAY GÖRÜNÜMÜ */
                <motion.div
                  key="detail-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start shrink-0">
                    <div>
                      <span
                        className="px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: categoryInfo.color }}
                      >
                        {categoryInfo.label}
                      </span>
                      <h2 className="text-2xl font-bold mt-2 tracking-tight">
                        {entry.title}
                      </h2>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full hover:bg-gray-100/80 transition-colors cursor-pointer text-gray-500"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Ust Detay Bar (Tarih, Ekleyen, Mood) */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 border-y border-[#3D3A45]/5 text-xs text-[#3D3A45]/70 shrink-0">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-[#E5989B]" />
                      {new Date(entry.visited_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <User size={14} className="text-[#E5989B]" />
                      <span>{creatorName} ekledi</span>
                    </span>

                    {moodLabel && (
                      <span className="flex items-center gap-1.5">
                        <Smile size={14} className="text-[#E5989B]" />
                        <span>{moodLabel}</span>
                      </span>
                    )}
                  </div>

                  {/* Fotograflar Carouseli */}
                  {photos.length > 0 && (
                    <div className="relative w-full aspect-video rounded-2xl bg-gray-100 border border-white/50 shadow-xs overflow-hidden shrink-0 group">
                      <img
                        src={photos[activePhotoIdx]}
                        alt={`${entry.title} Anısı`}
                        className="w-full h-full object-cover transition-all duration-300"
                      />

                      {/* Yon Navigasyon Butonlari (Sadece birden fazla resim varsa) */}
                      {photos.length > 1 && (
                        <>
                          <button
                            onClick={handlePrevPhoto}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/70 hover:bg-white text-[#3D3A45] shadow-sm cursor-pointer transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={handleNextPhoto}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/70 hover:bg-white text-[#3D3A45] shadow-sm cursor-pointer transition-colors"
                          >
                            <ChevronRight size={16} />
                          </button>

                          {/* Nokta Göstergeleri */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {photos.map((_, idx) => (
                              <span
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  idx === activePhotoIdx ? 'bg-white w-4' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Aşk Puanı Kalpler */}
                  <div className="flex gap-1 items-center shrink-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pr-2">
                      Aşk Puanı:
                    </span>
                    {[...Array(5)].map((_, idx) => (
                      <Heart
                        key={idx}
                        size={20}
                        fill={idx < entry.rating ? '#E5989B' : 'transparent'}
                        className="text-[#E5989B]"
                      />
                    ))}
                  </div>

                  {/* Anı Açıklama Notu */}
                  {entry.description && (
                    <div className="p-4 rounded-2xl bg-white/95 border border-white/50 shadow-xs text-sm leading-relaxed text-[#3D3A45]/95 whitespace-pre-line relative">
                      <div className="absolute -top-2 left-4 px-2 py-0.5 bg-[#FFF5F5] border border-[#FFEBE9] rounded-lg text-[9px] font-bold text-[#B56576] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={8} /> Anı Hikayesi
                      </div>
                      {entry.description}
                    </div>
                  )}

                  {/* 🗑️ Anıyı Silme Butonu */}
                  <div className="pt-2 border-t border-[#3D3A45]/5 shrink-0 flex justify-end">
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-500 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Anıyı Sil</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* ⚠️ ANIYI SİLME ÇİFT ONAY EKRANI (Premium Glassmorphic Kart) */
                <motion.div
                  key="confirm-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-5 text-center space-y-5"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-500">
                    <AlertTriangle size={28} />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">Bu Anıyı Silmek İstiyor musunuz?</h3>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                      Bu işlem geri alınamaz! Anıyla birlikte yüklenmiş tüm fotoğraflar ve notlar kalıcı olarak silinecektir.
                    </p>
                  </div>

                  <div className="flex gap-3 max-w-sm mx-auto pt-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={deleting}
                      className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-[#3D3A45] font-semibold text-xs rounded-2xl transition-colors cursor-pointer"
                    >
                      Vazgeç
                    </button>
                    <button
                      onClick={handleDeleteEntry}
                      disabled={deleting}
                      className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {deleting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 size={13} />
                          <span>Evet, Sil</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
