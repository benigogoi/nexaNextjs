/**
 * Nexa Design Lab — animated sticker reels. No filming: every frame is drawn.
 *
 * Each reel invents (or loads) a brand, then animates its sticker being
 * designed → printed → cut on the plotter → peeled → stuck on the product,
 * ending on the Nexa "DM to order" card. Sound effects are synthesised.
 *
 *   npx tsx scripts/make-reel.ts moonflour              one brand from reels/brands.json
 *   npx tsx scripts/make-reel.ts --all                  every brand in reels/brands.json
 *   npx tsx scripts/make-reel.ts --random 3             three new imaginary brands
 *   npx tsx scripts/make-reel.ts --random 2 --category tea --seed 40
 *   npx tsx scripts/make-reel.ts moonflour --stills 1,5,9,13,17   quick PNG previews
 *
 * Output per brand in reels/out/<id>/: <id>.mp4, cover.jpg, caption.txt, brand.json.
 * Needs ffmpeg on PATH and Chrome/Chromium (CHROME_PATH to override).
 */
import puppeteer, { type Browser } from "puppeteer";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { synth, toWav, type Cue } from "./reel-audio";
import { captionFor, complete, randomBrand, type Brand } from "./reel-brands";

const ROOT = path.resolve(__dirname, "..");
const STAGE = path.join(ROOT, "reels", "engine", "stage.html");
const LOGO = path.join(ROOT, "public", "nexaLogo.png");

interface StageInfo {
  duration: number;
  fps: number;
  cues: Cue[];
  cover: number;
}

function browserPath(): string | undefined {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ];
  return candidates.find((p) => p && existsSync(p)); // undefined → puppeteer's bundled Chrome
}

function parseArgs(argv: string[]) {
  const opts = { ids: [] as string[], all: false, random: 0, seed: Date.now() % 100000, category: undefined as string | undefined, stills: [] as number[] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") opts.all = true;
    else if (a === "--random") opts.random = Number(argv[++i] ?? 1);
    else if (a === "--seed") opts.seed = Number(argv[++i]);
    else if (a === "--category") opts.category = argv[++i];
    else if (a === "--stills") opts.stills = (argv[++i] ?? "").split(",").map(Number).filter((n) => !Number.isNaN(n));
    else opts.ids.push(a);
  }
  return opts;
}

async function render(browser: Browser, brand: Brand, stills: number[]) {
  const outDir = path.join(ROOT, "reels", "out", brand.id);
  await mkdir(outDir, { recursive: true });
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "warn" || m.type() === "error") console.warn(`  [page] ${m.text()}`);
  });
  page.on("pageerror", (e) => console.error(`  [page error] ${e}`));
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(STAGE).href, { waitUntil: "load" });
  const info = (await page.evaluate(
    (b, logo) => (window as unknown as { setup: (b: unknown, l: string) => Promise<unknown> }).setup(b, logo),
    brand as unknown as Record<string, unknown>,
    pathToFileURL(LOGO).href,
  )) as StageInfo;
  const seek = (t: number) => page.evaluate((x) => (window as unknown as { renderAt: (t: number) => void }).renderAt(x), t);

  if (stills.length) {
    for (const t of stills) {
      await seek(t);
      const file = path.join(outDir, `still-${t.toFixed(2)}.png`) as `${string}.png`;
      await page.screenshot({ path: file });
      console.log("  still ->", path.relative(ROOT, file));
    }
    await page.close();
    return;
  }

  const wavPath = path.join(outDir, "sfx.wav");
  await writeFile(wavPath, toWav(synth(info.cues, info.duration)));
  await writeFile(path.join(outDir, "brand.json"), JSON.stringify(brand, null, 2));
  await writeFile(path.join(outDir, "caption.txt"), captionFor(brand) + "\n");

  const mp4 = path.join(outDir, `${brand.id}.mp4`);
  const ff = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe", "-framerate", String(info.fps), "-c:v", "mjpeg", "-i", "-",
    "-i", wavPath,
    "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(info.fps),
    "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart",
    mp4,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = once(ff, "close");

  const frames = Math.round(info.duration * info.fps);
  const started = Date.now();
  for (let f = 0; f < frames; f++) {
    await seek(f / info.fps);
    const jpg = await page.screenshot({ type: "jpeg", quality: 92, optimizeForSpeed: true });
    if (!ff.stdin.write(Buffer.from(jpg))) await once(ff.stdin, "drain");
    if (f % 60 === 0) process.stdout.write(`\r  frame ${f}/${frames}`);
  }
  ff.stdin.end();
  const [code] = await done;
  if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
  process.stdout.write(`\r  ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)}s\n`);

  await seek(info.cover);
  await page.screenshot({ path: path.join(outDir, "cover.jpg") as `${string}.jpg`, type: "jpeg", quality: 92 });
  await page.close();
  console.log("  MP4 ->", path.relative(ROOT, mp4));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const library = (JSON.parse(readFileSync(path.join(ROOT, "reels", "brands.json"), "utf8")) as Brand[]).map(complete);
  let brands: Brand[] = [];
  if (opts.all) brands = library;
  for (const id of opts.ids) {
    const b = library.find((x) => x.id === id);
    if (!b) throw new Error(`No brand "${id}" in reels/brands.json (have: ${library.map((x) => x.id).join(", ")})`);
    brands.push(b);
  }
  for (let i = 0; i < opts.random; i++) brands.push(randomBrand(opts.seed + i, opts.category));
  if (!brands.length) {
    console.error("Usage: npx tsx scripts/make-reel.ts <brand-id…> | --all | --random N [--seed S] [--category C] [--stills t1,t2]");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: browserPath(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb", "--font-render-hinting=none", "--hide-scrollbars"],
  });
  try {
    for (const b of brands) {
      console.log(`${b.name} (${b.id})`);
      await render(browser, b, opts.stills);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
