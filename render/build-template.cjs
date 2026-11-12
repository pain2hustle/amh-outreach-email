// Builds browser references: ../template-v3.html (data URIs) and ../template-v3-hosted.html (GitHub URLs).
// For email MIME packaging use ../build_email.py; do not submit a data-URI preview as an email body.
// from template-src.html + ../assets/. usage: node build-template.cjs
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), ASSETS = path.join(ROOT, "assets");
const RAW = "https://raw.githubusercontent.com/pain2hustle/amh-outreach-email/main/assets/";
const MIME = { ".gif": "image/gif", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg" };
const src = fs.readFileSync(path.join(__dirname, "template-src.html"), "utf8");
const used = new Set();
const sub = (fn) => src.replace(/\{\{ASSET:([^}]+)\}\}/g, (_, f) => { used.add(f); return fn(f); });
const inline = sub((f) => { const p = path.join(ASSETS, f); if (!fs.existsSync(p)) throw new Error("missing asset " + f); return `data:${MIME[path.extname(f)]};base64,${fs.readFileSync(p).toString("base64")}`; });
const hosted = sub((f) => RAW + f);
fs.writeFileSync(path.join(ROOT, "template-v3.html"), inline);
fs.writeFileSync(path.join(ROOT, "template-v3-hosted.html"), hosted);
for (const f of used) console.log(f, (fs.statSync(path.join(ASSETS, f)).size / 1024).toFixed(0) + " KB");
console.log("template-v3.html", (fs.statSync(path.join(ROOT, "template-v3.html")).size / 1024).toFixed(0) + " KB");
console.log("template-v3-hosted.html", (fs.statSync(path.join(ROOT, "template-v3-hosted.html")).size / 1024).toFixed(0) + " KB");
