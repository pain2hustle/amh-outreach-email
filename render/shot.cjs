// Full-page screenshots of the templates at 720px wide for the visual check. usage: node shot.cjs <html> <out.png>
const { chromium } = require("C:/Users/Servi/node_modules/playwright"); const fs = require("fs"), path = require("path");
const pw = path.join(process.env.LOCALAPPDATA || "C:/Users/Servi/AppData/Local", "ms-playwright");
const CHROME = process.env.CHROME || fs.readdirSync(pw).filter((d) => /^chromium-\d+$/.test(d)).map((d) => path.join(pw, d, "chrome-win64", "chrome.exe")).find(fs.existsSync) || "C:/Program Files/Google/Chrome/Application/chrome.exe";
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: CHROME });
  const p = await b.newPage({ viewport: { width: 720, height: 900 } });
  await p.goto("file:///" + path.resolve(process.argv[2]).split(path.sep).join("/"), { waitUntil: "load" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: process.argv[3], fullPage: true });
  console.log("->", process.argv[3]); await b.close();
})();
