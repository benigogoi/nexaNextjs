# Nexa sticker reels: no filming

Every reel is drawn by code: an imaginary brand's sticker gets **designed →
printed → cut on the plotter → peeled → stuck on the product**, then the
Nexa "DM to order" end card. 18 seconds, 1080×1920, with sound effects.

```
npx tsx scripts/make-reel.ts --all                  # every brand in reels/brands.json
npx tsx scripts/make-reel.ts moonflour kopili-tea   # specific brands
npx tsx scripts/make-reel.ts --random 5             # invent 5 new brands
npx tsx scripts/make-reel.ts --random 3 --category tea --seed 40
npx tsx scripts/make-reel.ts moonflour --stills 1,5,9,14   # quick PNG previews
```

Each reel lands in `reels/out/<brand-id>/`:

| file | what it is |
|---|---|
| `<id>.mp4` | the reel, ready to upload |
| `cover.jpg` | cover frame (the "same box, new brand" shot) |
| `caption.txt` | caption + hashtags to paste |
| `brand.json` | the brand it used; paste into `brands.json` to keep a good random one |

Needs `ffmpeg` on PATH and Chrome (set `CHROME_PATH` if it isn't found).
About a minute per reel.

## Categories (for `--random` / `--category`)

`bakery` (cake box) · `cafe` (coffee cup) · `pickles` (jar) · `candles`
(candle tumbler) · `tea` (pouch) · `skincare` (dropper bottle) ·
`cloudkitchen` (bag or box) · `boutique` (shopping bag) · `honey` (jar)

Same `--seed` = same brand, so any reel can be re-made exactly.

## Adding a brand by hand

Copy an entry in `reels/brands.json` and change it:

- `shape`: `circle`, `oval`, `roundrect` or `arch` (`layout: "badge"` curves the name round a circle)
- `product`: `box`, `jar`, `cup`, `pouch`, `bottle`, `bag` (jar `contents`: `pickle`, `honey`, `cream`, `wax`)
- `icon`: `cupcake`, `kulhad`, `coffee`, `chili`, `candle`, `tealeaves`, `drop`, `dumpling`, `hanger`, `honey`, `bowl`, `sparkle`
- `font`: any Google Font name (`fontWeight`, `fontStyle`, `upper`, `ls` = letter spacing)
- `palette`: sticker `bg`, text `ink`, icon `accent`, highlight `light`, scene `backdrop`
- `hook` / `reveal`: the two headline lines at the start and end

Real customer? Add them as a brand with `"concept": false`. The reveal then
says "Made for <name>" instead of "Concept", and so does the caption.

## Posting on Instagram

1. Upload the MP4 as a Reel and pick `cover.jpg` as the cover.
2. Add a trending song at low volume and keep the original sound (plotter/peel
   noises) on top. Trending audio helps reach.
3. Paste `caption.txt`. Reply to every "STICKER" DM fast.
4. Share to your story, and use Trial Reels for some so they reach non-followers first.
5. Batch it: make a week of reels in one go, then schedule them in Meta
   Business Suite (one a day, evenings).

## How it works

- `reels/engine/stage.html` + `stage.js`: one page holds every scene;
  `renderAt(t)` draws any moment deterministically.
- `reels/engine/art.js`: icons, sticker layouts, product mockups (all SVG).
- `scripts/make-reel.ts`: headless Chrome screenshots all 552 frames → ffmpeg.
- `scripts/reel-audio.ts`: synthesises the sound effects from the scene's cue list.
- `scripts/reel-brands.ts`: categories, the random-brand generator, captions.
