# KIOSK Content Guide

How to publish films, photo stories, interviews, radio playlists and products on the KIOSK Glass site.

Everything lives in **one file: `js/kiosk-content.js`**. There's no CMS and no build step. Edit the file, add your media, commit, and Cloudflare Pages deploys it.

| Page | URL | Renders |
| --- | --- | --- |
| Home | `index.html` | Lead story, Garage rail, films, radio, Vault preview, Dispatch signup |
| Atlas | `atlas.html` | Every story as a blog post: date, read time, chapters (`?draft=1` shows unwritten chapters) |
| Garage | `atlas.html` | Every story, with filters (machine, format, era, season, city, search, saved) |
| Story | `story.html?s=<slug>` | One shoot as a magazine feature: full-bleed cover, standfirst, the story in text-and-photo spreads, swipe gallery, spec sheet, subjects, colour guide, behind the scenes, interview, shop the look, next story |
| Radio | `radio.html` | Phonk playlists. Plays in the site-wide radio dock with a live waveform |
| Shop | `vault.html?c=<category>&sort=new` | KIOSK Supply: apparel, headwear, skate, accessories, films, LUT packs |

The older Shopify apparel pages (classic store, `collections/*`) have been removed; the shop now lives in `vault.html`.

---

## 1. Add a story (film, photo story or interview)

The stories are real shoots: `andy-q50`, `moses-r1m`, `honda-f4i-shop`, `l0st-tapes` and `doom-racing-prospect-meet`. Copy one of them to start a new story. Add `hidden: true` to take a story off the site without deleting it (the optional `hidden: true` keeps a story off the site).

**Films from Google Drive:** set `embed` to `https://drive.google.com/file/d/<FILE_ID>/preview`. It only plays for visitors once the Drive file is shared as **Anyone with the link → Viewer**. For the best playback, upload to YouTube or Vimeo and use that embed URL instead.

**Gallery captions:** put the camera settings in `meta`, e.g. `'A7C II · 28mm · 1/50 · f/8 · ISO 100'`. They show under each slide.

1. Create a folder for the media: `images/garage/<slug>/`. Use short, lowercase slugs like `r32-wangan` or `cb750-brooklyn`.
2. Export images as **WebP**, about 2400 px on the long edge for covers and slides, and about 1200 px for behind-the-scenes frames.
3. Copy an existing object in `features` and edit it.

```js
{
  slug: 'andy-q50',              // URL: story.html?s=andy-q50
  type: 'car',                   // 'car' | 'motorcycle'
  format: 'film',                // 'film' | 'gallery' | 'interview'  (garage filter + label)
  year: 1991, make: 'Nissan', model: 'Skyline GT-R', code: 'R32',  // code = giant hero text
  title: 'Wangan Nights',
  tagline: 'Midnight purple on the Wangan line.',
  excerpt: 'One or two sentences shown in the hero panel and on cards.',
  era: '90s',                    // filter chip
  season: 'fall',                // 'spring' | 'summer' | 'fall' | 'winter'
  vibes: ['night', 'neon', 'jdm', 'moody'],   // used for "Shop the look"
  location: 'Wangan Line', city: 'Tokyo', country: 'JP', coords: '35.6264° N, 139.7753° E',
  shotOn: 'Sony FX3', lens: '35mm f/1.4', runtime: '04:12', published: '2026-09-18',
  tone: 'sodium',                // placeholder colour while media is missing

  // MEDIA
  image: 'images/garage/andy-q50/01.webp',
  focus: '62% 78%',              // where to centre the cover when it's cropped (CSS object-position)
  poster: 'images/garage/r32-wangan/poster.webp',
  video: 'videos/garage/r32-wangan.mp4',               // self-hosted, or…
  embed: 'https://www.youtube.com/embed/VIDEO_ID',     // …YouTube / Vimeo player URL
  gallery: [
    { src: 'images/garage/r32-wangan/01.webp', caption: 'Daikoku, 1:40 a.m.', meta: 'FX3 · 35mm · 1/50 · f/1.4 · ISO 3200' },
    { src: 'images/garage/r32-wangan/02.webp', caption: 'Bayshore run' },
  ],
  …
}
```

Cards and the hero only need the identity fields (`slug` through `tone`) plus the media. Every other section on the story page is optional, and a section with no data is hidden.

### Blog chapters (dictated)
Each story is also a Journal post. Its `chapters` start empty and stay hidden from visitors until they have a `body`. Dictate a chapter to Claude and it gets typed in. See **`docs/DICTATION.md`** for every post's chapter list and prompts.
```js
author: 'RollerReels',
chapters: [
  { id: 'the-car', heading: 'The Q50', prompt: 'What has been done to the car?', body: 'First paragraph…\n\nSecond paragraph…' },
]
```
`type` can be `'car'`, `'motorcycle'` or `'meet'`.

