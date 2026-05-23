# Phase 2: Couple Space & Realtime Pairing

## 1. Goal
İki kullanıcının birbirini davet kodu yardımıyla bulup ortak bir alan (`Couple Space`) oluşturması ve uygulamada anlık etkileşime girmesi.

## 2. Technical Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Framer Motion, canvas-confetti (eşleşme anı için).
- **Backend:** Supabase Realtime (Presence & Broadcast), Supabase PostgreSQL.

## 3. Data Model Requirements (Postgres)
- **`couples` Tablosu:**
  - `id`: UUID (Primary Key, default gen_random_uuid())
  - `invite_code`: VARCHAR(10) (Unique, random üretilen 6-8 haneli kod)
  - `status`: VARCHAR(20) (Default 'pending', values: 'pending', 'active')
  - `created_at`: TIMESTAMP WITH TIME ZONE

## 4. UI/UX & Design Guidelines (Romantik UI)
- **Invite Screen:** 
  - Davet kodu üreten kişi için büyük, kopyalanabilir ve WhatsApp ile doğrudan paylaşılabilir şık bir kod kartı.
  - Davet kodunu alacak kişi için 6 haneli kod giriş kutuları (Input OTP tasarımı).
- **Eşleşme Animasyonu (Love Tunnel/Match):**
  - İki kullanıcı eşleştiği an ekranda beliren, partnerlerin avatarlarının bir araya gelip kalp içinde birleştiği Framer Motion animasyonu ve konfeti patlaması (`canvas-confetti`).
- **Partner Varlığı (Realtime Presence):**
  - Üst barda partnerin avatarının etrafında o an aktifse dönen tatlı, pembe bir neon ışığı / parıltı efekti.

## 5. MVP Deliverables & Requirements
- **Dashboard Davet Adımı:** Henüz bir partnerle eşleşmemiş kullanıcılara özel "Davet Kodu Üret" ve "Kodu Gir" kartları.
- **Eşleşme Doğrulama Fonksiyonu:** Girilen kodun doğrulanıp veritabanında `couples` kaydının `active` yapılması ve her iki kullanıcının `profile.couple_id` ve `profile.partner_id` alanlarının güncellenmesi.
- **Realtime Sync Kurulumu:** Eşleşen kullanıcıların anında ortak Dashboard'a yönlendirilmesi (sayfa yenilemeden realtime yönlendirme).
