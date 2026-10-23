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
    name: 'Parametrik Araba Plakası (TR)',
    category: 'Signs & Plates',
    description: 'Bambu Lab AMS 3-renkli (Siyah çerçeve, Mavi TR şeridi, Beyaz zemin) kişiselleştirilebilir araba plakası.',
    colorsCount: 3,
    suggestedAmsSlots: [
      { id: 1, name: 'Siyah Çerçeve & Plaka No', colorHex: '#111111', materialType: 'PLA' },
      { id: 2, name: 'Mavi TR Şeridi', colorHex: '#003399', materialType: 'PLA' },
      { id: 3, name: 'Beyaz Zemin & Yazılar', colorHex: '#FFFFFF', materialType: 'PLA' },
    ],
    code: `// =======================================================
// MAKERWORLD / BAMBU LAB PARAMETRİK PLAKALIK
// =======================================================

/* [Plaka Bilgileri] */
plaka_no = "06 TR 06";
isim_soyisim = "İSİM SOYİSİM";

/* [Boyut Ayarları] */
genislik = 100; // [60:1:200]
yukseklik = 35; // [25:1:80]
kalinlik = 4.0; // [2:0.5:8]
radyus = 4.0;   // [1:0.5:10]

/* [Yazı Boyutları] */
plaka_font_size = 13.0; // [8:0.5:25]
isim_font_size = 7.0;   // [4:0.5:15]
tr_font_size = 5.0;     // [3:0.5:10]

/* [Renk Ayarları (AMS Filament)] */
cerceve_rengi  = "#111111"; // [Color]
serit_rengi    = "#003399"; // [Color]
plaka_rengi    = "#FFFFFF"; // [Color]
yazi_rengi     = "#111111"; // [Color]
alt_yazi_rengi = "#FFFFFF"; // [Color]

/* [Hidden] */
$fn = 40;

// Hızlı ve pürüzsüz 2D yuvarlak dikdörtgen
module yuvarlak_dikdortgen_2d(w, h, r) {
    translate([r, r])
        offset(r = r)
            square([max(0.1, w - 2*r), max(0.1, h - 2*r)]);
}

// Katman kalınlıkları (Sıfır çakışma, kusursuz AMS katmanları)
taban_h = 1.2;                           // 1.2 mm taşıyıcı siyah taban
beyaz_zemin_h = kalinlik - taban_h - 0.8; // 2.0 mm beyaz zemin
mavi_serit_h  = kalinlik - taban_h - 0.4; // 2.4 mm mavi şerit
yazi_kabartma_h = 0.8;                   // 0.8 mm plaka yazı kabartması
tr_kabartma_h   = 0.4;                   // 0.4 mm TR kabartması

serit_genislik = genislik * 0.14;
ic_w = genislik - 3.0;
ic_h = yukseklik - (yukseklik / 2.5) - 1.5;
ic_y = yukseklik / 2.5;

// 1. ANA ÇERÇEVE VE TAŞIYICI ALT TABAN (Siyah - Bağımsız Katı Hacim)
color(cerceve_rengi)
difference() {
    linear_extrude(height = kalinlik)
        yuvarlak_dikdortgen_2d(genislik, yukseklik, radyus);
    
    translate([1.5, ic_y, taban_h])
        linear_extrude(height = kalinlik + 0.1)
            yuvarlak_dikdortgen_2d(ic_w, ic_h, radyus - 0.5);
}

// 2. MAVİ ŞERİT (Mavi - Altı ve üstü kapalı bağımsız 3D katı cisim)
color(serit_rengi)
translate([0, 0, taban_h])
intersection() {
    translate([1.5, ic_y, 0])
        linear_extrude(height = mavi_serit_h)
            yuvarlak_dikdortgen_2d(ic_w, ic_h, radyus - 0.5);
    
    translate([0, 0, 0])
        cube([serit_genislik + 1.5, yukseklik * 2, kalinlik]);
}

// 3. MAVİ ŞERİT ÜSTÜ TR YAZISI (Beyaz Kabartma)
color(plaka_rengi)
translate([serit_genislik * 0.6, yukseklik / 1.9, taban_h + mavi_serit_h])
    linear_extrude(height = tr_kabartma_h)
        text("TR", size = tr_font_size, halign = "center", valign = "center", font = "Arial:style=Bold");

// 4. BEYAZ PLAKA ALANI (Beyaz - Altı ve üstü kapalı bağımsız 3D katı cisim)
color(plaka_rengi)
translate([0, 0, taban_h])
intersection() {
    translate([1.5, ic_y, 0])
        linear_extrude(height = beyaz_zemin_h)
            yuvarlak_dikdortgen_2d(ic_w, ic_h, radyus - 0.5);
    
    translate([serit_genislik + 1.5, 0, 0])
        cube([genislik, yukseklik * 2, kalinlik]);
}

// 5. ANA PLAKA YAZISI (Siyah Kabartma)
color(yazi_rengi)
translate([(genislik / 2) + (serit_genislik / 2), ic_y + (ic_h / 2), taban_h + beyaz_zemin_h])
    linear_extrude(height = yazi_kabartma_h)
        text(plaka_no, size = plaka_font_size, halign = "center", valign = "center", font = "Arial:style=Bold");

// 6. ALT İSİM SOYİSİM (Beyaz Kabartma)
color(alt_yazi_rengi)
translate([genislik / 2, yukseklik / 5.5, kalinlik])
    linear_extrude(height = 0.8)
        text(isim_soyisim, size = isim_font_size, halign = "center", valign = "center", font = "Arial:style=Bold");
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
