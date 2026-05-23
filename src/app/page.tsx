import { createClient } from '@/utils/supabase/server'
import CoupleOnboarding from '@/components/CoupleOnboarding'
import Dashboard from '@/components/Dashboard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  // Giris yapmis kullanicinin auth bilgisini al
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Middleware zaten auth olmayanlari /login'e yonlendiriyor, 
    // ancak build veya beklenmedik durumlar icin koruma ekliyoruz.
    return null
  }

  // Profil tablosundan eslesme durumunu ve display name bilgisini al
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, couple_id, partner_id')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    if (error) {
      console.error("Home page profile fetch error:", error.message)
    }
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-[#FFFDF9] text-[#3D3A45]">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Profil Yüklenemedi</h2>
          <p className="text-sm opacity-70">Lütfen oturumu kapatıp tekrar giriş yapmayı deneyin.</p>
        </div>
      </div>
    )
  }

  // Eslesme durumu: Hem kendi profilinde couple_id ve partner_id olmali, 
  // hem de bu eslesme couples tablosunda active olmalidir.
  const isPaired = profile.couple_id !== null && profile.partner_id !== null

  if (!isPaired) {
    return <CoupleOnboarding initialProfile={profile} />
  }

  return <Dashboard profile={profile} />
}
