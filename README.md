# AMH creator outreach email

## Current sending path — 12 November 2026

Use `build_email.py` for new first-contact messages. It retains the original animated
AMH sun/globe and badge art, supplies plain-text and HTML alternatives, and embeds
images as named inline CID parts under `multipart/related`. It builds an `.eml`, a
Gmail connector MIME payload and a browser preview. **It does not send anything.**

```powershell
python build_email.py --to owner@example.com --name "Creator name" --preview https://example.com/preview/
python -m unittest -v test_email.py
```

The first-contact copy has one preview link and a reply invitation. The existing v3
pricing, payment buttons and sample links remain below/in the legacy templates for a
requested follow-up; they are not all loaded into the initial invitation. The new copy
does not claim that private noindex previews are already indexed or promise rankings,
400k daily views or a Google Knowledge Panel. A recipient can reply “no thanks”; check
those replies and suppress further outreach to that address before any subsequent send.

`--mode links --to artificialmindhive@gmail.com` builds Austin's requested link-report
email with the creator landing page and directory. Select Recent in the directory for
the new pages. This mode is for Austin's report, not creator outreach.

### Delivery evidence required for Muse and other senders

- Keep the authenticated Gmail identity; do not spoof a sender or rotate accounts to
  evade a rejection. Check Sent and replies before sending to avoid duplicates.
- Only send when Austin has authorized that message/recipient. The builder is not a
  send authorization and does not resume any existing outreach batch.
- Use the generated MIME tree as the message itself, not a forwarded `.eml` attachment,
  and do not paste the browser-only `data:image` template as an API email body.
- Record the returned Gmail ID **and the RFC Message-ID from a readback**. “SENT”, a
  self-message “INBOX” label, or absence of a bounce is not proof of recipient delivery.
- Check new delivery notices against the exact original RFC Message-ID. A later failure
  overrides the initial send response. `delivery_status.classify()` implements this rule.
- A permanent 5.x failure is not an automatic retry. A 5.7.1 policy failure pauses the
  affected batch for diagnosis; do not continue sending the same rejected message.
- Validate a requested controlled send in an independently read recipient inbox, then
  check images and links. Until then record `provider_accepted_delivery_unconfirmed`.

### What this repair establishes

The inspected initial group contained 77 illustrated sends around 1 MB and five small
text sends. Earlier and later illustrated samples carried the same seven image sizes
with complete CID references. Later failures included a 1 MB forwarded illustration
and a 1.8 KB text email. An image-free link report also received a late 5.7.1 rejection.
These observations do not establish an attachment-size limit or identify Google's
private filtering rule. The changes improve message structure, accurate copy and
delivery accounting; they do not guarantee inbox placement or override recipient policy.

References: [Google sender guidelines](https://support.google.com/mail/answer/81126),
[Gmail API MIME messages](https://developers.google.com/workspace/gmail/api/guides/sending),
[rejected messages](https://support.google.com/mail/answer/69585).

## Preserved v3 artwork and follow-up templates

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
| `template-v3.html` | browser reference with base64 data URI images; do not submit directly as an API email body |
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
