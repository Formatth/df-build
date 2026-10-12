# DF Build — Mobile Loadout Explorer

Proyek Next.js untuk menampilkan build senjata Delta Force dengan UI mobile-first.

## Run lokal
```bash
npm install
npm run dev
```
Buka http://localhost:3000.

## API
`GET /api/builds?page=1&pageSize=12`

API memanggil katalog build dan konfigurasi weapon dari host tetap `meta.deltaforce.garena.com`, lalu menggabungkan weaponId dengan data senjata. Cache katalog 5 menit, konfigurasi 1 jam. Tidak menggunakan cookie, token, ataupun kredensial akun.

## Deploy Vercel
Import repository ini di Vercel menggunakan preset Next.js. Tidak ada environment variable yang wajib diatur untuk MVP ini.

## Catatan
- Endpoint ditemukan melalui capture jaringan tanggal 12 Oktober 2026; implementasi bergantung pada stabilitas format API sumber.
- Kode ini hanya membaca endpoint katalog. Tidak meneruskan endpoint atau parameter host dari user.
- Pencarian/filter hanya pada item yang dimuat ke browser; tombol muat lainnya mengambil halaman berikutnya.
- Proyek komunitas tidak resmi, tidak berafiliasi dengan Garena. Pastikan penggunaan endpoint dan aset mematuhi ketentuan pemilik layanan.
