# PWA Icons

This folder should contain the following icon files for the PWA manifest:

## Required Icons

| File | Size | Purpose |
|------|------|---------|
| `icon-72x72.png` | 72x72 | Small icon |
| `icon-96x96.png` | 96x96 | Medium icon |
| `icon-128x128.png` | 128x128 | Medium icon |
| `icon-144x144.png` | 144x144 | Medium icon |
| `icon-152x152.png` | 152x152 | iOS icon |
| `icon-192x192.png` | 192x192 | Android icon |
| `icon-384x384.png` | 384x384 | Large icon |
| `icon-512x512.png` | 512x512 | Splash screen |
| `apple-touch-icon.png` | 180x180 | iOS home screen |
| `favicon-32x32.png` | 32x32 | Browser favicon |
| `favicon-16x16.png` | 16x16 | Browser favicon |

## Generating Icons

You can use tools like:

1. **RealFaviconGenerator** (https://realfavicongenerator.net/)
2. **PWA Asset Generator** (`npx pwa-asset-generator`)
3. **Figma/Sketch** export

### Using PWA Asset Generator

```bash
npx pwa-asset-generator ./logo.svg ./public/icons --manifest ./public/manifest.json
```

### Design Guidelines

- Use a simple, recognizable design
- Ensure the icon works at small sizes
- Use the app's primary color (#228be6) as the background
- Consider using a wallet/piggy bank icon to represent budgeting
- Icons should be square with no padding (the system adds padding)

## Recommended Design

For a budgeting app, consider using:
- A wallet icon
- A piggy bank
- A simple "B" monogram
- Chart/graph symbol representing finances
