const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LITE = matchMedia("(pointer: coarse)").matches || screen.width < 820;   // HP/tablet

/* Tinggi layar yang STABIL. Di HP, bar alamat naik-turun saat scroll dan mengubah innerHeight,
   sehingga hitungan scroll melompat dan kanvas terhapus (kedip). 100svh tidak ikut berubah. */
const probe = document.createElement("div");
probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none";
document.body.appendChild(probe);
let _vh = probe.offsetHeight || window.innerHeight;
const VH = () => _vh;
function onResize(fn) {            // hanya jalan kalau lebar/tinggi stabil benar-benar berubah
  let w = innerWidth, h = _vh;
  addEventListener("resize", () => {
    const nh = probe.offsetHeight || window.innerHeight;
    if (innerWidth === w && nh === h) return;
    w = innerWidth; h = _vh = nh; fn();
  });
}

/* ===== Tahun otomatis ===== */
$("#year").textContent = new Date().getFullYear();

/* ===== Link dalam halaman: scroll lewat JS, tanpa href, supaya browser tidak menampilkan alamat di pojok kiri bawah ===== */
$$('a[href^="#"]').forEach((a) => {
  a.dataset.to = a.getAttribute("href"); a.removeAttribute("href");
  a.setAttribute("role", "link"); a.tabIndex = 0; a.style.cursor = "pointer";
});
const goTo = (a) => { const t = $(a.dataset.to); if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); };
document.addEventListener("click", (e) => { const a = e.target.closest("a[data-to]"); if (a) { e.preventDefault(); goTo(a); } });
document.addEventListener("keydown", (e) => { const a = e.target.closest && e.target.closest("a[data-to]"); if (a && e.key === "Enter") { e.preventDefault(); goTo(a); } });

