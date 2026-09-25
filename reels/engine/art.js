/* Nexa reel artwork: icons, sticker designs and product mockups, all as SVG strings.
 * Loaded by stage.html; everything hangs off window.ART. */
(function () {
  'use strict';

  // ---------- colour helpers ----------
  function rgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  /** amt > 0 lightens towards white, amt < 0 darkens towards black. */
  function shade(hex, amt) {
    const to = amt < 0 ? 0 : 255;
    const k = Math.abs(amt);
    return '#' + rgb(hex).map((v) => Math.round(v + (to - v) * k).toString(16).padStart(2, '0')).join('');
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------- icons (100x100 grid; c = palette) ----------
  const sw = (c, w) => `stroke="${c.ink}" stroke-width="${w || 3.5}" stroke-linejoin="round" stroke-linecap="round"`;
  const ICONS = {
    cupcake: (c) => `
      <path d="M20 50 H80 L71 91 H29 Z" fill="${c.accent}" ${sw(c)}/>
      <path d="M35 51 L39 90 M50 51 V90 M65 51 L61 90" stroke="${c.ink}" stroke-width="3" opacity=".35"/>
      <path d="M16 52 C8 52 9 38 20 38 C17 26 32 20 40 27 C43 15 61 15 62 27 C70 20 85 26 80 38 C91 38 92 52 84 52 Z" fill="${c.light}" ${sw(c)}/>
      <circle cx="50" cy="14" r="7" fill="${c.accent}" ${sw(c, 3)}/>
      <path d="M52 7 C54 3 58 1 63 1" fill="none" ${sw(c, 3)}/>`,
    kulhad: (c) => `
      <path d="M36 25 C30 18 42 14 36 6 M50 25 C44 18 56 14 50 6 M64 25 C58 18 70 14 64 6" fill="none" ${sw(c, 3.5)} opacity=".55"/>
      <path d="M20 33 H80 L71 88 C70 93 30 93 29 88 Z" fill="${c.accent}" ${sw(c)}/>
      <path d="M18 33 H82" ${sw(c, 8)}/>
      <path d="M26 50 H74" stroke="${c.light}" stroke-width="3.5" opacity=".6" stroke-linecap="round"/>`,
    coffee: (c) => `
      <path d="M28 26 H72 L67 90 C66 93 34 93 33 90 Z" fill="${c.light}" ${sw(c)}/>
      <path d="M30 46 H70 L68 68 H32 Z" fill="${c.accent}" ${sw(c, 3)}/>
      <rect x="22" y="15" width="56" height="12" rx="5" fill="${c.accent}" ${sw(c, 3)}/>
      <path d="M34 15 C36 8 64 8 66 15" fill="${c.accent}" ${sw(c, 3)}/>`,
    chili: (c) => `
      <path d="M72 24 C82 36 77 57 62 69 C48 80 30 88 12 88 C27 80 40 68 48 54 C56 40 60 26 72 24 Z" fill="${c.accent}" ${sw(c)}/>
      <path d="M62 23 C66 16 78 16 82 23 C78 29 66 29 62 23 Z" fill="${c.ink}"/>
      <path d="M74 17 C74 11 78 7 85 6" fill="none" ${sw(c, 4)}/>
      <path d="M61 40 C57 51 49 60 38 68" fill="none" stroke="${c.light}" stroke-width="4" stroke-linecap="round" opacity=".75"/>`,
    candle: (c) => `
      <path d="M50 4 C64 19 65 32 50 40 C35 32 36 19 50 4 Z" fill="${c.accent}" ${sw(c, 3)}/>
      <path d="M50 19 C56 26 56 32 50 36 C44 32 44 26 50 19 Z" fill="${c.light}"/>
      <path d="M50 40 V48" ${sw(c, 3.5)}/>
      <rect x="29" y="48" width="42" height="44" rx="5" fill="${c.light}" ${sw(c)}/>
      <path d="M29 58 C35 58 35 67 41 67 C47 67 46 58 51 58 H71" fill="none" ${sw(c, 3)} opacity=".5"/>`,
    tealeaves: (c) => {
      const leaf = `<path d="M0 0 C13 -12 33 -12 46 0 C33 12 13 12 0 0 Z" fill="${c.accent}" ${sw(c, 3)}/><path d="M5 0 H40" ${sw(c, 2.5)}/>`;
      return `
      <g transform="translate(47 66) rotate(-148)">${leaf}</g>
      <g transform="translate(53 66) rotate(-32)">${leaf}</g>
      <path d="M50 8 C59 22 59 42 50 58 C41 42 41 22 50 8 Z" fill="${c.accent}" ${sw(c, 3)}/>
      <path d="M50 58 V93" ${sw(c, 4)}/>`;
    },
    drop: (c) => `
      <path d="M50 5 C64 28 78 44 78 62 C78 79 65 92 50 92 C35 92 22 79 22 62 C22 44 36 28 50 5 Z" fill="${c.accent}" ${sw(c)}/>
      <path d="M36 63 C36 53 41 44 46 38" fill="none" stroke="${c.light}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`,
    dumpling: (c) => `
      <path d="M41 22 C37 15 45 11 46 18 M56 18 C58 11 66 15 61 22" fill="none" ${sw(c, 3)} opacity=".5"/>
      <path d="M12 74 C12 48 30 32 50 32 C70 32 88 48 88 74 C74 80 26 80 12 74 Z" fill="${c.light}" ${sw(c)}/>
      <path d="M50 32 C46 42 44 52 45 63 M50 32 C54 42 56 52 55 63 M39 36 C35 45 34 53 36 62 M61 36 C65 45 66 53 64 62" fill="none" ${sw(c, 3)}/>
      <path d="M8 86 H92" stroke="${c.accent}" stroke-width="8" stroke-linecap="round"/>`,
    hanger: (c) => `
      <path d="M50 34 C50 26 60 24 60 16 C60 9 53 5 48 7 C45 8 43 11 43 14" fill="none" ${sw(c, 5)}/>
      <path d="M50 34 L90 64 C94 67 92 73 86 73 H14 C8 73 6 67 10 64 Z" fill="none" stroke="${c.accent}" stroke-width="7" stroke-linejoin="round"/>`,
    honey: (c) => `
      <path d="M60 30 L76 5" ${sw(c, 4.5)}/>
      <path d="M24 42 H76 C85 57 85 76 72 89 H28 C15 76 15 57 24 42 Z" fill="${c.accent}" ${sw(c)}/>
      <rect x="19" y="30" width="62" height="13" rx="6" fill="${c.light}" ${sw(c, 3)}/>
      <path d="M30 57 C40 62 60 62 70 57" fill="none" stroke="${c.light}" stroke-width="4" stroke-linecap="round" opacity=".8"/>`,
    bowl: (c) => `
      <path d="M38 28 C33 21 43 17 38 9 M52 28 C47 21 57 17 52 9" fill="none" ${sw(c, 3)} opacity=".5"/>
      <path d="M60 46 L84 12 M68 46 L92 18" ${sw(c, 4)}/>
      <path d="M12 50 H88 C88 72 72 88 50 88 C28 88 12 72 12 50 Z" fill="${c.accent}" ${sw(c)}/>
      <path d="M8 50 H92" ${sw(c, 5)}/>`,
    sparkle: (c) => `<path d="M50 6 C54 36 64 46 94 50 C64 54 54 64 50 94 C46 64 36 54 6 50 C36 46 46 36 50 6 Z" fill="${c.accent}" ${sw(c, 3)}/>`,
  };

  // ---------- sticker shapes ----------
  const SIZE = { circle: [400, 400], oval: [460, 300], roundrect: [460, 300], arch: [300, 420] };

  function rrect(x, y, w, h, r) {
    return `M${x + w / 2},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
  }
  function archD(x, y, w, h, rb) {
    const r = w / 2;
    return `M${x + r},${y} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - rb} A${rb},${rb} 0 0 1 ${x + w - rb},${y + h} H${x + rb} A${rb},${rb} 0 0 1 ${x},${y + h - rb} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
  }
  /** Outline of a shape, shrunk by `i` px. All start at top-centre and run clockwise (the cut path). */
  function shapeD(shape, i) {
    switch (shape) {
      case 'oval': {
        const rx = 226 - i, ry = 146 - i;
        return `M230,${150 - ry} A${rx},${ry} 0 1 1 230,${150 + ry} A${rx},${ry} 0 1 1 230,${150 - ry} Z`;
      }
      case 'roundrect':
        return rrect(4 + i, 4 + i, 452 - 2 * i, 292 - 2 * i, Math.max(10, 44 - i));
      case 'arch':
        return archD(4 + i, 4 + i, 292 - 2 * i, 412 - 2 * i, Math.max(8, 28 - i));
      default: {
        const r = 196 - i;
        return `M200,${200 - r} A${r},${r} 0 1 1 200,${200 + r} A${r},${r} 0 1 1 200,${200 - r} Z`;
      }
    }
  }

  // ---------- text measuring ----------
  const ctx = document.createElement('canvas').getContext('2d');
  function textW(text, f, size, ls) {
    ctx.font = `${f.style || 'normal'} ${f.weight} ${size}px "${f.family}"`;
    return ctx.measureText(text).width + (ls || 0) * Math.max(0, [...text].length - 1);
  }
  /** Largest font size (<= max) at which `text` fits in maxW. */
  function fit(text, f, maxW, max, ls) {
    const per = textW(text, f, 100, 0) / 100;
    const spacing = (ls || 0) * Math.max(0, [...text].length - 1);
    return Math.max(8, Math.min(max, (maxW - spacing) / per));
  }
  function splitName(name, maxChars) {
    if (name.length <= maxChars || !name.includes(' ')) return [name];
    const mid = name.length / 2;
    let best = -1;
    for (let i = 0; i < name.length; i++) {
      if (name[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    }
    return [name.slice(0, best), name.slice(best + 1)];
  }
  function chars(str) {
    return [...str].map((ch) => `<tspan class="ch">${esc(ch)}</tspan>`).join('');
  }
  function txt(cls, str, x, y, f, size, fill, o) {
    o = o || {};
    return `<text class="${cls}" x="${x}" y="${y}" font-family="${f.family}" font-weight="${f.weight}" font-style="${f.style || 'normal'}" font-size="${size.toFixed(1)}" fill="${fill}" text-anchor="${o.anchor || 'middle'}" letter-spacing="${o.ls || 0}" style="white-space:pre">${chars(str)}</text>`;
  }

  /**
   * Build one sticker. pfx must be unique per copy (text-on-path ids).
   * Returns { w, h, markup, contour, boxes: {icon, name}, nameChars }.
   */
  function sticker(b, pfx) {
    const shape = SIZE[b.shape] ? b.shape : 'circle';
    const [w, h] = SIZE[shape];
    const c = b.palette;
    const F = { family: b.font, weight: b.fontWeight || 400, style: b.fontStyle || 'normal' };
    const SF = { family: b.subFont || 'Montserrat', weight: 700, style: 'normal' };
    const name = b.upper ? b.name.toUpperCase() : b.name;
    const tag = (b.tagline || '').toUpperCase();
    const ls = b.ls || 0;
    const boxes = {};
    const out = [];

    out.push(`<g class="st-bg"><path d="${shapeD(shape, 0)}" fill="#fff" stroke="#000" stroke-opacity=".10" stroke-width="2"/><path d="${shapeD(shape, 12)}" fill="${c.bg}"/></g>`);
    const ring = (i, width, op) => `<path class="st-deco" d="${shapeD(shape, i)}" fill="none" stroke="${c.ink}" stroke-width="${width}" opacity="${op || 0.9}"/>`;
    const icon = (cx, cy, s) => {
      boxes.icon = { x: cx - s / 2, y: cy - s / 2, w: s, h: s };
      const art = (ICONS[b.icon] || ICONS.sparkle)(c);
      return `<g class="st-icon" transform="translate(${cx},${cy})"><g class="st-icon-s"><g transform="translate(${-s / 2},${-s / 2}) scale(${s / 100})">${art}</g></g></g>`;
    };
    // Stacked name lines, centred on x; returns the y of the last baseline.
    const nameBlock = (lines, x, y0, size, anchor) => {
      const lh = size * 1.02;
      let maxW = 0;
      lines.forEach((l, i) => {
        out.push(txt('st-name', l, x, y0 + i * lh, F, size, c.ink, { ls, anchor }));
        maxW = Math.max(maxW, textW(l, F, size, ls));
      });
      const left = anchor === 'start' ? x : x - maxW / 2;
      boxes.name = { x: left - 8, y: y0 - size * 0.86, w: maxW + 16, h: (lines.length - 1) * lh + size * 1.12 };
      return y0 + (lines.length - 1) * lh;
    };
    const tagLine = (x, y, maxW, max, anchor) => {
      if (!tag) return;
      const size = fit(tag, SF, maxW, max, 3);
      out.push(txt('st-tag', tag, x, y, SF, size, c.ink, { ls: 3, anchor }));
      return textW(tag, SF, size, 3);
    };

    if (shape === 'circle' && b.layout === 'badge') {
      out.push(ring(26, 3.5));
      out.push(`<circle class="st-deco" cx="200" cy="200" r="112" fill="none" stroke="${c.ink}" stroke-width="2" opacity=".8"/>`);
      const arc = (id, R, a0, a1, sweep) => {
        const p = (a) => `${(200 + R * Math.cos((a * Math.PI) / 180)).toFixed(2)},${(200 + R * Math.sin((a * Math.PI) / 180)).toFixed(2)}`;
        return `<path id="${pfx}-${id}" d="M${p(a0)} A${R},${R} 0 0 ${sweep} ${p(a1)}" fill="none"/>`;
      };
      out.push(`<defs>${arc('top', 134, 198, 342, 1)}${arc('bot', 152, 158, 22, 0)}</defs>`);
      const topLen = 134 * ((144 * Math.PI) / 180);
      const nsize = fit(name, F, topLen * 0.9, 44, Math.max(ls, 3));
      out.push(`<text class="st-name" font-family="${F.family}" font-weight="${F.weight}" font-style="${F.style}" font-size="${nsize.toFixed(1)}" fill="${c.ink}" letter-spacing="${Math.max(ls, 3)}" style="white-space:pre"><textPath href="#${pfx}-top" startOffset="50%" text-anchor="middle">${chars(name)}</textPath></text>`);
      boxes.name = { x: 70, y: 36, w: 260, h: 96 };
      if (tag) {
        const tsize = fit(tag, SF, 152 * ((136 * Math.PI) / 180) * 0.86, 20, 3);
        out.push(`<text class="st-tag" font-family="${SF.family}" font-weight="700" font-size="${tsize.toFixed(1)}" fill="${c.ink}" letter-spacing="3" style="white-space:pre"><textPath href="#${pfx}-bot" startOffset="50%" text-anchor="middle">${chars(tag)}</textPath></text>`);
      }
      const star = (x) => `<g class="st-deco" transform="translate(${x - 9},191) scale(.18)">${ICONS.sparkle({ ...c, accent: c.ink })}</g>`;
      out.push(star(200 - 147) + star(200 + 147));
      out.push(icon(200, 200, 118));
    } else if (shape === 'circle') {
      out.push(ring(26, 3));
      const lines = splitName(name, 11);
      if (lines.length === 1) {
        const size = fit(lines[0], F, 272, 78, ls);
        out.push(icon(200, 132, 88));
        const yl = nameBlock(lines, 200, 258, size);
        const tw = tagLine(200, yl + 44, 200, 18);
        if (tw) out.push(`<circle class="st-deco" cx="${200 - tw / 2 - 16}" cy="${yl + 38}" r="3.5" fill="${c.accent}"/><circle class="st-deco" cx="${200 + tw / 2 + 16}" cy="${yl + 38}" r="3.5" fill="${c.accent}"/>`);
      } else {
        const size = Math.min(...lines.map((l) => fit(l, F, 250, 58, ls)));
        out.push(icon(200, 116, 78));
        const yl = nameBlock(lines, 200, 212, size);
        tagLine(200, yl + 40, 190, 17);
      }
    } else if (shape === 'oval') {
      out.push(ring(24, 3));
      out.push(icon(230, 88, 62));
      let lines = [name];
      let size = fit(name, F, 330, 66, ls);
      if (size < 40 && name.includes(' ')) {
        lines = splitName(name, 0);
        size = Math.min(...lines.map((l) => fit(l, F, 300, 46, ls)));
      }
      const yl = nameBlock(lines, 230, lines.length === 1 ? 180 : 160, size);
      const tw = tagLine(230, yl + 36, 226, 16);
      if (tw) {
        const y = yl + 30, x0 = 230 - tw / 2 - 12, x1 = 230 + tw / 2 + 12;
        out.push(`<path class="st-deco" d="M${x0 - 30},${y} H${x0} M${x1},${y} H${x1 + 30}" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>`);
      }
    } else if (shape === 'roundrect') {
      out.push(ring(24, 3));
      out.push(icon(122, 150, 116));
      out.push(`<path class="st-deco" d="M206,96 V204" stroke="${c.ink}" stroke-width="2.5" opacity=".45"/>`);
      let lines = [name];
      let size = fit(name, F, 196, 64, ls);
      if (size < 38 && name.includes(' ')) {
        lines = splitName(name, 0);
        size = Math.min(...lines.map((l) => fit(l, F, 196, 50, ls)));
      }
      const tsize = tag ? fit(tag, SF, 196, 15, 3) : 0;
      const blockH = size * 0.78 + (lines.length - 1) * size * 1.02 + (tag ? 18 + tsize : 0);
      const y0 = 150 - blockH / 2 + size * 0.78;
      const yl = nameBlock(lines, 226, y0, size, 'start');
      if (tag) out.push(txt('st-tag', tag, 226, yl + 18 + tsize, SF, tsize, c.ink, { ls: 3, anchor: 'start' }));
    } else {
      // arch
      out.push(ring(22, 3));
      out.push(icon(150, 146, 96));
      const lines = splitName(name, 9);
      let yl;
      if (lines.length === 1) yl = nameBlock(lines, 150, 272, fit(lines[0], F, 214, 62, ls));
      else yl = nameBlock(lines, 150, 256, Math.min(...lines.map((l) => fit(l, F, 204, 48, ls))));
      tagLine(150, yl + 40, 178, 16);
      out.push(`<path class="st-deco" d="M128,${Math.min(372, yl + 70)} H172" stroke="${c.accent}" stroke-width="3.5" stroke-linecap="round"/>`);
    }

    return { w, h, markup: out.join(''), contour: shapeD(shape, 0), boxes, nameChars: [...name].length };
  }

  // ---------- products ----------
  let NOISE = '';
  const noiseDef = (p) => (NOISE ? `<pattern id="${p}-noise" width="220" height="220" patternUnits="userSpaceOnUse"><image href="${NOISE}" width="220" height="220"/></pattern>` : '');
  const noise = (p, el) => (NOISE ? el.replace('FILL', `url(#${p}-noise)`) : '');
  const contact = (p, cx, cy, rx) =>
    `<radialGradient id="${p}-contact"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".6" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `|<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.09}" fill="url(#${p}-contact)"/>`;
  const cylDef = (id, strength) =>
    `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="${0.32 * strength}"/><stop offset=".14" stop-color="#000" stop-opacity="${0.06 * strength}"/><stop offset=".34" stop-color="#fff" stop-opacity="${0.12 * strength}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".84" stop-color="#000" stop-opacity="${0.07 * strength}"/><stop offset="1" stop-color="#000" stop-opacity="${0.34 * strength}"/></linearGradient>`;
  const ridges = (x0, x1, y, h, step, op) => {
    let s = '';
    for (let x = x0; x <= x1; x += step) s += `M${x},${y} V${y + h} `;
    return `<path d="${s}" stroke="#000" stroke-opacity="${op}" stroke-width="3"/>`;
  };
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const PRODUCTS = {
    // Cake/pastry box seen from above-front; the sticker lies on the lid (tilted).
    box(b, p) {
      const col = b.productColor || '#f6f3ed';
      const [cd, ce] = contact(p, 320, 606, 330).split('|');
      return {
        w: 640, h: 630, tilt: 56,
        defs: cd + noiseDef(p) +
          `<linearGradient id="${p}-lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".10"/></linearGradient>` +
          `<linearGradient id="${p}-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".25" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>`,
        base: ce +
          `<rect x="30" y="392" width="580" height="208" rx="8" fill="${shade(col, -0.13)}"/>` +
          noise(p, `<rect x="30" y="392" width="580" height="208" rx="8" fill="FILL" opacity=".7"/>`) +
          `<rect x="30" y="392" width="580" height="208" rx="8" fill="url(#${p}-front)"/>` +
          `<rect x="14" y="350" width="612" height="50" rx="10" fill="${shade(col, -0.07)}"/>` +
          `<path d="M275 400 A45 26 0 0 0 365 400 Z" fill="${shade(col, -0.24)}"/>` +
          `<rect x="20" y="34" width="600" height="332" rx="18" fill="${col}"/>` +
          noise(p, `<rect x="20" y="34" width="600" height="332" rx="18" fill="FILL" opacity=".7"/>`) +
          `<rect x="20" y="34" width="600" height="332" rx="18" fill="url(#${p}-lid)"/>` +
          `<path d="M40 50 L64 34 M600 50 L576 34" stroke="#000" stroke-opacity=".07" stroke-width="3"/>`,
        over: `<rect x="20" y="34" width="600" height="332" fill="url(#${p}-lid)" opacity=".5"/>`,
        clip: `<rect x="20" y="34" width="600" height="332" rx="18"/>`,
        label: { cx: 320, cy: 202, maxW: 300, maxH: 300 },
      };
    },

    jar(b, p) {
      const contents = b.contents || 'pickle';
      if (contents === 'wax') return PRODUCTS.tumbler(b, p);
      const cap = b.capColor || '#b3261e';
      const fill = { pickle: '#c9521f', honey: '#e2a02a', cream: '#f4efe6' }[contents] || '#c9521f';
      const r = seeded(7);
      let chunks = '';
      if (contents === 'pickle') {
        for (let i = 0; i < 46; i++) {
          const x = 70 + r() * 320, y = 196 + r() * 390, s = 10 + r() * 22;
          chunks += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${s.toFixed(0)}" ry="${(s * (0.6 + r() * 0.5)).toFixed(0)}" fill="${shade(fill, r() > 0.5 ? -0.25 : 0.18)}" opacity=".8"/>`;
        }
        for (let i = 0; i < 70; i++) chunks += `<circle cx="${(62 + r() * 336).toFixed(0)}" cy="${(190 + r() * 400).toFixed(0)}" r="${(2 + r() * 2.5).toFixed(1)}" fill="#e8c14a" opacity=".85"/>`;
      } else if (contents === 'honey') {
        chunks = `<rect x="44" y="176" width="372" height="436" rx="60" fill="url(#${p}-honey)"/>`;
      }
      const [cd, ce] = contact(p, 230, 624, 210).split('|');
      return {
        w: 460, h: 640, tilt: 0,
        defs: cd + cylDef(`${p}-cyl`, 1) + cylDef(`${p}-capcyl`, 1.4) +
          `<radialGradient id="${p}-honey" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#f7c65a"/><stop offset="1" stop-color="#b86b0f"/></radialGradient>`,
        base: ce +
          `<rect x="40" y="136" width="380" height="480" rx="64" fill="#fff" fill-opacity=".35" stroke="#000" stroke-opacity=".10" stroke-width="2"/>` +
          `<rect x="44" y="176" width="372" height="436" rx="60" fill="${fill}"/>` +
          `<g clip-path="url(#${p}-clip)">${chunks}</g>` +
          `<rect x="66" y="196" width="24" height="370" rx="12" fill="#fff" opacity=".28"/>` +
          `<rect x="82" y="110" width="296" height="36" rx="10" fill="#fff" fill-opacity=".55" stroke="#000" stroke-opacity=".10" stroke-width="2"/>` +
          `<rect x="60" y="22" width="340" height="100" rx="20" fill="${cap}"/>` +
          ridges(76, 384, 30, 84, 14, 0.14) +
          `<rect x="60" y="22" width="340" height="100" rx="20" fill="url(#${p}-capcyl)"/>`,
        over: `<rect x="40" y="136" width="380" height="480" fill="url(#${p}-cyl)"/><rect x="104" y="210" width="9" height="330" rx="4" fill="#fff" opacity=".16"/>`,
        clip: `<rect x="40" y="136" width="380" height="480" rx="64"/>`,
        label: { cx: 230, cy: 396, maxW: 300, maxH: 250 },
      };
    },

    // Candle in a glass tumbler (jar with contents: "wax").
    tumbler(b, p) {
      const wax = b.productColor || '#f3ece0';
      const [cd, ce] = contact(p, 230, 604, 200).split('|');
      return {
        w: 460, h: 620, tilt: 0,
        defs: cd + cylDef(`${p}-cyl`, 1) +
          `<radialGradient id="${p}-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>`,
        base: ce +
          `<rect x="50" y="70" width="360" height="524" rx="34" fill="#fff" fill-opacity=".32" stroke="#000" stroke-opacity=".10" stroke-width="2"/>` +
          `<rect x="57" y="160" width="346" height="428" rx="30" fill="${wax}"/>` +
          `<ellipse cx="230" cy="160" rx="173" ry="15" fill="${shade(wax, 0.35)}"/>` +
          `<path d="M230 160 V128" stroke="#2b2622" stroke-width="5" stroke-linecap="round"/>` +
          `<ellipse cx="230" cy="70" rx="180" ry="12" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="4"/>` +
          `<rect x="72" y="96" width="20" height="470" rx="10" fill="#fff" opacity=".3"/>`,
        over: `<rect x="50" y="70" width="360" height="524" fill="url(#${p}-cyl)"/>`,
        clip: `<rect x="50" y="70" width="360" height="524" rx="34"/>`,
        top: `<g class="p-flame" transform="translate(230,126)"><circle r="64" fill="url(#${p}-glow)"/><g class="p-flame-s"><path d="M0 -58 C14 -38 16 -16 0 0 C-16 -16 -14 -38 0 -58 Z" fill="#ffb22e"/><path d="M0 -34 C7 -24 7 -12 0 -4 C-7 -12 -7 -24 0 -34 Z" fill="#fff4c9"/></g></g>`,
        label: { cx: 230, cy: 388, maxW: 290, maxH: 300 },
      };
    },

    cup(b, p) {
      const col = b.productColor || '#f6f4ef';
      const lid = b.capColor || '#2b2320';
      const body = 'M58 118 L382 118 L348 650 Q346 666 330 666 L110 666 Q94 666 92 650 Z';
      const [cd, ce] = contact(p, 220, 670, 160).split('|');
      return {
        w: 440, h: 690, tilt: 0,
        defs: cd + noiseDef(p) + cylDef(`${p}-cyl`, 1),
        base: ce + `<path d="${body}" fill="${col}"/>` + noise(p, `<path d="${body}" fill="FILL" opacity=".5"/>`) +
          `<rect x="60" y="128" width="320" height="18" fill="#000" fill-opacity=".10"/>` +
          `<path d="M64 88 C72 50 104 34 148 32 L292 32 C336 34 368 50 376 88 Z" fill="${lid}"/>` +
          `<path d="M100 72 C124 52 164 48 204 48" stroke="#fff" stroke-opacity=".3" stroke-width="7" fill="none" stroke-linecap="round"/>` +
          `<rect x="262" y="48" width="64" height="12" rx="6" fill="#000" fill-opacity=".35"/>` +
          `<rect x="36" y="84" width="368" height="46" rx="14" fill="${shade(lid, 0.08)}"/>` +
          `<rect x="36" y="84" width="368" height="46" rx="14" fill="url(#${p}-cyl)"/>`,
        over: `<path d="${body}" fill="url(#${p}-cyl)"/>`,
        clip: `<path d="${body}"/>`,
        label: { cx: 220, cy: 382, maxW: 256, maxH: 256 },
      };
    },

    pouch(b, p) {
      const col = b.productColor || '#c49a64';
      const body = 'M40 36 H440 V596 C440 642 418 664 372 668 C300 674 180 674 108 668 C62 664 40 642 40 596 Z';
      const [cd, ce] = contact(p, 240, 676, 220).split('|');
      let seal = '';
      for (let y = 44; y < 94; y += 6) seal += `M40,${y} H440 `;
      return {
        w: 480, h: 700, tilt: 0,
        defs: cd + noiseDef(p) +
          `<linearGradient id="${p}-pillow" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".26"/><stop offset=".16" stop-color="#000" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".10"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>` +
          `<linearGradient id="${p}-pillowv" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".10"/><stop offset=".2" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>`,
        base: ce + `<path d="${body}" fill="${col}"/>` + noise(p, `<path d="${body}" fill="FILL" opacity=".75"/>`) +
          `<path d="${seal}" stroke="#000" stroke-opacity=".09" stroke-width="2"/>` +
          `<path d="M40 102 l16 8 l-16 8 Z M440 102 l-16 8 l16 8 Z" fill="#000" fill-opacity=".28"/>` +
          `<path d="M40 134 H440" stroke="#000" stroke-opacity=".18" stroke-width="5"/><path d="M40 142 H440" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>` +
          `<path d="M58 612 C150 590 330 590 422 612" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="5"/>`,
        over: `<path d="${body}" fill="url(#${p}-pillow)"/><path d="${body}" fill="url(#${p}-pillowv)"/>`,
        clip: `<path d="${body}"/>`,
        label: { cx: 240, cy: 370, maxW: 330, maxH: 300 },
      };
    },

    bottle(b, p) {
      const glass = b.productColor || '#9a5a1c';
      const cap = b.capColor || '#c9a24a';
      const body = 'M58 312 C58 272 92 250 134 250 H226 C268 250 302 272 302 312 V664 C302 694 282 712 252 712 H108 C78 712 58 694 58 664 Z';
      const [cd, ce] = contact(p, 180, 716, 150).split('|');
      return {
        w: 360, h: 730, tilt: 0,
        defs: cd + cylDef(`${p}-cyl`, 1.2) + cylDef(`${p}-capcyl`, 1.4) +
          `<linearGradient id="${p}-amber" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${shade(glass, 0.15)}"/><stop offset="1" stop-color="${shade(glass, -0.3)}"/></linearGradient>`,
        base: ce +
          `<rect x="136" y="6" width="88" height="136" rx="44" fill="#1d1d1f"/><rect x="152" y="24" width="12" height="88" rx="6" fill="#fff" opacity=".22"/>` +
          `<rect x="132" y="216" width="96" height="40" fill="${shade(glass, -0.35)}"/>` +
          `<rect x="108" y="126" width="144" height="96" rx="12" fill="${cap}"/>` + ridges(120, 240, 132, 84, 10, 0.18) +
          `<rect x="108" y="126" width="144" height="96" rx="12" fill="url(#${p}-capcyl)"/>` +
          `<path d="${body}" fill="url(#${p}-amber)"/>` +
          `<rect x="80" y="300" width="18" height="360" rx="9" fill="#fff" opacity=".25"/>`,
        over: `<path d="${body}" fill="url(#${p}-cyl)"/><rect x="262" y="320" width="8" height="300" rx="4" fill="#fff" opacity=".14"/>`,
        clip: `<path d="${body}"/>`,
        label: { cx: 180, cy: 494, maxW: 214, maxH: 300 },
      };
    },

    bag(b, p) {
      const col = b.productColor || '#c9a06a';
      const handle = b.capColor || shade(col, -0.35);
      const [cd, ce] = contact(p, 280, 722, 260).split('|');
      return {
        w: 560, h: 740, tilt: 0,
        defs: cd + noiseDef(p) +
          `<linearGradient id="${p}-bagl" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".12" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset=".88" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>`,
        base: ce +
          `<path d="M178 200 C178 70 230 44 280 44 C330 44 382 70 382 200" fill="none" stroke="${handle}" stroke-width="15" stroke-linecap="round"/>` +
          `<rect x="50" y="170" width="460" height="550" rx="8" fill="${col}"/>` + noise(p, `<rect x="50" y="170" width="460" height="550" rx="8" fill="FILL" opacity=".75"/>`) +
          `<rect x="50" y="170" width="460" height="64" fill="#000" fill-opacity=".08"/>` +
          `<path d="M88 234 V720 M472 234 V720" stroke="#000" stroke-opacity=".08" stroke-width="3"/>` +
          `<circle cx="178" cy="202" r="8" fill="#000" fill-opacity=".45"/><circle cx="382" cy="202" r="8" fill="#000" fill-opacity=".45"/>`,
        over: `<rect x="50" y="170" width="460" height="550" fill="url(#${p}-bagl)"/>`,
        clip: `<rect x="50" y="170" width="460" height="550" rx="8"/>`,
        label: { cx: 280, cy: 470, maxW: 300, maxH: 300 },
      };
    },
  };

  /** Product SVG with an (initially hidden) sticker placed on its label spot. */
  function product(b, pfx, showSticker) {
    const d = (PRODUCTS[b.product] || PRODUCTS.box)(b, pfx);
    const st = sticker(b, pfx + 's');
    const k = Math.min(d.label.maxW / st.w, d.label.maxH / st.h);
    const cos = Math.cos((d.tilt * Math.PI) / 180);
    const lx = d.label.cx - (st.w * k) / 2;
    const ly = d.label.cy - (st.h * k * cos) / 2;
    const svg =
      `<svg class="prod" viewBox="0 0 ${d.w} ${d.h}" style="overflow:visible;display:block">` +
      `<defs>${d.defs}<clipPath id="${pfx}-clip">${d.clip}</clipPath>` +
      `<linearGradient id="${pfx}-shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
      `<g class="p-base">${d.base}</g>` +
      `<g class="p-sticker" style="display:${showSticker ? 'inline' : 'none'}" transform="translate(${lx.toFixed(2)},${ly.toFixed(2)}) scale(${k.toFixed(4)},${(k * cos).toFixed(4)})">${st.markup}</g>` +
      `<g class="p-over" clip-path="url(#${pfx}-clip)">${d.over}<rect class="p-shine" x="-300" y="-60" width="170" height="${d.h + 120}" fill="url(#${pfx}-shine)" transform="skewX(-18)"/></g>` +
      (d.top || '') +
      `</svg>`;
    return {
      svg, w: d.w, h: d.h, tilt: d.tilt,
      label: { cx: d.label.cx, cy: d.label.cy, w: st.w * k, h: st.h * k },
    };
  }

  window.ART = {
    SIZE, ICONS, shade, esc, sticker, product, shapeD, textW, fit,
    setNoise(url) { NOISE = url; },
  };
})();
