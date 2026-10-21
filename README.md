# MakerSCAD Studio (Parametric Multi-Color 3MF Creator)

**MakerSCAD Studio**, [ochafik.com/openscad2](https://ochafik.com/openscad2) projesinin modern bir alternatifi olup **MakerWorld (Bambu Lab)** ekosistemine tam uyumlu, renkli ve çok filamentli (AMS) `.3mf` çıktıları üretmek üzere tasarlanmış web tabanlı parametrik bir 3D modelleme stüdyosudur.

---

## 🌟 Öne Çıkan Özellikler

### 1. 🖨️ MakerWorld & Bambu Studio / OrcaSlicer Renkli 3MF Çıktısı
- **Otomatik Parça Ayrıştırma (Sub-objects / Assembly):** Kodda `color(...)` ile renklendirilmiş her gövde bağımsız, katı bir alt parçaya dönüştürülür ve üst montaj (`<components>`) altına toplanır.
- **Bambu AMS Slot Eşleme:** 4 kanallı AMS filament paleti (Slot 1, 2, 3, 4). Renkler otomatik olarak AMS yuvalarıyla eşleştirilir.
- **Tam Bambu Metadata Desteği:**
  - `Metadata/model_settings.config` (Her parçaya extruder slotu ataması: `<metadata key="extruder" value="1"/>`).
  - `Metadata/project_settings.config` (Bambu Studio için filament renkleri `filament_colour` ve tipleri `filament_type`).
  - `3D/3dmodel.model` içinde hem `<basematerials>` hem de üçgen tabanlı `paint_color="1C"`, `2C` MMU boyama etiketleri.
- **Dilimlemeye Hazır:** İndirilen `.3mf` dosyasını Bambu Studio veya OrcaSlicer'a sürüklediğiniz anda filamentler otomatik tanımlanır ve hiçbir manuel boyama yapmadan doğrudan dilimlenip basılabilir.

### 2. ⚡ WebAssembly & Manifold CSG Çekirdeği
- Tarayıcı içinde doğrudan **WebAssembly (WASM)** üzerinde çalışan resmi OpenSCAD motoru.
- **Manifold CSG Motoru (`--backend=manifold --enable=lazy-union`):** Birleşim ve fark operasyonları 5-25 milisaniyede derlenir.
- Tarayıcı donmadan arka planda Web Worker ile çalışır.

### 3. 🎛️ MakerWorld Parametric Model Maker Özelleştirici
- OpenSCAD parametrelerini otomatik algılar:
  - Kaydırıcılar (Sliders): `// [10:1:100]`
  - Açılır Listeler (Dropdowns): `// [PLA, PETG, ABS]` veya `// [1:Küçük, 2:Büyük]`
  - Metin Kutuları (Text): Metin anahtarlık veya tabelalar için
  - Onay Kutuları (Booleans): `true` / `false`
  - Grup Başlıkları: `/* [Boyutlar] */`, `/* [Metin] */`

### 4. 🎨 İnteraktif 3D Önizleme (Three.js)
- Bambu Lab 256×256 mm dokulu PEI tabla simülasyonu.
- Doğru renkler, stüdyo ışıklandırması ve gölgeler.
- Kamera açı kısayolları (Üst, Ön, Yan, İzometrik) ve model boyut göstergeleri.

### 5. 💻 Gelişmiş Monaco Kod Editörü
- VS Code tabanlı Monaco Editor ile OpenSCAD sözdizimi renklendirmesi ve otomatik tamamlama.
- Split View ile eşzamanlı kod ve özelleştirici görünümü.

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js (v18 veya üzeri önerilir)

### Kurulum ve Çalıştırma
```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

Sunucu başladığında tarayıcınızda `http://localhost:3000` adresine giderek uygulamayı kullanabilirsiniz.

### Üretim Derlemesi (Production Build)
```bash
npm run build
```
Oluşan `dist/` klasörünü herhangi bir statik web sunucusunda (Netlify, Vercel, GitHub Pages, Nginx) sunabilirsiniz.

---

## 📦 Proje Mimarisi

```
├── public/
│   └── wasm/
│       ├── openscad.js          # Emscripten WASM JS bağlayıcı
│       └── openscad.wasm        # Manifold destekli OpenSCAD WASM ikili dosyası
├── src/
│   ├── components/
│   │   ├── TopNavbar.tsx         # Üst menü, şablon seçici ve 3MF export butonu
│   │   ├── CustomizerPanel.tsx   # Otomatik üretilen MakerWorld parametre paneli
│   │   ├── EditorPanel.tsx       # Monaco OpenSCAD kod editörü
│   │   ├── Viewport3D.tsx        # Three.js 3D Bambu tabla ve model render
│   │   └── AmsPaletteManager.tsx # Bambu AMS 4 slotlu filament yönetim barı
│   ├── data/
│   │   └── presets.ts            # Hazır renkli MakerWorld şablonları
│   ├── services/
│   │   ├── openscadWorker.ts     # OpenSCAD WASM Web Worker
│   │   ├── openscadService.ts    # Render & parametre çıkarma yöneticisi
│   │   ├── offParser.ts          # OFF geometri & renk ayrıştırıcı
│   │   └── export3mf.ts          # Bambu/OrcaSlicer renkli 3MF üretim motoru
│   ├── types/
│   │   └── index.ts              # TypeScript arayüz ve tipleri
│   ├── App.tsx                   # Ana uygulama çatısı
│   └── main.tsx                  # Giriş noktası
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🎨 OpenSCAD ile Çok Renkli Kodlama İpuçları

Bambu Studio'nun renkleri doğru tanıması için en iyi pratikler:

1. **Renk Bildirimi:**
   ```openscad
   // RGB değerleri (0.0 ile 1.0 arası) veya hazır isimler:
   color([0.0, 0.68, 0.26]) cube([30, 20, 3]); // Bambu Yeşili taban
   color([1.0, 1.0, 1.0]) translate([15, 10, 3]) linear_extrude(1) text("MAKER");
   ```

2. **Üst Seviye Düğümler:**
   Her farklı renkli parça `color(...)` bloğu içinde ve bağımsız bir üst düğüm olarak tanımlanmalıdır.

3. **Z-Fighting (Yüzey Çakışması) Önleme:**
   Gömme veya kabartma metinlerde, taban ile metnin aynı Z seviyesinde çakışmaması için `difference()` ile yuva açın veya metni tabanın üstüne yerleştirin.
