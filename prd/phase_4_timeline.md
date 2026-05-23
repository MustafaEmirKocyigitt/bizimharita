# Phase 4: Timeline View

## 1. Goal
Çiftlerin anılarını kronolojik bir fotoğraf albümü ve zaman çizgisi akışında inceleyerek geçmişe dair tatlı bir nostalji yaşamaları.

## 2. Technical Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Framer Motion (kart geçişleri için), Tailwind CSS.
- **Backend:** Supabase PostgreSQL, Supabase Storage (resimlerin çekilmesi).

## 3. Data Model Requirements (Postgres)
- Bu faz ek bir veritabanı şeması gerektirmez, doğrudan Phase 3'teki `place_entries` ve `entry_photos` tablolarını sorgular.
- Performans için resimlerin Next.js `<Image>` bileşeni ve Supabase CDN resizing ile optimize edilmesi istenir.

## 4. UI/UX & Design Guidelines (Romantik UI)
- **Zamansal Gruplama:** Anıların ay ve yıl bazında ("Eylül 2025", "Yaz Tatili") zarif çizgiler ve kalp ikonlarıyla bölünmüş kronolojik akışı.
- **Memory Cards (Anı Kartları):** 
  - Yumuşak gölgeli, beyaz/krem arka planlı, `glassmorphism` efektli kartlar.
  - Kartın üzerinde ziyaret tarihi, mekan adı, anıyı ekleyenin ufak avatarı, pembe kalp puanları ve anıya eklenen fotoğrafların şık bir galerisi (grid layout veya carousel).
- **Milestones (Özel Dönüm Noktaları):** İlk buluşma, evlilik yıldönümü gibi özel anların kartlarının etrafında hafif parıltılı (shimmer) pembe/altın sarısı bir çerçeve.

## 5. MVP Deliverables & Requirements
- **Zaman Tüneli Ekranı:** Giriş yapıldığında anıların yukarıdan aşağıya tarih sırasına göre aktığı sayfa.
- **Fotoğraf Galerisi Modalı:** Kartlardaki fotoğraflara tıklandığında açılan, yüksek çözünürlüklü ve pürüzsüz kaydırmalı (Framer Motion destekli) galeri.
- **Tarih ve Kategoriye Göre Arama/Süzme:** Üst kısımda hızlı arama çubuğu ve tarih aralığı seçici.
