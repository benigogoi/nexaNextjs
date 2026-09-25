/**
 * Nexa Design Lab — reel generator.
 *
 * Turns a reel spec (JSON) into a ready-to-post 1080x1920 MP4:
 *   - "card" slides: full-screen brand cards (hook, text, end card with logo)
 *   - "clip" slides: your real footage (video or photo) with a branded caption
 *     overlay ("PRINT." / "CUT." / "STICK.") and the logo watermark
 *
 *   npx tsx scripts/render-reel.ts reels/specs/reel-01-cake-confec.json
 *
 * Output: reels/out/<slug>/<slug>.mp4 plus a PNG of every card/overlay.
 * Needs ffmpeg on PATH and Chrome/Chromium (CHROME_PATH to override).
 */
import puppeteer from "puppeteer";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(__dirname, "..");
const W = 1080;
const H = 1920;
const FPS = 30;

interface CardSlide {
  kind?: "card" | "end";
  eyebrow?: string;
  title: string;
  body?: string;
  durationSec: number;
}
interface ClipSlide {
  kind: "clip";
  /** Video or image, relative to the spec file. */
  src: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  durationSec: number;
  /** Video only: where to start in the source clip (seconds). */
  startSec?: number;
  /** Video only: playback speed, e.g. 2 = twice as fast. */
  speed?: number;
  /** Video only: keep the clip's own sound (plotter noise). Default true. */
  keepAudio?: boolean;
}
type Slide = CardSlide | ClipSlide;
interface ReelSpec {
  slug: string;
  slides: Slide[];
}

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function browserPath(): string | undefined {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ];
  return candidates.find((p) => p && existsSync(p)); // undefined → puppeteer's bundled Chrome
}

function ffmpeg(args: string[]) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: "inherit",
  });
}

function hasAudio(file: string): boolean {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file,
  ]).toString();
  return out.trim().length > 0;
}