### Specs (the stat strip)
```js
specs: [ { label: 'Engine', value: '2.6L RB26DETT' }, { label: 'Power', value: '276 HP' } ]
```

### Spec sheet (schematic + facts)
Cars and bikes live once in `machines` (in `js/kiosk-content.js`): a side-elevation schematic, the key numbers, a few facts and their sources. A story shows the ones it lists:
```js
machines: ['yamaha-r3', 'yamaha-r1m'],
```
Each machine can also carry:
- `factory`: a drawing from its owner's manual (`{ src, caption, credit }`), shown above the schematic.
- `street`: its entry in **The Street File** (`the-garage.html`), the Garage editorial: `{ role, dek, numbers: [{ label, value, note }], secrets: ['…'], sources }`. Every machine with `street` gets a spread there, in the order of `machines`, and its story spec sheet links to it.

Available: `infiniti-q50`, `yamaha-r1m`, `yamaha-r3`, `honda-cbr600f4i`, `honda-shadow-1100`. The drawings are SVGs in `images/schematics/`, drawn to each machine's published wheelbase, wheel sizes, length, height and seat height by `node scripts/draw-schematics.js`. To add a machine, add its drawing to that script, run it, then add an entry to `machines`.

### Story body (the blog part)
An ordered list of blocks:
```js
story: [
  { type: 'text', lead: 'Daikoku Futo, 1:40 a.m.', body: 'The parking deck empties out…' },
  { type: 'quote', text: 'Daylight tells you too much about a car.', cite: 'Ken' },
  { type: 'heading', text: 'The build' },
  { type: 'image', src: 'images/garage/r32-wangan/engine.webp', caption: 'RB26, rebuilt over two winters' },
]
```
The page lays the blocks out like a magazine spread (`css/kiosk-editorial.css`):

- A `text` block's `lead` becomes its serif subheading; the first paragraph gets a drop cap.
- A `text` block **followed by an `image`** becomes a spread: words beside the photograph, alternating sides down the page.
- A lone `image` goes full-bleed, the next one inset, and so on in turn; two `image` blocks in a row sit side by side.
- A `quote` is set as a large centred pull quote.
- Each written chapter is followed by a gallery frame the body hasn't used, and one more frame closes the read full-bleed.

The `excerpt` is the standfirst under the cover, and `specs` is the "at a glance" row beneath it.

### Subjects (who and what is in the film)
```js
subjects: [
  { name: 'Ken', role: 'Owner · Driver', bio: 'Night-shift sound engineer…' },
  { name: 'The R32', role: 'Machine', bio: 'Factory Midnight Purple…' },
]
owner: { name: 'Ken', quote: 'Pull quote used if the story has no quote block.' }
```

### Colour guide
Pick 3–6 colours from your grade. Visitors can tap a swatch to copy its hex.
```js
palette: [
  { name: 'Midnight Purple', hex: '#2b1d3a', note: 'LP2 paint in shadow' },
  { name: 'Sodium', hex: '#e8892b', note: 'Overhead lamps' },
]
```
If the gallery is still empty, the swipe gallery shows placeholder frames tinted with these colours.

### Behind the scenes
```js
bts: {
  crew: [ { role: 'Director / DP', name: 'KIOSK' } ],
  gear: [ 'Sony FX3', 'Sigma 35mm f/1.4', 'DJI RS 3 Pro' ],
  conditions: [ { label: 'Call time', value: '00:30' }, { label: 'Weather', value: '14°C · clear' } ],
  notes: 'Shot entirely under existing street light…',
  frames: [ 'images/garage/r32-wangan/bts-01.webp' ],
  // Raw / behind-the-scenes clips: short muted loops (a few seconds, no audio, ~1 MB max)
  clips: [
    { src: 'images/garage/r32-wangan/bts/raw-01.mp4', webm: 'images/garage/r32-wangan/bts/raw-01.webm',
      poster: 'images/garage/r32-wangan/bts/raw-01.webp', caption: 'Setting up the rig', meta: 'Osmo Pocket 3 · raw' },
  ],
}
```
Clips autoplay muted on loop. When the visitor has reduced motion turned on, they show controls instead. Encode them like this:
```bash
ffmpeg -i clip.MP4 -an -vf "scale=960:-2,fps=24" -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart raw-01.mp4
ffmpeg -i raw-01.mp4 -c:v libvpx-vp9 -b:v 0 -crf 38 raw-01.webm
ffmpeg -ss 1 -i raw-01.mp4 -frames:v 1 raw-01.webp
```

### Interview and timeline
```js
interview: [ { q: 'Why only at night?', a: 'Sodium light…' } ],
timeline: [ { year: '1991', label: 'Built in Musashimurayama' }, { year: '2026', label: 'Shot for Issue 01' } ],
```

