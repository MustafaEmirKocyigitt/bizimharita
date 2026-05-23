# Phase 1: Authentication & Onboarding

## 1. Goal
Kullanıcıların sisteme güvenli bir şekilde kaydolması, giriş yapması ve profillerini (isim, avatar vb.) oluşturarak ilişkisel veritabanına kaydedilmesini sağlamak.

## 2. Technical Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide React.
- **Backend:** Supabase Auth, Supabase PostgreSQL, Supabase Storage (profil fotoğrafları için).

## 3. Data Model Requirements (Postgres)
- **`profiles` Tablosu:**
  - `id`: UUID (auth.users.id ile ilişkili, Primary Key)
  - `display_name`: VARCHAR(100) (Boş bırakılamaz)
  - `avatar_url`: TEXT (Opsiyonel)
  - `couple_id`: UUID (Nullable, couples.id ile ilişkili)
  - `partner_id`: UUID (Nullable, profiles.id ile ilişkili)
  - `updated_at`: TIMESTAMP WITH TIME ZONE

## 4. UI/UX & Design Guidelines (Romantik UI)
- **Aşırı Responsive:** Tamamen mobil öncelikli (mobile-first) tasarım. Ekran genişliklerine göre fluid fontlar ve padding'ler.
- **Renk Paleti (Warm & Romantic):** 
  - Arka plan: Krem/Fildişi tonları (`bg-[#FFFDF9]`)
  - Birincil (Primary): Sıcak Gül Kurusu / Tatlı Pembe (`bg-[#E07A5F]` veya `bg-[#F26419]` yerine pastel pembe tonları `bg-[#E5989B]` ve `bg-[#B56576]`)
  - Yazı rengi: Derin Kestane / Espresso (`text-[#3D3A45]`)
- **Micro-interactions:** Input odaklanmalarında yumuşak pembe gölgeler, giriş butonunda basıldığında küçülme (scale-95) animasyonu.

## 5. MVP Deliverables & Requirements
- **Kaydolma ve Giriş Sayfaları:** E-posta/Şifre ile temiz, minimalist ve romantik tasarımlı giriş formu.
- **Profil Kurulum (Onboarding) Adımı:** İlk girişte kullanıcıdan `display_name` ve isteğe bağlı `avatar` resmi yüklemesini talep eden hoş bir karşılama ekranı. Profil resmi Supabase Storage'a yüklenir.
- **Session Persistence:** Oturumun tarayıcıda kalıcı olması, her girişte şifre istememesi.
- **Vercel Readiness:** Hızlı yükleme süreleri, SEO dostu başlıklar ve temiz Next.js App Router yapısı.
