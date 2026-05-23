'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Search, MapPin, Plus, X, Heart, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import 'leaflet/dist/leaflet.css'

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

interface MapComponentProps {
  entries: PlaceEntry[]
  onPinClick: (entry: PlaceEntry) => void
  onMapClick?: (lat: number, lng: number) => void
  center: [number, number]
  zoom: number
}

// Kategoriye gore pin rengi dondurur
const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'cafe':
      return '#E5989B' // Pastel Pembe
    case 'restaurant':
      return '#B56576' // Gul Kurusu
    case 'nature':
      return '#6B9080' // Doğa Yesili
    case 'travel':
      return '#8ECAE6' // Gök Mavisi
    case 'hotel':
      return '#A24857' // Derin kiremit
    case 'event':
      return '#E07A5F' // Mercan/Turuncu
    case 'museum':
      return '#9B5DE5' // Asil Mor
    case 'special':
      return '#FFB703' // Altin Sarisi (Yildonumleri)
    default:
      return '#B56576'
  }
}

// Leaflet icin ozel romantik kalp pin ikonu olusturur
const createHeartIcon = (category: string) => {
  const color = getCategoryColor(category)
  
  return L.divIcon({
    className: 'custom-heart-marker',
    html: `
      <div class="heart-pin-wrapper" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; position: relative;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
        <div style="position: absolute; width: 6px; height: 6px; background-color: white; border-radius: 50%; top: 11px; left: 13px;"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
}

// Arama ile secilen gecici pin ikonu (Sari/Altin renginde parildayan kalp)
const createSearchPinIcon = () => {
  return L.divIcon({
    className: 'custom-heart-marker-search',
    html: `
      <div class="heart-pin-wrapper-search animate-bounce" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; position: relative; filter: drop-shadow(0 4px 6px rgba(255, 183, 3, 0.4));">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#FFB703" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
        <div style="position: absolute; width: 8px; height: 8px; background-color: white; border-radius: 50%; top: 12px; left: 14px;"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  })
}

// Harita kontrolculeri (setView islemleri icin)
function MapControllers({ 
  center, 
  zoom, 
  onMapClick, 
  searchCoords 
}: { 
  center: [number, number]
  zoom: number
  onMapClick?: (lat: number, lng: number) => void
  searchCoords: [number, number] | null
}) {
  const map = useMap()

  // Merkez ve zoom degisimlerinde haritayi yumusakca kaydir
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1.2 })
  }, [center, zoom, map])

  // Arama koordinatlari degistiginde oraya odaklan
  useEffect(() => {
    if (searchCoords) {
      map.setView(searchCoords, 16, { animate: true, duration: 1.5 })
    }
  }, [searchCoords, map])

  // Tıklama olaylarını dinle
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })

  return null
}

export default function MapComponent({ entries, onPinClick, onMapClick, center, zoom }: MapComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Arama ile secilen gecici konum
  const [searchCoords, setSearchCoords] = useState<[number, number] | null>(null)
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>('')

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)

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

  const handleSelectSearchLocation = (loc: any) => {
    const shortName = loc.display_name.split(',')[0]
    const lat = parseFloat(loc.lat)
    const lon = parseFloat(loc.lon)

    setSelectedPlaceName(shortName)
    setSearchCoords([lat, lon])
    setSearchQuery(shortName)
    setShowDropdown(false)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setSearchCoords(null)
    setSelectedPlaceName('')
    setShowDropdown(false)
  }

  const handleAddEntryFromSearch = () => {
    if (searchCoords && onMapClick) {
      onMapClick(searchCoords[0], searchCoords[1])
    }
  }

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden border border-white/40 shadow-[0_8px_24px_rgba(61,58,69,0.04)]">
      
      {/* 🔍 Yüzen Gelişmiş Adres Arama Kutusu (Floating Searchbox - UI/UX Pro Max) */}
      <div className="absolute top-36 left-4 right-4 sm:left-4 sm:right-auto sm:w-88 z-20">
        <div className="relative group">
          <div className="backdrop-blur-md bg-white/90 border border-white/80 shadow-[0_8px_30px_rgba(61,58,69,0.06)] rounded-full p-1 flex items-center gap-2.5 transition-all duration-300 focus-within:ring-2 focus-within:ring-[#E5989B]/40 focus-within:border-transparent focus-within:shadow-[0_0_18px_rgba(229,152,155,0.25)]">
            <div className="pl-3.5 text-[#E5989B] shrink-0">
              <Search size={15} className="animate-pulse" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Gitmek istediğiniz adresi yazın..."
              className="w-full bg-transparent border-none text-[11px] font-semibold text-[#3D3A45] focus:outline-none placeholder-[#3D3A45]/40 pr-9 py-2.5"
            />
            {searching ? (
              <div className="absolute right-11 w-4.5 h-4.5 border-2 border-[#E5989B] border-t-transparent rounded-full animate-spin shrink-0" />
            ) : null}

            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3.5 p-1 rounded-full hover:bg-red-50 text-[#B56576] hover:text-red-500 cursor-pointer transition-all active:scale-90"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Autocomplete Sonuç Dropdown'ı (Glassmorphic & Premium List) */}
          <AnimatePresence>
            {showDropdown && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute left-0 right-0 mt-2 max-h-56 overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_12px_40px_rgba(61,58,69,0.12)] z-50 p-2.5 space-y-1.5 scrollbar-none"
              >
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchLocation(result)}
                    className="w-full text-left p-3 hover:bg-[#FFF5F5] rounded-2xl text-[11px] flex items-start gap-2.5 transition-all duration-200 cursor-pointer hover:translate-x-0.5 active:scale-[0.99]"
                  >
                    <div className="mt-0.5 p-1 bg-[#FFF5F5] text-[#E5989B] rounded-lg shrink-0">
                      <MapPin size={13} />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-[#3D3A45] text-xs block">
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
        </div>
      </div>

      {/* 🗺️ Harita Konteyneri */}
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Tüm anıların pinlerini haritada göster */}
        {entries.map((entry) => (
          <Marker
            key={entry.id}
            position={[entry.latitude, entry.longitude]}
            icon={createHeartIcon(entry.category)}
            eventHandlers={{
              click: () => onPinClick(entry),
            }}
          />
        ))}

        {/* 🌟 Arama ile seçilen geçici pini haritada göster */}
        {searchCoords && (
          <Marker
            position={searchCoords}
            icon={createSearchPinIcon()}
          >
            <Popup closeButton={false} className="custom-popup">
              <div className="p-2 text-center space-y-2">
                <span className="font-bold text-xs text-[#3D3A45] flex items-center justify-center gap-1">
                  <Sparkles size={12} className="text-[#FFB703]" />
                  {selectedPlaceName}
                </span>
                <p className="text-[10px] text-gray-500 leading-tight">
                  Burası anınızın geçtiği yer mi? ❤️
                </p>
                <button
                  onClick={handleAddEntryFromSearch}
                  className="w-full py-1.5 px-3 bg-[#E5989B] hover:bg-[#B56576] text-white font-semibold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus size={10} />
                  <span>Anı Olarak Ekle</span>
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Harita Kontrolcüleri ve Dinleyicileri */}
        <MapControllers 
          center={center} 
          zoom={zoom} 
          onMapClick={onMapClick} 
          searchCoords={searchCoords} 
        />
      </MapContainer>
    </div>
  )
}