/* ===== Judul: huruf naik satu per satu ===== */
const wl = $("#welcome");
wl.setAttribute("aria-label", wl.textContent);
let ci = 0;
wl.innerHTML = wl.textContent.split(" ").map((w) =>
  `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="ch" style="--i:${ci++}">${c}</span>`).join("")}</span>`
).join(" ");

/* ===== Navbar: maskot, menu aktif, tema terang/gelap ===== */
const nav = $("#nav"), pill = $("#pill"), mascot = $("#mascot");
const links = $$("#links a");
let active = links[0];

function moveMascot(a) {
  if (!a || innerWidth <= 760) return;
  const p = pill.getBoundingClientRect(), r = a.getBoundingClientRect();
  mascot.style.transform = `translateX(${r.left - p.left + r.width / 2}px)`;
}
function setActive(a) {
  links.forEach((l) => l.classList.toggle("active", l === a));
  active = a;
  moveMascot(a);
}
links.forEach((a) => {
  a.addEventListener("mouseenter", () => { moveMascot(a); mascot.classList.add("happy"); });
});
pill.addEventListener("mouseleave", () => { moveMascot(active); mascot.classList.remove("happy"); });
onResize(() => moveMascot(active));
document.fonts && document.fonts.ready.then(() => moveMascot(active));
moveMascot(active);

const secObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const map = { portfolio: "projects", gallery: "projects" };         // judul dan galeri ikut menu Portfolio
    const a = links.find((l) => l.dataset.to === "#" + (map[e.target.id] || e.target.id));
    if (a) setActive(a);
    nav.classList.toggle("light", e.target.dataset.theme === "light");
  });
}, { rootMargin: "-45% 0px -50% 0px" });
$$("main > section[id]").forEach((s) => secObs.observe(s));

/* Hamburger (mobile) */
const burger = $("#burger"), menu = $("#links");
burger.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
menu.addEventListener("click", (e) => {
  if (e.target.tagName === "A") { menu.classList.remove("open"); burger.setAttribute("aria-expanded", false); }
});

/* ===== Intro bertahap: scroll 1 = dedaunan menyingkir, scroll 2 = judul muncul ===== */
const intro = $("#home");
const layers = $$("[data-depth]", intro);
if (!reduce) {
  intro.addEventListener("pointermove", (e) => {
    const x = e.clientX - innerWidth / 2, y = e.clientY - VH() / 2;
    layers.forEach((l) => {
      const d = parseFloat(l.dataset.depth);
      l.style.translate = `${x * d}px ${y * d}px`;
    });
  });
}
const LAST = 1;                                   // satu langkah: gua menjauh + judul muncul
const stageOf = (y = scrollY) => { const r = y / VH(); return r < .5 ? 0 : 1; };
let stage = -1;
function syncStage() {
  const r = scrollY / VH();
  const s = stage === 1 ? (r < .35 ? 0 : 1) : stage === 0 ? (r > .65 ? 1 : 0) : stageOf();   // histeresis: tidak kedip di batas
  document.documentElement.classList.toggle("hero-lock", scrollY < VH() - 2);

  if (s === stage) return;
  stage = s;
  intro.dataset.stage = s;
}
syncStage();
let fly = 0, hp = false;                          // 0..1: terbang menembus kabut setelah judul muncul
function heroProgress() {
  hp = false;
  const len = intro.offsetHeight - 2 * VH();
  fly = Math.min(1, Math.max(0, (scrollY - VH()) / len));
  intro.style.setProperty("--p", fly.toFixed(4));
  intro.classList.toggle("done", fly > .995);
}
addEventListener("scroll", () => { syncStage(); if (!hp) { hp = true; requestAnimationFrame(heroProgress); } }, { passive: true });
onResize(() => { syncStage(); heroProgress(); });
heroProgress();

/* Satu gerakan scroll = satu langkah. Hanya aktif selama masih di area intro. */
let busy = false;
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function goStage(n) {
  busy = true;
  const from = scrollY, to = n * VH(), t0 = performance.now(), dur = 800;
  const root = document.documentElement;
  root.style.scrollBehavior = "auto";
  (function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    scrollTo(0, from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(step);
    else { root.style.scrollBehavior = ""; setTimeout(() => { busy = false; }, 120); }
  })(t0);
}
function inZone(dir) {                            // true bila gerakan ini harus ditangani intro
  const end = LAST * VH();
  if (dir > 0) return scrollY < end - 2;
  return scrollY > 2 && scrollY <= end + 2;
}
function nudge(dir) {
  if (busy) return;
  goStage(Math.max(0, Math.min(LAST, stageOf() + dir)));
}
if (!reduce) {
  addEventListener("wheel", (e) => {
    if (e.ctrlKey || !e.deltaY) return;
    const dir = Math.sign(e.deltaY);
    if (!inZone(dir)) return;
    e.preventDefault();
    if (Math.abs(e.deltaY) > 3) nudge(dir);
  }, { passive: false });
  let ty = null;
  addEventListener("touchstart", (e) => {
    ty = document.documentElement.classList.contains("hero-lock") || scrollY <= VH() + 2 ? e.touches[0].clientY : null;
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (ty === null || busy) return;
    const d = ty - e.touches[0].clientY;
    if (Math.abs(d) < 3 || !inZone(Math.sign(d))) return;
    if (e.cancelable) e.preventDefault();
    if (Math.abs(d) > 36) { nudge(Math.sign(d)); ty = null; }
  }, { passive: false });
  addEventListener("touchend", () => { ty = null; }, { passive: true });
  addEventListener("keydown", (e) => {
    if (/^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(e.target.tagName)) return;
    const dir = { ArrowDown: 1, PageDown: 1, " ": e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (!dir || !inZone(dir)) return;
    e.preventDefault(); nudge(dir);
  });
}

/* ===== Pemandangan WebGL: gunung berlapis, kabut, awan, sinar, kamera maju saat scroll ===== */
(function () {
  const cv = $("#gl");
  const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "low-power" });
  if (!gl) return;
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes,uM; uniform float uT,uP,uI,uG;
float h11(float n){return fract(sin(n*127.1)*43758.5453);}
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h11(i),h11(i+1.),f);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float fbm3(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float rdg(float x,float sd){float s=0.,a=.55,f=1.;for(int i=0;i<6;i++){float n=1.-abs(2.*vn(x*f+sd)-1.);s+=a*n*n;f*=2.07;a*=.48;}return s;}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=vec2((gl_FragCoord.x-.5*uRes.x)/uRes.y,gl_FragCoord.y/uRes.y);
  p+=(vec2(n2(vec2(uT*22.,1.)),n2(vec2(uT*22.,5.)))-.5)*.007*sin(clamp(uP,0.,1.)*3.1416);
  float I=1.-pow(1.-clamp(uI,0.,1.),3.);
  vec2 sun=vec2(asp*.24,mix(.30,.46,I)+uP*.28);
  float ds=length((p-sun)*vec2(1.,1.15));
  vec3 top=mix(vec3(.03,.05,.12),vec3(.10,.16,.26),I);
  vec3 mid=mix(vec3(.10,.14,.26),vec3(.42,.52,.64),I);
  vec3 hor=mix(vec3(.30,.22,.30),vec3(1.,.74,.52),I);
  vec3 col=mix(hor,mid,smoothstep(.35,.7,p.y));
  col=mix(col,top,smoothstep(.6,1.05,p.y));
  col+=vec3(1.,.62,.32)*exp(-ds*2.6)*.75*I+vec3(1.,.85,.6)*exp(-ds*9.)*.8*I;
  vec2 cp=vec2(p.x*.9+uT*.05,p.y*2.6);
  cp+=(vec2(n2(cp*1.3+uT*.02),n2(cp*1.3+7.))-.5)*.8;
  float cl=fbm(cp*vec2(1.2,2.2));
  float cm=smoothstep(.48,.78,cl)*smoothstep(.38,.75,p.y)*(1.-smoothstep(.95,1.1,p.y));
  col=mix(col,mix(vec3(.55,.60,.72),vec3(1.,.8,.6),exp(-ds*1.6)),cm*.65);
  vec3 fogC=mix(vec3(.55,.60,.70),vec3(.95,.78,.66),exp(-ds*1.2)*I);
  for(int i=0;i<6;i++){
    float fi=float(i),d=fi/5.;
    float s=1.+uP*(.12+1.1*d);
    vec2 q=vec2(p.x/s+uM.x*.03*d,(p.y-.3)/s+.3-uM.y*.015*d+uP*.02*d);
    float base=mix(.46,.09,d),fq=mix(1.4,2.2,d);
    float xx=q.x*fq+fi*13.7;
    float r=rdg(xx,fi*3.1);
    float hy=base+.2*r;
    if(i==2){float bx=(q.x-asp*.1)*2.6;hy+=.3*exp(-bx*bx)*(.75+.5*r);}
    float aa=1.5/uRes.y/s;
    float m=1.-smoothstep(-aa,aa,q.y-hy);
    if(m>0.){
      float sl=(rdg(xx+.03,fi*3.1)-r)*1.6;
      float dep=clamp((hy-q.y)*5.,0.,1.);float lit=mix(clamp(.55-sl*.6,0.,1.),.5,dep);
      float tx=fbm3(vec2(q.x*mix(8.,26.,d),q.y*mix(6.,4.,d)));
      vec3 sh=mix(vec3(.60,.67,.76),vec3(.035,.06,.09),pow(d,.8));
      vec3 litC=mix(vec3(.95,.78,.62),vec3(.5,.32,.2),d*.8);
      vec3 lc=sh*(.7+.6*tx)*(.55+.9*lit)+litC*lit*lit*.35*(1.-d*.5);
      lc=mix(lc,fogC,pow(1.-d,1.6)*.7);
      lc=mix(lc,fogC,(1.-smoothstep(base-.2,base+.1,q.y))*.5);
      if(i==2){float sn=smoothstep(.6,.7,q.y+tx*.08);lc=mix(lc,vec3(1.,.9,.82)*(.6+.5*lit),sn*.9);}
      col=mix(col,lc,m);
    }
    float fg=exp(-pow((q.y-base-.02)*6.,2.))*(.35+.65*fbm3(vec2(q.x*2.+uT*.06*(1.+fi*.4)+fi*5.,q.y*9.)));
    col=mix(col,fogC,clamp(fg*.7*(1.+uP*2.5),0.,1.));
  }
  float rush=smoothstep(.12,.45,uP)*(1.-smoothstep(.78,.95,uP));
  float k1=fbm3(vec2(p.x*1.6+uT*.1,p.y*2.4+uP*9.));
  float k2=fbm3(vec2(p.x*3.1-uT*.15+4.,p.y*4.5+uP*16.));
  vec3 cc=mix(vec3(.8,.84,.92),vec3(1.,.86,.68),exp(-ds*1.3));
  col=mix(col,cc,smoothstep(.5,.78,k1)*rush*.8);
  col=mix(col,cc*1.05,smoothstep(.55,.8,k2)*rush*.7);
  vec2 dv=p-sun;float ang=atan(dv.y,dv.x);
  float rays=pow(max(0.,sin(ang*14.+uT*.15)*.5+.5),3.)*(.5+.5*n2(vec2(ang*6.,uT*.1)));
  col+=vec3(1.,.75,.5)*rays*exp(-length(dv)*1.8)*.13*I*(1.+uP*2.5)*(1.-smoothstep(.8,.95,uP));
  vec2 mp=p*9.+vec2(uT*.15,uT*.35);vec2 mi=floor(mp),mf=fract(mp)-.5;
  float mh=h21(mi);vec2 off=(vec2(h21(mi+3.1),h21(mi+7.7))-.5)*.6;
  float mote=(1.-smoothstep(0.,.05,length(mf-off)))*step(.82,mh)*(.5+.5*sin(uT*1.5+mh*30.));
  col+=vec3(1.,.8,.6)*mote*.6*exp(-ds);
  col+=vec3(1.,.8,.5)*exp(-ds*2.5)*smoothstep(.5,.9,uP)*1.6;
  col=mix(col,vec3(1.,.88,.66),smoothstep(.74,.93,uP));
  col=mix(col,vec3(.02,.03,.07),smoothstep(.93,1.,uP));
  col=(col-.5)*1.08+.5;
  vec2 uv=gl_FragCoord.xy/uRes-.5;
  col*=1.-.35*pow(length(uv*vec2(1.,.9))*1.15,2.);
  col+=(h21(gl_FragCoord.xy+fract(uT)*100.)-.5)*uG;
  col*=mix(.55,1.,smoothstep(0.,.6,uI));
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}
`;
  const mk = (t, s) => {
    const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; }
    return o;
  };
  const v = mk(gl.VERTEX_SHADER, "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}");
  const f = mk(gl.FRAGMENT_SHADER, FS);
  if (!v || !f) return;
  const pr = gl.createProgram();
  gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "a");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n);
  const uR = U("uRes"), uT = U("uT"), uP = U("uP"), uI = U("uI"), uM = U("uM"), uG = U("uG");
  let mx = 0, my = 0, tx = 0, ty = 0, cam = 0, lastF = 0;
  addEventListener("pointermove", (e) => { tx = e.clientX / innerWidth * 2 - 1; ty = 1 - e.clientY / VH() * 2; });
  const size = () => {                              // resolusi tetap (HP lebih kecil); tidak pernah berubah di tengah animasi
    const cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !ch) return;
    const d = Math.min(LITE ? .75 : Math.min(devicePixelRatio || 1, 1.25), Math.sqrt((LITE ? .16e6 : 1.6e6) / (cw * ch)));
    const w = Math.round(cw * d), h = Math.round(ch * d);
    if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
  };
  const t0 = performance.now();
  let lastNow = t0;
  const draw = (now) => {
    lastNow = now;
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    const target = stage ? .04 + fly * .96 : 0;
    cam += (target - cam) * (stage ? .18 : .05);
    const p = cam;
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, reduce ? 14 : (now - t0) / 1000);
    gl.uniform1f(uP, p);
    gl.uniform1f(uI, reduce ? 1 : (now - t0) / 3500);
    gl.uniform2f(uM, mx, my);
    gl.uniform1f(uG, LITE ? 0 : .028);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  onResize(() => { size(); draw(performance.now()); });   // gambar ulang hanya bila ukuran benar-benar berubah
  size();
  (function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || now - lastF < (LITE ? 42 : 33) || scrollY > intro.offsetHeight - VH() * .9) return;   // berhenti saat hero tak terlihat
    lastF = now; draw(now);
  })(t0);
  cv.classList.add("on");
})();

