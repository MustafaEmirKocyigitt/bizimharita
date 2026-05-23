# Phase 5: Wishlist & Interactive Touches

## 1. Goal
Çiftlerin gelecekte gitmek istedikleri yerleri ortaklaşa planlamaları, dilek listesi oluşturmaları ve buraları gerçekleştirdiklerinde tek tıkla anıya dönüştürmeleri.

## 2. Technical Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Framer Motion (reaksiyon animasyonları için).
- **Backend:** Supabase PostgreSQL, Supabase Realtime (kalp reaksiyonları için).

## 3. Data Model Requirements (Postgres)
- **`wishlist` Tablosu:**
  - `id`: UUID PRIMARY KEY
  - `couple_id`: UUID REFERENCES couples(id) ON DELETE CASCADE
  - `created_by`: UUID REFERENCES profiles(id)
  - `title`: VARCHAR(255) (Mekan veya Aktivite ismi)
  - `category`: VARCHAR(50) (Cafe, Travel, Nature vb.)
  - `latitude`: DOUBLE PRECISION (Opsiyonel)
  - `longitude`: DOUBLE PRECISION (Opsiyonel)
  - `notes`: TEXT (Ziyaret notları, fikirler)
  - `created_at`: TIMESTAMP WITH TIME ZONE

## 4. UI/UX & Design Guidelines (Romantik UI)
- **Bucket List Kartları:** Yumuşak, kesikli pembe çizgili (dashed border) kartlar. Geleceğe dair bir heyecan ve plan hissi verir.
- **Heart Reaction (Realtime Aşk Emojisi):** Wishlist'teki bir mekana partnerlerden biri tıkladığında, diğer partnerin ekranında o karttan yukarı doğru uçan realtime kalpler belirmesi (Supabase Realtime Broadcast yardımıyla).
- **Convert to Memory (Gerçekleştirildi!) Akışı:** İstek listesindeki kartın yanındaki "Gittik! ✨" butonuna tıklandığında, konumu otomatik doldurulmuş Phase 3 anı ekleme formunun açılması.

## 5. MVP Deliverables & Requirements
- **Ortak Wishlist Sayfası:** Çiftin birlikte gitmek istediği yerleri liste halinde ve harita üzerinde şeffaf gri pinlerle görebildiği alan.
- **Dilek Ekleme / Kaldırma Arayüzü:** Hızlı ve basit bir istek ekleme modalı.
- **Ziyaret Edilen Yere Dönüştürme Akışı:** İstek listesi öğesini anıya dönüştürüp `wishlist` tablosundan silerken `place_entries` tablosuna ekleme yapan veritabanı işlemi (Database transaction veya Supabase Client batch insert).
- **Realtime Kalp Uçurma:** Partnerler online ise birbirlerinin isteklerine anında kalp gönderebilmesi.
