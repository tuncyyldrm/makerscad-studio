export interface Preset {
  id: string;
  name: string;
  category: string;
  description: string;
  colorsCount: number;
  code: string;
  suggestedAmsSlots: { id: number; name: string; colorHex: string; materialType: string }[];
}

export const PRESETS: Preset[] = [
  {
    id: 'bubble-letters',
    name: '3D Balon Harf Duvar Yazısı (Bubble Letters Wall Art)',
    category: 'Home & Wall Decor',
    description: 'MakerWorld & Anycubic ACE Pro / AMS uyumlu, düz sırtlı (çift taraflı bant / çivi askılı) puf balon duvar harfleri ve isimliği.',
    colorsCount: 6,
    suggestedAmsSlots: [
      { id: 1, name: 'Turkuaz (1. Harf)', colorHex: '#00D2D3', materialType: 'PLA' },
      { id: 2, name: 'Mercan Turuncu (2. Harf)', colorHex: '#FF5C00', materialType: 'PLA' },
      { id: 3, name: 'Fıstık Yeşili (3. Harf)', colorHex: '#78E08F', materialType: 'PLA' },
      { id: 4, name: 'Güneş Sarısı (4. Harf)', colorHex: '#F6B93B', materialType: 'PLA' },
    ],
    code: `// =======================================================
// MAKERWORLD / ANYCUBIC BUBBLE LETTERS WALL ART
// 3D Şişkin Balon Duvar Yazısı (Duvar Süsü / İsimlik)
// =======================================================

/* [Metin & Yazı Ayarları] */
// Duvara yazılacak isim veya metin
metin           = "BUBBLE";
// Harf yüksekliği (mm)
harf_boyutu     = 35.0; // [30:5:150]
// Harfler arası mesafe oranı (0.80-0.95 bitişik, 1.10+ ayrı harfler)
harf_araligi    = 1.55; // [0.80:0.05:1.60]
// Yazı tipi
font_secimi     = "Arial:style=Bold"; // [Arial:style=Bold: "Arial Bold (Klasik Yuvarlak)", Impact: "Impact (Ekstra Dolgun)", Tahoma:style=Bold: "Tahoma Bold"]

/* [Performans & Önizleme Hızı] */
// Hızlı önizleme tasarım anında akıcı çalışır; baskı öncesi yüksek kaliteye alabilirsiniz
hiz_modu        = "hizli"; // [hizli: "Hızlı Önizleme (Ultra Akıcı ~120ms)", yuksek: "Yüksek Kalite (Baskı Öncesi Son Kontrol)"]

/* [Şişkinlik & Balon Efekti (3D Puf)] */
// Toplam plaka/harf et kalınlığı (Z mm)
toplam_kalinlik = 10.0; // [8:2:35]
// Balon kubbe kavis yarıçapı (mm)
balon_kavisi    = 4.0;  // [3:1:15]
// Harf tombulluk / ekstra et payı (mm)
tombulluk       = 3.5;  // [0.5:0.5:6.0]

/* [Yerleşim & Baskı Modu] */
// Harflerin diziliş düzeni
yerlesim_tipi   = "ayri"; // [ayri: "Ayrı Harfler (Duvar Düzeni)", bitisik: "Bitişik Kelime (Tek Parça Tabela)", tabla_2x: "2 Sıralı Izgara (Baskı Tablası)"]
// Tek bir harfi seçip basmak için (0: Tümü)
harf_secici     = 0; // [0: "Tüm Kelime", 1: "1. Harf", 2: "2. Harf", 3: "3. Harf", 4: "4. Harf", 5: "5. Harf", 6: "6. Harf", 7: "7. Harf", 8: "8. Harf"]

/* [Montaj & Duvar Askı Yuvası] */
// Duvara sabitleme tipi
montaj_tipi     = "duz"; // [duz: "Düz Taban (Çift Taraflı / Nano Bant)", civi: "Çivi / Vida Askı Yuvası (Gömme Keyhole)", miknatis: "Mıknatıs Yuvalı (Buzdolabı / Metal)"]
// Çivi başı veya mıknatıs çapı (mm)
delik_capi      = 6.5;   // [4.0:0.5:12.0]

/* [Renkler (Anycubic ACE Pro / Bambu AMS 4-Renk & Çok Renkli)] */
renk_1          = "#00D2D3"; // [Color] Turkuaz (1. Harf)
renk_2          = "#FF5C00"; // [Color] Mercan Turuncu (2. Harf)
renk_3          = "#78E08F"; // [Color] Fıstık Yeşili (3. Harf)
renk_4          = "#38ADA9"; // [Color] Okyanus Mavisi (4. Harf)
renk_5          = "#F6B93B"; // [Color] Güneş Sarısı (5. Harf)
renk_6          = "#E55039"; // [Color] Canlı Kırmızı (6. Harf)

/* [Hidden] */
katman_sayisi   = (hiz_modu == "hizli") ? 8 : 16;
$fn             = (hiz_modu == "hizli") ? 14 : 22;

palette = [renk_1, renk_2, renk_3, renk_4, renk_5, renk_6];

// Tek seferlik optimize 2D ofset (Çift ofset yerine tek ofset ile 2.5x hız)
module harf_konturu_2d(char, r_ekstra = 0) {
    eff_r = max(0.1, tombulluk + r_ekstra);
    offset(r = eff_r)
        text(char, size = harf_boyutu, font = font_secimi, halign = "center", valign = "center");
}

// 3D Balon Harf (Puf Kubbeli + Düz Sırtlı)
module tek_balon_harf(char) {
    h_base = max(1.0, toplam_kalinlik - balon_kavisi);
    R = balon_kavisi;
    dz = R / katman_sayisi;
    
    difference() {
        union() {
            // Taban gövdesi
            linear_extrude(height = h_base)
                harf_konturu_2d(char, 0);
                
            // Puf kubbe katmanları (Küre kavis profili)
            for (i = [0 : katman_sayisi - 1]) {
                z = (i + 1) * dz;
                dr = R - sqrt(max(0, R*R - z*z));
                translate([0, 0, h_base + i * dz])
                    linear_extrude(height = dz + 0.05)
                        harf_konturu_2d(char, -dr);
            }
        }
        
        // Montaj Yuvaları (Sırt yüzeyinde)
        if (montaj_tipi == "civi") {
            translate([0, harf_boyutu * 0.15, 0]) {
                translate([0, -4, -0.5])
                    cylinder(d = delik_capi, h = 4.5);
                translate([-delik_capi*0.3, -4, -0.5])
                    cube([delik_capi*0.6, 9, 4.5]);
                translate([0, 2, 2.0])
                    cylinder(d = delik_capi, h = 4.0);
            }
        } else if (montaj_tipi == "miknatis") {
            translate([0, 0, -0.5])
                cylinder(d = delik_capi, h = 3.2);
        }
    }
}

// 2D Bitişik Yazı Konturu
module bitisik_kontur_2d(r_ekstra = 0) {
    eff_r = max(0.1, tombulluk + r_ekstra);
    offset(r = eff_r)
        text(metin, size = harf_boyutu, font = font_secimi, halign = "center", valign = "center", spacing = harf_araligi);
}

// 3D Bitişik Tabela Modülü
module bitisik_kelime() {
    h_base = max(1.0, toplam_kalinlik - balon_kavisi);
    R = balon_kavisi;
    dz = R / katman_sayisi;
    
    difference() {
        union() {
            linear_extrude(height = h_base)
                bitisik_kontur_2d(0);
                
            for (i = [0 : katman_sayisi - 1]) {
                z = (i + 1) * dz;
                dr = R - sqrt(max(0, R*R - z*z));
                translate([0, 0, h_base + i * dz])
                    linear_extrude(height = dz + 0.05)
                        bitisik_kontur_2d(-dr);
            }
        }
        
        if (montaj_tipi == "civi") {
            genislik_tahmini = len(metin) * harf_boyutu * 0.7 * harf_araligi;
            for (offset_x = [-genislik_tahmini * 0.3, genislik_tahmini * 0.3]) {
                translate([offset_x, harf_boyutu * 0.15, 0]) {
                    translate([0, -4, -0.5])
                        cylinder(d = delik_capi, h = 4.5);
                    translate([-delik_capi*0.3, -4, -0.5])
                        cube([delik_capi*0.6, 9, 4.5]);
                    translate([0, 2, 2.0])
                        cylinder(d = delik_capi, h = 4.0);
                }
            }
        }
    }
}

// =======================================================
// SAHNE OLUŞTURMA & YERLEŞİM
// =======================================================
n = len(metin);
dx_step = harf_boyutu * 0.72 * harf_araligi;

if (harf_secici > 0 && harf_secici <= n) {
    // Tek Harf Seçici Modu
    idx = harf_secici - 1;
    color(palette[idx % len(palette)])
        tek_balon_harf(metin[idx]);
} else if (yerlesim_tipi == "bitisik") {
    // Bitişik Tek Parça Tabela
    color(renk_1)
        bitisik_kelime();
} else if (yerlesim_tipi == "tabla_2x") {
    // 2 Sıralı Kompakt Tabla Düzeni
    half = ceil(n / 2);
    for (i = [0 : n - 1]) {
        row = (i < half) ? 0 : 1;
        col = (i < half) ? i : (i - half);
        x_shift = (col - (row == 0 ? half - 1 : (n - half - 1)) / 2) * dx_step;
        y_shift = (row == 0) ? (harf_boyutu * 0.6) : (-harf_boyutu * 0.6);
        color(palette[i % len(palette)])
            translate([x_shift, y_shift, 0])
                tek_balon_harf(metin[i]);
    }
} else {
    // Ayrı Harfler (Duvar Dizilişi)
    toplam_genislik = (n - 1) * dx_step;
    for (i = [0 : n - 1]) {
        x_pos = -toplam_genislik / 2 + i * dx_step;
        color(palette[i % len(palette)])
            translate([x_pos, 0, 0])
                tek_balon_harf(metin[i]);
    }
}
`,
  },
  {
    id: 'parmak-led-tabela',
    name: 'Parmak LED Aydınlatmalı Modüler Harfler (Hızlı Baskı & Çift Katman Difüzör)',
    category: 'LED & Lightbox Decor',
    description: 'Harfleri tek tek basıp bağımsız monte edebileceğiniz, sabit ince et kalınlığı (2.2mm) ve desteksiz geometrisiyle baskı süresini 26 saatten 2.5 saate indiren, standart beyaz parmak LED ile her harfe farklı renk ışıma sağlayan çift katman difüzörlü modüler lightbox.',
    colorsCount: 5,
    suggestedAmsSlots: [
      { id: 1, name: 'Dış Kasa (Siyah / Koyu Gövde)', colorHex: '#1E1E1E', materialType: 'PLA' },
      { id: 2, name: 'Ön Difüzör Dış Yüzey (Standart Beyaz)', colorHex: '#FFFFFF', materialType: 'PLA' },
      { id: 3, name: '1. Harf Filtresi (Sarı)', colorHex: '#FFC000', materialType: 'PLA' },
      { id: 4, name: '2. Harf Filtresi (Kırmızı)', colorHex: '#A90432', materialType: 'PLA' },
    ],
    code: `// =======================================================
// MODÜLER PARMAK LED AYDINLATMALI AYRI HARF SİSTEMİ
// (Ultra Hızlı Baskı & Çift Katmanlı Difüzör Teknolojisi)
// =======================================================

/* [Metin & Harf Ayarları] */
// Duvara / Masaya yazılacak isim veya metin
metin           = "GS";
// Harf yüksekliği (mm) - Dilimleyicide büyütmek yerine buradan doğrudan 1:1 boyutu girin
harf_boyutu     = 190.0; // [30:5:220]
// Harfler arası yan yana boşluk mesafesi (mm)
harfler_arasi_bosluk = 5.0; // [5:2:80]
// Yazı tipi
font_secimi     = "Arial:style=Bold"; // [Arial:style=Bold: "Arial Bold (Net & Kalın)", Impact: "Impact (Modern Dolgun)", Tahoma:style=Bold: "Tahoma Bold"]

/* [Baskı Parça Seçici & Görünüm] */
// Hangi harf basılacak? (0: Tüm kelime, 1: 1. Harf, 2: 2. Harf...)
harf_secici     = 0; // [0: "Tüm Kelime (Yan Yana)", 1: "1. Harf", 2: "2. Harf", 3: "3. Harf", 4: "4. Harf", 5: "5. Harf", 6: "6. Harf"]
// Hangi parça basılacak veya gösterilecektir?
parca_secici    = "montajli"; // [montajli: "Montajlı (Işık Kapalı / Dıştan Saf Beyaz)", isik_yaniyor: "Işık Açık Görünümü (İç Filtre Renk Parıltısı)", kasa: "Sadece Kasa (Gövde)", kapak: "Sadece Kapak (Tablada Ters: 0.8mm Beyaz + Renk Filtre)", kapak_dis: "Sadece Kapak Dış Beyaz Katman (Ayrı STL)", kapak_filtre: "Sadece Kapak İç Renk Filtresi (Ayrı STL)", kopru: "Kablo Gizleme Köprüleri (3 Dk Baskı / 1.5gr)", patlatilmis: "Patlatılmış Görünüm (Kasa + İç Filtre + Dış Kapak)"]

/* [Hızlı Baskı & Kasa Ölçüleri] */
// Kasa toplam derinliği (Z mm) - 24 mm kutu harf için idealdir, Z basım süresini kısaltır
kasa_derinligi  = 24.0; // [16:1:40]
// Harf dış kenar payı (mm) - Harf silüetini birebir sarar, kare takoz formunu engeller!
cerceve_payi    = 2.0;  // [1.5:0.5:6.0]
// Sabit yan et kalınlığı (mm) - Tam 4 perimetre duvar, sıfır iç katı dolgu!
duvar_kalinligi = 1.6;  // [1.6:0.2:3.0]
// Taban (arka sırt) et kalınlığı (mm)
taban_kalinligi = 1.2;  // [1.2:0.2:2.6]

/* [Çift Katmanlı Difüzör & Renk Filtresi (Sihirli Işık)] */
// Işık kapalıyken dışarıdan görünen standart tek renk (Örn: Saf Beyaz)
dis_yuzey_rengi     = "#FFFFFF"; // [Color] Dış Yüzey Rengi
// Dış beyaz difüzör katman et payı (mm) - 4 katman @ 0.2mm
dis_yuzey_kalinligi = 0.8;  // [0.4:0.2:1.2]
// İç renk filtresi kalınlığı (mm) - Beyaz LED'i renklendiren iç katman
filtre_kalinligi    = 1.2;  // [0.6:0.2:2.0]
// Kapak oturma geçme toleransı (Sök-tak için 0.20 - 0.30 mm)
gecme_payi          = 0.25; // [0.15:0.05:0.40]
// Tırnak çentiği (Kasa kenarında sökme tırnağı)
tirnak_centigi      = false; // [true: "Çentikli (Sökme Yuvalı)", false: "Pürüzsüz Düz (Kusursuz Ön Yüzey)"]

/* [Harf İç Filtre Renkleri (Beyaz Işığı Renklendiren İç Katman)] */
filtre_1 = "#FFC000"; // [Color] 1. Harf Filtresi (Sarı)
filtre_2 = "#A90432"; // [Color] 2. Harf Filtresi (Kırmızı)
filtre_3 = "#FF7597"; // [Color] 3. Harf Filtresi (Neon Pembe)
filtre_4 = "#78E08F"; // [Color] 4. Harf Filtresi (Fıstık Yeşili)
filtre_5 = "#F6B93B"; // [Color] 5. Harf Filtresi (Güneş Sarısı)
filtre_6 = "#E55039"; // [Color] 6. Harf Filtresi (Kırmızı)

/* [Montaj & LED Yuvaları] */
// Harflerin montaj şekli
montaj_tarzi    = "bagimsiz"; // [bagimsiz: "Bağımsız Ayrı Harfler (Tek Tek Montaj)", kilitli: "Geçmeli Kilitli (Kırlangıç Tırnak)"]
// Arka duvara sabitleme tipi
montaj_yuvasi   = "civi"; // [civi: "Arka Çivi Askı Yuvalı (Keyhole)", duz: "Düz Taban (Çift Taraflı Nano Bant)", miknatis: "Mıknatıs Yuvalı"]
// Parmak LED delik çapı (mm) - Standart WS2811 kurşun/parmak piksel LED için 12.0 mm (0: Deliksiz)
led_delik_capi  = 12.0;   // [0.0:1.0:16.0]
// LED deliği X ekseni manuel kaydırma (mm)
led_x_ofset     = 0.0;    // [-50:1:50]
// LED deliği Y ekseni manuel kaydırma (mm)
led_y_ofset     = 0.0;    // [-50:1:50]
// Harfler arası yan kablo delikleri (Deliksiz duvar en hızlı basılır, havya ile 2 saniyede delinir)
yan_kablo_deligi= false;  // [false: "Deliksiz Düz Duvar (Ultra Hızlı / Sıcak Havya ile Kolay Delme)", true: "Otomatik Yan Delikli"]
// Kasa dış gövde rengi
kasa_rengi      = "#1E1E1E"; // [Color] Kasa Rengi

/* [Hidden] */
$fn = 24;

filtre_paleti = [filtre_1, filtre_2, filtre_3, filtre_4, filtre_5, filtre_6];
toplam_kapak_h = dis_yuzey_kalinligi + filtre_kalinligi;

// 2D Konturlar
module tek_harf_2d(c) {
    text(c, size = harf_boyutu, font = font_secimi, halign = "center", valign = "center");
}

module tek_kasa_dis_2d(c) {
    offset(r = cerceve_payi)
        tek_harf_2d(c);
}

// Sabit et paylı iç havuz (Gereksiz katı dolguyu önler)
module tek_kasa_ic_2d(c) {
    offset(r = max(0.2, cerceve_payi - duvar_kalinligi))
        tek_harf_2d(c);
}

// Kapak oturma basamağı (0.7 mm dış et payı bırakır, sağlam basamak oluşturur)
module tek_kapak_kademe_2d(c) {
    offset(r = cerceve_payi - 0.7)
        tek_harf_2d(c);
}

module kapak_kontur_2d(c) {
    offset(r = cerceve_payi - 0.7 - gecme_payi)
        tek_harf_2d(c);
}

// 45 derece çatılı desteksiz kablo geçiş tüneli
module desteksiz_kablo_tuneli(uzunluk = 30) {
    rotate([0, 90, 0])
    linear_extrude(height = uzunluk, center = true)
        polygon(points = [
            [-2.5, -3],
            [2.5, -3],
            [2.5, 0],
            [0, 3],
            [-2.5, 0]
        ]);
}

// 1.5 Gramlık Hızlı Kablo Gizleme Köprüsü (Harfler arası kabloyu kapatır)
module kablo_gizleme_koprusu(mesafe) {
    w_k = mesafe + 4.0;
    h_k = 7.0;
    d_k = 5.5;
    et = 1.0;
    difference() {
        cube([w_k, d_k, h_k], center = true);
        translate([0, 0, -et])
            cube([w_k + 1, d_k - et * 2, h_k], center = true);
    }
}

// Kırlangıç Erkek Tırnak (Sağ taraf)
module kirlangic_erkek(w_half) {
    translate([w_half, 0, taban_kalinligi])
        linear_extrude(height = kasa_derinligi * 0.5)
            polygon(points = [[0, -4], [4, -6], [4, 6], [0, 4]]);
}

// Kırlangıç Dişi Yuva (Sol taraf)
module kirlangic_disi(w_half) {
    tol = gecme_payi;
    translate([-w_half, 0, taban_kalinligi - 0.5])
        linear_extrude(height = kasa_derinligi * 0.5 + 1.0)
            polygon(points = [[0.1, -4.5 - tol], [-4.5 - tol, -6.5 - tol], [-4.5 - tol, 6.5 + tol], [0.1, 4.5 + tol]]);
}

// 3D Kasa Gövdesi (Düz Dikey Duvarlar - T, Y, P, L dahil tüm harflerde sıfır üçgen hatası)
module tek_kasa(c, index = 0, is_first = true, is_last = true) {
    w_est = harf_boyutu * 0.45 + cerceve_payi;
    
    // Akıllı LED konumlandırma (Ortası boş harflerde LED deliğini gövdeye yerleştirir)
    eff_led_x = (led_x_ofset != 0) ? led_x_ofset : 
                (c == "L" ? -harf_boyutu * 0.15 : 
                (c == "C" || c == "G" ? -harf_boyutu * 0.22 : 0));

    eff_led_y = (led_y_ofset != 0) ? led_y_ofset : 
                (c == "L" ? -harf_boyutu * 0.25 : 
                (c == "O" || c == "U" || c == "V" ? -harf_boyutu * 0.30 : 0));
    
    difference() {
        union() {
            // Düz dikey gövde - Hull olmadan her harfte kusursuz geometri
            linear_extrude(height = kasa_derinligi)
                tek_kasa_dis_2d(c);
                
            if (montaj_tarzi == "kilitli" && !is_last) {
                kirlangic_erkek(w_est);
            }
        }
        
        // İç Işık Odası (Sabit 2.2 mm duvar)
        translate([0, 0, taban_kalinligi])
            linear_extrude(height = kasa_derinligi + 1)
                tek_kasa_ic_2d(c);
                
        // Kapak Oturma Basamağı
        translate([0, 0, kasa_derinligi - toplam_kapak_h])
            linear_extrude(height = toplam_kapak_h + 2)
                tek_kapak_kademe_2d(c);
                
        // Sök-tak tırnak çentiği oyuğu (Sadece kasada)
        if (tirnak_centigi) {
            translate([0, -harf_boyutu * 0.44, kasa_derinligi - toplam_kapak_h * 0.5])
                cube([6, 3, toplam_kapak_h + 1], center = true);
        }
        
        // Kırlangıç dişi yuva
        if (montaj_tarzi == "kilitli" && !is_first) {
            kirlangic_disi(w_est);
        }
        
        // Arka Parmak LED Yuvası (12mm)
        if (led_delik_capi > 0) {
            translate([eff_led_x, eff_led_y, -1])
                cylinder(d = led_delik_capi, h = taban_kalinligi + 2);
        }
        
        // Desteksiz Yan Kablo Kanalları (0% Destek)
        if (yan_kablo_deligi) {
            for (dx = [-w_est * 1.5, w_est * 1.5]) {
                translate([dx, 0, taban_kalinligi + 3.0])
                    desteksiz_kablo_tuneli(w_est * 2);
            }
        }
        
        // Arka Sırt Kablo Kanalı (Duvara sıfır, kablo ezilmeden yapışması için)
        translate([0, 0, -0.2])
            cube([w_est * 3, 5.0, 1.4], center = true);
        
        // Montaj Yuvaları
        if (montaj_yuvasi == "civi") {
            translate([0, harf_boyutu * 0.28, -0.5]) {
                cylinder(d = 6.5, h = 1.5);
                translate([-1.8, -2, 0]) cube([3.6, 5, 1.5]);
            }
        } else if (montaj_yuvasi == "miknatis") {
            translate([0, 0, -0.5])
                cylinder(d = 8.2, h = 2.0);
        }
    }
}

// 1. Dış Yüzey Kapak Katmanı (Işık kapalıyken görünen saf beyaz katman - Pürüzsüz & Deliksiz)
module kapak_dis_yuzey(c) {
    linear_extrude(height = dis_yuzey_kalinligi)
        kapak_kontur_2d(c);
}

// 2. İç Renk Filtresi (LED'e bakan, beyaz ışığı renklendiren iç katman)
module kapak_ic_filtre(c) {
    linear_extrude(height = filtre_kalinligi)
        kapak_kontur_2d(c);
}

// Harf Bileşeni
module harf_bilesen(c, idx = 0, is_first = true, is_last = true) {
    filtre_c = filtre_paleti[idx % len(filtre_paleti)];
    z_kapak_base = kasa_derinligi - toplam_kapak_h;
    
    if (parca_secici == "kasa") {
        color(kasa_rengi) tek_kasa(c, idx, is_first, is_last);
    } else if (parca_secici == "kapak") {
        // Tablada ters baskı (0..0.8mm Beyaz, 0.8..2.0mm Renk Filtresi)
        color(dis_yuzey_rengi) kapak_dis_yuzey(c);
        color(filtre_c)
            translate([0, 0, dis_yuzey_kalinligi])
                kapak_ic_filtre(c);
    } else if (parca_secici == "kapak_dis") {
        color(dis_yuzey_rengi) kapak_dis_yuzey(c);
    } else if (parca_secici == "kapak_filtre") {
        color(filtre_c) kapak_ic_filtre(c);
    } else if (parca_secici == "isik_yaniyor") {
        color(kasa_rengi) tek_kasa(c, idx, is_first, is_last);
        color(filtre_c)
            translate([0, 0, kasa_derinligi - dis_yuzey_kalinligi])
                kapak_dis_yuzey(c);
    } else if (parca_secici == "patlatilmis") {
        color(kasa_rengi) tek_kasa(c, idx, is_first, is_last);
        color(filtre_c)
            translate([0, 0, kasa_derinligi + 14])
                kapak_ic_filtre(c);
        color(dis_yuzey_rengi)
            translate([0, 0, kasa_derinligi + 28])
                kapak_dis_yuzey(c);
    } else {
        // montajli: Gündüz / Işık kapalı (Dıştan saf beyaz difüzör görünür)
        color(kasa_rengi) tek_kasa(c, idx, is_first, is_last);
        color(filtre_c)
            translate([0, 0, z_kapak_base])
                kapak_ic_filtre(c);
        color(dis_yuzey_rengi)
            translate([0, 0, z_kapak_base + filtre_kalinligi])
                kapak_dis_yuzey(c);
    }
}

// Yerleşim
n = len(metin);
dx_adim = harf_boyutu * 0.95 + cerceve_payi * 2 + harfler_arasi_bosluk;

if (parca_secici == "kopru") {
    // Sadece kablo köprülerini bas (3 dakikada basılan 1.5 gramlık klipsler)
    toplam_kopru = max(1, n - 1);
    for (i = [0 : toplam_kopru - 1]) {
        translate([0, (i - (toplam_kopru - 1) / 2) * 12.0, 3.5])
            color(kasa_rengi)
                kablo_gizleme_koprusu(harfler_arasi_bosluk);
    }
} else if (harf_secici > 0 && harf_secici <= n) {
    secili_idx = harf_secici - 1;
    harf_bilesen(metin[secili_idx], secili_idx, secili_idx == 0, secili_idx == n - 1);
} else {
    toplam_genislik = (n - 1) * dx_adim;
    for (i = [0 : n - 1]) {
        x_pos = -toplam_genislik / 2 + i * dx_adim;
        translate([x_pos, 0, 0])
            harf_bilesen(metin[i], i, i == 0, i == n - 1);
            
        // Harfler arasındaki kablo gizleme köprüsü (Son harf hariç)
        if (i < n - 1 && (parca_secici == "montajli" || parca_secici == "isik_yaniyor")) {
            x_kopru = x_pos + dx_adim / 2;
            translate([x_kopru, 0, taban_kalinligi + 3.0])
                color(kasa_rengi)
                    kablo_gizleme_koprusu(harfler_arasi_bosluk);
        }
    }
}
`,
  },
  {
    id: 'cumhuriyet-atas',
    name: 'Yaşasın Cumhuriyet Ataş Kitap Ayracı',
    category: 'Bookmarks & Clips',
    description: 'Baskıya hazır 2-renkli Segoe Script kabartma yazılı optimize ataş kitap ayracı.',
    colorsCount: 2,
    suggestedAmsSlots: [
      { id: 1, name: 'Alt Taşıyıcı Taban', colorHex: '#B9122A', materialType: 'PLA' },
      { id: 2, name: 'Üst Kabartma Yazı & Fitil', colorHex: '#F5284B', materialType: 'PLA' },
    ],
    code: `// =======================================================
// YAŞASIN CUMHURİYET ATAŞ KİTAP AYRACI (HIZLI RENDER EDİLEN VERSİYON)
// =======================================================

/* [Teknik Ölçüler] */
toplam_kalinlik = 2.0; // [1.0:0.2:5.0] Yazının ve ataşın tepe yüksekliği (Z, mm)
zemin_kalinlik  = 1.4; // [0.6:0.2:3.0] Alt taşıyıcı taban seviyesi (Z, mm)
t_genel         = 3.6; // [2.0:0.2:6.0] Ataş dış taban et kalınlığı (Geniş zemin, mm)
t_kabartma      = 2.0; // [1.0:0.2:4.0] Ataşın üzerindeki kabartma fitil et kalınlığı (mm)
bosluk          = 9.0; // [5.0:0.5:15.0] Hatlar arası iç net mesafe (mm)
toplam_boy      = 135.0; // [80:5:200] Toplam uzunluk (mm)

/* [Metin & Font Ayarları] */
yazi_metni   = "YaşasınCumhuriyet";
font_adi     = "Segoe Script:style=Regular";
yazi_boyutu  = 9.0; // [5.0:0.5:15.0]

/* [Renkler (AMS Filament)] */
zemin_renk    = "#B9122A"; // [Color]
kabartma_renk = "#F5284B"; // [Color]

/* [Hidden] */
$fn = 40; // Dış kavisler için yeterli ve hızlı değer 
kabartma_h   = toplam_kalinlik - zemin_kalinlik; // 0.6 mm kabartma yüksekliği
r_ust_orta   = (bosluk + t_genel) / 2;
r_alt_orta   = (bosluk + t_genel);
x_sol        = 0;
x_orta       = 2 * r_ust_orta;   // Orta hat ekseni
x_sag        = 2 * r_alt_orta;   // Sağ serbest kol ekseni
sag_kol_boy  = toplam_boy - 20.0;

// =======================================================
// 3D MODELLEME (OPTİMİZE EDİLMİŞ DÜZEN)
// =======================================================

// 1. ALT TABAN VE ZEMİN (Komple tek parça)
color(zemin_renk) {
    linear_extrude(height = zemin_kalinlik) {
        atas_cercevesi(t_genel);
        organik_zemin();
    }
}

// 2. ÜST KABARTMA (Zeminin üzerinden yükselir -> Boolean yükünü yarıya indirir)
color(kabartma_renk) {
    translate([0, 0, zemin_kalinlik])
    linear_extrude(height = kabartma_h) {
        atas_cercevesi(t_kabartma);
        yazi_geometrisi(offset_payi = 0.35);
    }
}

// -------------------------------------------------------
// MODÜLLER
// -------------------------------------------------------

module atas_cercevesi(profil_t) {
    // 1. Sol uzun kol
    translate([x_sol - profil_t/2, r_alt_orta])
        square([profil_t, toplam_boy - r_alt_orta - r_ust_orta]);

    // 2. Alt büyük U dönüşü
    translate([r_alt_orta, r_alt_orta]) {
        difference() {
            circle(r = r_alt_orta + profil_t/2);
            circle(r = r_alt_orta - profil_t/2);
            translate([-(r_alt_orta + profil_t), 0])
                square([(r_alt_orta + profil_t) * 2, (r_alt_orta + profil_t) * 2]);
        }
    }

    // 3. Sağ serbest kol
    translate([x_sag - profil_t/2, r_alt_orta]) {
        square([profil_t, sag_kol_boy - r_alt_orta]);
        translate([profil_t/2, sag_kol_boy - r_alt_orta])
            circle(d = profil_t);
    }

    // 4. Üst küçük U dönüşü
    translate([r_ust_orta, toplam_boy - r_ust_orta]) {
        difference() {
            circle(r = r_ust_orta + profil_t/2);
            circle(r = r_ust_orta - profil_t/2);
            translate([-(r_ust_orta + profil_t), -(r_ust_orta + profil_t) * 2])
                square([(r_ust_orta + profil_t) * 2, (r_ust_orta + profil_t) * 2]);
        }
    }
}

// Yazı Geometrisi (offset $fn değeri 16 yapılarak poligon yükü düşürüldü)
module yazi_geometrisi(offset_payi = 0.35) {
    y_tepe = toplam_boy - r_ust_orta;

    translate([x_orta, y_tepe - 118, 0]) {
        rotate([0, 0, 90]) {
            offset(r = offset_payi, $fn = 16) {
                text(
                    text = yazi_metni,
                    size = yazi_boyutu,
                    font = font_adi,
                    halign = "left",
                    valign = "center",
                    spacing = 0.90
                );
            }
        }
    }
}

// Harflerin Altındaki Taşıyıcı Zemin
module organik_zemin() {
    y_tepe = toplam_boy - r_ust_orta;

    // Harflerin dış hatlarını saran zemin
    yazi_geometrisi(offset_payi = 1.3);

    // Üst kavis ucundan harflerin zeminine bağlanan köprü
    translate([x_orta - t_genel/2, y_tepe - 12])
        square([t_genel, 12]);
}
`,
  },
  {
    id: 'araba-plaka',
    name: 'Parametrik Araba Plakası (Modüler TR & Askı Delikli)',
    category: 'Signs & Plates',
    description: 'Bambu Lab AMS 3-renkli veya modüler (ayrı basılıp yapıştırılabilir), sol üst askı delikli ve %60 anahtarlık ölçekli araba plakası.',
    colorsCount: 3,
    suggestedAmsSlots: [
      { id: 1, name: 'Siyah Çerçeve & Plaka No', colorHex: '#111111', materialType: 'PLA' },
      { id: 2, name: 'Mavi TR Şeridi', colorHex: '#003399', materialType: 'PLA' },
      { id: 3, name: 'Beyaz Zemin & Yazılar', colorHex: '#FFFFFF', materialType: 'PLA' },
    ],
    code: `// =======================================================
// MAKERWORLD / BAMBU LAB PARAMETRİK PLAKALIK (MODÜLER TR)
// =======================================================

/* [Plaka Bilgileri] */
plaka_no        = "06 TR 06";
isim_soyisim    = "İSİM SOYİSİM";

/* [Ölçeklendirme] */
// En, boy ve yükseklik (Z) bu oranla birlikte orantılı büyür/küçülür (%100: 100x35x4.8mm, %60: 60x21x2.88mm)
olcek_yuzdesi   = 60;   // [40:5:150]

/* [Yazdırma / Parça Seçimi] */
parca_secimi    = "hepsi"; // [hepsi: Tümü (Montajlı Görünüm), plaka: Sadece Ana Plaka (TR Yuvalı), tr_modul: Sadece Mavi TR Rozeti (Yapıştırmalık)]

/* [Montaj & Delik Ayarları] */
delik_aktif     = true; // [true, false]
delik_tipi      = "ic"; // [ic: Sol Üst Gömme Delik, kulak: Sol Üst Dış Askı Halkası, yok: Deliksiz]
delik_capi      = 3.0;  // [2.0:0.5:5.0]
tolerans        = 0.15; // [0.08:0.02:0.30]

/* [Boyut Ayarları (Referans %100 Değerleri)] */
genislik_ref    = 100; // [60:1:200]
yukseklik_ref   = 35;  // [25:1:80]
kalinlik_ref    = 2.8; // [2.0:0.5:8.0] Referans %100 Gövde Yüksekliği (Z mm)
radyus_ref      = 4.0; // [1:0.5:10]

/* [Yazı Boyutları (Referans %100 Değerleri)] */
plaka_font_ref  = 13.0; // [8:0.5:25]
isim_font_ref   = 7.0;  // [4:0.5:15]
tr_font_ref     = 5.0;  // [3:0.5:10]

/* [Renk Ayarları (AMS Filament)] */
cerceve_rengi   = "#111111"; // [Color]
serit_rengi     = "#003399"; // [Color]
plaka_rengi     = "#FFFFFF"; // [Color]
yazi_rengi      = "#111111"; // [Color]
alt_yazi_rengi  = "#FFFFFF"; // [Color]

/* [Hidden] */
$fn = 40;

// Ölçek katsayısı (Tüm eksenler: En, Boy, Yükseklik)
k = olcek_yuzdesi / 100;

// En, Boy ve Yükseklik dinamik hesaplama
genislik        = genislik_ref * k;
yukseklik       = yukseklik_ref * k;
kalinlik        = kalinlik_ref * k;
radyus          = radyus_ref * k;

plaka_font_size = plaka_font_ref * k;
isim_font_size  = isim_font_ref * k;
tr_font_size    = tr_font_ref * k;
delik_mesafe    = 5.2 * k;

// Kenar payları ve katman yükseklikleri (Z yüksekliği ile tam orantılı)
kenar_payi      = max(0.9, 1.5 * k);
taban_h         = kalinlik * 0.30;       // Taban kalınlığı (Z yüksekliğinin %30'u)
yazi_kabartma_h = kalinlik * 0.20;       // Yazı kabartması (Z yüksekliğinin %20'si)
tr_kabartma_h   = kalinlik * 0.12;       // TR kabartması (Z yüksekliğinin %12'si)
beyaz_zemin_h   = kalinlik - taban_h - yazi_kabartma_h; // Beyaz zemin kalınlığı
mavi_serit_h    = kalinlik - taban_h - tr_kabartma_h;   // Mavi şerit kalınlığı

serit_genislik  = genislik * 0.14;
ic_w            = genislik - (kenar_payi * 2);
ic_y            = yukseklik / 2.5;
ic_h            = yukseklik - ic_y - kenar_payi;

// Sol üst delik konumu
delik_x         = delik_mesafe;
delik_y         = yukseklik - delik_mesafe;

// Hızlı ve pürüzsüz 2D yuvarlak dikdörtgen
module yuvarlak_dikdortgen_2d(w, h, r) {
    r_akt = min(r, min(w/2, h/2));
    translate([r_akt, r_akt])
        offset(r = r_akt)
            square([max(0.1, w - 2*r_akt), max(0.1, h - 2*r_akt)]);
}

// 1. ANA ÇERÇEVE VE TAŞIYICI ALT TABAN (Siyah)
module ana_cerceve() {
    difference() {
        union() {
            // Dış ana gövde
            linear_extrude(height = kalinlik)
                yuvarlak_dikdortgen_2d(genislik, yukseklik, radyus);
            
            // Eğer dış kulakçık halkası seçildiyse
            if (delik_aktif && delik_tipi == "kulak") {
                kulak_r = (delik_capi + (3.0 * k)) / 2;
                translate([0, yukseklik - radyus])
                    difference() {
                        cylinder(r = kulak_r, h = kalinlik, $fn = 32);
                        translate([0, 0, -1])
                            cylinder(d = delik_capi, h = kalinlik + 2, $fn = 32);
                    }
            }
        }
        
        // İç havuz (taban_h seviyesinden yukarı)
        translate([kenar_payi, ic_y, taban_h])
            linear_extrude(height = kalinlik + 0.1)
                yuvarlak_dikdortgen_2d(ic_w, ic_h, max(0.5, radyus - kenar_payi));
        
        // Sol üst gömme delik (aktifse)
        if (delik_aktif && delik_tipi == "ic") {
            translate([delik_x, delik_y, -1])
                cylinder(d = delik_capi, h = kalinlik + 2, $fn = 32);
        }
    }
}

// 2. BEYAZ PLAKA ALANI (Beyaz Zemin)
module beyaz_plaka_alani() {
    translate([0, 0, taban_h])
    intersection() {
        translate([kenar_payi, ic_y, 0])
            linear_extrude(height = beyaz_zemin_h)
                yuvarlak_dikdortgen_2d(ic_w, ic_h, max(0.5, radyus - kenar_payi));
        
        translate([serit_genislik + kenar_payi, 0, 0])
            cube([genislik, yukseklik * 2, kalinlik]);
    }
}

// 3. ANA PLAKA YAZISI (Siyah Kabartma)
module plaka_yazisi() {
    translate([(genislik / 2) + (serit_genislik / 2), ic_y + (ic_h / 2), taban_h + beyaz_zemin_h])
        linear_extrude(height = yazi_kabartma_h)
            text(plaka_no, size = plaka_font_size, halign = "center", valign = "center", font = "Arial:style=Bold");
}

// 4. ALT İSİM SOYİSİM (Beyaz Kabartma)
module alt_isim() {
    translate([genislik / 2, yukseklik / 5.5, kalinlik])
        linear_extrude(height = yazi_kabartma_h)
            text(isim_soyisim, size = isim_font_size, halign = "center", valign = "center", font = "Arial:style=Bold");
}

// 2D TR Rozet Yuvası / Parçası Profili
module tr_rozet_2d(t = 0) {
    offset(r = -t)
    intersection() {
        translate([kenar_payi, ic_y])
            yuvarlak_dikdortgen_2d(ic_w, ic_h, max(0.5, radyus - kenar_payi));
        translate([0, ic_y - 1])
            square([serit_genislik + kenar_payi, ic_h + 2]);
    }
}

// 5. MODÜLER TR ROZETİ (Mavi Zemin + Beyaz TR Yazısı)
module tr_modulu(izole = false) {
    tol = izole ? tolerans : 0;
    z_taban = izole ? 0 : taban_h;
    t_x = izole ? -kenar_payi : 0;
    t_y = izole ? -ic_y : 0;
    
    translate([t_x, t_y, z_taban]) {
        // Mavi zemin
        color(serit_rengi)
        difference() {
            linear_extrude(height = mavi_serit_h)
                tr_rozet_2d(tol);
            
            // Eğer iç delik varsa TR rozetinden de delinmeli
            if (delik_aktif && delik_tipi == "ic") {
                translate([delik_x, delik_y, -1])
                    cylinder(d = delik_capi + (izole ? tol : 0), h = mavi_serit_h + 2, $fn = 32);
            }
        }
        
        // Beyaz TR Yazısı
        color(plaka_rengi)
        translate([serit_genislik * 0.6, yukseklik / 1.9, mavi_serit_h])
            linear_extrude(height = tr_kabartma_h)
                text("TR", size = tr_font_size, halign = "center", valign = "center", font = "Arial:style=Bold");
    }
}

// =======================================================
// RENDER YÖNETİMİ
// =======================================================
if (parca_secimi == "hepsi") {
    color(cerceve_rengi) ana_cerceve();
    color(plaka_rengi)   beyaz_plaka_alani();
    color(yazi_rengi)    plaka_yazisi();
    color(alt_yazi_rengi) alt_isim();
    tr_modulu(izole = false);
} else if (parca_secimi == "plaka") {
    color(cerceve_rengi) ana_cerceve();
    color(plaka_rengi)   beyaz_plaka_alani();
    color(yazi_rengi)    plaka_yazisi();
    color(alt_yazi_rengi) alt_isim();
} else if (parca_secimi == "tr_modul") {
    tr_modulu(izole = true);
}
`,
  },
  {
    id: 'keychain',
    name: 'Multi-Color Keychain & Bag Tag',
    category: 'Accessories',
    description: 'Customizable 3-color tag with rounded corners, sturdy eyelet, and raised text.',
    colorsCount: 3,
    suggestedAmsSlots: [
      { id: 1, name: 'Base Plate', colorHex: '#1E1E1E', materialType: 'PLA' },
      { id: 2, name: 'Border & Ring', colorHex: '#00AE42', materialType: 'PLA' },
      { id: 3, name: 'Text & Details', colorHex: '#FFFFFF', materialType: 'PLA' },
    ],
    code: `/* [Text Settings] */
tag_text = "MAKER";
font_adi = "Segoe Script:style=Bold";
text_size = 11; // [6:1:24]
text_thickness = 1.2; // [0.4:0.2:3]

/* [Colors (AMS Filament)] */
base_color = "#1E1E1E"; // [Color]
border_color = "#00AE42"; // [Color]
text_color = "#FFFFFF"; // [Color]

/* [Tag Dimensions] */
tag_length = 65; // [40:1:120]
tag_width = 28; // [18:1:60]
base_thickness = 2.4; // [1.2:0.2:6]
corner_radius = 6; // [2:1:15]

/* [Hole & Border] */
hole_diameter = 5.0; // [3:0.5:10]
border_width = 2.0; // [1:0.5:5]
border_height = 0.8; // [0.4:0.2:2]

$fn = 40;

module rounded_rect(w, l, r) {
    hull() {
        translate([r, r, 0]) circle(r=r);
        translate([w - r, r, 0]) circle(r=r);
        translate([w - r, l - r, 0]) circle(r=r);
        translate([r, l - r, 0]) circle(r=r);
    }
}

// 1. Base Body (Color 1)
color(base_color) {
    difference() {
        linear_extrude(base_thickness) {
            rounded_rect(tag_length, tag_width, corner_radius);
        }
        // Hole through base
        translate([corner_radius + 2, tag_width / 2, -0.1])
            cylinder(h = base_thickness + 0.2, d = hole_diameter);
    }
}

// 2. Border & Hole Reinforcement (Color 2)
color(border_color) {
    // Outer border
    translate([0, 0, base_thickness])
        linear_extrude(border_height) {
            difference() {
                rounded_rect(tag_length, tag_width, corner_radius);
                translate([border_width, border_width, 0])
                    rounded_rect(tag_length - border_width * 2, tag_width - border_width * 2, max(1, corner_radius - border_width));
            }
        }
    
    // Hole inner ring
    translate([corner_radius + 2, tag_width / 2, base_thickness])
        difference() {
            cylinder(d = hole_diameter + border_width * 2, h = border_height);
            translate([0, 0, -0.1]) cylinder(d = hole_diameter, h = border_height + 0.2);
        }
}

// 3. Raised Text (Color 3)
color(text_color) {
    translate([(tag_length + corner_radius + 2) / 2, tag_width / 2, base_thickness]) {
        linear_extrude(text_thickness) {
            text(tag_text, font = font_adi, size = text_size, halign = "center", valign = "center");
        }
    }
}
`,
  },
  {
    id: 'desk-sign',
    name: 'Modern Desk Nameplate',
    category: 'Office',
    description: 'Sleek angled desk sign with dual-line text and colored accent stripe.',
    colorsCount: 3,
    suggestedAmsSlots: [
      { id: 1, name: 'Stand Body', colorHex: '#2C3E50', materialType: 'PLA' },
      { id: 2, name: 'Accent Stripe', colorHex: '#E67E22', materialType: 'PLA' },
      { id: 3, name: 'Name & Role', colorHex: '#FFFFFF', materialType: 'PLA' },
    ],
    code: `/* [Nameplate Text] */
full_name = "Alex Morgan";
title_role = "LEAD ENGINEER";
name_size = 9; // [6:1:18]
role_size = 5; // [3:0.5:10]

/* [Colors (AMS Filament)] */
stand_color = "#2C3E50"; // [Color]
stripe_color = "#E67E22"; // [Color]
text_color = "#FFFFFF"; // [Color]

/* [Dimensions] */
plate_length = 110; // [70:5:180]
plate_height = 36; // [25:2:60]
base_depth = 32; // [20:2:50]
face_thickness = 4; // [2:1:8]
accent_width = 3; // [1:0.5:8]

$fn = 32;
angle = 22;

// 1. Main Stand Wedge (Color 1)
color(stand_color) {
    difference() {
        // Base prism
        polyhedron(
            points = [
                [0, 0, 0], [plate_length, 0, 0], [plate_length, base_depth, 0], [0, base_depth, 0],
                [0, 6, plate_height], [plate_length, 6, plate_height]
            ],
            faces = [
                [0, 1, 2, 3], // Bottom
                [0, 4, 5, 1], // Angled front
                [1, 5, 2],    // Right side
                [2, 5, 4, 3], // Back
                [0, 3, 4]     // Left side
            ]
        );
        // Cut groove for accent stripe
        translate([10, -1, 7])
            rotate([angle, 0, 0])
            cube([plate_length - 20, accent_width, face_thickness]);
    }
}

// 2. Accent Stripe (Color 2)
color(stripe_color) {
    translate([10, 0, 7.5])
        rotate([angle, 0, 0])
        cube([plate_length - 20, accent_width, 1.2]);
}

// 3. Name & Title (Color 3)
color(text_color) {
    // Primary Name
    translate([plate_length / 2, 2.5, plate_height * 0.62])
        rotate([angle, 0, 0])
        linear_extrude(1.2)
        text(full_name, size = name_size, halign = "center", valign = "center");

    // Subtitle / Role
    translate([plate_length / 2, 7.8, plate_height * 0.30])
        rotate([angle, 0, 0])
        linear_extrude(1.0)
        text(title_role, size = role_size, halign = "center", valign = "center");
}
`,
  },
  {
    id: 'ams-coaster',
    name: '4-Color AMS Geometry Coaster',
    category: 'Household',
    description: 'Stunning 4-color circular coaster demonstrating full Bambu AMS multi-material capability.',
    colorsCount: 4,
    suggestedAmsSlots: [
      { id: 1, name: 'Outer Rim', colorHex: '#111111', materialType: 'PLA' },
      { id: 2, name: 'Inner Base', colorHex: '#EAEAEA', materialType: 'PLA' },
      { id: 3, name: 'Pattern Rings', colorHex: '#00AE42', materialType: 'PLA' },
      { id: 4, name: 'Center Star', colorHex: '#E74C3C', materialType: 'PLA' },
    ],
    code: `/* [Colors (AMS Filament)] */
rim_color = "#111111"; // [Color]
base_color = "#EAEAEA"; // [Color]
ring_color = "#00AE42"; // [Color]
star_color = "#E74C3C"; // [Color]

/* [Coaster Dimensions] */
diameter = 90; // [60:5:120]
total_height = 3.6; // [2:0.4:6]
inlay_depth = 1.0; // [0.4:0.2:2]
rim_width = 4; // [2:1:8]

/* [Pattern Settings] */
star_points = 8; // [4:1:16]
center_star_radius = 16; // [8:1:30]
accent_rings = 2; // [1:1:4]

$fn = 64;
radius = diameter / 2;

// 1. Outer Dark Rim (Color 1)
color(rim_color) {
    difference() {
        cylinder(r = radius, h = total_height);
        translate([0, 0, -0.1])
            cylinder(r = radius - rim_width, h = total_height + 0.2);
    }
}

// 2. Coaster Main Field (Color 2)
color(base_color) {
    difference() {
        cylinder(r = radius - rim_width, h = total_height - inlay_depth);
    }
}

// 3. Geometric Rings (Color 3)
color(ring_color) {
    for (i = [1 : accent_rings]) {
        ring_r = (radius - rim_width) * (i / (accent_rings + 1));
        translate([0, 0, total_height - inlay_depth])
            linear_extrude(inlay_depth) {
                difference() {
                    circle(r = ring_r + 1.2);
                    circle(r = ring_r - 1.2);
                }
            }
    }
}

// 4. Center Multi-Point Star (Color 4)
color(star_color) {
    translate([0, 0, total_height - inlay_depth]) {
        linear_extrude(inlay_depth) {
            angles = [for (i = [0 : star_points * 2 - 1]) i * 180 / star_points];
            polygon(points = [
                for (i = [0 : len(angles) - 1])
                    let(r = (i % 2 == 0) ? center_star_radius : center_star_radius * 0.45)
                    [r * cos(angles[i]), r * sin(angles[i])]
            ]);
        }
    }
}
`,
  },
  {
    id: 'parametric-box',
    name: 'Dual-Color Storage Box & Lid',
    category: 'Organization',
    description: 'Snap-fit parametric container with embossed two-tone geometric lid.',
    colorsCount: 2,
    suggestedAmsSlots: [
      { id: 1, name: 'Container Body', colorHex: '#2980B9', materialType: 'PLA' },
      { id: 2, name: 'Lid & Accent', colorHex: '#F39C12', materialType: 'PLA' },
    ],
    code: `/* [Colors (AMS Filament)] */
box_color = "#2980B9"; // [Color]
lid_color = "#F39C12"; // [Color]

/* [Box Dimensions] */
box_width = 50; // [30:5:100]
box_length = 50; // [30:5:100]
box_height = 25; // [15:5:80]
wall_thickness = 2.0; // [1.2:0.4:4]
corner_r = 5; // [2:1:12]

/* [Lid Inlay] */
lid_text = "MAKER";
inlay_thickness = 1.0; // [0.4:0.2:2]

$fn = 32;

module rounded_box(w, l, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(h=h, r=r);
        translate([w-r, r, 0]) cylinder(h=h, r=r);
        translate([w-r, l-r, 0]) cylinder(h=h, r=r);
        translate([r, l-r, 0]) cylinder(h=h, r=r);
    }
}

// 1. Box Bottom Base (Color 1)
color(box_color) {
    difference() {
        rounded_box(box_width, box_length, box_height, corner_r);
        translate([wall_thickness, wall_thickness, wall_thickness])
            rounded_box(
                box_width - wall_thickness * 2,
                box_length - wall_thickness * 2,
                box_height,
                max(1, corner_r - wall_thickness)
            );
    }
}

// 2. Lid with Inlay (Color 2)
color(lid_color) {
    translate([box_width + 10, 0, 0]) {
        difference() {
            rounded_box(box_width + 2, box_length + 2, 6, corner_r + 1);
            // Lip inner cut
            translate([1.5, 1.5, -0.1])
                rounded_box(box_width - 1, box_length - 1, 4.2, corner_r);
        }
        
        // Embossed Pattern/Text on top
        translate([(box_width + 2) / 2, (box_length + 2) / 2, 6])
            linear_extrude(inlay_thickness)
            text(lid_text, size = 10, halign = "center", valign = "center");
    }
}
`,
  },
  {
    id: 'blank',
    name: 'Blank Multi-Color Playground',
    category: 'Custom',
    description: 'Clean template ready for any custom OpenSCAD multi-color code.',
    colorsCount: 2,
    suggestedAmsSlots: [
      { id: 1, name: 'Part A', colorHex: '#00AE42', materialType: 'PLA' },
      { id: 2, name: 'Part B', colorHex: '#FFFFFF', materialType: 'PLA' },
    ],
    code: `/* [Colors (AMS Filament)] */
core_color = "#00AE42"; // [Color]
inlay_color = "#FFFFFF"; // [Color]

/* [Customizer Parameters] */
cube_size = 30; // [10:5:80]
sphere_radius = 18; // [5:1:50]
cylinder_height = 35; // [10:5:80]

$fn = 40;

// Color 1: Core Cube
color(core_color) {
    difference() {
        cube(cube_size, center = true);
        sphere(r = sphere_radius);
    }
}

// Color 2: Inlaid Sphere & Post
color(inlay_color) {
    intersection() {
        cube(cube_size, center = true);
        sphere(r = sphere_radius);
    }
    cylinder(h = cylinder_height, r = 5, center = true);
}
`,
  },
];