/* ===== Efek foto: area di sekitar kursor berubah jadi Spider-Man ===== */
const photo = $("#photo");
if (photo) {
  const dot = $(".dot", photo);
  photo.addEventListener("pointerenter", () => photo.classList.add("on"));
  photo.addEventListener("pointerleave", () => photo.classList.remove("on"));
  photo.addEventListener("pointermove", (e) => {
    const r = photo.getBoundingClientRect();
    const x = e.clientX - r.left + "px", y = e.clientY - r.top + "px";
    photo.style.setProperty("--x", x); photo.style.setProperty("--y", y);
    dot.style.left = x; dot.style.top = y;
  });
}

/* ===== Timeline: item terdekat ke tengah layar menyala ===== */
const tls = $$(".tl");
function updateTL() {
  const mid = VH() / 2;
  tls.forEach((tl) => {
    const tr = tl.getBoundingClientRect();
    tl.style.setProperty("--tp", Math.min(1, Math.max(0, (VH() * .6 - tr.top) / tr.height)).toFixed(3));
    let best = null, bd = Infinity;
    $$("li", tl).forEach((li) => {
      const r = li.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bd) { bd = d; best = li; }
    });
    $$("li", tl).forEach((li) => li.classList.toggle("on", li === best));
  });
}
let tick = false;
addEventListener("scroll", () => {
  if (tick) return; tick = true;
  requestAnimationFrame(() => { updateTL(); tick = false; });
}, { passive: true });
updateTL();

/* ===== Tab Projects / Certificates / Awards ===== */
$$(".tab").forEach((t) => t.addEventListener("click", () => {
  $$(".tab").forEach((x) => x.classList.toggle("on", x === t));
  $$(".panel").forEach((p) => p.classList.toggle("on", p.id === t.dataset.tab));
  dispatchEvent(new Event("resize"));                       // hitung ulang panah carousel di panel yang baru tampil
}));

/* ===== Carousel (dipakai Projects, Certificates, Awards: tiap .car punya panah sendiri) ===== */
$$(".car").forEach((car) => {
  const tr = $(".track", car);
  const step = () => (tr.firstElementChild?.offsetWidth || 340) + 24;
  $(".arrow.l", car).addEventListener("click", () => tr.scrollBy({ left: -step(), behavior: "smooth" }));
  $(".arrow.r", car).addEventListener("click", () => tr.scrollBy({ left: step(), behavior: "smooth" }));
  /* panah hanya muncul kalau kartunya memang melebihi lebar layar (mis. 1 sertifikat = tanpa panah) */
  const sync = () => { const need = tr.scrollWidth > tr.clientWidth + 4; $$(".arrow", car).forEach((a) => (a.hidden = !need)); };
  sync(); addEventListener("resize", sync); addEventListener("load", sync);
});

