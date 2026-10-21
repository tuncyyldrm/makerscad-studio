export interface FontItem {
  id: string;
  name: string; // Exact OpenSCAD font string
  displayName: string;
  category: 'Calligraphy / Script' | 'Sans-Serif' | 'Display / Bold';
  cssFamily: string;
  filename: string;
  previewText?: string;
}

export const INSTALLED_FONTS: FontItem[] = [
  {
    id: 'segoe-script-bold',
    name: 'Segoe Script:style=Bold',
    displayName: 'Segoe Script Bold (Kaligrafi / El Yazısı Kalın)',
    category: 'Calligraphy / Script',
    cssFamily: "'Segoe Script', cursive, sans-serif",
    filename: 'segoescb.ttf',
    previewText: 'Yaşasın Cumhuriyet',
  },
  {
    id: 'segoe-script-regular',
    name: 'Segoe Script',
    displayName: 'Segoe Script Regular (Kaligrafi / El Yazısı)',
    category: 'Calligraphy / Script',
    cssFamily: "'Segoe Script', cursive, sans-serif",
    filename: 'segoesc.ttf',
    previewText: 'Cumhuriyet 100. Yıl',
  },
  {
    id: 'segoe-print-bold',
    name: 'Segoe Print:style=Bold',
    displayName: 'Segoe Print Bold (Baskı El Yazısı Kalın)',
    category: 'Calligraphy / Script',
    cssFamily: "'Segoe Print', cursive, sans-serif",
    filename: 'segoeprb.ttf',
    previewText: 'MakerWorld 3D Print',
  },
  {
    id: 'segoe-print-regular',
    name: 'Segoe Print',
    displayName: 'Segoe Print Regular (Baskı El Yazısı)',
    category: 'Calligraphy / Script',
    cssFamily: "'Segoe Print', cursive, sans-serif",
    filename: 'segoepr.ttf',
    previewText: 'Özel Tasarım Model',
  },
  {
    id: 'impact',
    name: 'Impact',
    displayName: 'Impact (Büyük / Tabela / Kalın)',
    category: 'Display / Bold',
    cssFamily: "Impact, Charcoal, sans-serif",
    filename: 'impact.ttf',
    previewText: 'MAKERWORLD 2026',
  },
  {
    id: 'arial-bold',
    name: 'Arial:style=Bold',
    displayName: 'Arial Bold (Net / Kalın Sans)',
    category: 'Sans-Serif',
    cssFamily: "Arial, sans-serif",
    filename: 'arialbd.ttf',
    previewText: 'Modern 3MF Studio',
  },
  {
    id: 'arial-regular',
    name: 'Arial',
    displayName: 'Arial Regular (Standart Düz)',
    category: 'Sans-Serif',
    cssFamily: "Arial, sans-serif",
    filename: 'font.ttf',
    previewText: 'Parametric Studio',
  },
  {
    id: 'tahoma',
    name: 'Tahoma',
    displayName: 'Tahoma (Temiz / Net Geometrik)',
    category: 'Sans-Serif',
    cssFamily: "Tahoma, Geneva, sans-serif",
    filename: 'tahoma.ttf',
    previewText: 'Bambu Lab PEI Bed',
  },
];