### Links to Radio and the Vault
```js
soundtrack: 'phonk-n95',           // slug of a mix or playlist → "Soundtrack" button
gradedWith: 'lut-sodium-night',     // product id → "Graded with" link
filmProduct: 'film-r32-wangan',     // product id → "Own the film"
products: ['film-r32-wangan', 'app-hoodies'],   // pinned first in "Shop the look"
```

---

## 2. How "Shop the look" picks products

Products listed in a story's `products` always come first. The remaining slots go to the products that best match the story:

| Match | Points |
| --- | --- |
| Product is the story's `gradedWith` LUT | +4 |
| Product is the story's soundtrack mix | +4 |
| A product colourway name (or `colors` entry) equals a story `palette` name | +3 each, and that colourway is preselected |
| Product `seasons` includes the story `season` | +2 |
| A product `vibes` word matches a story `vibes` word | +2 each |

Each card shows the reasons it matched, such as `FALL`, `NIGHT` or `GRADED WITH`. For good matches, use the **same words** in both places. If a story uses the vibe `golden-hour`, tag the matching products with `golden-hour` too.

---

## 3. Radio: Spotify playlists (free to listen, nothing for sale)

Radio plays in a **dock that stays at the bottom of every page**. Once a visitor presses play, links between the KIOSK pages (Home, Garage, Journal, Story, Radio, Shop) load in place, so the music keeps going. Older pages (store, about, contact…) still reload normally, which stops playback. Playing a film pauses the radio.

**Live waveform:** every `<canvas data-wave>` draws the music as it plays: in the dock, on the radio deck, on each playlist card, and in the nav "Radio" pill. For a self-hosted `audio` file, the waveform is the real signal. Spotify doesn't let websites read its audio, so for Spotify playlists the waveform is generated to match a phonk beat, and it starts, stops and seeks with Spotify. Visitors logged in to Spotify hear full tracks; everyone else gets Spotify's 30-second previews.

To add a playlist, copy its share link (`open.spotify.com/playlist/<ID>`) and add an entry to `mixes`:
```js
{
  slug: 'phonk-n95', title: 'Phonk nº 95', volume: 'Playlist 01',
  mood: 'Phonk · curated on Spotify', tone: 'graphite',
  spotify: '1fO87QEdH8Y3WIVjAjDARS',   // playlist ID
  cover: '',                            // optional cover image URL
  length: '', bpm: '', audio: '', tracks: [],
}
```
**SoundCloud:** instead of `spotify`, set `soundcloud` to any SoundCloud link: a track, a playlist (set), or a profile's likes page (`https://soundcloud.com/<username>/likes`). It plays in the same dock, and the dock shows the current track and artist. If an `on.soundcloud.com/…` short link doesn't play, use the full `soundcloud.com/…` link it opens to.

For a self-hosted DJ mix, set `audio` to an MP3 URL (320 kbps). It then plays in the KIOSK player instead of the Spotify embed, and `length`, `bpm` and `tracks` show on the deck.

> Large media: Cloudflare Pages rejects any single file over 25 MB. Host long mixes and films on R2, Bunny or YouTube/Vimeo, and use those URLs in `audio`, `video` or `embed`.

---

## 3d. Raw footage played from Google Drive

For footage too big to host on the site (each file over 25 MB), list the Drive clips on a story and they play from Drive in the site's viewer, with no download:
```js
bts: { driveClips: [ { id: '<DRIVE_FILE_ID>', clip: '0066', time: '11:15:59' } ] }
```
The file must be shared **Anyone with the link** (viewer is enough). Your Lunar New Year clips are currently shared as *editor*, which lets anyone with the link change them. Switch them to **Viewer** in Drive. The reel only needs viewing access.

## 3a. Magazine layouts: departments, mosaics and rails

The site is organised like a magazine with four **desks**: Travel, Automotive, Music and Fashion.

- **Departments rail** (home page and Journal): one big card per desk.
- **Mosaic** (home page, Journal archive, and the contact sheet on each story): a Pinterest-style board. It mixes gallery photos, Vimeo films, story palettes, 3D product renders, playlists and pull quotes, with filter chips per desk. Tap a photo to open the photo viewer (← → to browse).
- **Lookbook rail** (shop): each product colourway next to the shoot whose palette it's named after.
- **Rails** scroll sideways with drag, arrow buttons or the keyboard.

Each story has a `desk` (`'travel' | 'automotive'`). A single gallery photo can go to a different desk with `desk: 'travel'` on that entry. Products always go under Fashion and playlists under Music.

**Thumbnails:** mosaics load 720px versions from `images/garage/<slug>/thumbs/`. After adding photos, make them with:
```bash
for f in images/garage/<slug>/[0-9][0-9].webp; do mkdir -p images/garage/<slug>/thumbs; convert "$f" -resize '720x720>' -strip -quality 72 "images/garage/<slug>/thumbs/$(basename "$f")"; done
```
If a thumbnail is missing, the full image is used instead.

