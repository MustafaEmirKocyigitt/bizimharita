'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, Plus, X, Heart, Search, MapPin, Smile, AlertCircle,
  Sparkles, CheckCircle2, Trash2, Map as MapIcon
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  couple_id: string | null
  partner_id: string | null
}

interface WishlistItem {
  id: string
  couple_id: string
  created_by: string
  title: string
  category: string
  latitude: number | null
  longitude: number | null
  notes: string | null
  created_at: string
}

interface FloatingHeart {
  id: string
  x: number
  startY: number
}

interface WishlistComponentProps {
  profile: Profile
  partnerName: string | null
  onConvertToEntry: (item: WishlistItem) => void
}

const CATEGORIES = [
  { id: 'cafe', label: 'Kafe ☕', color: '#E5989B' },
  { id: 'restaurant', label: 'Restoran 🍽️', color: '#B56576' },
  { id: 'nature', label: 'Doğa 🌳', color: '#6B9080' },
  { id: 'travel', label: 'Seyahat ✈️', color: '#8ECAE6' },
  { id: 'hotel', label: 'Otel 🏨', color: '#A24857' },
  { id: 'event', label: 'Etkinlik 🎭', color: '#E07A5F' },
  { id: 'museum', label: 'Müze 🏛️', color: '#9B5DE5' },
  { id: 'special', label: 'Özel Gün ✨', color: '#FFB703' },
]

