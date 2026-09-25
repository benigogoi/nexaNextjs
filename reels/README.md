# Reels — how to make one

```
npx tsx scripts/render-reel.ts reels/specs/<your-spec>.json
```

Output: `reels/out/<slug>/<slug>.mp4` (1080x1920, 30fps, ready for Reels),
plus a PNG of every card/overlay. Needs `ffmpeg` on PATH and Chrome
(set `CHROME_PATH` if it isn't found).

Put raw footage in `reels/footage/<job>/`. Videos (`.mp4`, `.mov`) are
git-ignored because they're big; keep the originals on your phone/drive.

## Spec format

```jsonc
{
  "slug": "reel-02-example",          // output folder + mp4 name
  "slides": [
    {
      "kind": "card",                 // full-screen brand card (hook / text)
      "eyebrow": "Custom stickers",   // small lime caps line (optional)
      "title": "Your logo. On every box.",
      "body": "Supporting line.",     // optional; \n for a line break
      "durationSec": 2.2
    },
    {
      "kind": "clip",                 // your footage + caption + logo watermark
      "src": "../footage/job/cut.mp4",// video OR photo, relative to this spec
      "eyebrow": "Step 2",
      "title": "Cut.",
      "body": "Precision plotter, every edge.",
      "startSec": 4,                  // video only: where to start in the clip
      "speed": 2,                     // video only: 2 = twice as fast
      "keepAudio": true,              // video only: keep plotter sound (default)
      "durationSec": 2.2              // length in the finished reel
    },
    {
      "kind": "end",                  // logo + CTA end card
      "title": "Done.",
      "body": "DM @nexa_designlab to order",
      "durationSec": 2.8
    }
  ]
}
```

Photos get a slow push-in; videos are cropped to fill 9:16.

## The "Print. Cut. Stick. Done." formula

1. Hook card (~2s)
2. PRINT. — top-down shot of the printed sheet
3. CUT. — close, low shot following the blade (speed 2–3x)
4. PEEL. — sticker lifting off, printed side to camera
5. STICK. — pressing it onto the customer's box/product
6. DONE. end card with logo + "DM to order"

12–16 seconds total. Add a trending audio in the Instagram editor, or keep
the plotter sound — it performs well on its own.

## Shooting checklist

- Vertical, 60fps, phone on a stand, tap-and-hold to lock focus/exposure.
- Bright white light (window/lamp); switch off coloured room lights.
- Same spot for every step so the reel feels like one continuous job.
- Clean background for the peel and stick shots.
- Film 5–10s of each step — the script trims it.
