# EyeQ Remotion demo

Programmatic 90-second EyeQ product demo.

## Commands (from repo root)

```bash
npm run video:preview
npm run video:render
npm run video:capture
```

## Commands (from `remotion/`)

```bash
npm install
npm run preview
npm run render
npm run capture
```

Output: `out/eyeq-demo.mp4` (repo root `out/`).

## Screenshots

Capture demo UI into `assets/screenshots/`:

```bash
npm run video:capture
```

Requires Playwright browsers and a running app. Optional env:

- `EYEQ_BASE_URL` / `PLAYWRIGHT_BASE_URL` (default `http://127.0.0.1:3000`)
- `DEMO_EMAIL` / `DEMO_PASSWORD` for authenticated captures
- `REMOTION_USE_SCREENSHOTS=1` when rendering to prefer live captures over mock UI

If the app is down or login fails, placeholders go to `assets/screenshots/_placeholders/`. The video uses polished in-composition mock UI by default (demo data only).

## Voiceover

See `assets/voiceover-script.md`.

## Notes

- Composition id: `EyeQDemo`
- 1920×1080 · 30fps · 90 seconds
- No live PHI · no fake production claims
- Clinical AI is described as draft / provider-review only