## 3b. Films on Vimeo

Vimeo films show in an **On Vimeo** strip on the home page and the Garage. Add the ID from the link (`vimeo.com/<id>`, or `vimeo.com/<id>/<hash>` for an unlisted video):
```js
vimeo: [
  { id: '1212483051', hash: 'f428c5372f', title: '', story: 'andy-q50' },
]
```
The title, thumbnail and length load from Vimeo automatically. `title` overrides Vimeo's title, and `story` adds a "Read the story" link in the player. To use a Vimeo film as a story's main film instead, set that story's `embed` to `https://player.vimeo.com/video/<id>?h=<hash>`. In Vimeo, set the video's embed privacy to allow `onlyatthekiosk.com` (and the `*.pages.dev` preview), or Vimeo won't play it on the site.

## 3c. Look and feel: cover, intro, day/night

- **Cover slideshow:** `issue.heroSlides` in `js/kiosk-content.js` plays full-screen muted clips behind the giant KIOSK on the home page.
  - **How it plays:** each clip plays once, then crossfades to the next. Story-style bars at the top show progress, and the caption links to the slide's story.
  - **Controls:** visitors can tap a bar, use the arrows or swipe, and pause. The slideshow pauses when the cover scrolls out of view.
  - **A slide:** `{ src, webm, poster, story, kicker, title, caption }`.
  - **Clip size:** keep each clip 4–10 s, muted, 1600 px wide and about 1–2 MB.
  - **Current clips:** `videos/hero/` holds the Q50 and R1M cuts of the KIOSK reel and the raw Q50 set footage.
  - **Fallback:** with an empty list, the single `issue.reel` loop plays instead.
- **Depth:** on the home page the issue slides up over the pinned globe hero like a sheet. Sections rise into view as you scroll, and cards tilt toward the pointer on desktop.
- **App shell:** links between the magazine pages load in place, with a short transition, so the header, tab bar and radio keep running.
  - **Phones:** navigation moves to a bottom tab bar (Home, Garage, Journal, Radio, Shop, More). The top bar shrinks to the logo and clock and tucks away while you read.
  - **Home screen:** `site.webmanifest` lets visitors add KIOSK to their home screen as a full-screen app.
- **Settings** (gear in the header, *More › Settings* on phones, or `#settings` on any page): readers can change these for themselves, saved on their device only:
  - language
  - theme and accent colour
  - text size
  - depth on or off
  - round or square corners
  - density
  - which home sections show, and in what order
  - motion, intro and hero autoplay
- **Languages:**
  - **Supported:** English, Español, Français, Português, Deutsch, Italiano, 日本語, 한국어 and 中文.
  - **Interface text:** the translations are in `js/kiosk-i18n.js`, keyed by the English text exactly as it appears on the page. If you change a label in the HTML or JS, change its key there too, or that label will stay in English.
  - **Stories and product notes:** these are not in the dictionary. In browsers with a built-in on-device translator (recent desktop Chrome), readers can switch on *Translate stories on this device*. Elsewhere those passages stay in English.
- **World traveler intro:** plays once per visit on the home page (skippable).
  - **The flight:** a 3D dotted Earth where a traveler flies New York → Reykjavík → London → Marrakesh → Dubai → Tokyo. Each stop gets a passport stamp, and a boarding pass shows the current leg and that city's local time. The camera then pulls back and the KIOSK title lands.
  - **Changing the route:** edit `ROUTE` at the top of `js/kiosk-intro3d.js`.
  - **Loading:** three.js (`js/vendor/`) and the land dots (`js/kiosk-world.js`) load only for this intro.
  - **Fallback:** without WebGL, or if loading takes over 2.5 seconds, the 2D wireframe globe plays instead.
  - **Reduced motion:** visitors who have reduced motion turned on skip the intro.
- **Day / night:** follows the visitor's local time (day 06:00–18:59). The header button cycles auto → day → night, and the choice is remembered. The digital clock in the header and menu shows the visitor's local time and city.

For stores, partner payouts, pickup-only Hunt pieces and quote merch, see **`docs/MARKETPLACE.md`**.

## 4. Add or sell a product (KIOSK Supply)

The shop is `vault.html`, shown as **Shop** in the nav. It's laid out like an airport terminal:
- a frosted header with search across products, Hunt pieces and stores
- a split-flap **departures board** of the newest drops
- categories as lettered **gates**
- boarding-pass product cards
- the **lounge**: every terminal photo, each one opens its colourway
- **in-flight** films and LUTs
- the **concourse** of partner stores

