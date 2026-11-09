// Renders the REAL AMH front-end modules (sun-lab.js WebGL sun, space-kit.js three.js globe + sky) in headless Chromium
// (ANGLE/SwiftShader) and captures deterministic frame sequences with Playwright's fake clock, then assembles GIFs with ffmpeg.
// usage: node render.cjs <job|all> [--frames N] [--step MS] [--still]   jobs: hero sun globe
const { chromium } = require("C:/Users/Servi/node_modules/playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const { start } = require("./serve.cjs");

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const pw = path.join(process.env.LOCALAPPDATA || "C:/Users/Servi/AppData/Local", "ms-playwright");
  try {
    const dirs = fs.readdirSync(pw).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split("-")[1] - +a.split("-")[1]);
    for (const d of dirs) { const p = path.join(pw, d, "chrome-win64", "chrome.exe"); if (fs.existsSync(p)) return p; }
  } catch {}
  return "C:/Program Files/Google/Chrome/Application/chrome.exe";
}
const CHROME = findChrome();
const ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const OUT = path.join(__dirname, "..", "out");
const JOBS = {
  hero: { page: "hero.html?met=1", w: 720, h: 360, clip: { x: 0, y: 0, width: 680, height: 360 }, frames: 24, step: 125, warm: 4200, flareAt: 1, needGlobe: true, needSun: true, gif: { colors: 256, maxKB: 1200 }, out: "space-globe" },
  sun: { page: "sun.html", w: 1600, h: 300, clip: { x: 0, y: 0, width: 560, height: 300 }, frames: 16, step: 125, warm: 3000, flareAt: 0, needSun: true, gif: { colors: 224, maxKB: 700 }, out: "sun" },
  globe: { page: "globe.html?met=1", w: 240, h: 240, frames: 24, step: 125, warm: 3600, needGlobe: true, gif: { colors: 192, maxKB: 600 }, out: "globe", round: true },
};
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : d; };
const which = argv[0] && !argv[0].startsWith("--") ? argv[0] : "all";
const STILL = argv.includes("--still"), ASSEMBLE = argv.includes("--assemble"); // --assemble: skip capture, rebuild GIFs from out/<job>/f*.png
const GIFSICLE = [path.join(__dirname, "node_modules"), path.join(__dirname, "..", "node_modules")].map((d) => path.join(d, "gifsicle", "vendor", "gifsicle.exe")).find(fs.existsSync) || "gifsicle";
const sharp = require("C:/Users/Servi/node_modules/sharp");

async function runJob(browser, port, name, J) {
  const dir = path.join(OUT, name);
  const frames = +opt("--frames", J.frames), step = +opt("--step", J.step);
  if (ASSEMBLE) return assemble(name, J, dir, fs.readdirSync(dir).filter((f) => /^f\d+\.png$/.test(f)).length, step);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: J.w, height: J.h }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`[${name} console]`, m.text()); });
  page.on("pageerror", (e) => console.log(`[${name} pageerror]`, e.message));
  await page.clock.install({ time: new Date("2026-11-09T12:00:00Z") });
  const extra = opt("--q", ""); await page.goto(`http://127.0.0.1:${port}/harness/${J.page}${extra ? (J.page.includes("?") ? "&" : "?") + extra : ""}`, { waitUntil: "load" });
  // let the fake rAF/timers tick so modules boot, textures load over the (real) network
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    await page.clock.runFor(100);
    const ok = await page.evaluate(({ g, s }) => (!g || !!document.querySelector(".space-ready")) && (!s || !!window.__sun), { g: !!J.needGlobe, s: !!J.needSun });
    if (ok) break;
  }
  const state = await page.evaluate(() => ({ ready: !!document.querySelector(".space-ready"), sun: !!window.__sun, sunCanvas: !!document.querySelector("canvas.sun-gl"), globeCanvas: !!document.querySelector("canvas.space-globe-cv") }));
  console.log(`[${name}] boot`, JSON.stringify(state));
  if ((J.needGlobe && !state.ready) || (J.needSun && !state.sunCanvas)) throw new Error(`${name}: modules did not come up (WebGL?)`);
  // warm up: stars/meteors/dust start, the Earth turns a bit, then force a flare so the sequence has one
  for (let t = 0; t < J.warm; t += 100) await page.clock.runFor(100);
  if (STILL) { await page.clock.runFor(500); await page.screenshot({ path: path.join(dir, "still.png"), clip: J.clip }); console.log(`[${name}] still ->`, path.join(dir, "still.png")); await ctx.close(); return; }
  for (let i = 0; i < frames; i++) {
    if (J.needSun && i === J.flareAt) await page.evaluate(() => window.__sun.flare(1));
    await page.clock.runFor(step);
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(3, "0")}.png`), clip: J.clip });
  }
  await ctx.close();
  await assemble(name, J, dir, frames, step);
}

// GIF: ffmpeg palettegen/paletteuse (no dither: the shader noise + star twinkle already break up banding and dither bloats
// LZW), then gifsicle -O3 --lossy to get under the size cap. round: alpha-mask the frames to a circle first.
async function assemble(name, J, dir, frames, step) {
  const fps = Math.round(1000 / step), outName = J.out || name, gif = path.join(OUT, `${outName}.gif`), still = path.join(OUT, `${outName}.png`);
  let pattern = path.join(dir, "f%03d.png"), alpha = "";
  if (J.round) {
    const r = J.w / 2, mask = Buffer.from(`<svg width="${J.w}" height="${J.h}"><circle cx="${r}" cy="${J.h / 2}" r="${r}" fill="#fff"/></svg>`);
    for (let i = 0; i < frames; i++) { const f = path.join(dir, `f${String(i).padStart(3, "0")}.png`); await sharp(f).composite([{ input: mask, blend: "dest-in" }]).png().toFile(path.join(dir, `r${String(i).padStart(3, "0")}.png`)); }
    pattern = path.join(dir, "r%03d.png"); alpha = ":reserve_transparent=1";
  }
  const stillIdx = Math.min(frames - 1, J.flareAt != null ? J.flareAt + 3 : 10);
  fs.copyFileSync(path.join(dir, `${J.round ? "r" : "f"}${String(stillIdx).padStart(3, "0")}.png`), still);
  const vf = `split[a][b];[a]palettegen=max_colors=${J.gif.colors}:stats_mode=diff${alpha}[p];[b][p]paletteuse=dither=none:diff_mode=rectangle${J.round ? ":alpha_threshold=128" : ""}`;
  const raw = path.join(dir, "raw.gif");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", pattern, "-vf", vf, "-loop", "0", raw]);
  for (const lossy of [40, 60, 80, 110, 150]) {
    execFileSync(GIFSICLE, ["-O3", `--lossy=${lossy}`, raw, "-o", gif]);
    const kb = fs.statSync(gif).size / 1024;
    console.log(`[${name}] ${gif} ${kb.toFixed(0)} KB (colors=${J.gif.colors}, lossy=${lossy}, ${frames}f @ ${fps}fps, raw ${(fs.statSync(raw).size / 1024).toFixed(0)} KB)`);
    if (kb <= J.gif.maxKB) break;
  }
}

(async () => {
  const srv = await start(0); const port = srv.address().port;
  const browser = ASSEMBLE ? null : await chromium.launch({ headless: true, args: ARGS, executablePath: CHROME });
  try {
    for (const [name, J] of Object.entries(JOBS)) if (which === "all" || which === name) await runJob(browser, port, name, J);
  } finally { if (browser) await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