/* ===== Modal Details ===== */
const dlg = $("#dlg");
$$(".detail").forEach((b) => b.addEventListener("click", () => {
  $("#dTitle").textContent = b.dataset.title;
  $("#dDesc").textContent = b.dataset.desc;
  const ul = $("#dList"); ul.innerHTML = "";
  b.dataset.list.split("|").forEach((t) => {
    const li = document.createElement("li"); li.textContent = t; ul.appendChild(li);
  });
  dlg.showModal();
}));

/* ===== Contact: pesan email, salin email, jam WITA, dinding komentar ===== */
(function () {
  const EMAIL = "callmeashadi@gmail.com";
  const toastEl = $("#toast");
  let toastT;
  const toast = (msg) => { toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2600); };
  const enc = encodeURIComponent;

  /* --- form pesan -> membuka aplikasi email --- */
  const form = $("#form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#fName").value.trim(), mail = $("#fMail").value.trim(), msg = $("#fMsg").value.trim();
    const btn = $(".send", form);
    btn.classList.add("sending");
    setTimeout(() => {
      location.href = `mailto:${EMAIL}?subject=${enc("Pesan dari portofolio: " + name)}&body=${enc(msg + "\n\n— " + name + (mail ? " (" + mail + ")" : ""))}`;
      btn.classList.remove("sending");
      toast("Membuka aplikasi email…");
    }, 650);
  });

  /* --- salin email --- */
  const copyBtn = $("#copyMail");
  copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(EMAIL); } catch { const t = document.createElement("textarea"); t.value = EMAIL; document.body.append(t); t.select(); try { document.execCommand("copy"); } catch {} t.remove(); }
    copyBtn.textContent = "Tersalin ✓"; copyBtn.classList.add("ok"); toast("Email disalin");
    setTimeout(() => { copyBtn.textContent = "Salin"; copyBtn.classList.remove("ok"); }, 1800);
  });

  /* --- dinding komentar ---
     Penyimpanan sengaja dibungkus di `store` supaya mudah diganti ke server (Supabase / Firebase / dll).
     Saat ini tersimpan di localStorage, jadi hanya terlihat di browser yang sama. */
  const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const store = { load: () => ls("portfolio.comments.v1", []), save: (a) => lsSet("portfolio.comments.v1", a.slice(0, 200)) };
  const liked = new Set(ls("portfolio.likes.v1", [])), mine = new Set(ls("portfolio.mine.v1", []));

  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const hue = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  function avatar(name, photo, cls) {
    const a = el("div", "av" + (cls ? " " + cls : ""));
    a.setAttribute("aria-hidden", "true");
    if (photo && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)) { const i = new Image(); i.src = photo; i.alt = ""; a.append(i); return a; }
    if (!name) { a.textContent = "?"; return a; }                  // belum ada nama -> avatar abu-abu
    const h = hue(name);
    a.style.background = `linear-gradient(135deg,hsl(${h} 72% 58%),hsl(${(h + 48) % 360} 70% 44%))`;
    a.textContent = (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => [...w][0]).join("") || "?";
    return a;
  }
  const rtf = new Intl.RelativeTimeFormat("id", { numeric: "auto" });
  function when(ts) {
    const s = Math.round((ts - Date.now()) / 1000), m = Math.abs(s);
    if (m < 45) return "baru saja";
    if (m < 3600) return rtf.format(Math.round(s / 60), "minute");
    if (m < 86400) return rtf.format(Math.round(s / 3600), "hour");
    if (m < 86400 * 7) return rtf.format(Math.round(s / 86400), "day");
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(ts);
  }
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const HEART = "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10z", TRASH = "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3";

  const list = $("#cList"), empty = $("#cEmpty"), more = $("#cMore"), countEl = $("#cN");
  const PAGE = 5; let shown = PAGE, freshId = null;
  function render() {
    const all = store.load().sort((x, y) => y.t - x.t);
    countEl.textContent = `(${all.length})`;
    list.replaceChildren();
    empty.hidden = all.length > 0;
    all.slice(0, shown).forEach((c) => {
      const li = el("li", "cm"), b = el("div", "cm-b"), h = el("div", "cm-h"), act = el("div", "cm-a");
      if (c.id !== freshId) li.style.animation = "none";
      h.append(el("b", "", c.name), el("time", "", when(c.t)));
      const like = el("button", "like" + (liked.has(c.id) ? " on" : ""));
      like.type = "button"; like.setAttribute("aria-label", "Suka");
      like.innerHTML = svg(HEART); like.append(el("span", "", String(c.likes || 0)));
      like.addEventListener("click", () => {
        const all2 = store.load(), t = all2.find((x) => x.id === c.id); if (!t) return;
        if (liked.has(c.id)) { liked.delete(c.id); t.likes = Math.max(0, (t.likes || 0) - 1); } else { liked.add(c.id); t.likes = (t.likes || 0) + 1; }
        lsSet("portfolio.likes.v1", [...liked]); store.save(all2); render();
      });
      act.append(like);
      if (mine.has(c.id)) {
        const del = el("button", "del"); del.type = "button"; del.innerHTML = svg(TRASH); del.append(el("span", "", "Hapus"));
        let armed = 0;
        del.addEventListener("click", () => {
          if (!armed) { armed = setTimeout(() => { armed = 0; del.classList.remove("sure"); del.lastChild.textContent = "Hapus"; }, 2500); del.classList.add("sure"); del.lastChild.textContent = "Yakin?"; return; }
          store.save(store.load().filter((x) => x.id !== c.id)); mine.delete(c.id); lsSet("portfolio.mine.v1", [...mine]); render();
        });
        act.append(del);
      }
      b.append(h, el("p", "cm-t", c.text), act);
      li.append(avatar(c.name, c.photo), b);
      list.append(li);
    });
    more.hidden = all.length <= shown;
    freshId = null;
  }
  more.addEventListener("click", () => { shown += PAGE; render(); });

  /* form komentar: avatar langsung berubah saat mengetik nama / memilih foto */
  const cForm = $("#cForm"), cName = $("#cName"), cText = $("#cText"), cFile = $("#cFile"), cFileTxt = $("#cFileTxt"), cFileX = $("#cFileX"), cCnt = $("#cCnt");
  let photo = null;
  const refreshAv = () => { const old = $("#cAv"), n = avatar(cName.value.trim(), photo); n.id = "cAv"; old.replaceWith(n); };
  cName.addEventListener("input", refreshAv);
  cText.addEventListener("input", () => { cCnt.textContent = `${cText.value.length}/280`; cCnt.classList.toggle("hot", cText.value.length > 240); });
  const clearPhoto = () => { photo = null; cFile.value = ""; cFileTxt.textContent = "Foto profil (opsional)"; cFileX.hidden = true; refreshAv(); };
  cFileX.addEventListener("click", clearPhoto);
  cFile.addEventListener("change", () => {
    const f = cFile.files[0]; if (!f) return;
    if (!/^image\//.test(f.type) || f.size > 5 * 1024 * 1024) { toast("Pilih gambar maksimal 5 MB"); clearPhoto(); return; }
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const s = 96, c = document.createElement("canvas"); c.width = c.height = s;
      const k = Math.max(s / im.width, s / im.height), w = im.width * k, h = im.height * k;
      c.getContext("2d").drawImage(im, (s - w) / 2, (s - h) / 2, w, h);
      photo = c.toDataURL("image/jpeg", .8); URL.revokeObjectURL(url);
      cFileTxt.textContent = f.name.length > 26 ? f.name.slice(0, 23) + "…" : f.name; cFileX.hidden = false; refreshAv();
    };
    im.onerror = () => { URL.revokeObjectURL(url); toast("Gambar tidak bisa dibaca"); clearPhoto(); };
    im.src = url;
  });
  cForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = cName.value.trim(), text = cText.value.trim(); if (!name || !text) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const all = store.load(); all.push({ id, name, text, photo, t: Date.now(), likes: 0 });
    if (!store.save(all)) { toast("Penyimpanan penuh, coba tanpa foto"); return; }
    mine.add(id); lsSet("portfolio.mine.v1", [...mine]);
    freshId = id; shown = Math.max(shown, PAGE);
    cForm.reset(); cCnt.textContent = "0/280"; clearPhoto(); render();
    toast("Komentar terkirim, terima kasih!");
    $("#cBox").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  });
  render();
})();

