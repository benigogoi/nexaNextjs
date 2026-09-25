/* Nexa reel stage: builds every scene for one brand, then renders any moment t (seconds)
 * deterministically via window.renderAt(t). scripts/make-reel.ts screenshots each frame.
 *
 * Story (18.4s): hook (plain product) → DESIGN → PRINT → CUT → PEEL → STICK → reveal → Nexa end card. */
(function () {
  'use strict';

  const FPS = 30;
  const T = { hook: 0, design: 2.0, print: 4.6, cut: 6.9, peel: 10.7, stick: 12.2, reveal: 14.0, end: 16.2, total: 18.4 };
  const SHEET = { x: 190, y: 430, w: 700, h: 915 };
  const SLOT = SHEET.y; // printer output slot; the sheet is hidden above this line while printing
  const FLOOR = 1340; // products stand on this line
  const PMAX = { w: 640, h: 760 };
  const ZOOM = 2.0;
  const PEEL_C = { x: 540, y: 880 };
  const VC = 640, VT = 2600; // plotter speed at 1x: cutting / travelling (px per second)
  const CUT_RUN = [1.3, 3.5]; // window inside the cut scene where the blade actually cuts
  const CUT_LEN = 3.8;
  const NS = 'http://www.w3.org/2000/svg';

  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, u) => a + (b - a) * u;
  const P = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    out: (u) => 1 - Math.pow(1 - u, 3),
    in: (u) => u * u * u,
    io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    smooth: (u) => u * u * (3 - 2 * u),
    back: (u) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    },
  };
  const tri = (x) => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * x));

  let B = null;
  const S = {};
  const G = {};
  let plan = null;
  let cues = [];

  // ---------- DOM helpers ----------
  function div(id, cls, parent, html) {
    const e = document.createElement('div');
    if (id) e.id = id;
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    (parent || S.stage).appendChild(e);
    return e;
  }
  const show = (e, on) => {
    const v = on ? '' : 'none';
    if (e.style.display !== v) e.style.display = v;
  };
  function slam(e, u, t0) {
    const k = P(u, t0, t0 + 0.22);
    e.style.opacity = clamp(k * 4);
    e.style.transform = `scale(${lerp(1.35, 1, E.out(k))})`;
  }
  function popIn(e, u, t0) {
    const k = P(u, t0, t0 + 0.35);
    e.style.opacity = clamp(k * 2.5);
    e.style.transform = `translateY(${lerp(30, 0, E.out(k))}px) scale(${lerp(0.9, 1, E.back(k))})`;
  }
  function fitLine(el, text, max, maxW) {
    const f = { family: 'Saira', weight: 900, style: 'italic' };
    el.style.fontSize = Math.min(max, ART.fit(text.toUpperCase(), f, maxW, max, -1)).toFixed(1) + 'px';
  }

  // ---------- setup ----------
  async function loadFonts() {
    const fam = new Map();
    const add = (name, spec) => {
      if (!fam.has(name)) fam.set(name, new Set());
      fam.get(name).add(spec);
    };
    ['0,500', '0,700', '0,800', '1,800', '1,900'].forEach((s) => add('Saira', s));
    ['0,500', '0,700'].forEach((s) => add('JetBrains Mono', s));
    add(B.font, `${B.fontStyle === 'italic' ? 1 : 0},${B.fontWeight || 400}`);
    add(B.subFont || 'Montserrat', '0,700');
    const q = [...fam].map(([n, specs]) => `family=${n.replace(/ /g, '+')}:ital,wght@${[...specs].sort().join(';')}`).join('&');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${q}&display=block`;
    await new Promise((res) => {
      link.onload = res;
      link.onerror = res;
      document.head.appendChild(link);
    });
    const specs = [
      '500 40px Saira', '700 40px Saira', '800 40px Saira', 'italic 800 40px Saira', 'italic 900 40px Saira',
      '500 40px "JetBrains Mono"', '700 40px "JetBrains Mono"',
      `${B.fontStyle || 'normal'} ${B.fontWeight || 400} 40px "${B.font}"`,
      `700 40px "${B.subFont || 'Montserrat'}"`,
    ];
    await Promise.all(specs.map((f) => document.fonts.load(f).catch(() => null)));
    await document.fonts.ready;
    const missing = specs.filter((f) => !document.fonts.check(f));
    if (missing.length) console.warn('fonts not loaded: ' + missing.join(', '));
  }

  function makeNoise() {
    const c = document.createElement('canvas');
    c.width = c.height = 220;
    const g = c.getContext('2d');
    const img = g.createImageData(220, 220);
    let s = 99;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.floor(r() * 30);
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function layoutSheet() {
    const [w, h] = ART.SIZE[B.shape] || ART.SIZE.circle;
    const M = { l: 50, r: 50, t: 100, b: 70 }, gap = 22;
    const aw = SHEET.w - M.l - M.r, ah = SHEET.h - M.t - M.b;
    let best = null;
    for (let cols = 2; cols <= 4; cols++) {
      for (let rows = 2; rows <= 6; rows++) {
        const sw = Math.min((aw - (cols - 1) * gap) / cols, ((ah - (rows - 1) * gap) / rows) * (w / h));
        const n = cols * rows;
        if (sw < 150 || n > 12) continue;
        const score = n + sw / 100;
        if (!best || score > best.score) best = { cols, rows, sw, score };
      }
    }
    const s = best.sw / w, sh = h * s;
    const gw = best.cols * best.sw + (best.cols - 1) * gap, gh = best.rows * sh + (best.rows - 1) * gap;
    const x0 = M.l + (aw - gw) / 2, y0 = M.t + (ah - gh) / 2;
    G.cells = [];
    for (let r = 0; r < best.rows; r++) {
      for (let k = 0; k < best.cols; k++) {
        const col = r % 2 ? best.cols - 1 - k : k; // serpentine, like a real plotter job
        G.cells.push({ x: x0 + col * (best.sw + gap), y: y0 + r * (sh + gap), s, w: best.sw, h: sh });
      }
    }
    G.stW = w;
    G.stH = h;
    let bi = 0, bd = 1e9;
    G.cells.forEach((c, i) => {
      const d = Math.hypot(c.x + c.w / 2 - SHEET.w / 2, c.y + c.h / 2 - SHEET.h * 0.55);
      if (d < bd) { bd = d; bi = i; }
    });
    G.peel = bi;
    const pc = G.cells[bi];
    G.pc = { x: SHEET.x + pc.x + pc.w / 2, y: SHEET.y + pc.y + pc.h / 2 };
    G.marks = [
      [SHEET.x + 46, SHEET.y + 46],
      [SHEET.x + SHEET.w - 50, SHEET.y + 50],
      [SHEET.x + 50, SHEET.y + SHEET.h - 50],
    ];
  }

  function sheetSVG() {
    const { w, h } = SHEET;
    const probe = ART.sticker(B, 'probe');
    G.contour = probe.contour;
    let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    s += `<defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ececE8"/></linearGradient></defs>`;
    s += `<rect width="${w}" height="${h}" fill="url(#paper)"/>`;
    s += `<rect x="30" y="30" width="32" height="32" fill="#141414"/>`;
    s += `<path d="M${w - 84},34 H${w - 34} V84 M34,${h - 84} V${h - 34} H84" fill="none" stroke="#141414" stroke-width="8"/>`;
    s += `<text x="${w / 2}" y="${h - 30}" text-anchor="middle" font-family="JetBrains Mono" font-size="15" fill="#a3a39c" letter-spacing="1">${ART.esc(B.name)} · ${G.cells.length} stickers · @nexa_designlab</text>`;
    G.cells.forEach((c, i) => {
      const t = `translate(${c.x.toFixed(2)},${c.y.toFixed(2)}) scale(${c.s.toFixed(5)})`;
      if (i === G.peel) {
        s += `<g transform="${t}"><path d="${G.contour}" fill="#e4e2da" stroke="#c4c1b6" stroke-width="${(2 / c.s).toFixed(2)}"/></g>`;
      }
      s += `<g class="sh-st" transform="${t}">${ART.sticker(B, 'sh' + i).markup}</g>`;
    });
    G.cells.forEach((c) => {
      s += `<path class="cut" transform="translate(${c.x.toFixed(2)},${c.y.toFixed(2)}) scale(${c.s.toFixed(5)})" d="${G.contour}" fill="none" stroke="#1e1e1e" stroke-opacity=".85" stroke-width="${(2.6 / c.s).toFixed(2)}"/>`;
    });
    return s + '</svg>';
  }

  function printerSVG() {
    return `<svg width="1000" height="292" viewBox="0 0 1000 292">
      <defs>
        <linearGradient id="pb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d4248"/><stop offset=".6" stop-color="#24282c"/><stop offset="1" stop-color="#16191c"/></linearGradient>
        <linearGradient id="psh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
      </defs>
      <rect x="60" y="244" width="880" height="48" fill="url(#psh)"/>
      <rect x="0" y="0" width="1000" height="232" rx="36" fill="url(#pb)"/>
      <rect x="1.5" y="1.5" width="997" height="229" rx="35" fill="none" stroke="#fff" stroke-opacity=".09" stroke-width="3"/>
      <rect x="130" y="34" width="740" height="84" rx="16" fill="#0b0d0f"/>
      <path d="M150 78 H850" stroke="#2c3136" stroke-width="6"/>
      <g class="shuttle"><rect x="-46" y="46" width="92" height="58" rx="10" fill="#4f565c"/><rect x="-32" y="92" width="64" height="9" rx="4" fill="#9aca3c"/></g>
      <text x="70" y="176" font-family="Saira" font-weight="800" font-style="italic" font-size="30" fill="#9aca3c" letter-spacing="3">NEXA</text>
      <text x="170" y="176" font-family="Saira" font-weight="700" font-size="22" fill="#7d858c" letter-spacing="4">PRINT STUDIO</text>
      <circle class="led" cx="920" cy="166" r="10" fill="#9aca3c"/>
      <rect x="40" y="200" width="920" height="44" rx="12" fill="#0c0e10"/>
      <rect x="40" y="200" width="920" height="6" rx="3" fill="#fff" fill-opacity=".10"/>
    </svg>`;
  }

  function headSVG() {
    return `<svg width="112" height="150" viewBox="0 0 112 150">
      <rect x="4" y="4" width="104" height="142" rx="16" fill="#2d3237" stroke="#fff" stroke-opacity=".14" stroke-width="2"/>
      <path d="M4 20 Q4 4 20 4 H92 Q108 4 108 20 V34 H4 Z" fill="#9aca3c"/>
      <text x="56" y="27" text-anchor="middle" font-family="Saira" font-weight="800" font-style="italic" font-size="19" fill="#0b0d09" letter-spacing="1">NEXA</text>
      <circle cx="56" cy="75" r="27" fill="#1a1d20" stroke="#6b737a" stroke-width="4"/>
      <circle cx="56" cy="75" r="9" fill="#c9cfd4"/>
      <circle cx="88" cy="124" r="6" fill="#ff5a4e"/>
      <rect x="20" y="116" width="44" height="14" rx="4" fill="#1a1d20"/>
    </svg>`;
  }

  function artboardSVG() {
    const st = ART.sticker(B, 'ab');
    G.ab = st;
    const k = Math.min(500 / st.w, 500 / st.h);
    const tx = 380 - (st.w * k) / 2, ty = 350 - (st.h * k) / 2;
    G.abT = { k, tx, ty };
    const pal = [B.palette.bg, B.palette.ink, B.palette.accent, B.palette.light];
    const sw = pal.map((c, i) => `<g transform="translate(${74 + i * 60},713)"><g class="ab-sw"><circle r="23" fill="${c}" stroke="#000" stroke-opacity=".15" stroke-width="2"/></g></g>`).join('');
    const handle = '<rect width="14" height="14" fill="#fff" stroke="#9aca3c" stroke-width="3"/>';
    const fontName = ART.esc(B.font);
    return `<svg width="760" height="780" viewBox="0 0 760 780">
      <g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${k.toFixed(5)})">
        <g class="ab-sticker">${st.markup}</g>
        <path class="ab-outline" d="${st.contour}" fill="none" stroke="#9aca3c" stroke-width="${(6 / k).toFixed(2)}" stroke-linecap="round"/>
      </g>
      <g class="ab-sel"><rect class="ab-sel-r" fill="none" stroke="#9aca3c" stroke-width="3" stroke-dasharray="10 7"/>${handle.repeat(4)}</g>
      <line x1="40" y1="670" x2="720" y2="670" stroke="#000" stroke-opacity=".07" stroke-width="2"/>
      ${sw}
      <g class="ab-font"><rect x="318" y="690" width="222" height="46" rx="23" fill="#eceee8"/>
        <text x="342" y="722" font-family="${fontName}" font-weight="${B.fontWeight || 400}" font-style="${B.fontStyle || 'normal'}" font-size="26" fill="#222">Aa</text>
        <text x="386" y="720" font-family="Saira" font-weight="600" font-size="19" fill="#555">${fontName.length > 14 ? fontName.slice(0, 13) + '…' : fontName}</text></g>
      <g class="ab-print"><g class="ab-print-s"><rect x="-82" y="-27" width="164" height="54" rx="14" fill="#9aca3c"/>
        <text x="-14" y="10" text-anchor="middle" font-family="Saira" font-weight="800" font-size="26" fill="#0b0d09" letter-spacing="2">PRINT</text>
        <path d="M46 -12 L64 0 L46 12 Z" fill="#0b0d09"/></g></g>
    </svg>`;
  }

  const CURSOR = `<svg width="56" height="56" viewBox="0 0 56 56"><path d="M8 4 L8 44 L18 34 L26 52 L33 49 L25 31 L40 31 Z" fill="#fff" stroke="#111" stroke-width="3" stroke-linejoin="round"/></svg>`;
  const SPARK = `<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 4 C54 36 64 46 96 50 C64 54 54 64 50 96 C46 64 36 54 4 50 C36 46 46 36 50 4 Z" fill="#fff"/></svg>`;
  const FF = `<svg viewBox="0 0 40 30"><path d="M2 3 L18 15 L2 27 Z M20 3 L36 15 L20 27 Z" fill="#0b0d09"/></svg>`;

  function productSlot(id, withSticker) {
    const p = ART.product(B, id, withSticker);
    const ps = Math.min(PMAX.w / p.w, PMAX.h / p.h);
    const e = div(id, 'pslot', S.productWrap, p.svg);
    const w = p.w * ps, h = p.h * ps;
    e.style.width = w + 'px';
    e.style.height = h + 'px';
    e.style.left = 540 - w / 2 + 'px';
    e.style.top = FLOOR - h + 'px';
    return { el: e, p, ps, left: 540 - w / 2, top: FLOOR - h };
  }

  function build(logoUrl) {
    const st = S.stage;
    const pal = B.palette;
    st.style.setProperty('--bd', pal.backdrop);
    st.style.setProperty('--bd-light', ART.shade(pal.backdrop, 0.55));
    st.style.setProperty('--bd-dark', ART.shade(pal.backdrop, -0.08));

    S.bgHook = div('bgHook', 'bg');
    S.bgDesign = div('bgDesign', 'bg');
    S.bgProduct = div('bgProduct', 'bg');
    G.blobs = [
      [120, 520, 380, pal.accent], [930, 760, 300, pal.bg], [860, 1480, 420, pal.accent], [160, 1300, 260, pal.bg],
    ].map(([x, y, r, c]) => {
      const e = div('', 'blob', S.bgProduct);
      e.style.width = e.style.height = r * 2 + 'px';
      e.style.left = x - r + 'px';
      e.style.top = y - r + 'px';
      e.style.background = `radial-gradient(circle, ${c}66 0%, ${c}00 70%)`;
      return e;
    });

    // Workshop world: cutting mat, printer, sheet, plotter gantry (zoomed as one during the peel).
    S.world = div('world');
    div('mat', 'bg', S.world);
    S.sheetWrap = div('sheetWrap', '', S.world);
    S.sheet = div('sheet', '', S.sheetWrap, sheetSVG());
    S.sheet.style.left = '0px';
    S.sheet.style.top = '0px';
    S.printer = div('printer', '', S.world, printerSVG());
    S.printer.style.left = '0px';
    S.printer.style.top = '0px';
    G.shuttle = S.printer.querySelector('.shuttle');
    G.led = S.printer.querySelector('.led');
    G.pings = G.marks.map(() => div('', 'ping', S.world));
    S.gantry = div('gantry', '', S.world);
    S.rail = div('rail', '', S.gantry);
    S.laser = div('laser', '', S.gantry);
    S.head = div('head', '', S.gantry, headSVG());
    S.okLabel = div('okLabel', '', S.world, 'MARKS ALIGNED ✓');
    S.okLabel.style.left = SHEET.x + SHEET.w / 2 - 190 + 'px';
    S.okLabel.style.top = SHEET.y + 110 + 'px';
    G.stEls = [...S.sheet.querySelectorAll('.sh-st')];
    G.cutEls = [...S.sheet.querySelectorAll('.cut')];
    G.cutLen = G.cutEls[0].getTotalLength();
    G.cutEls.forEach((e) => {
      e.style.strokeDasharray = `${G.cutLen} ${G.cutLen}`;
      e.style.strokeDashoffset = G.cutLen;
    });

    S.flyShadow = div('flyShadow');
    S.flyShadow.style.background = 'rgba(0,0,0,.55)';
    S.flyShadow.style.filter = 'blur(18px)';
    S.flyShadow.style.borderRadius = B.shape === 'circle' || B.shape === 'oval' ? '50%' : '28px';

    // Products: main + two copies for the reveal.
    S.productWrap = div('productWrap');
    G.slotL = productSlot('pl', true);
    G.slotR = productSlot('pr', true);
    G.slotM = productSlot('pm', false);
    const m = G.slotM;
    G.label = {
      cx: m.left + m.p.label.cx * m.ps, cy: m.top + m.p.label.cy * m.ps,
      w: m.p.label.w * m.ps, h: m.p.label.h * m.ps, tilt: m.p.tilt,
    };
    G.mainSticker = m.el.querySelector('.p-sticker');
    G.shine = m.el.querySelector('.p-shine');
    G.flame = [...S.productWrap.querySelectorAll('.p-flame-s')];
    G.sparks = [0, 1, 2, 3].map(() => div('', 'spark', S.productWrap, SPARK));

    // Headlines.
    const noun = B.productNoun || 'box';
    const hook = B.hook || ['Plain ' + noun + '?', "Let's brand it."];
    const rev = B.reveal || ['Same ' + noun + '.', 'New brand.'];
    S.hookText = div('hookText', 'headline');
    S.hookText.style.top = '250px';
    S.hkEye = div('', 'eyebrow', S.hookText, ART.esc('For ' + (B.audience || 'small brands')));
    S.hk1 = div('', 'line', S.hookText, ART.esc(hook[0]));
    S.hk2 = div('', 'line hl', S.hookText, `<span><i>${ART.esc(hook[1])}</i></span>`);
    fitLine(S.hk1, hook[0], 104, 940);
    fitLine(S.hk2.querySelector('span'), hook[1], 96, 820);
    S.revealText = div('revealText', 'headline');
    S.revealText.style.top = '250px';
    S.rvEye = div('', 'eyebrow', S.revealText, ART.esc((B.concept === false ? 'Made for ' + B.name : 'Concept · ' + (B.noun || 'brand'))));
    S.rv1 = div('', 'line', S.revealText, ART.esc(rev[0]));
    S.rv2 = div('', 'line hl', S.revealText, `<span><i>${ART.esc(rev[1])}</i></span>`);
    fitLine(S.rv1, rev[0], 104, 940);
    fitLine(S.rv2.querySelector('span'), rev[1], 96, 820);

    // Design scene.
    S.artboard = div('artboard', '', null, artboardSVG());
    div('abHead', '', S.artboard, `<b>●</b> ${ART.esc(B.id || 'brand')}-sticker.svg <span style="opacity:.6">— Nexa Studio</span>`);
    const ab = S.artboard;
    G.abOutline = ab.querySelector('.ab-outline');
    G.abLen = G.abOutline.getTotalLength();
    G.abOutline.style.strokeDasharray = `${G.abLen} ${G.abLen}`;
    G.abBg = ab.querySelector('.ab-sticker .st-bg');
    G.abLate = [...ab.querySelectorAll('.ab-sticker .st-deco, .ab-sticker .st-tag')];
    G.abLate.forEach((e) => (e.dataset.op = e.getAttribute('opacity') || '1'));
    G.abIcon = ab.querySelector('.ab-sticker .st-icon-s');
    G.abChars = [...ab.querySelectorAll('.ab-sticker .st-name .ch')];
    G.abSel = ab.querySelector('.ab-sel');
    G.abSelR = ab.querySelector('.ab-sel-r');
    G.abHandles = [...G.abSel.querySelectorAll('rect')].slice(1);
    G.abSw = [...ab.querySelectorAll('.ab-sw')];
    G.abFont = ab.querySelector('.ab-font');
    G.abPrint = ab.querySelector('.ab-print');
    G.abPrintS = ab.querySelector('.ab-print-s');
    G.abPrint.setAttribute('transform', 'translate(640,713)');
    const cpts = [];
    const tmp = document.createElementNS(NS, 'path');
    tmp.setAttribute('d', G.ab.contour);
    const svgTmp = document.createElementNS(NS, 'svg');
    svgTmp.appendChild(tmp);
    document.body.appendChild(svgTmp);
    const L = tmp.getTotalLength();
    for (let i = 0; i <= 140; i++) {
      const q = tmp.getPointAtLength((L * i) / 140);
      cpts.push([q.x, q.y]);
    }
    svgTmp.remove();
    G.contourPts = cpts;
    S.cursor = div('cursor', '', null, CURSOR);
    S.click = div('', 'ping');

    S.fadeCover = div('fadeCover', 'bg');
    S.fadeCover.style.background = getComputedStyle(S.bgProduct).background;

    S.fly = div('fly');
    const fst = ART.sticker(B, 'fly');
    S.fly.innerHTML = `<svg viewBox="0 0 ${fst.w} ${fst.h}" width="100%" height="100%" preserveAspectRatio="none" style="overflow:visible">
      <defs><linearGradient id="flyg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".6" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient></defs>
      ${fst.markup}<path class="fly-shade" d="${fst.contour}" fill="url(#flyg)" opacity="0"/></svg>`;
    G.flyShade = S.fly.querySelector('.fly-shade');
    S.tap = div('tap', 'ping');

    // UI overlay.
    S.watermark = div('watermark', '', null, `<img src="${logoUrl}" alt="">`);
    S.chips = div('chips');
    S.chipEls = ['Design', 'Print', 'Cut', 'Peel', 'Stick'].map((c) => div('', 'chip', S.chips, c.toUpperCase()));
    S.step = div('step');
    S.stepBox = div('stepBox', '', S.step);
    S.stepTxt = div('stepTxt', '', S.stepBox, '');
    S.speed = div('speed', '', null, FF + '<span></span>');
    S.speedTxt = S.speed.querySelector('span');

    S.endcard = div('endcard');
    div('', 'slash', S.endcard);
    ['tl', 'tr', 'bl', 'br'].forEach((c) => div('', 'mk ' + c, S.endcard));
    S.endLogo = document.createElement('img');
    S.endLogo.id = 'endLogo';
    S.endLogo.src = logoUrl;
    S.endLogo.style.position = 'absolute';
    S.endcard.appendChild(S.endLogo);
    S.endTitle = div('endTitle', '', S.endcard, 'Your logo<br>next?');
    S.endSub = div('endSub', '', S.endcard, 'Custom stickers &amp; labels<br>Designed · Printed · Cut in-house');
    S.endCta = div('endCta', '', S.endcard, 'DM @nexa_designlab');

    S.wipeB = div('wipeB', 'wipe');
    S.wipeA = div('wipeA', 'wipe');
  }

  // ---------- plotter job ----------
  function planCut() {
    const segs = [];
    let m = 0, prev = null;
    G.cutSeg = [];
    G.cells.forEach((c, i) => {
      const pts = G.contourPts.map(([x, y]) => [SHEET.x + c.x + x * c.s, SHEET.y + c.y + y * c.s]);
      if (prev) {
        const len = Math.hypot(pts[0][0] - prev[0], pts[0][1] - prev[1]);
        segs.push({ type: 'travel', a: prev, b: pts[0], m0: m, m1: m + len / VT });
        m += len / VT;
      }
      const cum = [0];
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      const len = cum[cum.length - 1];
      const seg = { type: 'cut', i, pts, cum, len, m0: m, m1: m + len / VC };
      segs.push(seg);
      G.cutSeg[i] = seg;
      m += len / VC;
      prev = pts[pts.length - 1];
    });
    // First sticker at real speed, then keep accelerating (the "8x" timelapse feel).
    const Tc = CUT_RUN[1] - CUT_RUN[0];
    const m1 = segs[0].m1, T1 = Math.min(m1, 0.95), r1 = m1 / T1;
    const Mrest = m - m1, Trest = Tc - T1;
    const alpha = clamp((r1 * Trest) / Mrest, 0, 1);
    plan = {
      segs, M: m, r1, start: segs[0].pts[0], end: prev,
      map(tau) {
        if (tau <= T1) return tau * r1;
        const u = clamp((tau - T1) / Trest);
        return m1 + Mrest * (alpha * u + (1 - alpha) * u * u * u);
      },
      rate(tau) {
        if (tau <= T1) return r1;
        const u = clamp((tau - T1) / Trest);
        return (Mrest / Trest) * (alpha + 3 * (1 - alpha) * u * u);
      },
    };
  }

  function toolAt(m) {
    const segs = plan.segs;
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid].m0 <= m) lo = mid;
      else hi = mid - 1;
    }
    const sg = segs[lo];
    const f = clamp((m - sg.m0) / (sg.m1 - sg.m0));
    if (sg.type === 'travel') return { x: lerp(sg.a[0], sg.b[0], f), y: lerp(sg.a[1], sg.b[1], f), down: false };
    const target = f * sg.len;
    let a = 0, b = sg.cum.length - 1;
    while (b - a > 1) {
      const mid = (a + b) >> 1;
      if (sg.cum[mid] <= target) a = mid;
      else b = mid;
    }
    const g = (target - sg.cum[a]) / Math.max(1e-6, sg.cum[b] - sg.cum[a]);
    return { x: lerp(sg.pts[a][0], sg.pts[b][0], g), y: lerp(sg.pts[a][1], sg.pts[b][1], g), down: f < 1 };
  }

  /** Tool position during the cut scene (u = seconds since the scene started). */
  function toolState(u) {
    const M = G.marks;
    const mv = (a, b, k) => ({ x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k) });
    if (u < 0.35) return { x: M[0][0], y: lerp(-180, M[0][1], E.out(P(u, 0, 0.35))) };
    if (u < 0.45) return { x: M[0][0], y: M[0][1], laser: true };
    if (u < 0.65) return Object.assign(mv(M[0], M[1], E.io(P(u, 0.45, 0.65))), { laser: true });
    if (u < 0.75) return { x: M[1][0], y: M[1][1], laser: true };
    if (u < 0.95) return Object.assign(mv(M[1], M[2], E.io(P(u, 0.75, 0.95))), { laser: true });
    if (u < 1.1) return { x: M[2][0], y: M[2][1], laser: true };
    if (u < CUT_RUN[0]) return mv(M[2], plan.start, E.io(P(u, 1.1, CUT_RUN[0])));
    if (u < CUT_RUN[1]) return toolAt(plan.map(u - CUT_RUN[0]));
    return { x: plan.end[0], y: lerp(plan.end[1], -220, E.in(P(u, CUT_RUN[1], CUT_LEN))) };
  }

  // ---------- scenes ----------
  function placeSlot(slot, dx, dy, s, rot) {
    slot.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot || 0}deg) scale(${s})`;
  }

  function sceneHook(t) {
    if (t >= T.design) return;
    // Product is on screen from frame 0: a blank first frame costs viewers.
    const d = E.back(P(t, 0, 0.42));
    const wob = t > 1.3 && t < 1.8 ? Math.sin((t - 1.3) * Math.PI * 7) * 2.2 * (1 - P(t, 1.3, 1.8)) : 0;
    placeSlot(G.slotM, 0, lerp(-110, 0, d), 1, wob);
    G.slotM.el.style.opacity = 1;
    show(G.slotL.el, false);
    show(G.slotR.el, false);
    show(G.mainSticker, false);
    G.sparks.forEach((e) => show(e, false));
    popIn(S.hkEye, t, 0.02);
    slam(S.hk1, t, 0.12);
    slam(S.hk2, t, 0.8);
  }

  function setSel(box) {
    if (!box) {
      show(G.abSel, false);
      return;
    }
    show(G.abSel, true);
    const { k, tx, ty } = G.abT;
    const x = tx + box.x * k - 8, y = ty + box.y * k - 8, w = box.w * k + 16, h = box.h * k + 16;
    G.abSelR.setAttribute('x', x);
    G.abSelR.setAttribute('y', y);
    G.abSelR.setAttribute('width', w);
    G.abSelR.setAttribute('height', h);
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy], i) => {
      G.abHandles[i].setAttribute('x', hx - 7);
      G.abHandles[i].setAttribute('y', hy - 7);
    });
  }

  function sceneDesign(t) {
    const on = t >= T.design && t < T.print;
    show(S.cursor, on && t >= T.design + 0.15);
    show(S.click, false);
    if (!on) return;
    const u = t - T.design;
    const a = E.out(P(u, 0, 0.3));
    S.artboard.style.opacity = a;
    S.artboard.style.transform = `scale(${lerp(0.94, 1, a)})`;

    const dk = E.io(P(u, 0.2, 0.8));
    G.abOutline.style.strokeDashoffset = G.abLen * (1 - dk);
    G.abOutline.setAttribute('opacity', 1 - P(u, 0.95, 1.15));
    G.abBg.setAttribute('opacity', E.out(P(u, 0.7, 0.9)));
    const late = P(u, 1.75, 1.95);
    G.abLate.forEach((e) => e.setAttribute('opacity', late * parseFloat(e.dataset.op)));
    const ik = P(u, 0.95, 1.25);
    G.abIcon.setAttribute('transform', `scale(${ik <= 0 ? 0 : E.back(ik)})`);
    const n = G.abChars.length;
    const typed = clamp((u - 1.25) / 0.6);
    G.abChars.forEach((ch, i) => ch.setAttribute('fill-opacity', u >= 1.25 + (i * 0.6) / n ? 1 : 0));
    const boxes = G.ab.boxes;
    setSel(u >= 0.95 && u < 1.25 ? boxes.icon : u >= 1.25 && u < 1.95 ? boxes.name : null);
    G.abSw.forEach((g, i) => {
      const k = P(u, 1.85 + i * 0.07, 2.1 + i * 0.07);
      g.setAttribute('transform', `scale(${k <= 0 ? 0 : E.back(k)})`);
    });
    G.abFont.setAttribute('opacity', P(u, 1.95, 2.1));
    const pk = P(u, 2.02, 2.25);
    const press = u > 2.3 && u < 2.42 ? 0.93 : 1;
    G.abPrintS.setAttribute('transform', `scale(${(pk <= 0 ? 0 : E.back(pk)) * press})`);

    // Cursor choreography (artboard coords).
    const { k, tx, ty } = G.abT;
    const toAb = (p) => [tx + p[0] * k, ty + p[1] * k];
    const pen = (f) => {
      const i = Math.min(G.contourPts.length - 1, Math.floor(f * (G.contourPts.length - 1)));
      return toAb(G.contourPts[i]);
    };
    const ic = [tx + (boxes.icon.x + boxes.icon.w / 2) * k, ty + (boxes.icon.y + boxes.icon.h / 2) * k];
    const nb = boxes.name;
    const nameAt = (f) => [tx + (nb.x + nb.w * f) * k, ty + (nb.y + nb.h * 0.62) * k];
    const btn = [650, 722];
    let c;
    if (u < 0.8) c = pen(dk);
    else if (u < 0.95) c = mix(pen(1), ic, E.io(P(u, 0.8, 0.95)));
    else if (u < 1.1) c = ic;
    else if (u < 1.25) c = mix(ic, nameAt(0), E.io(P(u, 1.1, 1.25)));
    else if (u < 2.02) c = nameAt(typed);
    else if (u < 2.26) c = mix(nameAt(1), btn, E.io(P(u, 2.02, 2.26)));
    else c = btn;
    const clicks = [0.97, 2.3];
    const pressed = clicks.some((x) => u >= x && u < x + 0.08);
    S.cursor.style.transform = `translate(${160 + c[0] - 8}px, ${470 + c[1] - 4}px) scale(${pressed ? 0.84 : 1})`;
    S.cursor.style.opacity = P(u, 0.15, 0.25);
    const ck = clicks.find((x) => u >= x && u < x + 0.35);
    if (ck !== undefined) {
      show(S.click, true);
      const kk = P(u, ck, ck + 0.35);
      S.click.style.transform = `translate(${160 + c[0] - 35}px, ${470 + c[1] - 35}px) scale(${0.3 + kk * 1.2})`;
      S.click.style.opacity = 1 - kk;
    }
  }
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

  function sceneMake(t) {
    if (t < T.print || t >= T.stick) {
      show(S.flyShadow, false);
      show(S.tap, false);
      show(S.fadeCover, false);
      return;
    }
    // PRINT
    const up = t - T.print;
    const pin = E.out(P(up, 0, 0.3)), pout = E.in(P(up, 1.95, 2.3));
    const printing = up > 0.35 && up < 1.9;
    const jx = printing ? Math.sin(up * 97) * 1.2 : 0, jy = printing ? Math.cos(up * 83) * 0.8 : 0;
    show(S.printer, up < 2.32);
    S.printer.style.transform = `translate(${40 + jx}px, ${SLOT - 222 + lerp(-520, 0, pin) + lerp(0, -560, pout) + jy}px)`;
    G.shuttle.setAttribute('transform', `translate(${500 + 300 * (printing ? tri(up * 2.4) : 0)},0)`);
    G.led.setAttribute('opacity', printing ? (Math.floor(up * 8) % 2 ? 1 : 0.25) : 1);
    const f = E.smooth(P(up, 0.35, 1.9));
    S.sheet.style.transform = `translate(${SHEET.x}px, ${lerp(SLOT - SHEET.h, SHEET.y, f)}px)`;
    S.sheetWrap.style.clipPath = up < 2.0 ? `inset(${SLOT}px 0 0 0)` : 'none';

    // CUT
    const uc = t - T.cut;
    const cutting = uc >= 0 && uc < CUT_LEN;
    show(S.gantry, cutting);
    let m = -1;
    if (uc >= CUT_RUN[0]) m = plan.map(Math.min(uc, CUT_RUN[1]) - CUT_RUN[0]);
    if (uc >= CUT_RUN[1]) m = plan.M;
    G.cutEls.forEach((el, i) => {
      const sg = G.cutSeg[i];
      const fr = m < 0 ? 0 : clamp((m - sg.m0) / (sg.m1 - sg.m0));
      el.style.strokeDashoffset = G.cutLen * (1 - fr);
    });
    if (cutting) {
      const s = toolState(uc);
      S.rail.style.transform = `translate(0px, ${s.y - 35}px)`;
      S.head.style.transform = `translate(${s.x - 56}px, ${s.y - 75}px) scale(${s.down ? 1 : 1.05})`;
      show(S.laser, !!s.laser);
      if (s.laser) S.laser.style.transform = `translate(${s.x - 30}px, ${s.y - 30}px)`;
    }
    [0.4, 0.7, 1.0].forEach((tp, i) => {
      const k = P(uc, tp, tp + 0.4);
      const on = uc >= tp && uc < tp + 0.4;
      show(G.pings[i], on);
      if (on) {
        G.pings[i].style.transform = `translate(${G.marks[i][0] - 35}px, ${G.marks[i][1] - 35}px) scale(${0.4 + 1.3 * k})`;
        G.pings[i].style.opacity = 1 - k;
      }
    });
    const okOn = uc >= 1.05 && uc < 1.9;
    show(S.okLabel, okOn);
    if (okOn) {
      popIn(S.okLabel, uc, 1.05);
      S.okLabel.style.opacity = Math.min(parseFloat(S.okLabel.style.opacity), 1 - P(uc, 1.65, 1.9));
    }

    // PEEL
    const pu = t - T.peel;
    let z = 1, wx = 0, wy = 0;
    if (pu >= 0) {
      const e = E.io(P(pu, 0, 0.45));
      z = lerp(1, ZOOM, e);
      wx = lerp(0, PEEL_C.x - ZOOM * G.pc.x, e);
      wy = lerp(0, PEEL_C.y - ZOOM * G.pc.y, e);
    }
    S.world.style.transform = `translate(${wx}px, ${wy}px) scale(${z})`;
    show(G.stEls[G.peel], pu < 0.45);
    show(S.fadeCover, pu >= 1.0);
    if (pu >= 1.0) S.fadeCover.style.opacity = E.smooth(P(pu, 1.0, 1.45));
    const tapOn = pu >= 0.36 && pu < 0.72;
    show(S.tap, tapOn);
    if (tapOn) {
      const k = P(pu, 0.36, 0.72);
      const hh = G.stH * G.cells[G.peel].s * ZOOM;
      S.tap.style.transform = `translate(${PEEL_C.x - 35}px, ${PEEL_C.y - hh / 2 + 20 - 35}px) scale(${0.35 + 1.2 * k})`;
      S.tap.style.opacity = 1 - k;
    }
  }

  function flyState(t) {
    if (t < T.peel + 0.45 || t >= T.stick + 0.95) return null;
    const c = G.cells[G.peel];
    const bw = G.stW * c.s * ZOOM, bh = G.stH * c.s * ZOOM;
    if (t < T.peel + 0.95) {
      const k = E.out(P(t - T.peel, 0.45, 0.95));
      return { cx: PEEL_C.x, cy: PEEL_C.y, w: bw, h: bh, rx: -40 * k, rz: -3 * k, origin: '50% 100%', shade: 0.45 * k, shadow: k };
    }
    if (t < T.stick) {
      const k = E.io(P(t - T.peel, 0.95, 1.5));
      const s = lerp(1, 1.9, k);
      return {
        cx: PEEL_C.x, cy: lerp(PEEL_C.y, 800, k), w: bw * s, h: bh * s, rx: lerp(-40, -8, k), rz: lerp(-3, -10, k),
        origin: '50% 100%', shade: lerp(0.45, 0.1, k), shadow: 1 - P(t - T.peel, 0.95, 1.2),
      };
    }
    const u = t - T.stick;
    const s0 = 1.9;
    if (u < 0.3) {
      return { cx: 540, cy: 800 + Math.sin(u * 9) * 8, w: bw * s0, h: bh * s0, rx: -8, rz: lerp(-10, -7, u / 0.3), origin: '50% 100%', shade: 0.1 };
    }
    const L = G.label;
    if (u < 0.8) {
      const k = E.io(P(u, 0.3, 0.8));
      return {
        cx: lerp(540, L.cx, k), cy: lerp(800 + Math.sin(2.7) * 8, L.cy, k), w: lerp(bw * s0, L.w, k), h: lerp(bh * s0, L.h, k),
        rx: lerp(-8, L.tilt, k), rz: lerp(-7, 0, k), origin: '50% 50%', persp: lerp(1600, 6000, k), shade: lerp(0.1, 0, k),
      };
    }
    const q = Math.sin(Math.PI * P(u, 0.8, 0.95));
    return { cx: L.cx, cy: L.cy, w: L.w * (1 + 0.05 * q), h: L.h * (1 - 0.05 * q), rx: L.tilt, rz: 0, origin: '50% 50%', persp: 6000, shade: 0 };
  }

  function sceneFly(t) {
    const f = flyState(t);
    show(S.fly, !!f);
    show(S.flyShadow, !!(f && f.shadow > 0));
    if (!f) return;
    const st = S.fly.style;
    st.width = f.w + 'px';
    st.height = f.h + 'px';
    st.left = f.cx - f.w / 2 + 'px';
    st.top = f.cy - f.h / 2 + 'px';
    st.transformOrigin = f.origin;
    st.transform = `perspective(${f.persp || 1600}px) rotateX(${f.rx}deg) rotateZ(${f.rz}deg)`;
    G.flyShade.setAttribute('opacity', f.shade);
    if (f.shadow > 0) {
      const sh = S.flyShadow.style;
      sh.width = f.w * 0.92 + 'px';
      sh.height = f.h * 0.85 + 'px';
      sh.left = f.cx - f.w * 0.46 + 'px';
      sh.top = f.cy - f.h * 0.4 + 26 * f.shadow + 'px';
      sh.opacity = 0.6 * f.shadow;
    }
  }

  function sceneProduct(t) {
    if (t < T.stick || t >= T.end) return;
    const u = t - T.stick;
    const r = t - T.reveal;
    const rk = r >= 0 ? E.io(P(r, 0, 0.6)) : 0;
    const rise = E.out(P(u, 0, 0.35));
    placeSlot(G.slotM, 0, lerp(900, 0, rise) + 50 * rk, lerp(1, 0.82, rk), 0);
    G.slotM.el.style.opacity = 1;
    show(G.mainSticker, u >= 0.95);
    const shk = P(u, 1.0, 1.45);
    G.shine.setAttribute('x', lerp(-300, G.slotM.p.w + 260, E.io(shk)));
    G.flame.forEach((fl, i) => fl.setAttribute('transform', `scale(${1 + 0.06 * Math.sin(t * 23 + i)}, ${1 + 0.09 * Math.sin(t * 31 + i * 2)})`));
    const L = G.label;
    const offs = [[-0.62, -0.46], [0.62, -0.3], [0.56, 0.5], [-0.5, 0.44]];
    G.sparks.forEach((e, i) => {
      const k = P(u, 1.0 + i * 0.06, 1.45 + i * 0.06);
      const on = k > 0 && k < 1 && r < 0;
      show(e, on);
      if (on) {
        const s = Math.sin(Math.PI * k) * (i % 2 ? 0.7 : 1);
        e.style.transform = `translate(${L.cx + offs[i][0] * L.w - 32}px, ${L.cy + offs[i][1] * L.h - 32}px) rotate(${45 * k}deg) scale(${s})`;
      }
    });
    // reveal: two more branded products slide in
    const ck = r >= 0 ? E.out(P(r, 0.12, 0.7)) : 0;
    show(G.slotL.el, r >= 0);
    show(G.slotR.el, r >= 0);
    if (r >= 0) {
      placeSlot(G.slotL, lerp(-900, -330, ck), 40, 0.64, 0);
      placeSlot(G.slotR, lerp(900, 330, ck), 40, 0.64, 0);
      popIn(S.rvEye, r, 0.2);
      slam(S.rv1, r, 0.3);
      slam(S.rv2, r, 0.55);
    }
    G.blobs.forEach((b, i) => (b.style.transform = `translate(${Math.sin(t * 0.6 + i) * 18}px, ${Math.cos(t * 0.5 + i * 2) * 22}px)`));
  }

  function sceneEnd(t) {
    if (t < T.end) return;
    const u = t - T.end;
    const lk = P(u, 0.1, 0.45);
    S.endLogo.style.opacity = clamp(lk * 3);
    S.endLogo.style.transform = `scale(${lerp(0.7, 1, E.back(lk))})`;
    slam(S.endTitle, u, 0.35);
    popIn(S.endSub, u, 0.55);
    popIn(S.endCta, u, 0.75);
    if (u > 1.1) S.endCta.style.transform = `scale(${1 + 0.035 * Math.sin((u - 1.1) * Math.PI * 2 * 1.4)})`;
  }

  function ui(t) {
    show(S.watermark, t < T.end);
    const chipsOn = t >= T.design && t < T.reveal + 0.25;
    show(S.chips, chipsOn);
    if (chipsOn) {
      S.chips.style.opacity = 1 - P(t, T.reveal, T.reveal + 0.25);
      const idx = t < T.print ? 0 : t < T.cut ? 1 : t < T.peel ? 2 : t < T.stick ? 3 : 4;
      const allDone = t >= T.stick + 0.95;
      S.chipEls.forEach((c, i) => {
        const cls = 'chip' + (i < idx || (allDone && i === idx) ? ' done' : i === idx ? ' on' : '');
        if (c.className !== cls) c.className = cls;
      });
    }
    const steps = [[T.design, 'Design.'], [T.print, 'Print.'], [T.cut, 'Cut.'], [T.peel, 'Peel.'], [T.stick, 'Stick.']];
    let cur = null;
    for (const s of steps) if (t >= s[0]) cur = s;
    const stepOn = !!cur && t < T.reveal;
    show(S.step, stepOn);
    if (stepOn) {
      if (S.stepTxt.textContent !== cur[1]) S.stepTxt.textContent = cur[1];
      const k = P(t, cur[0] + 0.08, cur[0] + 0.3);
      S.stepBox.style.transform = `skewX(-12deg) scale(${lerp(1.3, 1, E.out(k))})`;
      S.stepBox.style.opacity = clamp(k * 3);
      S.step.style.opacity = 1 - P(t, T.reveal - 0.2, T.reveal);
    }
    const uc = t - T.cut - CUT_RUN[0];
    const sp = uc >= 0 && uc < CUT_RUN[1] - CUT_RUN[0] ? plan.rate(uc) / plan.r1 : 0;
    show(S.speed, sp >= 1.6);
    if (sp >= 1.6) S.speedTxt.textContent = Math.round(sp) + '×';
  }

  function wipes(t) {
    let x = null;
    for (const c of [T.design, T.print, T.end]) {
      if (t >= c - 0.28 && t <= c + 0.28) x = lerp(-2450, 2100, E.io(P(t, c - 0.28, c + 0.28)));
    }
    show(S.wipeA, x !== null);
    show(S.wipeB, x !== null);
    if (x !== null) {
      S.wipeA.style.transform = `translateX(${x}px) skewX(-20deg)`;
      S.wipeB.style.transform = `translateX(${x - 160}px) skewX(-20deg)`;
    }
  }

  function renderAt(t) {
    const hook = t < T.design, design = t >= T.design && t < T.print, make = t >= T.print && t < T.stick;
    const prod = t >= T.stick && t < T.end, end = t >= T.end;
    show(S.bgHook, hook);
    show(S.bgDesign, design);
    show(S.world, make);
    show(S.bgProduct, prod);
    show(S.productWrap, hook || prod);
    show(S.endcard, end);
    show(S.hookText, hook);
    show(S.artboard, design);
    show(S.revealText, t >= T.reveal && t < T.end);
    sceneHook(t);
    sceneDesign(t);
    sceneMake(t);
    sceneFly(t);
    sceneProduct(t);
    sceneEnd(t);
    ui(t);
    wipes(t);
  }

  // ---------- sound cues (synthesised in Node by scripts/reel-audio.ts) ----------
  function buildCues() {
    cues = [];
    const add = (type, t, o) => cues.push(Object.assign({ type, t }, o || {}));
    [T.design, T.print, T.end].forEach((c) => add('whoosh', c - 0.3, { dur: 0.6 }));
    add('pop', 0.04, { gain: 0.6 });
    add('drop', 0.3);
    add('slam', 0.12);
    add('slam', 0.8, { gain: 0.8 });
    const d = T.design;
    add('draw', d + 0.2, { dur: 0.6 });
    add('click', d + 0.97);
    add('pop', d + 0.99, { gain: 0.5 });
    const n = G.abChars.length;
    for (let i = 0; i < n; i++) add('tick', d + 1.25 + (i * 0.6) / n);
    for (let i = 0; i < 4; i++) add('pop', d + 1.87 + i * 0.07, { gain: 0.3 });
    add('click', d + 2.3);
    add('printer', T.print + 0.35, { dur: 1.55 });
    [0.4, 0.7, 1.0].forEach((x) => add('beep', T.cut + x));
    add('ok', T.cut + 1.08);
    const samples = [];
    let prev = toolState(0);
    for (let f = 1; f <= Math.round(CUT_LEN * FPS); f++) {
      const s = toolState(f / FPS);
      samples.push([Math.round(Math.hypot(s.x - prev.x, s.y - prev.y) * FPS), s.down ? 1 : 0]);
      prev = s;
    }
    add('plotter', T.cut, { dur: CUT_LEN, fps: FPS, samples });
    add('tap', T.peel + 0.38);
    add('peel', T.peel + 0.45, { dur: 0.5 });
    add('whoosh', T.peel + 0.95, { dur: 0.55, gain: 0.6 });
    add('whoosh', T.stick + 0.3, { dur: 0.5, gain: 0.7 });
    add('thump', T.stick + 0.8);
    add('sparkle', T.stick + 1.0);
    add('whoosh', T.reveal + 0.12, { dur: 0.5, gain: 0.5 });
    add('slam', T.reveal + 0.3, { gain: 0.6 });
    add('slam', T.reveal + 0.55, { gain: 0.6 });
    add('pop', T.end + 0.12);
    add('slam', T.end + 0.35);
    add('pop', T.end + 0.75);
  }

  window.setup = async function (brand, logoUrl) {
    B = brand;
    S.stage = document.getElementById('stage');
    await loadFonts();
    ART.setNoise(makeNoise());
    layoutSheet();
    build(logoUrl);
    planCut();
    buildCues();
    await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
    renderAt(0);
    return { duration: T.total, fps: FPS, cues, cover: T.reveal + 1.6 };
  };
  window.renderAt = renderAt;
})();