**Lifestyle photos:** set two photos per colourway, a street shot and a terminal shot:
`lifestyle: ['images/product-lifestyle/tees/001-black-street-01.webp', 'images/product-lifestyle/tees/001-black-airport-01.webp']`.
- **On cards:** the street shot leads and the terminal shot shows on hover.
- **In the product panel:** both photos lead the gallery, followed by the 3D renders.
- **Without photos:** a product falls back to its 3D render or a **vector mockup**.
- **Current set:** the 36 lookbook photos are in `images/product-lifestyle/`; see `docs/APPAREL_LIFESTYLE_LOOKBOOK.md`.
- **More than two photos:** list as many as you have, in gallery order, and describe each for screen readers with `lifestyleAlt` (same order), e.g. `lifestyleAlt: ['front, on concrete steps', 'back print, walking away']`. The KIOSK Globe Hoodie #004 has four per colourway (`004-<colour>-street|back|chest|duo-01.webp`).
- **Size guide past XXL:** a product's own `guide` overrides the garment guide (`fit`, `fabric`, `care`, `chart` in inches, `shrink`), and `guide.fitsChest` sets the "Fits chest" column for its own sizes (the Globe Hoodie runs XS–4XL).
- **Fit model:** `model: { name: 'Preston', height: '6\'1"', size: 'L' }` shows "Preston is 6'1" and wears an L" under the sizes and in the size guide. It stays hidden until both height and size are filled in, so only real numbers ever show.
- **Globe print:** `mockup: { type: 'hoodie', chest: true, chestPrint: 'globe', backPrint: 'globe', drawcord: false }` draws the KIOSK globe mark small on the chest and large on the back of the vector mockups and the tech sketch, with a clean hood.
- **Orbit print and ringer collars:** `mockup: { type: 'tee', chest: true, chestPrint: 'orbit', backPrint: 'orbit' }` draws the orbit wordmark on the chest and back, masked from the real artwork in `images/brand/kiosk-orbit-logo.png` so it takes any ink colour (an outline version is in `kiosk-orbit-logo-outline.png`); a colourway's `rib: '#hex'` draws a contrast ringer collar on the mockups. The Orbit Ringer Tee #004 uses both, in Yellow Cab, East River, Ultraviolet, Matcha and Blackout (`images/product-lifestyle/tees/004-<colour>-street|garage|bridge|back|chest-01.webp`).
- **Retro print and per-colourway artwork:** `chestPrint: 'retro'` / `backPrint: 'retro'` draws the retro orbit mark (a tall italic K, IOSK beside it, an orbit swoosh to a star) with a cracked-print finish. `chestPrint`/`print: 'retro'` is the K logo with IOSK, `backPrint: 'retroK'` the K alone, both from `images/brand/kiosk-k-logo.png`; `tag: true` draws the woven K neck label (colourway `tag: '#hex'` sets its colour). A colourway can override the product's `mockup`, e.g. `mockup: { chest: false, print: 'retro', printW: 150, stripes: ['#hex', '#hex', '#hex'] }` for a big front print with racing stripes under the mark (one colour per band, top down). The Liftoff Retro Tee #005 uses this for Original Cream, Washed Navy and Washed Black; its other colourways add the product flats as `image` (back) and `imageFront` (front) next to the photos (`images/product-lifestyle/tees/005-<colour>-front|back|print|label-01.webp`, `005-<colour>-flat-front|back.webp`).
- **Tech pack:** the Globe Hoodie's full manufacturing spec (fabric, construction, print placement, colourways, points of measure XS–4XL, QC) is the "KIOSK Globe Hoodie — Tech Pack" doc.

```js
{
  id: 'hoodie-garage', category: 'apparel',   // apparel | headwear | skate | accessories | films | luts
  title: 'Midnight Garage Hoodie', price: 98,
  badge: 'New',                               // tile label: 'New', 'Issue 01' (orange sticker), 'Classic', 'Digital'…
  added: '2026-09-28',                        // used by "Newest" sort and the home "New in" row
  detail: 'Brushed fleece · kangaroo pocket · arch print',
  mockup: { type: 'hoodie', print: 'arch' },
  colorways: [
    { name: 'Plattenbau', garment: '#a7a39a', ink: '#141414' },
    { name: 'Asphalt',    garment: '#141416', ink: '#f2f0eb', shopifyHandle: 'garage-hoodie-asphalt' },
  ],
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  status: 'soon',            // 'soon' → "Notify me"   |   'available' → Buy
  shopifyHandle: '',         // fallback handle when a colourway has none
  href: '',                  // …or any URL
  image: '',                 // real photo replaces the mockup
  seasons: ['fall', 'winter'], vibes: ['night', 'urban'], colors: [],
}
```

**Mockup types:** `tee`, `longsleeve`, `crew`, `hoodie`, `cap`, `beanie`, `deck`, `socks`, `tote`, `keytag`, `stickers`, `chain`. Digital goods use `vhs` (films) and `lutbox` (LUT packs; pass `swatches: ['#hex', …]`).