/* ===== Reveal saat scroll ===== */
const rv = $$(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((en) => en.forEach((x) => {
    if (x.isIntersecting) { x.target.classList.add("in"); setTimeout(() => x.target.classList.add("live"), 1000); io.unobserve(x.target); }
  }), { threshold: 0.12 });
  rv.forEach((el) => io.observe(el));
} else rv.forEach((el) => el.classList.add("in"));

/* ===== Efek scroll halaman lain: progress bar, marquee, reveal fajar, headline kontak ===== */
const proj = $("#projects"), big = $("#big"), bw = $("#bigWord"), pt = $("#portfolio");
/* huruf per huruf + 3 lapis bayangan outline; ukuran kata menyesuaikan lebar layar */
const word = [..."PORTFOLIO"];
const mkWord = (cls, extra = "") => `<span class="bw ${cls}" style="${extra}"${cls ? ' aria-hidden="true"' : ""}>${word.map((c, i) => `<span class="L" style="--i:${i}" aria-hidden="true">${c}</span>`).join("")}</span>`;
bw.innerHTML = mkWord("g", "--gs:.5;--go:.22") + mkWord("g", "--gs:.68;--go:.34") + mkWord("g", "--gs:.84;--go:.5") + mkWord("");
const bws = $$(".bw", bw), mainW = bws[bws.length - 1];
function fitWord() {
  bw.style.fontSize = "100px";
  const w = mainW.offsetWidth || 1;
  bw.style.fontSize = Math.min(100 * innerWidth * .86 / w, VH() * .5) + "px";
}
fitWord(); onResize(fitWord); document.fonts && document.fonts.ready.then(fitWord);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
let pf = false;
function pageFx() {
  pf = false;
  /* judul PORTFOLIO: membesar menembus layar, lalu putih-terang menyambung ke halaman Portfolio */
  const pr = pt.getBoundingClientRect();
  if (pr.bottom > 0 && pr.top < VH()) {
    const pp = Math.min(1, Math.max(0, -pr.top / (pt.offsetHeight - VH())));
    const e = Math.min(1, Math.max(0, (pp - .1) / .9)), q = e * e * (3 - 2 * e);
    bw.style.setProperty("--s", (1 + Math.pow(e, 3) * 60).toFixed(3));
    bw.style.setProperty("--q", q.toFixed(3));
    if (!reduce) {
      /* seluruh kata: miring -> berayun -> menukik sambil berputar pelan saat menembus layar */
      const swing = smooth(pp / .7), inn = smooth((pp - .03) / .22);   // 0 = polos seperti semula
      bw.style.setProperty("--in", inn.toFixed(3));
      bw.style.setProperty("--rz", (inn * (-8 + 14 * swing) + 14 * e * e).toFixed(2) + "deg");
      bw.style.setProperty("--ry", (inn * 26 * Math.cos(clamp01(pp / .75) * Math.PI) * (1 - smooth((pp - .75) / .25))).toFixed(2) + "deg");
      bw.style.setProperty("--rx", (inn * 12 * Math.sin(pp * Math.PI * 1.2)).toFixed(2) + "deg");
      bw.style.setProperty("--sk", (inn * (-12 + 20 * swing)).toFixed(2) + "deg");
      /* tiap huruf: gelombang naik-turun + terbalik 3D dengan jeda berurutan */
      const env = Math.sin(clamp01(pp / .6) * Math.PI);
      bws.forEach((b, bi) => {
        const lag = (bws.length - 1 - bi) * .16;               // bayangan tertinggal di belakang kata utama
        $$(".L", b).forEach((L, i) => {
          const w = Math.sin(pp * Math.PI * 2.6 - i * .62 - lag);
          L.style.setProperty("--ly", (w * env * 7).toFixed(2) + "vh");
          L.style.setProperty("--lz", (w * env * 140).toFixed(1) + "px");
          L.style.setProperty("--lrx", (Math.cos(pp * Math.PI * 2.6 - i * .62 - lag) * env * 38).toFixed(1) + "deg");
          L.style.setProperty("--lr", (w * env * (i % 2 ? 9 : -9)).toFixed(2) + "deg");
        });
      });
    }
    pt.style.setProperty("--fl", Math.min(1, Math.max(0, (pp - .72) / .2)).toFixed(3));
  }
  const b = (VH() - big.getBoundingClientRect().top) / VH() * 100;
  big.style.setProperty("--bg", Math.min(100, Math.max(0, b)).toFixed(1));
}
addEventListener("scroll", () => { if (!pf) { pf = true; requestAnimationFrame(pageFx); } }, { passive: true });
onResize(pageFx);
pageFx();

