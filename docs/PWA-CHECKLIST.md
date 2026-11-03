# PWA Checklist — RubyOrbit Messages

Goal: one Next.js app that works in the browser and can be installed on phones (Android and iPhone) as an app.

## 1. Required (installable PWA)

- [x] **Manifest file** — `app/manifest.ts` with:
  - `name`, `short_name`, `description`
  - `start_url: "/inbox"`
  - `display: "standalone"`
  - `background_color`, `theme_color` (ruby red `#B0123B`)
  - `icons`
- [x] **Icons** (made from the new logo):
  - 192x192 and 512x512 PNG
  - 512x512 maskable icon (Android)
  - `apple-touch-icon` 180x180 (iPhone)
- [x] **Service worker** — `public/sw.js` with a fetch handler (needed for install)
- [x] **Register the service worker** — in the layout or a small client component
- [x] **Layout metadata** — in `app/layout.tsx`: `themeColor`, `viewport`, `appleWebApp`, manifest link
- [ ] **HTTPS deployment** — required for install on phones (e.g. Vercel)

## 2. Better user experience

- [x] **Offline page** — show "You're offline" instead of a white screen
- [x] **Install button** — in-app "Install app" button (`beforeinstallprompt`)
- [x] **iPhone install hint** — "Share → Add to Home Screen" guide, since Safari has no install prompt
- [x] **Mobile responsive UI** — inbox, chat and menus work on phone screens
- [x] **Safe-area padding** — for the iPhone notch and bottom bar

## 3. Messaging features (optional, after Phase 2)

- [x] **Push notifications** (infrastructure done; sending on new messages comes with Phase 2)
  - [x] Generate VAPID keys
  - [x] Save push subscriptions in Supabase
  - [x] Send pushes from the server (`web-push` library)
  - [x] Handle `push` and `notificationclick` in the service worker
- [ ] **Badge count** — unread messages on the app icon
- [ ] **Background cache** — show old conversations offline

## 4. Testing

- [ ] Chrome DevTools → Application → check Manifest and Service Workers
- [ ] Run a Lighthouse PWA audit
- [ ] Install and test on a real Android phone and a real iPhone

## Notes

- `proxy.ts` already excludes `manifest.webmanifest`, `sw.js` and `icons/` from its matcher, so those files will not be redirected to login.
- iPhone push notifications only work when the app is installed to the Home Screen (iOS 16.4+).
- Suggested order: sections 1 and 2 first, section 3 after messaging is built.