**Prints:** `wordmark`, `kmark`, `wangan`, `issue`, `arch`, `phonk`, `cafe`, `checker`. Pass `printW` to resize a print. Decks take `deckText` and `deckSub`, longsleeves take `sleevePrint`, and cassettes and VHS tapes take `label` and `sub`. New prints and garment types live in `js/kiosk-mockups.js`.

**Tech sketches:** a physical product (or colourway) without `lifestyle` photos is shown as a black-and-white tech-pack flat drawn from its `mockup` (front and back views, points of measure, construction details, spec block). Add real photos with `lifestyle` on the colourway to replace it. The flats live in `js/kiosk-mockups.js` (`sketch()`, `BLOCKS` and `DETAILS`); the theme colours are in `css/kiosk-glass.css` (`.k-mockup--sketch`).

**Colourways:** `garment` is the fabric colour and `ink` is the print colour. Name a colourway after a story palette colour (for example "Sodium" or "Midnight Purple") and that story's **Shop the look** will feature the product in that colourway automatically.

**To start selling a product:**
1. Create it in Shopify, one product per colourway. For films and LUTs, use a digital-delivery app such as Shopify's free **Digital Downloads** app.
2. Put each handle on its colourway (`shopifyHandle`) and set `status: 'available'`.

**What Buy does:** the button in the product panel finds the Shopify variant for the chosen colourway and size (`/api/shopify`), creates a cart (`/api/shopify-cart`) and opens Shopify checkout. This needs `SHOPIFY_STOREFRONT_TOKEN` and `SHOPIFY_STORE` on the Worker.