/** atempo only accepts 0.5–2.0, so chain it for bigger speed-ups. */
function atempoChain(speed: number): string {
  const parts: string[] = [];
  let s = speed;
  while (s > 2) { parts.push("atempo=2"); s /= 2; }
  while (s < 0.5) { parts.push("atempo=0.5"); s /= 0.5; }
  parts.push(`atempo=${s.toFixed(4)}`);
  return parts.join(",");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cropMarks = `<i class="mk tl"></i><i class="mk tr"></i><i class="mk bl"></i><i class="mk br"></i>`;

function slideHtml(s: Slide, logoUrl: string): string {
  const eyebrow = s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : "";
  const title = s.title ? `<div class="title">${esc(s.title)}</div>` : "";
  const body = s.body ? `<div class="body">${esc(s.body)}</div>` : "";

  if (s.kind === "clip") {
    // Transparent overlay laid over the footage.
    return `<div class="slide overlay">
      <div class="shade-top"></div><div class="shade-bottom"></div>
      <img class="watermark" src="${logoUrl}" alt="" />
      <div class="caption">${eyebrow}${title}${title ? `<div class="bar"></div>` : ""}${body}</div>
    </div>`;
  }
  if (s.kind === "end") {
    return `<div class="slide card end">
      <div class="slash"></div>${cropMarks}
      <img class="logo" src="${logoUrl}" alt="" />
      ${title}<div class="bar"></div>${body}
    </div>`;
  }
  return `<div class="slide card">
    <div class="slash"></div>${cropMarks}
    ${eyebrow}${title}<div class="bar"></div>${body}
  </div>`;
}

function buildHtml(spec: ReelSpec, logoUrl: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Saira:ital,wght@0,400;0,500;0,700;1,800;1,900&display=swap" rel="stylesheet">
<style>
  :root {
    --lime: #9aca3c; --lime-bright: #b4e04f;
    --ink: #0b0d09; --ink-deep: #050604;
    --white: #f2f5ee; --muted: #a7ae9f;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: transparent; }
  .slide {
    position: relative; overflow: hidden;
    width: ${W}px; height: ${H}px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    font-family: 'Saira', sans-serif;
  }
  .card {
    padding: 160px 110px;
    background:
      radial-gradient(1100px 800px at 50% 30%, rgba(154,202,60,0.13), transparent 65%),
      linear-gradient(180deg, var(--ink) 0%, var(--ink-deep) 100%);
  }
  /* The diagonal cut from the ND monogram, blown up as a background motif. */
  .slash {
    position: absolute; left: 50%; top: -20%;
    width: 38px; height: 140%;
    background: linear-gradient(180deg, transparent, rgba(154,202,60,0.22) 30%, rgba(154,202,60,0.22) 70%, transparent);
    transform: translateX(-50%) rotate(36deg);
  }
  /* Print-and-cut registration marks in the corners. */
  .mk { position: absolute; width: 90px; height: 90px; border-color: var(--lime); border-style: solid; border-width: 0; }
  .mk.tl { top: 70px; left: 70px; border-top-width: 8px; border-left-width: 8px; }
  .mk.tr { top: 70px; right: 70px; border-top-width: 8px; border-right-width: 8px; }
  .mk.bl { bottom: 70px; left: 70px; border-bottom-width: 8px; border-left-width: 8px; }
  .mk.br { bottom: 70px; right: 70px; border-bottom-width: 8px; border-right-width: 8px; }

  .eyebrow {
    position: relative;
    font-weight: 700; font-size: 38px; letter-spacing: 12px;
    text-transform: uppercase; color: var(--lime);
    margin-bottom: 40px;
  }
  .title {
    position: relative;
    font-style: italic; font-weight: 900;
    font-size: 150px; line-height: 0.98; letter-spacing: -2px;
    text-transform: uppercase; color: var(--white);
    max-width: 900px;
  }
  .bar {
    position: relative;
    width: 220px; height: 16px; margin: 44px auto 0;
    background: var(--lime); transform: skewX(-36deg);
  }
  .body {
    position: relative;
    font-weight: 500; font-size: 48px; line-height: 1.4;
    color: var(--muted); max-width: 820px; margin-top: 48px;
    white-space: pre-line;
  }
  .logo { position: relative; width: 640px; margin-bottom: 90px; }
  .end .title { font-size: 170px; }
  .end .body { color: var(--white); }

  /* Clip overlay */
  .overlay { justify-content: flex-end; padding: 0 80px 250px; }
  .shade-top {
    position: absolute; inset: 0 0 auto 0; height: 360px;
    background: linear-gradient(180deg, rgba(0,0,0,0.55), transparent);
  }
  .shade-bottom {
    position: absolute; inset: auto 0 0 0; height: 900px;
    background: linear-gradient(0deg, rgba(0,0,0,0.82) 10%, rgba(0,0,0,0.45) 55%, transparent);
  }
  .watermark { position: absolute; top: 90px; left: 80px; width: 250px; }
  .caption { position: relative; }
  .overlay .title { font-size: 190px; text-shadow: 0 6px 30px rgba(0,0,0,0.5); }
  .overlay .bar { margin-top: 34px; }
  .overlay .body { color: var(--white); margin-top: 36px; text-shadow: 0 3px 16px rgba(0,0,0,0.7); }
</style></head>
<body>${spec.slides.map((s) => slideHtml(s, logoUrl)).join("\n")}</body></html>`;
}

async function renderPngs(spec: ReelSpec, outDir: string): Promise<string[]> {
  const logoUrl = pathToFileURL(path.join(ROOT, "public", "nexaLogo.png")).href;
  const htmlPath = path.join(outDir, "slides.html");
  await writeFile(htmlPath, buildHtml(spec, logoUrl), "utf8");

  const browser = await puppeteer.launch({
    executablePath: browserPath(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");

  const els = await page.$$(".slide");
  const files: string[] = [];
  for (let i = 0; i < els.length; i++) {
    const file = path.join(outDir, `slide-${String(i + 1).padStart(2, "0")}.png`) as `${string}.png`;
    await els[i].screenshot({ path: file, omitBackground: true });
    files.push(file);
  }
  await browser.close();
  return files;
}

const VIDEO_OUT = ["-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", String(FPS)];
const AUDIO_OUT = ["-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2"];
const SILENCE = ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"];
const COVER = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;

/** Encode one slide to a uniform segment so they can be joined without re-encoding. */
function renderSegment(s: Slide, png: string, specDir: string, out: string) {
  const d = s.durationSec;
  const frames = Math.round(d * FPS);

  if (s.kind !== "clip") {
    // Brand card: short fade in from black so the cut doesn't feel abrupt.
    ffmpeg([
      "-loop", "1", "-framerate", String(FPS), "-i", png, ...SILENCE,
      "-filter_complex", `[0:v]format=yuv420p,fade=t=in:st=0:d=0.25[v]`,
      "-map", "[v]", "-map", "1:a", "-t", String(d), ...VIDEO_OUT, ...AUDIO_OUT, out,
    ]);
    return;
  }

  const src = path.resolve(specDir, s.src);
  if (!existsSync(src)) throw new Error(`Footage not found: ${src}`);

  if (IMAGE_EXT.has(path.extname(src).toLowerCase())) {
    // Still photo: slow push-in (pre-upscale 2x so zoompan doesn't shimmer).
    ffmpeg([
      "-loop", "1", "-i", src, "-i", png, ...SILENCE,
      "-filter_complex",
      `[0:v]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},` +
        `zoompan=z='1+0.10*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}[bg];` +
        `[bg][1:v]overlay=0:0,format=yuv420p[v]`,
      "-map", "[v]", "-map", "2:a", "-frames:v", String(frames), "-t", String(d),
      ...VIDEO_OUT, ...AUDIO_OUT, out,
    ]);
    return;
  }

  const speed = s.speed ?? 1;
  const useAudio = (s.keepAudio ?? true) && hasAudio(src);
  const inputs = ["-ss", String(s.startSec ?? 0), "-t", String(d * speed), "-i", src, "-i", png];
  const vf = `[0:v]${COVER},setpts=PTS/${speed},fps=${FPS}[bg];[bg][1:v]overlay=0:0,format=yuv420p[v]`;
  if (useAudio) {
    ffmpeg([
      ...inputs,
      "-filter_complex", `${vf};[0:a]${atempoChain(speed)},aresample=44100[a]`,
      "-map", "[v]", "-map", "[a]", "-t", String(d), ...VIDEO_OUT, ...AUDIO_OUT, out,
    ]);
  } else {
    ffmpeg([
      ...inputs, ...SILENCE,
      "-filter_complex", vf,
      "-map", "[v]", "-map", "2:a", "-t", String(d), ...VIDEO_OUT, ...AUDIO_OUT, out,
    ]);
  }
}

async function main() {
  const specArg = process.argv[2];
  if (!specArg) {
    console.error("Usage: npx tsx scripts/render-reel.ts <spec.json>");
    process.exit(1);
  }
  const specPath = path.resolve(process.cwd(), specArg);
  const spec: ReelSpec = JSON.parse(readFileSync(specPath, "utf8"));
  const outDir = path.join(ROOT, "reels", "out", spec.slug);
  await mkdir(outDir, { recursive: true });

  const pngs = await renderPngs(spec, outDir);
  const segments: string[] = [];
  for (let i = 0; i < spec.slides.length; i++) {
    const seg = path.join(outDir, `seg-${String(i + 1).padStart(2, "0")}.mp4`);
    renderSegment(spec.slides[i], pngs[i], path.dirname(specPath), seg);
    segments.push(seg);
    console.log("segment ->", path.relative(ROOT, seg));
  }

  const listPath = path.join(outDir, "segments.txt");
  await writeFile(listPath, segments.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n") + "\n");
  const mp4 = path.join(outDir, `${spec.slug}.mp4`);
  ffmpeg(["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", mp4]);
  console.log("MP4 ->", path.relative(ROOT, mp4));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
