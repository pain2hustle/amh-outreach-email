// AMH UFO Field — live sun (WebGL), ported from Site Revival (revival/game/sun.js) to amhagentbook.com/poem.
// Poem-page changes only: host = the fixed full-bleed .sun-layer behind all content, the canvas covers the whole screen with the
// sun up high near the top-right (uC = sun centre), render scale capped for phones, ~30 fps on phones, paused in hidden tabs.
// Original header:
// Photosphere: animated granulation cells + supergranule mottling + 2 rotating sunspot groups + faculae,
// limb darkening (quadratic law) with a temperature gradient (white-gold core -> orange limb).
// Limb: chromosphere rim, spicule fringe, domain-warped prominences. Corona: radial streamers, 1/r^3 falloff.
// Events: pulse (granular brightness breathing), random flares (white-hot kernel + coronal burst/CME shell),
// and a big "sun-out" eruption every ~3rd flare. Light spill is shared with the host page (--amhSunI).
(function () {
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const host = document.querySelector(".sun-layer");
  if (!host) return;
  const cv = document.createElement("canvas");
  cv.className = "sun-gl";
  cv.setAttribute("aria-hidden", "true");
  host.appendChild(cv);
  const spill = document.createElement("div");
  spill.className = "sun-spill";
  host.insertBefore(spill, host.firstChild.nextSibling);
  const gl = cv.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
  const old = document.querySelector(".summit .sun-img");
  if (!gl) { cv.remove(); return; } // keep the old sprite as fallback
  if (old) old.style.display = "none";

  const VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const FS = `precision highp float;
uniform vec2 uRes,uC;uniform float uR,uT,uPulse;uniform vec4 uF;uniform float uEdge;
float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.103,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float fbm3(vec3 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*vn(p);p=p*2.07+vec3(5.1,1.3,7.7);a*=.5;}return s;}
// animated cellular noise -> granules (bright cell centres, dark intergranular lanes)
float cells(vec2 p,float t){vec2 i=floor(p),f=fract(p);float d1=8.,d2=8.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y);vec2 o=h22(i+g);o=.5+.42*sin(t*.55+6.2831*o);
  float d=length(g+o-f);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
 return clamp(1.-d1*1.1,0.,1.)*.7+clamp((d2-d1)*1.2,0.,1.)*.3;}
float spot(vec3 s,vec3 c,float r){float d=acos(clamp(dot(s,c),-1.,1.));return 1.-smoothstep(r*.55,r,d);}
void main(){
 vec2 p=(gl_FragCoord.xy-uC)/uR;float r=length(p);float ang=atan(p.y,p.x);float t=uT;
 float fl=uF.w*smoothstep(0.,.12,uF.y)*exp(-uF.y*1.25);      // flare flash envelope
 vec2 fdir=vec2(cos(uF.x),sin(uF.x));
 vec3 col=vec3(0.);
 if(r<1.){
  float mu=sqrt(1.-r*r);vec3 s=vec3(p,mu);
  float rot=t*.018;float cr=cos(rot),sr=sin(rot);vec3 q=vec3(cr*s.x+sr*s.z,s.y,-sr*s.x+cr*s.z);
  float lon=atan(q.x,q.z),lat=asin(clamp(q.y,-1.,1.));
  float g=cells(vec2(lon,lat)*10.,t);float g2=cells(vec2(lon,lat)*23.+7.,t*1.3);
  float sup=fbm(q*3.2+vec3(0.,0.,t*.03));
  float limb=1.-.62*(1.-mu)-.22*(1.-mu)*(1.-mu);
  vec3 hot=vec3(1.,.86,.56),warm=vec3(1.,.42,.08);
  vec3 base=mix(hot,warm,pow(1.-mu,.6));
  float gran=.8+.16*g+.08*g2;gran=mix(1.,gran,.35+.65*mu);   // granulation fades toward the limb (foreshortening)
  float I=limb*gran*(.86+.26*sup);
  // two active regions carried by rotation: umbra + penumbra, faculae ring
  vec3 c1=normalize(vec3(.35,.22,.9)),c2=normalize(vec3(-.55,-.28,.78));
  float u1=spot(q,c1,.035),u2=spot(q,c2,.025),pe1=spot(q,c1,.075),pe2=spot(q,c2,.055);
  I*=1.-.3*max(pe1,pe2)-.4*max(u1,u2);
  float fac=smoothstep(.55,.75,fbm3(q*9.))*(1.-mu)*.5+ (pe1+pe2)*.12*(1.-mu);
  I+=fac;
  col=base*I*2.3*uPulse;
  // flare kernel (white-hot) near the limb at the flare angle
  vec2 fp=fdir*.86;col+=vec3(1.,.97,.9)*exp(-length(p-fp)*16.)*fl*3.2;
  col*=1.+.12*fl;
 }
 float h=max(r-1.,0.);
 // chromosphere + spicule fringe
 float fr=fbm3(vec3(ang*38.,h*20.,t*.4));
 col+=vec3(1.,.38,.22)*exp(-h/.012)*(.6+.6*fr)*step(.995,r)*.75;
 // prominences: domain-warped plasma arcs on a few sectors of the limb
 vec3 pp=vec3(ang*3.2,h*5.5-t*.035,t*.05);
 float w=fbm3(pp*1.3+vec3(3.,1.,0.));
 float pr=fbm(pp+vec3(w*1.2,w*.6,0.));
 float sect=smoothstep(.45,.75,vn(vec3(ang*1.6+11.,0.,t*.01)));
 float rid=1.-abs(2.*pr-1.);float prom=(pow(rid,7.)*1.4+smoothstep(.6,.8,pr)*.5)*sect*exp(-h/.15)*smoothstep(0.,.012,h);
 col+=vec3(1.,.36,.18)*prom*2.3;
 // corona: radial streamers with slow outflow
 float lr=log(max(r,1.));
 float st=fbm(vec3(ang*4.5,lr*1.2-t*.02,1.3));float st2=fbm3(vec3(ang*14.,lr*3.-t*.05,4.2));
 float cor=pow(max(r,1.),-3.1)*(.38+.85*st*st+.25*st2);
 col+=vec3(1.,.86,.68)*cor*.62*(1.+.7*fl)*step(.99,r)*uPulse;
 // coronal burst (CME shell) from the flare site
 if(uF.w>0.){
  float front=1.+uF.y*(.5+.4*uF.z)*(.82+.36*vn(vec3(ang*4.,uF.y*.8,5.)))+.015*sin(ang*11.+uF.y*3.)*uF.y;
  float da=abs(atan(sin(ang-uF.x),cos(ang-uF.x)));
  float cone=1.-smoothstep(.12+.18*uF.z+.08*uF.y,.42+.3*uF.z+.12*uF.y,da);
  float tex=fbm(vec3(ang*9.,r*3.2-uF.y*2.4,uF.y*.6));float tex2=fbm3(vec3(ang*26.,r*7.-uF.y*4.,2.));
  float body=smoothstep(front+.08,front-.35-.25*uF.y,r)*smoothstep(1.,1.12,r);   // filled plume behind the front
  float rim=exp(-pow((r-front)/(.07+uF.y*.04),2.));                            // brighter leading edge
  float fil=pow(1.-abs(2.*tex2-1.),5.);float dens=(body*.24+rim*.75)*cone*(pow(tex,2.2)*1.6+fil*.8);
  float fade=smoothstep(0.,.12,uF.y)*exp(-uF.y*(.6-.18*uF.z));
  col+=mix(vec3(1.,.6,.3),vec3(1.,.82,.55),rim)*dens*fade*uF.w*(.8+.9*uF.z)*step(1.,r)*1.5;
  // post-flare loop arcade at the base
  col+=vec3(1.,.5,.25)*exp(-pow((r-1.-.07-.1*uF.z)/.05,2.))*(1.-smoothstep(.05,.22,da))*fade*.9*uF.w*(.6+.4*tex2);
 }
 // optical glow (camera bloom) + faint anamorphic streak, all fading before the canvas edge
 col+=vec3(1.,.7,.4)*(.42*exp(-h*2.4)+.1/(1.+h*h*5.))*uPulse*(1.+.6*fl);
 col+=vec3(1.,.82,.62)*exp(-abs(p.y)*26.)*exp(-abs(p.x)*.95)*.16*(1.+fl);
 float edge=smoothstep(uEdge,uEdge*.7,r)*smoothstep(uEdge,uEdge*.8,abs(p.x));
 col*=edge;
 col=1.-exp(-col*1.1);
 float al=clamp(max(col.r,max(col.g,col.b))*1.15,0.,1.);if(r<1.)al=1.;
 gl_FragColor=vec4(col,al);
}`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn("[sun]", e); cv.remove(); if (old) old.style.display = ""; return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["uRes", "uC", "uR", "uT", "uPulse", "uF", "uEdge"].forEach((k) => (U[k] = gl.getUniformLocation(prog, k)));

  let R = 34, dpr = 1, scale = 1, phone = false;
  function layout() {
    const W = innerWidth, H = innerHeight; phone = W < 700;
    R = phone ? 30 : 46;
    let x = phone ? W * 0.16 : W * 0.95; let y = phone ? Math.max(430, H * 0.52) : 78;
    const hero = document.documentElement.getAttribute("data-hero");
    if (!phone && hero === "b") { x = W * 0.86; y = H * 0.2; } else if (!phone && hero === "c") { x = W * 0.12; y = Math.max(180, H * 0.24); } /* Austin 10-15: sun fully below the header */
    // the corona/flares may reach across the whole screen: edge fade at the farthest screen corner (in sun radii)
    const far = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
    const EDGE = far / R + 0.5;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    // full-screen fragment shader: cap the pixel count (phones ~0.2 MP, desktop ~0.9 MP); the corona is soft, the disk stays crisp enough
    scale = Math.min(dpr, Math.sqrt((phone ? 200000 : 560000) / (W * H)));
    if (/[?&]perf=1/.test(location.search)) { dpr = 1; scale = Math.min(1, scale) * (W >= 1366 ? 0.75 : 1); } /* poem: ?perf=1 test */
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
    cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;";
    document.documentElement.style.setProperty("--sunX", x.toFixed(1) + "px");
    document.documentElement.style.setProperty("--sunY", y.toFixed(1) + "px");
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform2f(U.uC, x * scale, (H - y) * scale); gl.uniform1f(U.uR, R * scale); gl.uniform1f(U.uEdge, EDGE);
  }
  layout(); addEventListener("resize", layout);
  const label = document.querySelector(".summit-label"); if (label) label.style.display = "none";


  // ---- sun dust: each flare throws plasma clumps that stream DOWN the screen toward the viewer (growing as they
  // "approach", perspective spread), or sweep down-then-LEFT across the headline, or both. Clumps travel together,
  // then slow and linger (accumulate) before fading. Low alpha over text; capped for phones.
  const dust = (() => {
    const c = document.createElement("canvas"); c.className = "sun-dust"; c.setAttribute("aria-hidden", "true"); host.appendChild(c);
    const x = c.getContext("2d");
    const spr = document.createElement("canvas"); spr.width = spr.height = 64;
    { const sx = spr.getContext("2d"), g = sx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,244,222,1)"); g.addColorStop(0.22, "rgba(255,196,128,.6)"); g.addColorStop(0.55, "rgba(255,140,64,.14)"); g.addColorStop(1, "rgba(255,110,40,0)");
      sx.fillStyle = g; sx.fillRect(0, 0, 64, 64); }
    let W = 0, H = 0, dp = 1, phone = false, CAP = 220, dim = [];
    const P = [];
    function size() {
      W = host.clientWidth; H = host.offsetHeight; phone = W < 700; CAP = phone ? 90 : 220; dp = Math.min(devicePixelRatio || 1, 1.5);
      c.width = Math.round(W * dp); c.height = Math.round(H * dp);
      const hr = host.getBoundingClientRect();
      dim = []; void hr;
    }
    size(); new ResizeObserver(size).observe(host);
    const rnd = (a, b) => a + Math.random() * (b - a);
    function burst(big, force) {
      const cs = getComputedStyle(document.documentElement);
      const sx = parseFloat(cs.getPropertyValue("--sunX")) || W * 0.74, sy = parseFloat(cs.getPropertyValue("--sunY")) || 116;
      const r0 = Math.random(), mode = force || (r0 < 0.4 ? "down" : r0 < 0.72 ? "left" : "both");
      const clumps = Math.round((phone ? 2 : 4) * (1 + big * 0.8));
      const sc = phone ? 0.7 : 1;
      for (let k = 0; k < clumps; k++) {
        const m = mode === "both" ? (k % 2 ? "down" : "left") : mode;
        let vx, vy, ax, ay;
        if (m === "down") { const a = Math.PI / 2 + rnd(-0.45, 0.3); const sp = rnd(105, 175) * sc; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; ax = vx * 0.22; ay = 26 * sc; }
        else { vx = rnd(-55, -20) * sc; vy = rnd(115, 165) * sc; ax = rnd(-175, -120) * sc; ay = -rnd(42, 62) * sc; }
        const n = Math.round(rnd(9, 16) * (phone ? 0.6 : 1) * (0.8 + big * 0.4)), delay = k * rnd(0.1, 0.22);
        for (let i = 0; i < n && P.length < CAP; i++) {
          P.push({ x: sx + rnd(-10, 10), y: sy + rnd(-10, 10), vx: vx + rnd(-16, 16) * sc, vy: vy + rnd(-16, 16) * sc, ax, ay, age: -delay - rnd(0, 0.12),
            life: rnd(4.5, 7.5), s: rnd(1.1, 2.4) * (phone ? 0.85 : 1), w: Math.random() });
        }
      }
    }
    const inDim = (px, py) => { for (const r of dim) if (px > r[0] && px < r[2] && py > r[1] && py < r[3]) return true; return false; };
    function frame(dt) {
      x.setTransform(dp, 0, 0, dp, 0, 0); x.clearRect(0, 0, W, H);
      if (!P.length) return;
      x.globalCompositeOperation = "lighter";
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        if (p.age < 0) { p.age += dt; continue; }
        p.age += dt; const k = p.age / p.life;
        if (k >= 1 || p.y > H + 40 || p.x < -60) { P.splice(i, 1); continue; }
        const travel = k < 0.55 ? 1 : 0.15;                       // after ~half its life the clump stalls and lingers
        p.vx += p.ax * dt * travel; p.vy += p.ay * dt * travel;
        if (k > 0.55) { const f = Math.pow(0.32, dt); p.vx *= f; p.vy *= f; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        const r = p.s * (1 + 2.8 * Math.min(1, k * 1.6)) * 3;     // grows as it "approaches"
        let a = Math.min(1, p.age * 6) * Math.pow(1 - k, 1.25) * (0.55 + 0.35 * p.w);
        if (inDim(p.x, p.y)) a *= 0.38;
        x.globalAlpha = a; x.drawImage(spr, p.x - r, p.y - r, r * 2, r * 2);
      }
      x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    }
    return { burst, frame, get count() { return P.length; } };
  })();
  // flare scheduler
  let flare = { ang: 0, start: -100, big: 0, on: 0 }, nextFlare = 2.2, nFlares = 0;
  function newFlare(t) {
    nFlares++;
    const big = nFlares % 3 === 0 ? 1 : Math.random() * 0.35;
    flare = { ang: Math.random() * Math.PI * 2, start: t, big, on: 0.75 + Math.random() * 0.35 + big * 0.3 };
    nextFlare = t + (big > 0.9 ? 9 : 5) + Math.random() * 6;
    if (!REDUCE) dust.burst(big);
  }
  let parentRoot = null;
  try { if (window.parent !== window && window.parent.document) parentRoot = window.parent.document.documentElement; } catch (e) {}

  const t0 = performance.now(); let lastPush = 0, visible = true;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
  window.__sun = { flare: (big) => { newFlare((performance.now() - t0) / 1000); if (big) flare.big = 1; }, get state() { return flare; }, dust };
  let lastF = performance.now();
  let lastDraw = 0;
  function frame(now) {
    if (!REDUCE && (!visible || (phone && now - lastDraw < 31))) { requestAnimationFrame(frame); return; }
    lastDraw = now;
    const t = (now - t0) / 1000;
    if (t > nextFlare) newFlare(t);
    const age = t - flare.start;
    const active = age < 7 ? flare.on : 0;
    // breathing pulse: slow 9s swell + faster granular shimmer, swells with flares
    const env = active ? Math.exp(-age * 1.2) * Math.min(1, age / 0.12) : 0;
    const pulse = 1 + 0.055 * Math.sin(t * 0.7) + 0.025 * Math.sin(t * 2.3 + 1.1) + 0.18 * env * (0.6 + flare.big);
    gl.uniform1f(U.uT, t); gl.uniform1f(U.uPulse, pulse);
    gl.uniform4f(U.uF, flare.ang, Math.max(0, age), flare.big, active);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    dust.frame(Math.min(0.05, (now - lastF) / 1000)); lastF = now;
    if (now - lastPush > 90) {
      lastPush = now;
      const I = (pulse - 0.92).toFixed(3) * 1;
      document.documentElement.style.setProperty("--sunI", I);
      if (parentRoot) parentRoot.style.setProperty("--amhSunI", I);
    }
    if (!REDUCE) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
