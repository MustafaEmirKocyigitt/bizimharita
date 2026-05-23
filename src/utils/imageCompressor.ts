/**
 * Kullanicinin yukledigi buyuk boyutlu fotograflari tarayicida canvas yardimiyla
 * sıkıstırarak WebP formatina donusturur. Supabase Storage alanindan ve yukleme suresinden tasarruf saglar.
 */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // En-boy oranini koruyarak maksimum genisligi/yuksekligi sınırla
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height)
            height = maxWidth
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context could not be created'))
          return
        }
        
        // Resmi canvas uzerine çiz
        ctx.drawImage(img, 0, 0, width, height)
        
        // WebP formatinda ve belirlenen kalitede sıkıstırarak blob olarak dondur
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Canvas image serialization failed'))
            }
          },
          'image/webp',
          quality
        )
      }
      
      img.onerror = (err) => {
        reject(err)
      }
    }
    
    reader.onerror = (err) => {
      reject(err)
    }
  })
}
