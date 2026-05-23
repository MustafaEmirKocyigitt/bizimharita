# Phase 3: Add Place Entry & Map View

## 1. Goal
Çiftlerin gittikleri veya keşfettikleri mekanları harita üzerinde estetik pinlerle görebilmesi ve hızlıca yeni yerler ekleyebilmesi.

## 2. Technical Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Mapbox GL JS (veya React Map GL), Tailwind CSS, shadcn/ui.
- **Backend:** Supabase PostgreSQL (RLS aktif), Supabase Storage (anı resimleri için).

## 3. Data Model Requirements (Postgres)
- **`place_entries` Tablosu:**
  - `id`: UUID PRIMARY KEY
  - `couple_id`: UUID REFERENCES couples(id) ON DELETE CASCADE
  - `created_by`: UUID REFERENCES profiles(id)
  - `title`: VARCHAR(255) (Mekan ismi)
  - `description`: TEXT (Anı notu)
  - `category`: VARCHAR(50) (Restaurant, Cafe, Travel, Nature vb.)
  - `latitude`: DOUBLE PRECISION
  - `longitude`: DOUBLE PRECISION
  - `visited_at`: DATE
  - `rating`: NUMERIC (1.0 - 5.0 arası kalp veya yıldız skoru)
  - `mood`: VARCHAR(50) (Romantik, Eğlenceli, Huzurlu vb.)
  - `created_at`: TIMESTAMP WITH TIME ZONE
- **`entry_photos` Tablosu:**
  - `id`: UUID PRIMARY KEY
  - `entry_id`: UUID REFERENCES place_entries(id) ON DELETE CASCADE
  - `storage_path`: TEXT (Supabase Storage path'i)
  - `created_at`: TIMESTAMP WITH TIME ZONE

## 4. UI/UX & Design Guidelines (Romantik UI)
- **Custom Map Styles:** Krem rengi veya pastel pembe/şeftali tonlarında özelleştirilmiş Mapbox Studio harita stili (veya standart haritaların minimalist pastel modları).
- **Romantic Pins:** Her kategorinin kendine ait ikonlu, kalp formunda veya yumuşak yuvarlak hatlı pinleri.
- **Add Entry Drawer (Aşağıdan Açılan Form):** Mobilde ekranın altından yumuşakça kayarak açılan form (`Drawer` component). Konum seçerken Mapbox Search/Geocoding ile anında mekan tamamlama.
- **Rating system:** 5 adet pembe kalp (`Heart` icon) ile puanlama.

## 5. MVP Deliverables & Requirements
- **Mekan Ekleme Arayüzü:** Hızlıca mekan ismi, kategori, tarih, not, kalp puanı, duygu etiketi ve anı fotoğrafları ekleyebileceğimiz form.
- **İnteraktif Harita:** Çiftin tüm ortak anılarını harita üzerinde pinleyen, pinlere tıklanınca alt tarafta şık bir detay kartı (Place Detail Modal/Drawer) açan harita görünümü.
- **Kategori Filtreleme:** Üst tarafta yatay kaydırılabilir, estetik kategori butonları (Cafe, Restoran, Doğa vb.) ile haritayı anlık filtreleme.
- **Row Level Security (RLS):** Yalnızca o çifte ait pinlerin haritada görünmesi.
