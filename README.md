# AMH creator outreach email — template v3

Austin's creator-outreach email (AMH Site Revival), v3: the same copy, links, Stripe buttons and
chase-box styling as v2, with the visuals replaced by renders of the **real AMH site code**:

- **Hero banner** `assets/space-globe.gif` (680x360, 24 frames @ 8 fps): the live `amhagentbook.com/poem`
  WebGL sun (`/poem/space/sun.js`, flare forced) composited in one page with the Site Revival space kit
  (`/poem/space/space-kit.js` + three.js): rotating Earth, asteroid turntables, meteors burning up, star field
  and shooting stars. Nothing is drawn by hand; the modules run unchanged in headless Chromium (ANGLE/SwiftShader).
- **Sun** `assets/sun.gif` (560x300, 16 frames) — the same sun on its own, with corona room.
- **Globe** `assets/globe.gif` (240x240, round, 24 frames) — Earth + rocks + sky on its own.
- **Header badge** `assets/header-amh-badge-112.png` — the real header badge (`header-amh-badge-192.webp`, brightened
  ~30%) shown at 56px, linked to amhsiterevival.com.
- **Footer** `assets/movie-amh-badge-anim.gif` — the real animated badge ("logo movie"), 144px.

## Files

| file | what |
| --- | --- |
| `template-v3.html` | drop-in version, every image inline as a base64 data URI (preview in a browser, paste into Gmail) |
| `template-v3-hosted.html` | same markup, images loaded from `raw.githubusercontent.com/pain2hustle/amh-outreach-email/main/assets/` |
| `template-v2.html` | the previous version, for reference |
| `assets/` | GIFs, PNG stills, badge files, client sample images |
| `render/` | harness pages + scripts that regenerate everything |

## Regenerate

Needs Node 20+, `ffmpeg` on PATH, Playwright + sharp (the scripts require them from `C:/Users/Servi/node_modules`;
edit the two `require(...)` paths if yours differ), a Playwright Chromium, and the front-end copy
`D:/agent-work/amh-ui-reference` (public: github.com/pain2hustle/amh-ui-reference).

```
cd render
npm i                              # gifsicle binary (lossy LZW keeps the GIFs under the email caps)
node render.cjs all                # captures frames with Playwright's fake clock, assembles ../out/*.gif + .png
node render.cjs hero --still       # one frame of a harness for layout checks
node render.cjs all --assemble     # re-encode the GIFs from the captured frames only
node build-template.cjs            # ../out assets -> copy into ../assets, then builds template-v3*.html
node shot.cjs ../template-v3.html ../out/shot-v3.png
```

`render/serve.cjs` serves the `amhagentbook.com` copy at `/` so `/poem/space/space-kit.js`, textures and the vendor three.js
resolve exactly as on the live site. `/poem/space/sun.js` is missing from the repo copy, so it was fetched once from the live
site into `render/live-fetch/` (it differs from `/poem/lab/bg/sun-lab.js` only in `layout()`: the poem version keeps the whole
disk on screen, the lab version is a big sun half off the left edge).

Harness-only presentation choices (the modules themselves are untouched): the sun layer is CSS-scaled 1.5x about the sun
centre, `data-hero="c"` picks the poem page's fully-visible sun position, `?met=1` makes meteors frequent, and the globe
box / `data-fill` size the Earth. GIFs: ffmpeg palettegen/paletteuse without dither, then `gifsicle -O3 --lossy=40`.