/* Kartu: sorotan cahaya + miring 3D mengikuti kursor */
$$(".card.d, .pcard").forEach((c) => {
  c.addEventListener("pointermove", (e) => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty("--mx", x * 100 + "%"); c.style.setProperty("--my", y * 100 + "%");
    c.style.transform = `perspective(700px) rotateX(${(.5 - y) * 8}deg) rotateY(${(x - .5) * 10}deg) translateY(-4px)`;
  });
  c.addEventListener("pointerleave", () => { c.style.transform = ""; });
});

/* ===== Mulut gua: dilihat dari dalam, digambar sekali di kanvas (tanpa file gambar) ===== */
function paintCave() {
  const cv = $("#cave"), W0 = Math.round(cv.clientWidth), H0 = Math.round(cv.clientHeight), k = Math.min(window.devicePixelRatio || 1, LITE ? 1 : 1.5);
  if (!W0 || !H0 || (Math.round(W0 * k) === cv.width && Math.abs(H0 * k - cv.height) < 60 * k)) return;   // abaikan perubahan kecil (bar alamat HP)
  cv.width = Math.round(W0 * k); cv.height = Math.round(H0 * k);
  const W = W0, H = H0;
  const c = cv.getContext("2d");
  c.setTransform(k, 0, 0, k, 0, 0);
  let a = 11;
  const R = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (lo, hi) => lo + (hi - lo) * R();
  const small = W < 700;

  /* garis tepi bukaan gua (searah jarum jam), lalu dikasarkan dengan midpoint displacement */
  const base = small
    ? [[.02,.95],[.25,.925],[.5,.95],[.8,.93],[.97,.9],[.99,.6],[.94,.25],[.8,.1],[.6,.06],[.4,.1],[.22,.2],[.1,.42],[.05,.7]]
    : [[.06,.94],[.14,.915],[.26,.935],[.42,.925],[.6,.95],[.78,.93],[.9,.9],[.965,.8],[.985,.55],[.95,.3],[.88,.14],[.76,.07],[.62,.1],[.5,.045],[.37,.095],[.25,.07],[.15,.15],[.09,.3],[.075,.5],[.085,.72],[.05,.85]];
  let pts = base.map(([x, y]) => [x * W, y * H]);
  let amp = Math.min(W, H) * .05;
  for (let it = 0; it < 3; it++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      out.push(p, [(p[0] + q[0]) / 2 + rr(-amp, amp), (p[1] + q[1]) / 2 + rr(-amp, amp)]);
    }
    pts = out; amp *= .5;
  }
  const edge = new Path2D(), mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const m0 = mid(pts[pts.length - 1], pts[0]); edge.moveTo(m0[0], m0[1]);          // kurva halus lewat titik-titik, bukan garis patah
  pts.forEach((p, i) => { const m = mid(p, pts[(i + 1) % pts.length]); edge.quadraticCurveTo(p[0], p[1], m[0], m[1]); });
  edge.closePath();

  /* batu: gradasi gelap ke tepi, lalu serpihan bidang untuk tekstur */
  const g = c.createRadialGradient(W * .62, H * .5, H * .25, W * .5, H * .5, Math.max(W, H) * .8);
  g.addColorStop(0, "#2b241f"); g.addColorStop(.55, "#15110f"); g.addColorStop(1, "#050404");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < (small ? 60 : 120); i++) {            // bercak lembut: gelap dan terang
    const x = rr(-50, W), y = rr(-50, H), s = rr(70, 260), dk = R() < .55;
    const gr = c.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, dk ? `rgba(0,0,0,${rr(.14, .34)})` : `rgba(130,108,92,${rr(.04, .09)})`);
    gr.addColorStop(1, dk ? "rgba(0,0,0,0)" : "rgba(130,108,92,0)");
    c.fillStyle = gr; c.fillRect(x - s, y - s, s * 2, s * 2);
  }
  /* retakan halus */
  c.strokeStyle = "rgba(0,0,0,.3)"; c.lineWidth = 1.2; c.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    let x = rr(0, W), y = rr(0, H), px_ = x, py_ = y; c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += rr(-26, 26); y += rr(14, 46); c.quadraticCurveTo(px_, py_, (x + px_) / 2, (y + py_) / 2); px_ = x; py_ = y; } c.stroke();
  }
  /* stalaktit di langit-langit */
  c.fillStyle = "#0b0908";
  for (let i = 0; i < (small ? 5 : 11); i++) {
    const x = rr(W * .22, W * .98), y = H * rr(.0, .1) + (x > W * .5 ? 0 : H * .08), w = rr(14, 40), l = rr(40, 150);
    c.beginPath(); c.moveTo(x - w, y - 10); c.quadraticCurveTo(x - w * .3, y + l * .5, x + rr(-4, 4), y + l); c.quadraticCurveTo(x + w * .3, y + l * .5, x + w, y - 10); c.fill();
  }
  /* cahaya hangat dari luar menyentuh tepi batu */
  c.globalCompositeOperation = "source-atop";
  c.lineJoin = "round";
  c.shadowColor = "rgba(255,170,105,.9)";
  [[60, 3], [28, 3], [10, 2.5]].forEach(([blur, w]) => { c.shadowBlur = blur; c.strokeStyle = "rgba(255,190,130,.55)"; c.lineWidth = w; c.stroke(edge); });
  c.shadowBlur = 0;
  c.globalCompositeOperation = "destination-out";
  c.fill(edge);
  c.globalCompositeOperation = "source-over";
}
let caveT;
paintCave();
onResize(() => { clearTimeout(caveT); caveT = setTimeout(paintCave, 200); });

/* ===== Garis kontur interaktif di semua section (Home punya pemandangan sendiri); di About garis bergerak sendiri tanpa ikut kursor =====
   Satu medan noise yang pelan mengalir; kursor membengkokkan garis seperti air dan
   menyalakan garis di sekitarnya. Dirender hanya ke section yang sedang terlihat. */
