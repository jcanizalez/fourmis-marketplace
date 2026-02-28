# Image Optimization

Images are typically the heaviest resources on a page (50-70% of total bytes). Optimize format, size, loading, and delivery for significant performance gains.

## Format Selection

| Format | Best For | Browser Support | Compression |
|--------|---------|----------------|-------------|
| **AVIF** | Photos, complex images | Chrome, Firefox, Safari 16.4+ | Best (50% smaller than JPEG) |
| **WebP** | Photos, transparency | All modern browsers | Great (25-35% smaller than JPEG) |
| **JPEG** | Photos (fallback) | Universal | Good |
| **PNG** | Transparency, sharp edges | Universal | Lossless, large files |
| **SVG** | Icons, logos, illustrations | Universal | Tiny (vector, scales perfectly) |

### Decision Flowchart
```
Is it an icon/logo/illustration?
  → YES → SVG
  → NO → Is transparency needed?
    → YES → WebP or AVIF (with PNG fallback)
    → NO → AVIF first, WebP second, JPEG fallback
```

## Responsive Images

### `<picture>` Element — Format + Size Selection

```html
<picture>
  <!-- AVIF for browsers that support it -->
  <source
    type="image/avif"
    srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  <!-- WebP fallback -->
  <source
    type="image/webp"
    srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  <!-- JPEG ultimate fallback -->
  <img
    src="hero-800.jpg"
    srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
    alt="Hero image"
    width="1200"
    height="600"
    loading="lazy"
    decoding="async"
  >
</picture>
```

### `sizes` Attribute — Tell the Browser How Wide the Image Will Be

```html
<!-- Full-width on mobile, half on desktop -->
<img sizes="(max-width: 768px) 100vw, 50vw" ...>

<!-- Fixed width sidebar image -->
<img sizes="(max-width: 768px) 100vw, 300px" ...>

<!-- Three-column grid -->
<img sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" ...>
```

## Lazy Loading

```html
<!-- Native lazy loading — below the fold images -->
<img src="photo.jpg" alt="Photo" loading="lazy" decoding="async"
     width="800" height="600">

<!-- NEVER lazy-load the LCP image -->
<img src="hero.jpg" alt="Hero" loading="eager" fetchpriority="high"
     width="1200" height="600">
```

### Intersection Observer (Custom Lazy Loading)
```typescript
// For cases where native loading="lazy" isn't sufficient
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target as HTMLImageElement;
      img.src = img.dataset.src!;
      img.removeAttribute('data-src');
      observer.unobserve(img);
    }
  });
}, { rootMargin: '200px' }); // Start loading 200px before viewport

document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
```

## Next.js Image Component

```tsx
import Image from 'next/image';

// Automatically: resizes, converts to WebP/AVIF, lazy loads, prevents CLS
<Image
  src="/photos/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority          // For LCP image — disables lazy loading, adds preload
  quality={85}      // Default is 75
  placeholder="blur" // Show blurred version while loading
  blurDataURL={blurHash} // Base64 blur placeholder
/>

// Fill mode — for unknown dimensions
<div className="relative w-full h-64">
  <Image
    src="/photos/cover.jpg"
    alt="Cover"
    fill
    className="object-cover"
    sizes="100vw"
  />
</div>
```

### next.config.ts Image Settings
```typescript
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'], // Prefer AVIF
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256], // Icon sizes
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year cache
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};
```

## Image Compression Tools

### Build-Time Compression
```bash
# sharp (Node.js — best quality/speed ratio)
npm install sharp

# Usage in a script
import sharp from 'sharp';

await sharp('input.jpg')
  .resize(1200, 600, { fit: 'cover' })
  .avif({ quality: 80 })
  .toFile('output.avif');

await sharp('input.jpg')
  .resize(1200, 600, { fit: 'cover' })
  .webp({ quality: 80 })
  .toFile('output.webp');
```

### CLI Tools
```bash
# Convert to WebP
cwebp -q 80 input.jpg -o output.webp

# Convert to AVIF
avifenc --min 20 --max 40 input.jpg output.avif

# Optimize JPEG
jpegoptim --max=85 --strip-all input.jpg

# Optimize PNG
pngquant --quality=65-80 input.png
optipng -o5 input.png

# Optimize SVG
npx svgo input.svg -o output.svg
```

### Batch Conversion Script
```bash
#!/bin/bash
# Convert all JPEGs in a directory to WebP + AVIF
for f in images/*.jpg; do
  name="${f%.jpg}"
  # WebP at 80% quality
  cwebp -q 80 "$f" -o "${name}.webp"
  # AVIF at quality range 20-40
  avifenc --min 20 --max 40 "$f" "${name}.avif"
  # Generate responsive sizes
  for size in 400 800 1200; do
    convert "$f" -resize "${size}x>" "${name}-${size}.jpg"
    cwebp -q 80 "${name}-${size}.jpg" -o "${name}-${size}.webp"
  done
done
```

## SVG Optimization

```bash
# SVGO — remove unnecessary metadata, minify
npx svgo icon.svg -o icon.min.svg

# SVGO config for best results
# svgo.config.js
export default {
  plugins: [
    'preset-default',
    'removeDimensions',  // Use viewBox instead of width/height
    { name: 'removeAttrs', params: { attrs: 'data-.*' } },
  ],
};
```

### Inline SVGs vs External
```html
<!-- External: cacheable, cleaner HTML -->
<img src="icon.svg" alt="Icon" width="24" height="24">

<!-- Inline: styleable with CSS, no extra request -->
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2L2 22h20L12 2z"/>
</svg>

<!-- SVG sprite: one request, multiple icons -->
<svg><use href="/sprites.svg#icon-home" /></svg>
```

## Image CDN

Use an image CDN for automatic optimization, resizing, and format negotiation:

```html
<!-- Cloudinary -->
<img src="https://res.cloudinary.com/demo/image/upload/w_800,f_auto,q_auto/photo.jpg">

<!-- imgix -->
<img src="https://demo.imgix.net/photo.jpg?w=800&auto=format,compress">

<!-- Vercel Image Optimization (built into Next.js) -->
<!-- Automatic when using next/image component -->
```

## Image Performance Checklist

1. [ ] Use AVIF/WebP with JPEG fallback (use `<picture>` or Next.js Image)
2. [ ] Set explicit `width` and `height` on all images (prevents CLS)
3. [ ] Use `loading="lazy"` on below-the-fold images
4. [ ] Use `fetchpriority="high"` and `loading="eager"` on the LCP image
5. [ ] Preload the LCP image: `<link rel="preload" as="image" href="...">`
6. [ ] Serve responsive sizes with `srcset` + `sizes`
7. [ ] Compress images (sharp, squoosh, or CDN)
8. [ ] Use SVG for icons and logos (optimize with SVGO)
9. [ ] Set far-future `Cache-Control` headers for static images
10. [ ] Use `decoding="async"` on non-critical images
