# MASOQ.id Landing Page

Landing page modern dan SEO-friendly untuk MASOQ.id - Solusi Validasi Kehadiran Cerdas & Anti-Fraud.

## 🚀 Quick Start

### Development

```bash
npm run dev
```

Server akan berjalan di `http://localhost:4321/`

### Build Production

```bash
npm run build
```

Output akan tersimpan di folder `dist/`

### Preview Production Build

```bash
npm run preview
```

## 📁 Struktur Proyek

```
/
├── public/
│   └── robots.txt              # SEO robots configuration
├── src/
│   ├── components/
│   │   ├── Navigation.astro    # Sticky navigation
│   │   ├── Hero.astro          # Hero section
│   │   ├── Comparison.astro    # Comparison section
│   │   ├── Features.astro      # Features grid
│   │   ├── Advantages.astro    # Advantages section
│   │   ├── Pricing.astro       # Pricing card
│   │   └── Footer.astro        # Footer
│   ├── layouts/
│   │   └── Layout.astro        # Main layout with SEO
│   ├── pages/
│   │   └── index.astro         # Landing page
│   └── styles/
│       └── global.css          # Global styles
├── astro.config.mjs            # Astro configuration
├── tailwind.config.mjs         # Tailwind theme
└── package.json
```

## ✨ Fitur

- ✅ **SEO-Friendly**: Meta tags lengkap, Open Graph, Structured Data, Sitemap
- ✅ **Responsive**: Mobile-first design dengan Tailwind CSS
- ✅ **Dark Mode**: Support untuk light/dark theme
- ✅ **Performance**: Static site generation untuk kecepatan optimal
- ✅ **Modern UI**: Glassmorphism, hover effects, smooth scrolling
- ✅ **Accessibility**: Semantic HTML, proper heading hierarchy

## 🎨 Design System

### Colors

- Primary: `#195de6`
- Primary Dark: `#1045b3`
- Background Light: `#ffffff`
- Background Subtle: `#f8f9fc`
- Background Dark: `#111621`
- Text Main: `#0e121b`
- Text Muted: `#4e6797`

### Typography

- Font Family: Manrope (400, 500, 600, 700, 800)
- Icons: Material Symbols Outlined

## 🛠️ Tech Stack

- [Astro](https://astro.build/) - Static Site Generator
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Google Fonts](https://fonts.google.com/) - Manrope font
- [Material Symbols](https://fonts.google.com/icons) - Icon library

## 📦 Deployment

Build folder `dist/` dapat di-deploy ke:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- Atau hosting static lainnya

## 📄 License

© 2026 MASOQ.id. All rights reserved.