(function () {
  const secs = $$("main > .sec").filter((el) => $(".lines", el)).map((el) => ({ el, cv: $(".lines", el), cx: null, on: false, light: el.classList.contains("light"), follow: !el.hasAttribute("data-nofollow"), photo: $(".photo-wrap .base", el) }));
  if (!secs.length) return;
  secs.forEach((s) => { s.cx = s.cv.getContext("2d"); });

  /* noise halus 3D (nilai di-interpolasi) */
  const H3 = (x, y, z) => { let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); };
  const sm = (t) => t * t * (3 - 2 * t);
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(H3(xi, yi, zi), H3(xi + 1, yi, zi), xf), l(H3(xi, yi + 1, zi), H3(xi + 1, yi + 1, zi), xf), yf),
      l(l(H3(xi, yi, zi + 1), H3(xi + 1, yi, zi + 1), xf), l(H3(xi, yi + 1, zi + 1), H3(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  }

  let W = 0, H = 0, dpr = 1, cell = 24, cols = 0, rows = 0, grid = new Float32Array(0);
  const LEVELS = LITE ? 7 : 12;
  function resize() {
    dpr = 1;
    W = innerWidth; H = VH();
    cell = LITE ? Math.max(32, Math.min(46, Math.round(W / 14))) : Math.max(22, Math.min(34, Math.round(W / 48)));
    cols = Math.ceil(W / cell) + 2; rows = Math.ceil(H / cell) + 2;
    grid = new Float32Array(cols * rows);
    secs.forEach((s) => { const w = Math.round(W * dpr), h = Math.round(H * dpr); if (s.cv.width !== w || s.cv.height !== h) { s.cv.width = w; s.cv.height = h; } });
  }
  onResize(resize); resize();

  /* kursor: posisi dihaluskan, kecepatan menentukan seberapa kuat "mengaduk" */
  let px = -9999, py = -9999, sx = -9999, sy = -9999, energy = 0, present = 0, presentT = 0;
  addEventListener("pointermove", (e) => {
    if (sx < -999) { sx = e.clientX; sy = e.clientY; }
    energy = Math.min(1, energy + Math.hypot(e.clientX - px, e.clientY - py) / 260);
    px = e.clientX; py = e.clientY; presentT = 1;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { presentT = 0; });
  addEventListener("pointerdown", () => { energy = 1; }, { passive: true });   // klik = gelombang dorong

  const R_IN = 230;                                        // radius pengaruh kursor (px)
  function buildField(t, scroll, useCursor) {
    const k = .0021;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        let x = i * cell, y = j * cell;
        const dx = x - sx, dy = y - sy, d2 = dx * dx + dy * dy;
        if (useCursor && (presentT || present > .01)) {
          const f = Math.exp(-d2 / (R_IN * R_IN)) * present;
          const d = Math.sqrt(d2) + 1;
          const push = f * (46 + 70 * energy);               // garis menjauh dari kursor
          x += dx / d * push; y += dy / d * push;
          const sw = f * (.5 + energy) * .6;                  // dan berputar sedikit
          const ox = x - sx, oy = y - sy;
          x = sx + ox * Math.cos(sw) - oy * Math.sin(sw); y = sy + ox * Math.sin(sw) + oy * Math.cos(sw);
        }
        const yy = y + scroll;
        const n = .6 * noise(x * k, yy * k, t) + .3 * noise(x * k * 2.1 + 9, yy * k * 2.1 + 3, t * 1.3) + .1 * noise(x * k * 4.3 + 4, yy * k * 4.3 + 8, t * 1.7);
        grid[j * cols + i] = n;
      }
    }
  }

  function trace(lv) {                                      // marching squares -> satu Path2D
    const p = new Path2D(), g = grid;
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = g[j * cols + i], b = g[j * cols + i + 1], c = g[(j + 1) * cols + i + 1], d = g[(j + 1) * cols + i];
        const mn = Math.min(a, b, c, d), mx = Math.max(a, b, c, d);
        if (lv < mn || lv > mx) continue;
        const x = i * cell, y = j * cell;
        const t_ = x + cell * (lv - a) / (b - a), r_ = y + cell * (lv - b) / (c - b), b_ = x + cell * (lv - d) / (c - d), l_ = y + cell * (lv - a) / (d - a);
        const idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
        const seg = (x1, y1, x2, y2) => { p.moveTo(x1, y1); p.lineTo(x2, y2); };
        switch (idx) {
          case 1: case 14: seg(x, l_, b_, y + cell); break;
          case 2: case 13: seg(b_, y + cell, x + cell, r_); break;
          case 3: case 12: seg(x, l_, x + cell, r_); break;
          case 4: case 11: seg(t_, y, x + cell, r_); break;
          case 5: seg(t_, y, x + cell, r_); seg(x, l_, b_, y + cell); break;
          case 6: case 9: seg(t_, y, b_, y + cell); break;
          case 7: case 8: seg(x, l_, t_, y); break;
          case 10: seg(x, l_, t_, y); seg(b_, y + cell, x + cell, r_); break;
        }
      }
    }
    return p;
  }

  let vis = 0, raf = 0, start = performance.now(), last = 0;
  const io = new IntersectionObserver((en) => {
    en.forEach((e) => { const s = secs.find((q) => q.el === e.target); s.on = e.isIntersecting; });
    vis = secs.filter((s) => s.on).length;
    if (vis && !raf) raf = requestAnimationFrame(frame);
  }, { rootMargin: "0px" });
  secs.forEach((s) => io.observe(s.el));

  function frame(now) {
    raf = 0;
    if (!vis || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (now - last < (LITE ? 66 : 40)) return;                             // ~30fps cukup untuk garis halus
    last = now;
    const t = reduce ? 3 : (now - start) / 1000 * .045;
    sx += (px - sx) * .12; sy += (py - sy) * .12;
    present += (presentT - present) * .06;
    energy *= .93;
    const mk = (cur) => { buildField(t, scrollY * .35, cur); const a = []; for (let l = 0; l < LEVELS; l++) a.push(trace(.31 + l * .034)); return a; };
    const onSecs = secs.filter((s) => s.on);
    const pathsF = onSecs.some((s) => s.follow) ? mk(!LITE) : null;     // garis yang ikut kursor
    const pathsS = onSecs.some((s) => !s.follow) ? mk(false) : null;   // garis yang hanya mengalir sendiri
    secs.forEach((s) => {
      if (!s.on) return;
      const paths = s.follow ? pathsF : pathsS;
      const c = s.cx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      c.lineJoin = "round"; c.lineCap = "round";
      const base = s.light ? "20,30,90" : "196,210,255", warm = s.light ? "200,90,28" : "240,161,94";
      paths.forEach((p, l) => {
        const major = l % 4 === 0;
        c.lineWidth = major ? 1.25 : .8;
        c.strokeStyle = `rgba(${base},${major ? (s.light ? .11 : .2) : (s.light ? .055 : .1)})`;
        c.stroke(p);
      });
      if (s.follow && present > .05) {                       // garis menyala di sekitar kursor
        const gr = c.createRadialGradient(sx, sy, 0, sx, sy, R_IN * 1.35);
        const a = (s.light ? .55 : .8) * present;
        gr.addColorStop(0, `rgba(${warm},${a})`); gr.addColorStop(.55, `rgba(${warm},${a * .35})`); gr.addColorStop(1, `rgba(${warm},0)`);
        c.strokeStyle = gr; c.lineWidth = 1.3;
        paths.forEach((p) => c.stroke(p));
      }
      /* siluet foto "menghapus" garis di belakangnya, jadi garis hanya tampil di luar badan (bukan tembus lewat bagian foto yang memudar) */
      const im = s.photo;
      if (im && im.complete && im.naturalWidth) {
        const r = im.getBoundingClientRect(), co = s.cv.getBoundingClientRect();
        c.globalCompositeOperation = "destination-out";
        c.drawImage(im, r.left - co.left, r.top - co.top, r.width, r.height);
        c.globalCompositeOperation = "source-over";
      }
    });
  }
})();


