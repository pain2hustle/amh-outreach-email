const { chromium } = require("C:/Users/Servi/node_modules/playwright");
const args = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
(async () => {
  const b = await chromium.launch({ headless: true, args, executablePath: "C:/Users/Servi/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe" });
  const p = await b.newPage();
  await p.setContent("<canvas id=c></canvas>");
  const r = await p.evaluate(() => {
    const gl = document.getElementById("c").getContext("webgl", { alpha: true });
    if (!gl) return "NO WEBGL";
    const d = gl.getExtension("WEBGL_debug_renderer_info");
    return { vendor: gl.getParameter(d ? d.UNMASKED_VENDOR_WEBGL : gl.VENDOR), renderer: gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER), gl2: !!document.createElement("canvas").getContext("webgl2") };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