**Colourway status:** a colourway can override the product with `status: 'soon'` (for example a new colour that isn't in Shopify yet).

**Linked handles:** the "Classic" #001 hoodie, tee, chain and bracelet are already linked to their existing Shopify handles.

**Shareable links:**
- `vault.html?p=<product id>` opens a product's full page; `&cw=<n>` opens a specific colourway.
- `/products/<handle>` lands on the matching product.

"Notify me" sends the email to `/api/subscribe`, which writes to the Airtable "Incoming Interest" table. It stores the email only, not the product.

---

## 5. Lead story

```js
issue: {
  number: '01', title: 'Night Shift', dek: '…',
  lead: 'r32-wangan',                        // the lead story, sorted first wherever stories are listed
}
```
The home page no longer has a cover carousel: under the globe hero the issue starts straight away. `heroSlides` and `reel` are not shown on the home page (`heroSlides` still decides which stories the Atlas globe pins when `featured` is empty).

---

## 5a. Reader quotes (Why the kiosk)

```js
voices: [
  { quote: 'I came for the Q50 film and left with a road trip planned.', name: 'Ama', place: 'Accra', role: 'Reader since Issue 01', image: 'images/…webp', story: 'andy-q50' },
],
```
Each reader quote becomes a slide on the home page, ahead of the KIOSK's own lines. Print only real quotes, with the reader's OK. `image` is optional: without it the slide uses `story`'s photo, else one of the lifestyle shots (`colorways[].lifestyle`) or a story photo.

---

## 6. Design system

- Styles: `css/kiosk-glass.css`. Rendering: `js/kiosk-glass.js`. Content: `js/kiosk-content.js`.
- Fonts: General Sans (local) and **Instrument Serif** from Google Fonts for italic editorial accents.
- Theme: white by default. Photo and film surfaces (heroes, story cards, radio deck, player, lightbox) use a dark token scope so footage stays cinematic. Add class `k-dark` or `k-light` to flip any block.
- Colour: graphite, bone and glass. A single signal orange (`--signal`) appears only on "live" and "now playing" dots and the "Issue 01" sticker.
- Placeholder **plates** (tones `sodium`, `chrome`, `desert`, `ice`, `ember`, `graphite`, `moss`) stand in for any missing image, so pages never look broken while footage is in post.

## Site map (2026-10)

- **Home** (`index.html`): opens on the **globe hero** (`js/kiosk-globe-hero.js` over the satellite Earth, `js/kiosk-earth.js`). On the first visit of a session a flight hops round the world to the visitor's town, each stop closer to home; then the planet settles across the bottom of the screen under the headline and buttons. The hero is a scroll scene a few screens tall with its stage pinned: scrolling down, the headline lifts away, the whole planet rises into view and turns clockwise (seen from the north pole) with the page, and back again scrolling up; a caption under it shows the live count. Drag the planet to spin it (on phones, swipe sideways; vertical swipes still scroll), and it coasts to a stop when let go. With reduced motion the hero is one screen with no scroll spin, and the planet can still be dragged. The visitor's town is pinned with a sonar pulse, everyone else on the site right now is pinned too, and flights keep streaking between them while the planet turns slowly back and forth. The Earth is NASA day and night imagery lit by the real sun, so the day/night line is the actual one. Return visits skip the flight (so does Settings › Intro animation: Off); reduced motion gets one still frame; without WebGL a still planet image stands in. The visitor's town comes from their check-in home, else the approximate city Cloudflare attaches to the request (`functions/api/where.js`, no permission prompt, nothing stored), else a guess from the device's time zone (`TZ_HOME` in `js/kiosk-glass.js`), else New York. **Live count and pins** come from `/api/live` (`functions/api/live.js`): every open tab checks in every half minute and checks out when it closes; a viewer is anyone heard from in the last two minutes. Everyone here is counted in the header on every page (a glowing green dot and the number, beside the clock; on phones a small chip beside the logo), and it links to the home globe, where everyone else shows as a glowing green pin (bigger where more people are, labelled with the city) and you show in orange. Only the city-level location Cloudflare attaches to the request is kept, rounded to about 10 km and grouped by city, with the tab's id stored hashed and rows swept after ten minutes; a visitor Cloudflare can't place is counted but not pinned. It needs the D1 binding `DB` and the `presence` table (`migrations/0004_presence.sql`, applied with `npx wrangler d1 migrations apply kiosk-accounts --remote`). Without them the header shows no count, the chip says where the visitor is and only their pin shows; no viewers are ever made up. Under the hero, the **Main concourse** pairs the terminal directory with the departures board (latest stories, the two newest pieces and the radio; type sized to the board's width, two lines per flight where it's narrow), and the **Atlas globe** first slides out from under the board as it scrolls up. It is one globe that roams (`roamGlobe` in `js/kiosk-glass.js`, scrubbed with the scroll like a GSAP Flip): out from under the board, then swelling into a large faint globe behind **Latest stories** ("Every shoot is a story", the same rail and card size as the departments), then settling into **The Atlas**, where up to four featured stories (`issue.featured`) come up as small thumbnails at their `geo: { lat, lon }`. With reduced motion or Settings › Depth: Flat it simply stays in the Atlas. The default order is Latest stories › The Atlas › The Departments › Why the kiosk (readers can still reorder them in Settings). As the departments come up the whole page fades to black, stays black through **Why the kiosk** and fades back for the next section (`bindZone`). **Why the kiosk** is a two-sided slider: a quote on one half, a lifestyle photo filling the other (stacked on phones), turning every 7 s with arrows and a pause button; readers' own words lead (`voices` in `js/kiosk-content.js`), then the KIOSK manifesto line and the Words to wear quotes.
- **The Atlas** (`atlas.html`): opens on a satellite Earth in quarter view (`js/kiosk-earth.js`), framed on the stories that have a `geo` and lit for late afternoon, with up to four featured posts pinned on it. Drag the globe to look around. Below it, posts sit in streaming-style rows: Featured (`issue.featured`), Latest, Films & vlogs, Photo diaries, Stories, then one row per desk. Typing in the search box or touching a filter swaps the rows for a results grid. Search any word (titles, places, story text, chapters, tags); sort by date, title, location or author; filter by type (video / photos / article), desk, author, location and tags. Filters live in the URL, e.g. `atlas.html?type=video&tag=Film`.
- **Flights** (`flights.html`, terminal T6 "Flight deck"): live flight status on the same satellite Earth, with the real day/night line. Search a flight number (`BA117`) or callsign (`BAW117`), press *Surprise me* for a random flight near one of ~36 world hubs, or *Above me* for the closest flight overhead (asks for location). Links share as `flights.html?f=BAW117`. Data: `functions/api/flights.js` proxies the free [adsb.lol](https://adsb.lol) ADS-B feed (ODbL) with the OpenSky Network as a backup for callsign lookups, and caches answers at the edge for a few seconds. Routes come from adsb.lol's route database and can be wrong for some callsigns. If the feed can't be reached, the page says so and shows sample traffic from the fictional KIOSK fleet (`KSK` callsigns). **Flight status** (scheduled, estimated and actual times, terminal, gate, delay, baggage) comes from Aviationstack through `?status=` on the same endpoint, using the Worker secret `aviationstack_api`. Searching a flight number shows it even when the plane isn't in the air (scheduled or landed); for a random flight it loads only when someone taps *Gate & times*. The free Aviationstack plan allows about 100 lookups a month, so each answer is cached for 10 minutes and shared by everyone; when the month's allowance runs out the page says so and keeps working with live positions only. Airline names for callsign prefixes are `AIRLINES` in `js/kiosk-glass.js`.
- **The Journal** (`archive.html`): one volume a month, filed on a wireframe "3D library" shelf (lines in the page ink: black by day, white by night). Each row opens a volume, `archive.html?v=2025-11`, titled *Monthly Archive* and laid out like a monthly field report: cover photo and caption, the month in numbers, an "On the road" breakdown, a section per story with its facts and a time / scene / details log taken from the story blocks, notes from other stories' timelines, and that month's shop drops. *Download PDF* prints it. A month gets a volume when anything in `js/kiosk-content.js` is dated in it (`published`, a `bts.conditions` Date, a `timeline` entry like `Mar 2026`, a product's `added`); write a month up in `journal` to give it a cover, caption and note, or to add an empty month. The Atlas shows the same shelf.
- **Gallery** (`gallery.html`): every photograph, film and clip from every story, newest first. Search any word; sort by date, story, location or type; filter by type, story, issue (Journal volume), location, year and desk; collections (one per story and per volume) along the top. Raw Google Drive footage is left out until someone asks for it (*+ N raw clips* or Type › Raw footage). Filters live in the URL, e.g. `gallery.html?issue=2025-11&type=photo`.
- **Partner Hub** (`partner.html`): stores, brands and sponsors sign in with their KIOSK account and keep a profile, the pieces they list and their settings; live partners get a page at `partner.html?p=<handle>`. See **`docs/PARTNER_HUB.md`**.
- **Films** (`films.html`): the screening room, a billboard and streaming-style rows from `filmRows` and `films` in `js/kiosk-content.js`. Add `vimeo`, `youtube` or `video` to a film to make it playable; without one it shows "Coming soon".
- **Radio** (`radio.html`): curated playlists from Spotify (`spotify`), SoundCloud (`soundcloud`), Apple Music (`apple`) or a self-hosted MP3 (`audio`). The player docks at the bottom and keeps playing while people browse.
- **Lost & Found** (`lost-and-found.html`, was The Hunt): rare finds and pickup-only pieces on the map.
- The Garage page is gone; `/garage` redirects to the library and `/hunt` to Lost & Found (`_redirects`).

## Wireframe globe (Atlas header)

`js/kiosk-wireglobe.js` draws the Atlas header: an orthographic wireframe globe on a 2D canvas with the Natural Earth coastlines from `data/land-110m.geojson`, a graticule that gets finer as you zoom in (15° → 5° → 1°), and the cities in `LABELS` (`js/kiosk-earth.js`) as plot points with their labels. The featured stories are pinned at their `geo`. Swipe or drag to turn it, pinch, ctrl/⌘-scroll or the + / − buttons to zoom (up to 6×), double-tap to fly in, and the globe button to fly back to the stories. On phones, vertical swipes keep scrolling the page until you zoom in. No WebGL needed.

## Satellite Earth (Flights, home intro)

`js/kiosk-earth.js` draws a photographic globe in one WebGL2 pass: NASA Blue Marble (day), Black Marble city lights (night), a relief map for terrain shading, ocean glint, atmosphere and stars. The textures live in `images/earth/` (NASA Visible Earth, public domain; phones load `day-2k.jpg` and `night.jpg`, larger screens the `-4k` versions). Map labels (continents, oceans, cities) are `LABELS` in the same file. Without WebGL2 the header falls back to a dark gradient.

## Phone navigation

On phones the tab bar floats at the bottom with icons only (Home, Atlas, Films, Radio, Shop); a soft highlight glides to the current page, and More sits apart in its own circle and opens the menu. The menu fits one screen: every page (including Garage, Flights, Lost & Found and Stores) as a two-column grid of tiles with an icon and a one-line note, then a swipeable row of quick actions (Settings, Theme, Check in, Account, Cart) and a strip of small links, rising in one after another. While the menu is open the tab bar folds away and More turns into a close button, so nothing in the menu sits under it. Menu entries come from `NAV` plus `MENU` in `js/kiosk-glass.js`. On the home page the header pill stays hidden until the ꓘIOSK wordmark has flown up and formed the symbol inside it.

## Brand marks

- **K star** (`images/brand/kiosk-k-star.svg`): the KIOSK logo, a backwards K and a K back to back with a four-point star where they meet. It's the header logo, the footer logo, the favicon, the app icon, the share image and the email header. The SVG uses `currentColor` (it takes the text colour where it's placed; its path has `id="k-star"` for `<use>`). PNGs: `kiosk-k-star-white-1024.png`, `kiosk-k-star-black-1024.png`. The original artwork is `kiosk-k-star-reference.png`. Always call it the K star.
- **Favicon, app icons and share image** are drawn from the K star: `images/favicon.svg`, `favicon.ico` (16/32/48), `favicon-32.png`, `favicon-48.png`, `webclip.png`, `images/app/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and `images/og-kiosk.png` (1200×630, the `og:image`). Pages link them with `?v=kstar` so browsers drop the old icon; change that tag if you redraw them.
- **Retired:** the earlier symbol (`kiosk-symbol*.svg/png`, `kiosk-lockup-reference.png`) and the box logos (`KiosKBoxLogo.png`, `KiosK-BOX-Logo-NO-BG.jpg`, `Wht-Logo*.png`) are kept for reference but no longer used on the site. Garment artwork (the K mark and retro K prints in `js/kiosk-mockups.js`) is product design, not the logo, and is unchanged.
- **Wordmark**: ꓘIOSK, with the first K facing backwards (`.k-rk`).