/* ===== Folder di About =====
   - jumlah dan gambar diambil otomatis dari kartu di tab Portfolio (tambah kartu + gambar = folder ikut berubah)
   - klik folder / "Open folder": gambar menyebar keluar; klik salah satu gambar: loncat ke project itu
   - "Explore All ...": buka tab yang sesuai di Portfolio */
const folders = $$(".folder");
const closeFolders = (except) => folders.forEach((f) => {
  if (f === except) return;
  f.classList.remove("open", "menu-open"); $(".f-more", f).setAttribute("aria-expanded", "false");
});
function explore(id, cardIdx) {
  const t = $(`.tab[data-tab="${id}"]`); if (t) t.click();
  $("#projects").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  if (cardIdx == null) return;
  setTimeout(() => {
    const panel = $("#" + id), tr = $(".track", panel), card = $$(".pcard", panel)[cardIdx];
    if (tr && card) tr.scrollTo({ left: Math.max(0, card.offsetLeft - tr.offsetLeft - 6), behavior: "smooth" });
  }, reduce ? 0 : 700);
}
folders.forEach((f) => {
  const id = f.dataset.open, cards = $$(".pcard", $("#" + id)), label = $("em", f).textContent;
  $("b", f).textContent = cards.length;
  f.classList.toggle("none", !cards.length);
  $('[data-act="explore"]', f).textContent = "Explore All " + label;

  /* gambar dari kartu (maks. 4); kalau belum ada gambar, tetap pakai lembar berwarna bawaan */
  const shots = cards.map((c, i) => ({ src: $("img", c)?.getAttribute("src"), i })).filter((x) => x.src).slice(0, 4);
  if (shots.length) $(".sheets", f).replaceChildren(...shots.map(({ src, i }) => {
    const im = new Image(); im.src = src; im.alt = ""; im.draggable = false; im.dataset.i = i; return im;
  }));

  const more = $(".f-more", f), setMenu = (on) => { f.classList.toggle("menu-open", on); more.setAttribute("aria-expanded", String(on)); };
  f.addEventListener("click", (e) => {
    if (e.target.closest(".f-more, .f-menu")) return;
    const shot = e.target.closest(".sheets > img");
    if (f.classList.contains("open") && shot) { explore(id, +shot.dataset.i); return; }
    const open = !f.classList.contains("open");
    closeFolders(f); setMenu(false); f.classList.toggle("open", open);
  });
  more.addEventListener("click", (e) => { e.stopPropagation(); closeFolders(f); setMenu(!f.classList.contains("menu-open")); });
  $('[data-act="open"]', f).addEventListener("click", (e) => { e.stopPropagation(); setMenu(false); f.classList.add("open"); });
  $('[data-act="explore"]', f).addEventListener("click", (e) => { e.stopPropagation(); setMenu(false); explore(id); });
  f.addEventListener("keydown", (e) => { if (e.target === f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); f.click(); } });
});
document.addEventListener("click", (e) => { if (!e.target.closest(".folder")) closeFolders(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeFolders(); });


/* ===== Galeri: kamera maju, foto muncul kecil di tengah lalu membesar, menyebar ke tepi, dan lewat ===== */
(function () {
  const sec = $("#gallery"); if (!sec) return;
  const G = 137.508 * Math.PI / 180;
  const cfg = $$(".gp", sec).map((el, i) => {
    const a = i * G + .6, k = .55 + ((i * .37) % 1) * .45;
    return { el, z: .3 + i * .6, x: Math.cos(a) * k, y: Math.sin(a) * .85 * k, rot: (i % 2 ? 1 : -1) * (4 + (i * 3.7) % 7) };
  });
  const clamp = (v) => Math.min(1, Math.max(0, v));
  let busy = false;
  function draw() {
    busy = false;
    const r = sec.getBoundingClientRect();
    if (r.bottom < -80 || r.top > VH() + 80) return;
    const p = clamp(-r.top / (sec.offsetHeight - VH()));
    const c = p * (cfg[cfg.length - 1].z + .9), W = innerWidth / 2, H = VH() / 2;
    cfg.forEach(({ el, z, x, y, rot }) => {
      const d = z - c, s = 1 / Math.max(.12, 1 + d * .9);
      const vis = clamp((2 - d) / 1.6) * clamp((3.4 - s) / 1.2), blur = clamp((d - .3) / 1.5) * 5;
      el.style.visibility = vis > 0 ? "visible" : "hidden";
      if (vis <= 0) return;
      el.style.opacity = vis.toFixed(3);
      el.style.filter = blur > .15 ? `blur(${blur.toFixed(1)}px)` : "none";
      el.style.zIndex = Math.round(s * 100);
      el.style.transform = `translate(-50%,-50%) translate(${(x * W * s).toFixed(1)}px,${(y * H * s).toFixed(1)}px) rotate(${rot}deg) scale(${s.toFixed(3)})`;
    });
  }
  const go = () => { if (!busy) { busy = true; requestAnimationFrame(draw); } };
  addEventListener("scroll", go, { passive: true });
  onResize(go);
  draw();
})();

/* Folder About: cahaya oranye mengikuti kursor */
$$(".folder").forEach((f) => f.addEventListener("pointermove", (e) => {
  const r = f.getBoundingClientRect();
  f.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
  f.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
}));

/* Blokir menu klik-kanan / tahan-lama pada foto (efek Spider-Man tetap jalan) */
document.addEventListener("contextmenu", (e) => { if (e.target.closest && e.target.closest(".photo-wrap, .person")) e.preventDefault(); });
