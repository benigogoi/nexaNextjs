/**
 * Sound effects for the animated reels, synthesised from the cue list the stage
 * emits (no audio files, no licensing). Output: 44.1kHz 16-bit stereo WAV.
 * Music is left to Instagram's trending-audio picker, which also helps reach.
 */

export interface Cue {
  type: string;
  t: number;
  dur?: number;
  gain?: number;
  fps?: number;
  samples?: [number, number][];
}

const SR = 44100;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RBJ-cookbook biquad; coefficients can be changed per sample for sweeps. */
class Biquad {
  private b0 = 1; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  private set(kind: "lp" | "hp" | "bp", f: number, q: number) {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
    const al = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + al;
    if (kind === "lp") { this.b0 = (1 - c) / 2 / a0; this.b1 = (1 - c) / a0; this.b2 = this.b0; }
    else if (kind === "hp") { this.b0 = (1 + c) / 2 / a0; this.b1 = -(1 + c) / a0; this.b2 = this.b0; }
    else { this.b0 = al / a0; this.b1 = 0; this.b2 = -al / a0; }
    this.a1 = (-2 * c) / a0;
    this.a2 = (1 - al) / a0;
    return this;
  }
  lp(f: number, q = 0.707) { return this.set("lp", f, q); }
  hp(f: number, q = 0.707) { return this.set("hp", f, q); }
  bp(f: number, q = 1) { return this.set("bp", f, q); }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export function synth(cues: Cue[], duration: number): Float32Array {
  const out = new Float32Array(Math.ceil(duration * SR));
  const rnd = rng(1337);
  const noise = () => rnd() * 2 - 1;
  const put = (i: number, v: number) => {
    if (i >= 0 && i < out.length) out[i] += v;
  };
  const each = (c: Cue, len: number, fn: (t: number, k: number) => number) => {
    const i0 = Math.round(c.t * SR), n = Math.round(len * SR), g = c.gain ?? 1;
    for (let k = 0; k < n; k++) put(i0 + k, fn(k / SR, k) * g);
  };

  for (const c of cues) {
    switch (c.type) {
      case "click": {
        const hp = new Biquad().hp(2200);
        each(c, 0.04, (t) => hp.run(noise()) * Math.exp(-t / 0.004) * 0.5 + Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t / 0.01) * 0.25);
        break;
      }
      case "tap": {
        const bp = new Biquad().bp(1400, 1.2);
        each(c, 0.06, (t) => bp.run(noise()) * Math.exp(-t / 0.008) * 0.6 + Math.sin(2 * Math.PI * 700 * t) * Math.exp(-t / 0.015) * 0.2);
        break;
      }
      case "tick": {
        const bp = new Biquad().bp(4200, 1.5);
        each(c, 0.02, (t) => bp.run(noise()) * Math.exp(-t / 0.0025) * 0.55);
        break;
      }
      case "pop": {
        let ph = 0;
        each(c, 0.14, (t) => {
          const f = 300 * Math.pow(3, Math.min(t / 0.05, 1));
          ph += (2 * Math.PI * f) / SR;
          return Math.sin(ph) * (1 - Math.exp(-t / 0.002)) * Math.exp(-t / 0.035) * 0.45;
        });
        break;
      }
      case "slam": {
        let ph = 0;
        const lp = new Biquad().lp(900);
        each(c, 0.5, (t) => {
          ph += (2 * Math.PI * (95 * Math.exp(-t * 9) + 42)) / SR;
          return Math.sin(ph) * Math.exp(-t / 0.16) * 0.7 + lp.run(noise()) * Math.exp(-t / 0.03) * 0.35;
        });
        break;
      }
      case "drop":
      case "thump": {
        let ph = 0;
        const bp = new Biquad().bp(1600, 1);
        const big = c.type === "thump" ? 1 : 0.6;
        each(c, 0.4, (t) => {
          ph += (2 * Math.PI * (130 * Math.exp(-t * 22) + 52)) / SR;
          return (Math.sin(ph) * Math.exp(-t / 0.1) * 0.8 + bp.run(noise()) * Math.exp(-t / 0.014) * 0.4) * big;
        });
        break;
      }
      case "whoosh": {
        const dur = c.dur ?? 0.5;
        const bp = new Biquad();
        each(c, dur, (t) => {
          const u = t / dur;
          bp.bp(350 + 2600 * Math.pow(Math.sin(Math.PI * u), 2), 0.9);
          return bp.run(noise()) * Math.pow(Math.sin(Math.PI * u), 1.6) * 0.55;
        });
        break;
      }
      case "draw": {
        // marker on paper
        const dur = c.dur ?? 0.6;
        const bp = new Biquad().bp(3000, 0.8);
        each(c, dur, (t) => {
          const u = t / dur;
          return bp.run(noise()) * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 13 * t)) * 0.16;
        });
        break;
      }
      case "printer": {
        const dur = c.dur ?? 1.5;
        const lp = new Biquad().lp(700);
        const tickBp = new Biquad().bp(3200, 1.5);
        let ph = 0;
        each(c, dur, (t) => {
          const env = Math.min(1, t / 0.08, (dur - t) / 0.1);
          ph += (2 * Math.PI * 96) / SR;
          const motor = (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph)) * 0.08;
          const roller = lp.run(noise()) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 9 * t)) * 0.35;
          const tt = t % 0.19;
          const tick = tickBp.run(noise()) * Math.exp(-tt / 0.012) * 0.35;
          return (motor + roller + tick) * Math.max(0, env);
        });
        break;
      }
      case "beep": {
        each(c, 0.09, (t) => (Math.sin(2 * Math.PI * 2093 * t) + 0.2 * Math.sin(2 * Math.PI * 4186 * t)) * Math.min(1, t / 0.003) * Math.exp(-t / 0.04) * 0.22);
        break;
      }
      case "ok": {
        each(c, 0.5, (t) => {
          const a = Math.sin(2 * Math.PI * 1568 * t) * Math.exp(-t / 0.12);
          const t2 = t - 0.09;
          const b = t2 > 0 ? Math.sin(2 * Math.PI * 2093 * t2) * Math.exp(-t2 / 0.18) : 0;
          return (a + b) * 0.13;
        });
        break;
      }
      case "plotter": {
        // Motor whirr that follows head speed, a soft click when the blade drops or lifts,
        // and the blade scratch while it cuts.
        const fps = c.fps ?? 30;
        const smp = c.samples ?? [];
        const hp = new Biquad().hp(3500);
        const whirr = new Biquad().bp(900, 0.7);
        const clickBp = new Biquad().bp(2200, 1.4);
        let ph = 0, sp = 0, down = 0, click = 0, lastDn = 0, lastFrame = -1;
        each(c, c.dur ?? 3.8, (t) => {
          const i = Math.max(0, Math.min(smp.length - 1, Math.floor(t * fps)));
          const [target, dn] = smp[i] ?? [0, 0];
          if (i !== lastFrame) {
            if (dn !== lastDn) click = 1;
            lastDn = dn;
            lastFrame = i;
          }
          click *= 0.9975;
          sp += (target - sp) * 0.0015;
          down += (dn - down) * 0.003;
          const moving = Math.min(1, sp / 300);
          const f = 140 + Math.min(sp, 5200) * 0.05;
          ph += (2 * Math.PI * f) / SR;
          const tone = (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) * moving * 0.04;
          const rush = whirr.run(noise()) * moving * 0.1;
          const scratch = hp.run(noise()) * down * (0.55 + 0.45 * rnd()) * 0.09;
          return tone + rush + scratch + clickBp.run(noise()) * click * 0.5;
        });
        break;
      }
      case "peel": {
        const dur = c.dur ?? 0.5;
        const bp = new Biquad().bp(2600, 2);
        const bp2 = new Biquad().bp(1800, 0.7);
        each(c, dur, (t) => {
          const u = t / dur;
          const p = 0.004 + 0.06 * Math.sin(Math.PI * u);
          const imp = rnd() < p ? (rnd() * 0.8 + 0.2) * (rnd() < 0.5 ? -1 : 1) : 0;
          return bp.run(imp) * 1.4 + bp2.run(noise()) * Math.sin(Math.PI * u) * 0.12;
        });
        break;
      }
      case "sparkle": {
        const notes = [2093, 2637, 3136, 4186];
        each(c, 0.9, (t) => {
          let v = 0;
          notes.forEach((f, j) => {
            const tj = t - j * 0.05;
            if (tj > 0) v += Math.sin(2 * Math.PI * f * tj) * Math.exp(-tj / 0.22) * (1 + 0.3 * Math.sin(2 * Math.PI * 7 * tj));
          });
          return v * 0.075;
        });
        break;
      }
    }
  }

  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.tanh(out[i] * 1.1);
    peak = Math.max(peak, Math.abs(out[i]));
  }
  const norm = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < out.length; i++) out[i] *= norm;
  return out;
}

export function toWav(mono: Float32Array): Buffer {
  const n = mono.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, mono[i])) * 32767;
    buf.writeInt16LE(v | 0, 44 + i * 4);
    buf.writeInt16LE(v | 0, 46 + i * 4);
  }
  return buf;
}
