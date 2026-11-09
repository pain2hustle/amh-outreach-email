// Tiny static server: serves the REAL amhagentbook.com front-end copy at / (so /poem/space/space-kit.js,
// /poem/lab/bg/sun-lab.js, textures and the three.js vendor module resolve exactly like on the live site)
// and this render/ folder at /harness/.
const http = require("http"), fs = require("fs"), path = require("path");
const REF = process.env.AMH_REF || "D:/agent-work/amh-ui-reference/amhagentbook.com";
const HARNESS = __dirname;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".gif": "image/gif", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon" };
function start(port = 8765) {
  const srv = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split("?")[0]);
    let file = u.startsWith("/harness/") ? path.join(HARNESS, u.slice(9)) : path.join(REF, u);
    if (u.endsWith("/")) file = path.join(file, "index.html");
    // files the repo copy is missing but the live site serves (fetched once with curl into live-fetch/, see README)
    if (!fs.existsSync(file) && u.startsWith("/poem/space/")) { const alt = path.join(HARNESS, "live-fetch", path.basename(u)); if (fs.existsSync(alt)) file = alt; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end("404 " + u); if (process.env.LOG404) console.log("404", u); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(buf);
    });
  });
  return new Promise((ok) => srv.listen(port, "127.0.0.1", () => ok(srv)));
}
module.exports = { start };
if (require.main === module) start(+process.argv[2] || 8765).then((s) => console.log("serving on", s.address().port));