export default function WishlistComponent({ profile, partnerName, onConvertToEntry }: WishlistComponentProps) {
  const supabase = createClient()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Kayan Kalp Animasyonu State'leri (Realtime)
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])

  // Yeni İstek Ekleme Form State'leri
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('cafe')
  const [newNotes, setNewNotes] = useState('')
  const [newLatitude, setNewLatitude] = useState<number | null>(null)
  const [newLongitude, setNewLongitude] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Wishlist verilerini çek
  const fetchItems = async () => {
    if (!profile.couple_id) return
    try {
      const { data } = await supabase
        .from('wishlist')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: false })
      if (data) setItems(data)
    } catch (err) {
      console.error('Wishlist fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [profile.couple_id])

  // Realtime: Veritabanındaki değişiklikleri takip et
  useEffect(() => {
    if (!profile.couple_id) return

    const dbChannel = supabase
      .channel('wishlist_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wishlist',
        filter: `couple_id=eq.${profile.couple_id}`,
      }, () => {
        fetchItems()
      })
      .subscribe()

    return () => { supabase.removeChannel(dbChannel) }
  }, [profile.couple_id])

  // Realtime: Kalp Broadcast kanalını dinle
  useEffect(() => {
    if (!profile.couple_id) return

    const heartChannel = supabase
      .channel(`wishlist_hearts_${profile.couple_id}`)
      .on('broadcast', { event: 'heart_reaction' }, ({ payload }: any) => {
        // Sadece partner'ın gönderdiği kalpleri göster
        if (payload.sender_id !== profile.id) {
          triggerFloatingHearts(payload.x ?? 200)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(heartChannel) }
  }, [profile.couple_id])

  // Ekrana kayan kalpler
  const triggerFloatingHearts = (x: number) => {
    const count = 5
    const newHearts: FloatingHeart[] = Array.from({ length: count }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      x: x + (Math.random() - 0.5) * 80,
      startY: window.innerHeight * 0.7,
    }))
    setFloatingHearts(prev => [...prev, ...newHearts])
    setTimeout(() => {
      setFloatingHearts(prev =>
        prev.filter(h => !newHearts.find(n => n.id === h.id))
      )
    }, 2500)
  }

  // Bir karta tıklayınca kalp gönder (Realtime Broadcast)
  const handleHeartReaction = async (e: React.MouseEvent) => {
    if (!profile.couple_id) return
    const x = e.clientX

    // Önce kendin görüyorsun
    triggerFloatingHearts(x)

    // Sonra partner'a broadcast et
    await supabase.channel(`wishlist_hearts_${profile.couple_id}`).send({
      type: 'broadcast',
      event: 'heart_reaction',
      payload: { sender_id: profile.id, x },
    })
  }

  // OSM Nominatim Konum Arama
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setNewTitle(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!val.trim() || val.length < 3) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    setSearching(true)
    setShowDropdown(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`,
          { headers: { 'User-Agent': 'BizimHaritaApp/1.0' } }
        )
        const data = await res.json()
        setSearchResults(data)
      } catch { /* ignore */ } finally {
        setSearching(false)
      }
    }, 800)
  }

  const handleSelectLocation = (loc: any) => {
    const name = loc.display_name.split(',')[0]
    setNewTitle(name)
    setSearchQuery(name)
    setNewLatitude(parseFloat(loc.lat))
    setNewLongitude(parseFloat(loc.lon))
    setShowDropdown(false)
  }

  // Yeni istek ekle
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.couple_id) return
    if (!newTitle.trim()) {
      setFormError('Lütfen bir yer adı girin.')
      return
    }
    setFormLoading(true)
    setFormError(null)

    try {
      const { error } = await supabase.from('wishlist').insert({
        couple_id: profile.couple_id,
        created_by: profile.id,
        title: newTitle,
        category: newCategory,
        latitude: newLatitude,
        longitude: newLongitude,
        notes: newNotes || null,
      })
      if (error) throw error

      // Formu temizle
      setNewTitle('')
      setSearchQuery('')
      setNewCategory('cafe')
      setNewNotes('')
      setNewLatitude(null)
      setNewLongitude(null)
      setShowAddForm(false)
      fetchItems()
    } catch (err: any) {
      setFormError(err.message || 'İstek eklenirken hata oluştu.')
    } finally {
      setFormLoading(false)
    }
  }

  // İsteği sil
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await supabase.from('wishlist').delete().eq('id', id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const catMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col text-[#3D3A45] relative">

      {/* Kayan Kalpler (Realtime Reaksiyon Efekti) */}
      <AnimatePresence>
        {floatingHearts.map(h => (
          <motion.div
            key={h.id}
            initial={{ opacity: 1, y: h.startY, x: h.x, scale: 0.6 }}
            animate={{ opacity: 0, y: h.startY - 320, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            className="fixed z-[999] pointer-events-none text-[#E5989B]"
            style={{ left: 0, top: 0 }}
          >
            <Heart size={32} fill="currentColor" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Başlık + Ekle Butonu */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            Hayaller & Planlar <Star size={18} className="text-[#E5989B]" fill="#E5989B" />
          </h2>
          <p className="text-xs text-[#3D3A45]/60 mt-0.5">Birlikte gitmek istediğiniz yerlerin listesi.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E5989B] hover:bg-[#B56576] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Ekle</span>
        </motion.button>
      </div>

      {/* Yeni İstek Ekleme Formu (Drawer tarzı üstten açılır) */}
      <AnimatePresence>
        {showAddForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="fixed inset-0 bg-[#3D3A45]/30 backdrop-blur-xs z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-[#FFFDF9] rounded-t-3xl border-t border-white/50 shadow-[0_-8px_32px_rgba(61,58,69,0.12)] p-6 z-50 max-h-[85vh] overflow-y-auto flex flex-col"
            >
              <div className="mx-auto w-12 h-1.5 rounded-full bg-gray-300/60 mb-5 shrink-0 cursor-pointer" onClick={() => setShowAddForm(false)} />

              <div className="flex justify-between items-center mb-5 shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Yeni Dilek Ekle <Sparkles size={16} className="text-[#E5989B]" />
                </h3>
                <button onClick={() => setShowAddForm(false)} className="p-2 rounded-full hover:bg-gray-100/80 cursor-pointer text-gray-500">
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddItem} className="space-y-4 flex-1">
                {/* Konum / Yer Adı Arama */}
                <div className="relative space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">
                    Yer Adı veya Konum *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3D3A45]/40">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Hayalinizde bir yer aratın..."
                      className="block w-full pl-11 pr-4 py-3 bg-white border border-white/60 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all"
                    />
                    {searching && (
                      <div className="absolute right-4 top-3.5 w-4 h-4 border-2 border-[#E5989B] border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  <AnimatePresence>
                    {showDropdown && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-lg z-50 p-2 space-y-1"
                      >
                        {searchResults.map((r, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectLocation(r)}
                            className="w-full text-left p-3 hover:bg-[#FFF5F5] rounded-xl text-xs flex items-start gap-2 cursor-pointer transition-colors"
                          >
                            <MapPin size={13} className="text-[#E5989B] mt-0.5 shrink-0" />
                            <div>
                              <span className="font-semibold">{r.display_name.split(',')[0]}</span>
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">{r.display_name}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Kategori */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">Kategori</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewCategory(cat.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 border cursor-pointer transition-all ${
                          newCategory === cat.id ? 'text-white border-transparent' : 'border-white/60 bg-white text-[#3D3A45]/70 hover:bg-gray-50'
                        }`}
                        style={{ backgroundColor: newCategory === cat.id ? cat.color : undefined }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Not */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A45]/60 pl-1">Neden Gitmek İstiyorsunuz?</label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Neden bu yeri hayal ediyorsunuz? Partnerinize kısa bir not bırakın..."
                    rows={3}
                    className="block w-full px-4 py-3 bg-white border border-white/60 rounded-2xl text-sm placeholder-[#3D3A45]/40 focus:outline-none focus:ring-2 focus:ring-[#E5989B]/30 focus:border-[#E5989B] transition-all resize-none"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={formLoading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 bg-[#E5989B] hover:bg-[#B56576] text-white font-semibold rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {formLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Hayallere Ekle</span>
                      <Star size={15} fill="currentColor" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Liste */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Heart size={32} fill="#E5989B" className="text-[#E5989B] animate-pulse" />
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4"
        >
          <div className="w-16 h-16 rounded-3xl bg-[#FFF5F5] border border-[#FFEBE9] text-[#E5989B] flex items-center justify-center">
            <Star size={32} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Hayal Listeniz Boş 🌟</h3>
            <p className="text-xs text-[#3D3A45]/60 mt-1 max-w-xs">
              Birlikte gitmek istediğiniz yerleri buraya ekleyin. Gittiğinizde tek tıkla anıya dönüştürebilirsiniz!
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4 flex-1">
          {items.map((item) => {
            const cat = catMap[item.category] || { label: item.category, color: '#B56576' }
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative p-5 rounded-3xl bg-white/70 backdrop-blur-md border-2 border-dashed border-[#E5989B]/30 hover:border-[#E5989B]/60 transition-all group"
              >
                {/* Üst Satır */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        {cat.label}
                      </span>
                      {item.latitude && item.longitude && (
                        <MapPin size={12} className="text-[#E5989B] shrink-0" />
                      )}
                    </div>
                    <h4 className="font-bold text-sm md:text-base truncate">{item.title}</h4>
                    {item.notes && (
                      <p className="text-xs text-[#3D3A45]/70 mt-1.5 leading-relaxed line-clamp-2">{item.notes}</p>
                    )}
                  </div>

                  {/* Sağ Eylemler */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-50 transition-all cursor-pointer"
                    >
                      {deletingId === item.id
                        ? <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </div>
                </div>

                {/* Alt Eylem Barı */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-[#3D3A45]/5">
                  {/* Kalp Reaksiyon Butonu (Realtime) */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleHeartReaction}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FFF5F5] hover:bg-[#FFEBE9] border border-[#FFEBE9] text-[#B56576] text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    <Heart size={13} fill="currentColor" />
                    <span>Hadi Gidelim!</span>
                  </motion.button>

                  {/* Gittik! — Anıya Çevirme Butonu */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onConvertToEntry(item)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E5989B] hover:bg-[#B56576] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    <span>Gittik! ✨</span>
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
