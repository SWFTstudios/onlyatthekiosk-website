/**
 * KIOSK — content model
 * ------------------------------------------------------------
 * Single source of truth for the Garage (stories: films, photo
 * galleries, interviews), Radio (phonk mixes) and the Vault /
 * Supply store. Every page reads window.KIOSK_CONTENT.
 *
 * To publish a new story: copy a block in `features`, change the
 * slug, drop media into /images/garage/<slug>/ and fill the fields.
 * Anything left empty is simply hidden on the page.
 *
 * MEDIA
 *   image    cover image            'images/garage/<slug>/cover.webp'
 *   gallery  slideshow frames       [{ src, caption, meta }]
 *   video    self-hosted film       'videos/garage/<slug>.mp4'
 *   embed    hosted film            'https://www.youtube.com/embed/<id>' or Vimeo player URL
 *   poster   film poster frame
 *
 * STORY (blog-style body)
 *   story    ordered blocks: { type: 'text' | 'quote' | 'image' | 'heading', ... }
 *   subjects people / machines featured in the film
 *   palette  colour guide           [{ name, hex, note }]
 *   bts      behind the scenes      { crew, gear, conditions, notes, frames }
 *
 * SHOP THE LOOK
 *   season + vibes + palette names are matched against product tags,
 *   and anything listed in `products` is pinned first.
 *
 * Tones (placeholder plates while media is in post):
 *   'sodium' | 'chrome' | 'desert' | 'ice' | 'ember' | 'graphite' | 'moss'
 *
 * Full walkthrough: docs/CONTENT_GUIDE.md
 */
window.KIOSK_CONTENT = {
  issue: {
    number: '01',
    title: 'Hudson Line',
    dek: 'Our first projects: Andy’s Q50, Moses’s R1M and a Lunar New Year meet. Shot on location, scored in phonk.',
    // Optional looping hero reel (muted, autoplay). Empty → lead story's cover image.
    reel: '',
    reelPoster: '',
    lead: 'andy-q50',
  },

  /* ----------------------------------------------------------
   * GARAGE — every shoot is a story
   * Source footage: Google Drive › RollerReels Video Files
   * -------------------------------------------------------- */
  features: [
    {
      slug: 'andy-q50',
      type: 'car',
      format: 'film',
      year: '',
      make: 'Infiniti',
      model: 'Q50',
      code: 'Q50',
      title: 'Real Slummy',
      tagline: 'Low, black and rolling across the Hudson.',
      excerpt: 'Andy’s Q50 — dropped low on polished wheels — over one late-November afternoon: rollers across the bridge, the parkway through bare oaks, and statics below a stone spillway.',
      era: '',
      season: 'fall',
      vibes: ['daylight', 'clean', 'urban', 'autumn'],
      location: 'Bridge + parkway rollers',
      city: 'Hudson Valley',
      country: 'NY',
      coords: '',
      shotOn: 'Sony A7C II',
      lens: 'Sigma 28–70mm f/2.8 · Sony FE 50mm f/1.8',
      runtime: '',
      published: '2025-11-28',
      tone: 'graphite',
      tags: ['Stance', 'Rollers', 'Film'],
      media: ['photo', 'film'],
      specs: [
        { label: 'Car', value: 'Infiniti Q50' },
        { label: 'Stance', value: 'Lowered' },
        { label: 'Wheels', value: 'Polished multi-spoke' },
        { label: 'Brakes', value: 'Gold calipers' },
      ],
      subjects: [
        { name: 'Andy', role: 'Owner · Driver', bio: '' },
        { name: 'The Q50', role: 'Machine', bio: 'Black Infiniti Q50 on polished multi-spoke wheels with gold calipers and a front lip.' },
      ],
      owner: { name: 'Andy', quote: '' },
      story: [
        { type: 'text', lead: 'Noon, on the bridge.', body: 'We opened with rollers across the Hudson — camera car alongside, 1/50 s at f/8 so the cables smear and the car stays sharp.' },
        { type: 'image', src: 'images/garage/andy-q50/02.webp', caption: 'Bridge roller · 12:07 · 28mm · 1/50 · f/8' },
        { type: 'text', lead: 'Then the parkway.', body: 'Late-November light through bare oaks, guard rails blurring past at the same slow shutter.' },
        { type: 'text', lead: 'Statics, 1 p.m.', body: 'Switched to the 50mm wide open for the parked shots — out on the grass, then low against a stone spillway.' },
        { type: 'image', src: 'images/garage/andy-q50/12.webp', caption: 'Spillway static · 13:34 · 50mm · f/1.8' },
      ],
      author: 'RollerReels',
      // Blog chapters: dictate a chapter and it gets typed into `body`.
      // Empty chapters stay hidden (preview them with story.html?s=<slug>&draft=1).
      chapters: [
        { id: 'meeting-andy', heading: 'Meeting Andy', prompt: 'How did you and Andy link up, and what made the Q50 worth a shoot?', body: '' },
        { id: 'the-car', heading: 'The Q50', prompt: 'What has been done to the car — stance, wheels, gold calipers? What makes it Andy’s?', body: '' },
        { id: 'the-route', heading: 'Why the bridge and the parkway', prompt: 'Why this route? What was the plan going in?', body: '' },
        { id: 'on-the-day', heading: 'On the day', prompt: 'How did the day go — the rollers, the statics by the spillway, anything that went wrong or right?', body: '' },
        { id: 'cutting-real-slummy', heading: 'Cutting “Real Slummy”', prompt: 'How did the edit come together — the music, the pacing, the name?', body: '' },
        { id: 'whats-next', heading: 'What’s next', prompt: 'What’s next for Andy, the car or the series?', body: '' },
      ],
      palette: [
        { name: 'Obsidian', hex: '#0b0b0e', note: 'Paint in full sun' },
        { name: 'Gunmetal', hex: '#313235', note: 'Shadows + tyre walls' },
        { name: 'Bridge Steel', hex: '#5d6c79', note: 'Cable-stayed span' },
        { name: 'Hudson Blue', hex: '#3b6b92', note: 'Late-November sky' },
        { name: 'Oak Brown', hex: '#87633f', note: 'Bare oaks on the parkway' },
        { name: 'Tail Red', hex: '#ae1518', note: 'Rear lights' },
      ],
      bts: {
        crew: [{ role: 'Photo + video', name: 'RollerReels' }],
        gear: ['Sony A7C II', 'Sigma 28–70mm f/2.8 DG DN | C', 'Sony FE 50mm f/1.8', 'DJI Osmo Pocket 3', 'Drone', '360 camera'],
        conditions: [
          { label: 'Date', value: '28 Nov 2025' },
          { label: 'First frame', value: '12:06' },
          { label: 'Last frame', value: '13:34' },
          { label: 'Rollers', value: '1/50 · f/8 · ISO 100' },
          { label: 'Statics', value: '1/4000 · f/1.8 · ISO 64' },
        ],
        notes: 'Stills edited in Lightroom Classic. Video captured on Osmo Pocket 3, drone and 360 — the cut is “Real Slummy”.',
        frames: [],
        // Raw Osmo Pocket 3 proxy clips from the shoot folder, muted loops.
        clips: [
          { src: 'images/garage/andy-q50/bts/raw-0040.mp4', webm: 'images/garage/andy-q50/bts/raw-0040.webm', poster: 'images/garage/andy-q50/bts/raw-0040.webp', caption: 'On the spillway bridge', meta: 'Osmo Pocket 3 · 12:52 · raw' },
          { src: 'images/garage/andy-q50/bts/raw-0067.mp4', webm: 'images/garage/andy-q50/bts/raw-0067.webm', poster: 'images/garage/andy-q50/bts/raw-0067.webp', caption: 'Low pass in the lot', meta: 'Osmo Pocket 3 · 13:46 · raw' },
        ],
      },
      timeline: [
        { year: 'Nov 2025', label: 'Shot in the Hudson Valley' },
        { year: 'Mar 2026', label: 'Final cut: Real Slummy' },
        { year: 'Issue 01', label: 'Published on KIOSK' },
      ],
      interview: [],
      image: 'images/garage/andy-q50/01.webp',
      focus: '62% 78%',   // object-position used when the cover is cropped (cards)
      poster: 'images/garage/andy-q50/01.webp',
      gallery: [
        { src: 'images/garage/andy-q50/01.webp', caption: 'Bridge roller', meta: 'A7C II · 39mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/02.webp', caption: 'Bridge roller, wide', meta: 'A7C II · 28mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/03.webp', caption: 'Bridge roller, three-quarter', meta: 'A7C II · 28mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/04.webp', caption: 'Through the cables', meta: 'A7C II · 39mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/05.webp', caption: 'Off the bridge', meta: 'A7C II · 28mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/06.webp', caption: 'Parkway, river side', meta: 'A7C II · 41mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/07.webp', caption: 'Parkway, head-on', meta: 'A7C II · 57mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/08.webp', caption: 'Parkway, long lens', meta: 'A7C II · 54mm · 1/50 · f/9 · ISO 100' },
        { src: 'images/garage/andy-q50/09.webp', caption: 'Profile on the grass', meta: 'A7C II · 50mm · 1/4000 · f/1.8 · ISO 64' },
        { src: 'images/garage/andy-q50/10.webp', caption: 'Face-on', meta: 'A7C II · 50mm · 1/4000 · f/1.8 · ISO 64' },
        { src: 'images/garage/andy-q50/11.webp', caption: 'Face-on, warm', meta: 'A7C II · 50mm · 1/4000 · f/1.8 · ISO 64' },
        { src: 'images/garage/andy-q50/12.webp', caption: 'Below the spillway', meta: 'A7C II · 50mm · 1/1250 · f/1.8 · ISO 100' },
        { src: 'images/garage/andy-q50/13.webp', caption: 'Bridge roller, cables overhead', meta: 'A7C II · 39mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/14.webp', caption: 'Coming off the bridge', meta: 'A7C II · 35mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/15.webp', caption: 'Rear roller, sound wall', meta: 'A7C II · 38mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/16.webp', caption: 'Rear roller, low sun', meta: 'A7C II · 32mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/17.webp', caption: 'Parkway, guardrail', meta: 'A7C II · 41mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/18.webp', caption: 'Parkway, open road', meta: 'A7C II · 36mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/19.webp', caption: 'Parkway pan, wide', meta: 'A7C II · 28mm · 1/50 · f/9 · ISO 100' },
        { src: 'images/garage/andy-q50/20.webp', caption: 'Parkway pan, tree line', meta: 'A7C II · 54mm · 1/50 · f/9 · ISO 100' },
        { src: 'images/garage/andy-q50/21.webp', caption: 'Parkway, river bend', meta: 'A7C II · 48mm · 1/50 · f/9 · ISO 100' },
        { src: 'images/garage/andy-q50/22.webp', caption: 'Side profile, gold calipers', meta: 'A7C II · 55mm · 1/50 · f/9 · ISO 100' },
        { src: 'images/garage/andy-q50/23.webp', caption: 'Rear three-quarter on the grass', meta: 'A7C II · 50mm · 1/4000 · f/1.8 · ISO 64' },
      ],
      video: '',
      // Google Drive preview of "Andy Q50 Real Slummy3.mp4". Plays once the file is
      // shared as "Anyone with the link" — or swap for a YouTube/Vimeo embed URL.
      embed: 'https://drive.google.com/file/d/16vUQ0t8qtvoZeGsZ3rY-vWd1ibGrtyi3/preview',
      soundtrack: '',
      gradedWith: '',
      filmProduct: 'film-andy-q50',
      products: ['film-andy-q50', 'tee-hudson', 'lut-hudson-november'],
    },
    {
      slug: 'moses-r1m',
      type: 'motorcycle',
      format: 'gallery',
      year: '',
      make: 'Yamaha',
      model: 'YZF-R1M',
      code: 'R1M',
      title: 'Under the Bridge',
      tagline: 'Carbon, gold forks and the George Washington Bridge at dusk.',
      excerpt: 'Moses and his R1M, shot twice in April 2025 — a night run on the 16th, then last light under the George Washington Bridge on the 19th.',
      era: '',
      season: 'spring',
      vibes: ['urban', 'moody', 'clean', 'dusk'],
      location: 'George Washington Bridge',
      city: 'Hudson River',
      country: 'NY / NJ',
      coords: '',
      shotOn: 'iPhone 14 Pro',
      lens: '3× telephoto (77mm eq.)',
      runtime: '',
      published: '2025-04-19',
      tone: 'ice',
      tags: ['Superbike', 'Dusk', 'Photo story'],
      media: ['photo'],
      specs: [
        { label: 'Bike', value: 'Yamaha YZF-R1M' },
        { label: 'Finish', value: 'Carbon + black' },
        { label: 'Wheels', value: 'Blue' },
        { label: 'Forks', value: 'Gold' },
      ],
      subjects: [
        { name: 'Moses', role: 'Owner · Rider', bio: '' },
        { name: 'The R1M', role: 'Machine', bio: 'Yamaha YZF-R1M in carbon and black, on blue wheels with gold forks.' },
      ],
      owner: { name: 'Moses', quote: '' },
      story: [
        { type: 'text', lead: 'Two sessions.', body: 'We shot Moses and the R1M twice in one week of April 2025: a night run on the 16th, then dusk under the George Washington Bridge on the 19th.' },
        { type: 'text', lead: '6:57 p.m.', body: 'Parked on the yellow curb with the bridge tower behind — phone on the 3× lens to stack the bike against the span.' },
        { type: 'image', src: 'images/garage/moses-r1m/07.webp', caption: 'Helmet on the rocks, Midtown across the river · 19:05' },
        { type: 'text', lead: 'The helmet got its own frames.', body: 'Set on the rocks at the water’s edge with the Midtown skyline lined up between the bridge and the river.' },
        { type: 'text', lead: '7:10 p.m.', body: 'Last frames as the light went flat — carbon, gold forks and the blue wheels holding the colour.' },
      ],
      author: 'RollerReels',
      // Blog chapters: dictate a chapter and it gets typed into `body`.
      // Empty chapters stay hidden (preview them with story.html?s=<slug>&draft=1).
      chapters: [
        { id: 'meeting-moses', heading: 'Meeting Moses', prompt: 'How did you and Moses meet, and why the R1M?', body: '' },
        { id: 'the-r1m', heading: 'The R1M', prompt: 'What should people know about the bike — the carbon, the gold forks, the blue wheels?', body: '' },
        { id: 'night-run', heading: 'The night run — 16 April', prompt: 'What happened on the night session?', body: '' },
        { id: 'dusk-at-the-bridge', heading: 'Dusk at the bridge — 19 April', prompt: 'Why the George Washington Bridge, and how did the dusk shoot go?', body: '' },
        { id: 'whats-next', heading: 'What’s next', prompt: 'What’s next for Moses and the bike?', body: '' },
      ],
      palette: [
        { name: 'Carbon', hex: '#14181d', note: 'Fairings + tank' },
        { name: 'Fork Gold', hex: '#9a782e', note: 'Front forks' },
        { name: 'Racing Blue', hex: '#364679', note: 'Wheels + badge' },
        { name: 'Bridge Grey', hex: '#a8aba8', note: 'Tower steel' },
        { name: 'Hudson Haze', hex: '#d1cec7', note: 'Dusk sky' },
        { name: 'Livery Yellow', hex: '#a5ab1e', note: 'Helmet' },
      ],
      bts: {
        crew: [{ role: 'Photo + video', name: 'RollerReels' }],
        gear: ['iPhone 14 Pro (3× telephoto)', 'DJI Osmo (via DJI Mimo)', 'DJI camera (night session)', 'Nikon (night session stills)'],
        conditions: [
          { label: 'Session 1', value: '16 Apr 2025 · 21:44–23:19' },
          { label: 'Session 2', value: '19 Apr 2025 · 18:57–19:10' },
          { label: 'Stills', value: 'f/2.8 · ISO 250–500' },
        ],
        notes: 'Session 2 stills edited in Lightroom Classic. Footage from both sessions is in the edit.',
        frames: [],
      },
      timeline: [
        { year: '16 Apr 2025', label: 'Night session' },
        { year: '19 Apr 2025', label: 'Dusk at the GWB' },
        { year: 'Issue 01', label: 'Published on KIOSK' },
      ],
      interview: [],
      image: 'images/garage/moses-r1m/01.webp',
      focus: '64% 70%',
      poster: 'images/garage/moses-r1m/01.webp',
      gallery: [
        { src: 'images/garage/moses-r1m/01.webp', caption: 'Bridge tower, three-quarter', meta: 'iPhone 14 Pro · 3× · 1/25 · f/2.8 · ISO 500' },
        { src: 'images/garage/moses-r1m/02.webp', caption: 'On the yellow curb', meta: 'iPhone 14 Pro · 3× · 1/105 · f/2.8 · ISO 250' },
        { src: 'images/garage/moses-r1m/03.webp', caption: 'On the yellow curb, wider', meta: 'iPhone 14 Pro · 3× · 1/30 · f/2.8 · ISO 400' },
        { src: 'images/garage/moses-r1m/04.webp', caption: 'Front fairing', meta: 'iPhone 14 Pro · 3× · 1/15 · f/2.8 · ISO 500' },
        { src: 'images/garage/moses-r1m/05.webp', caption: 'Last light', meta: 'iPhone 14 Pro · 3× · 1/25 · f/2.8 · ISO 500' },
        { src: 'images/garage/moses-r1m/06.webp', caption: 'Tank detail, bridge behind', meta: 'iPhone 14 Pro · 1× · 1/60 · f/1.8 · ISO 640' },
        { src: 'images/garage/moses-r1m/07.webp', caption: 'Helmet + Midtown', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 320' },
        { src: 'images/garage/moses-r1m/08.webp', caption: 'Helmet + Midtown, tighter', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 250' },
        { src: 'images/garage/moses-r1m/09.webp', caption: 'Helmet + tower', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 250' },
        { src: 'images/garage/moses-r1m/10.webp', caption: 'Helmet, river level', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 250' },
      ],
      video: '',
      embed: '',
      soundtrack: '',
      gradedWith: '',
      filmProduct: '',
      products: ['cap-kmark', 'lut-bridge-dusk'],
    },
    {
      slug: 'lunar-new-year-meet',
      type: 'car',
      format: 'film',
      year: '',
      make: '',
      model: 'Lunar New Year Meet',
      code: 'LNY',
      title: 'Lunar New Year Meet',
      tagline: 'A Lunar New Year car meet — the cut is in the edit.',
      excerpt: 'Seventy-plus clips from a Lunar New Year car meet on 1 March 2026 — the cut is in the edit now.',
      era: '',
      season: 'winter',
      vibes: ['daylight', 'urban'],
      location: 'Car meet',
      city: '',
      country: '',
      coords: '',
      shotOn: 'DJI',
      lens: '',
      runtime: '',
      published: '2026-03-01',
      tone: 'ember',
      tags: ['Car meet', 'Film', 'In the edit'],
      media: ['film'],
      specs: [
        { label: 'Clips', value: '70+' },
        { label: 'Date', value: '1 Mar 2026' },
        { label: 'Rolling', value: '11:15–12:51' },
        { label: 'Camera', value: 'DJI' },
      ],
      subjects: [],
      owner: { name: '', quote: '' },
      story: [
        { type: 'text', lead: 'In the edit.', body: 'Seventy-plus clips from a Lunar New Year car meet, rolling from 11:15 to 12:51 on 1 March 2026. The film and stills land here when the cut is done.' },
      ],
      author: 'RollerReels',
      // Blog chapters: dictate a chapter and it gets typed into `body`.
      // Empty chapters stay hidden (preview them with story.html?s=<slug>&draft=1).
      chapters: [
        { id: 'the-meet', heading: 'The meet', prompt: 'Where was it, who put it on, and what was the energy like?', body: '' },
        { id: 'standouts', heading: 'The builds that stood out', prompt: 'Which cars caught your eye and why?', body: '' },
        { id: 'the-people', heading: 'The people', prompt: 'Who did you meet or talk to?', body: '' },
        { id: 'cutting-the-film', heading: 'Cutting the film', prompt: 'How is the edit coming together?', body: '' },
      ],
      palette: [],
      bts: {
        crew: [{ role: 'Video', name: 'RollerReels' }],
        gear: ['DJI camera'],
        conditions: [{ label: 'Date', value: '1 Mar 2026' }, { label: 'Rolling', value: '11:15–12:51' }],
        notes: '',
        frames: [],
      },
      timeline: [
        { year: '1 Mar 2026', label: 'Shot' },
        { year: 'Soon', label: 'Final cut' },
      ],
      interview: [],
      image: '', poster: '', gallery: [], video: '', embed: '',
      soundtrack: '',
      gradedWith: '',
      filmProduct: '',
      products: [],
    },
    {
      slug: 'doom-racing-prospect-meet',
      type: 'meet',
      format: 'film',
      year: '',
      make: 'Doom Racing ×',
      model: 'Prospect Powersports',
      code: 'DOOM',
      title: 'Doom Racing × Prospect Powersports',
      tagline: 'A summer meet that ran from golden hour into the night — the cut is in the edit.',
      excerpt: 'Around eighty clips from the Doom Racing × Prospect Powersports meet on 15 August 2025, rolling from 6 p.m. to half past nine.',
      era: '',
      season: 'summer',
      vibes: ['night', 'golden-hour', 'urban'],
      location: 'Prospect Powersports',
      city: '',
      country: '',
      coords: '',
      shotOn: 'DJI',
      lens: '',
      runtime: '',
      published: '2025-08-15',
      tone: 'sodium',
      tags: ['Meet', 'Film', 'In the edit'],
      media: ['film'],
      specs: [
        { label: 'Clips', value: '~80' },
        { label: 'Date', value: '15 Aug 2025' },
        { label: 'Rolling', value: '18:00–21:31' },
        { label: 'Camera', value: 'DJI' },
      ],
      subjects: [],
      owner: { name: '', quote: '' },
      story: [
        { type: 'text', lead: 'In the edit.', body: 'Around eighty clips from the Doom Racing × Prospect Powersports meet on 15 August 2025, from 6 p.m. until 9:31. The film and stills land here when the cut is done.' },
      ],
      author: 'RollerReels',
      // Blog chapters: dictate a chapter and it gets typed into `body`.
      // Empty chapters stay hidden (preview them with story.html?s=<slug>&draft=1).
      chapters: [
        { id: 'the-meet', heading: 'The meet', prompt: 'What was the meet, who put it on, and how did you end up shooting it?', body: '' },
        { id: 'doom-racing', heading: 'Doom Racing × Prospect Powersports', prompt: 'Who are Doom Racing and Prospect Powersports, and how are they connected?', body: '' },
        { id: 'the-machines', heading: 'The machines', prompt: 'Which builds stood out and why?', body: '' },
        { id: 'into-the-night', heading: 'Golden hour into the night', prompt: 'How did the light change from 6 p.m. to 9:30, and how did you shoot it?', body: '' },
        { id: 'cutting-the-film', heading: 'Cutting the film', prompt: 'How is the edit coming together?', body: '' },
      ],
      palette: [],
      bts: {
        crew: [{ role: 'Video', name: 'RollerReels' }],
        gear: ['DJI camera'],
        conditions: [{ label: 'Date', value: '15 Aug 2025' }, { label: 'Rolling', value: '18:00–21:31' }],
        notes: '',
        frames: [],
      },
      timeline: [
        { year: '15 Aug 2025', label: 'Shot' },
        { year: 'Soon', label: 'Final cut' },
      ],
      interview: [],
      image: '', poster: '', gallery: [], video: '', embed: '',
      soundtrack: '',
      gradedWith: '',
      filmProduct: '',
      products: [],
    },
  ],

  /* ----------------------------------------------------------
   * VIMEO — films hosted on Vimeo. Title, thumbnail and length are
   * read from Vimeo when the page loads, so only the ID is needed.
   * Private (unlisted) links carry a hash: vimeo.com/<id>/<hash>.
   * Set `title` to override Vimeo's, and `story` to the slug of the
   * shoot it belongs to (adds a "Read the story" link).
   * -------------------------------------------------------- */
  vimeo: [
    { id: '1212483051', hash: 'f428c5372f', title: '', story: '' },
    { id: '1066971784', hash: '', title: '', story: '' },
  ],

  /* ----------------------------------------------------------
   * RADIO — your phonk playlists on Spotify.
   * `spotify` is the playlist ID from its share link
   * (open.spotify.com/playlist/<ID>) and renders Spotify's player.
   * Add `audio` (an MP3 URL) to play a self-hosted mix instead.
   * Radio is free to listen to: nothing here is sold.
   * -------------------------------------------------------- */
  mixes: [
    {
      slug: 'phonk-n95',
      title: 'Phonk nº 95',
      volume: 'Playlist 01',
      length: '',
      bpm: '',
      mood: 'Phonk · curated on Spotify',
      tone: 'graphite',
      spotify: '1fO87QEdH8Y3WIVjAjDARS',
      audio: '',
      cover: 'https://mosaic.scdn.co/640/ab67616d0000b27303a253cffd6d9e556ef4eec5ab67616d0000b27365fc93b5c819602262be24d4ab67616d0000b2738b78cb4ebf3f1719d61d0f4eab67616d0000b273c465a9daacf171835b602cbd',
      tracks: [],
    },
    {
      slug: 'keifetgr33n-phonk',
      title: 'Keifetgr33n Phonk',
      volume: 'Playlist 02',
      length: '',
      bpm: '',
      mood: 'Phonk · curated on Spotify · explicit',
      tone: 'moss',
      spotify: '6FhSH1DSCzAspiCtAnMAZk',
      audio: '',
      cover: 'https://mosaic.scdn.co/640/ab67616d0000b2735f154e86d6078ba8a0ff918eab67616d0000b2736b4118a6648f973cf8c587a3ab67616d0000b2739079689dc439fa4361b49f82ab67616d0000b273d1476c299b9f86960612fc9b',
      tracks: [],
    },
  ],

  /* ----------------------------------------------------------
   * SHOP — KIOSK Supply (skateshop) + digital goods
   *
   * Every product renders a vector mockup from `mockup` until you
   * set `image` to a real product photo.
   *
   * colorways: each one is { name, garment, ink, shopifyHandle? }.
   *   Name colourways after story palette colours ("Obsidian",
   *   "Racing Blue") and "Shop the look" will match them and
   *   preselect that colourway on the story page.
   *
   * status:
   *   'available' → Buy (links to /products/<shopifyHandle> of the
   *                  selected colourway, or `href`)
   *   'soon'      → Notify me (joins the Dispatch list)
   *
   * badge: short label on the tile — 'New', 'Issue 01', 'Classic'…
   * seasons / vibes / colors: extra tags for "Shop the look".
   * -------------------------------------------------------- */
  categories: [
    { id: 'apparel', label: 'Apparel', kind: 'physical' },
    { id: 'headwear', label: 'Headwear', kind: 'physical' },
    { id: 'skate', label: 'Skate', kind: 'physical' },
    { id: 'accessories', label: 'Accessories', kind: 'physical' },
    { id: 'films', label: 'Films', kind: 'digital' },
    { id: 'luts', label: 'LUT Packs', kind: 'digital' },
  ],

  products: [
    /* ---- Apparel ---- */
    {
      id: 'tee-hudson', category: 'apparel', title: 'Hudson Line Tee', price: 42, badge: 'Issue 01', added: '2026-10-01',
      detail: 'Heavyweight cotton · boxy fit · screen print',
      mockup: { type: 'tee', print: 'hudson' },
      colorways: [
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb', image: 'images/shop/3d/tee-hudson-0.webp' },
        { name: 'Hudson Blue', garment: '#3b6b92', ink: '#f2f0eb', image: 'images/shop/3d/tee-hudson-1.webp' },
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214', image: 'images/shop/3d/tee-hudson-2.webp' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'spring'], vibes: ['daylight', 'urban', 'clean'], colors: [],
    },
    {
      id: 'ls-issue01', category: 'apparel', title: 'Issue 01 Longsleeve', price: 55, badge: 'New', added: '2026-10-01',
      detail: 'Midweight cotton · sleeve hit · screen print',
      mockup: { type: 'longsleeve', print: 'issue', sleevePrint: 'HUDSON LINE' },
      colorways: [
        { name: 'Fork Gold', garment: '#9a782e', ink: '#121214' },
        { name: 'Carbon', garment: '#14181d', ink: '#9a782e' },
        { name: 'Bridge Steel', garment: '#5d6c79', ink: '#f2f0eb' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'spring'], vibes: ['urban', 'moody', 'dusk'], colors: [],
    },
    {
      id: 'hoodie-garage', category: 'apparel', title: 'Midnight Garage Hoodie', price: 98, badge: 'New', added: '2026-09-28',
      detail: 'Brushed fleece · kangaroo pocket · arch print',
      mockup: { type: 'hoodie', print: 'arch' },
      colorways: [
        { name: 'Bridge Grey', garment: '#a8aba8', ink: '#121214', image: 'images/shop/3d/hoodie-garage-0.webp' },
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb', image: 'images/shop/3d/hoodie-garage-1.webp' },
        { name: 'Oak Brown', garment: '#6e5034', ink: '#ece9e1', image: 'images/shop/3d/hoodie-garage-2.webp' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter'], vibes: ['urban', 'autumn', 'moody'], colors: [],
    },
    {
      id: 'crew-cafe', category: 'apparel', title: 'Café Racer Club Crewneck', price: 85, badge: 'New', added: '2026-09-20',
      detail: 'Loopback fleece · rib trims',
      mockup: { type: 'crew', print: 'cafe' },
      colorways: [
        { name: 'Tail Red', garment: '#6e1114', ink: '#e9dcc4' },
        { name: 'Hudson Haze', garment: '#d1cec7', ink: '#6e1114' },
        { name: 'Gunmetal', garment: '#313235', ink: '#e9dcc4' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['vintage', 'craft', 'workshop', 'heritage'], colors: [],
    },
    {
      id: 'tee-phonk', category: 'apparel', title: 'KIOSK Radio Tee', price: 42, badge: '', added: '2026-09-12',
      detail: 'Heavyweight cotton · regular fit',
      mockup: { type: 'tee', print: 'phonk' },
      colorways: [
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214', image: 'images/shop/3d/tee-phonk-0.webp' },
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb', image: 'images/shop/3d/tee-phonk-1.webp' },
        { name: 'Racing Blue', garment: '#364679', ink: '#f2f0eb', image: 'images/shop/3d/tee-phonk-2.webp' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['summer', 'spring'], vibes: ['urban', 'clean', 'dusk'], colors: [],
    },
    {
      id: 'ess-hoodie', category: 'apparel', title: 'Essential Hoodie #001', price: 89.99, badge: 'Classic', added: '2025-11-01',
      detail: 'The original KIOSK hoodie',
      mockup: { type: 'hoodie', print: 'kmark', printW: 56 },
      colorways: [
        { name: 'Black', garment: '#141414', ink: '#f2f0eb', shopifyHandle: '001-black-hoodie', image: 'images/shop/3d/ess-hoodie-0.webp' },
        { name: 'White', garment: '#f1efe9', ink: '#141414', shopifyHandle: '001-white-hoodie', image: 'images/shop/3d/ess-hoodie-1.webp' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'available', shopifyHandle: '001-black-hoodie', href: '', image: '',
      seasons: ['fall', 'winter'], vibes: ['clean', 'urban', 'night'], colors: ['Obsidian', 'Carbon'],
    },
    {
      id: 'ess-tee', category: 'apparel', title: 'Essential Tee #001', price: 39.99, badge: 'Classic', added: '2025-11-01',
      detail: 'The original KIOSK tee',
      mockup: { type: 'tee', print: 'wordmark' },
      colorways: [
        { name: 'Black', garment: '#141414', ink: '#f2f0eb', shopifyHandle: '001-black-tshirt', image: 'images/shop/3d/ess-tee-0.webp' },
        { name: 'White', garment: '#f1efe9', ink: '#141414', shopifyHandle: '001-white-tshirt', image: 'images/shop/3d/ess-tee-1.webp' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'available', shopifyHandle: '001-black-tshirt', href: '', image: '',
      seasons: ['summer', 'spring'], vibes: ['clean', 'urban', 'daylight'], colors: ['Obsidian', 'Hudson Haze'],
    },

    /* ---- Headwear ---- */
    {
      id: 'cap-kmark', category: 'headwear', title: 'K Mark 6-Panel Cap', price: 38, badge: 'New', added: '2026-09-25',
      detail: 'Unstructured cotton twill · strapback',
      mockup: { type: 'cap', print: 'kmark' },
      colorways: [
        { name: 'Carbon', garment: '#14181d', ink: '#f2f0eb' },
        { name: 'Hudson Haze', garment: '#d1cec7', ink: '#14181d' },
        { name: 'Racing Blue', garment: '#364679', ink: '#f2f0eb' },
      ],
      sizes: ['One size'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['summer', 'spring'], vibes: ['clean', 'daylight', 'urban', 'dusk'], colors: [],
    },
    {
      id: 'beanie-night', category: 'headwear', title: 'Night Shift Beanie', price: 32, badge: '', added: '2026-09-18',
      detail: 'Rib knit · woven patch',
      mockup: { type: 'beanie', print: 'wordmark' },
      colorways: [
        { name: 'Fork Gold', garment: '#9a782e', ink: '#121214' },
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
        { name: 'Bridge Grey', garment: '#a8aba8', ink: '#121214' },
      ],
      sizes: ['One size'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter'], vibes: ['autumn', 'moody', 'urban'], colors: [],
    },

    /* ---- Skate ---- */
    {
      id: 'deck-hudson', category: 'skate', title: 'Hudson Line Deck', price: 70, badge: 'Issue 01', added: '2026-10-01',
      detail: '7-ply maple · medium concave',
      mockup: { type: 'deck', print: 'hudson', deckText: 'HUDSON', deckSub: 'line — issue 01' },
      colorways: [
        { name: 'Racing Blue', garment: '#364679', ink: '#9a782e' },
        { name: 'Obsidian', garment: '#121214', ink: '#e4e1da' },
        { name: 'Hudson Haze', garment: '#d1cec7', ink: '#364679' },
      ],
      sizes: ['8.0"', '8.25"', '8.5"'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'spring'], vibes: ['urban', 'dusk', 'clean'], colors: [],
    },
    {
      id: 'deck-checker', category: 'skate', title: 'Checker Deck', price: 65, badge: '', added: '2026-09-10',
      detail: '7-ply maple · medium concave',
      mockup: { type: 'deck', print: 'checker' },
      colorways: [
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' },
        { name: 'Obsidian', garment: '#121214', ink: '#e4e1da' },
      ],
      sizes: ['8.0"', '8.25"', '8.5"'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['summer', 'spring'], vibes: ['clean', 'urban', 'vintage'], colors: [],
    },
    {
      id: 'socks-pit', category: 'skate', title: 'Pit Crew Socks', price: 16, badge: '', added: '2026-09-10',
      detail: 'Cushioned crew socks · 2 stripes',
      mockup: { type: 'socks' },
      colorways: [
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' },
        { name: 'Carbon', garment: '#14181d', ink: '#9a782e' },
      ],
      sizes: ['S/M', 'L/XL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: [], vibes: ['clean', 'urban', 'workshop'], colors: [],
    },

    /* ---- Accessories ---- */
    {
      id: 'tote-dispatch', category: 'accessories', title: 'Dispatch Tote', price: 28, badge: '', added: '2026-09-05',
      detail: 'Heavy canvas · arch print',
      mockup: { type: 'tote', print: 'arch' },
      colorways: [
        { name: 'Hudson Haze', garment: '#d1cec7', ink: '#121214' },
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
      ],
      sizes: [],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['spring', 'summer'], vibes: ['clean', 'coastal', 'daylight'], colors: [],
    },
    {
      id: 'acc-keytag', category: 'accessories', title: 'Garage Key Tag', price: 18, badge: '', added: '2026-09-05',
      detail: 'Anodised aluminium · laser-etched',
      mockup: { type: 'keytag' },
      colorways: [
        { name: 'Chrome', garment: '#c9ccd1', ink: '#141414' },
        { name: 'Fork Gold', garment: '#9a782e', ink: '#121214' },
      ],
      sizes: [],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: [], vibes: ['clean', 'workshop', 'craft'], colors: [],
    },
    {
      id: 'acc-sticker-pack', category: 'accessories', title: 'Issue 01 Sticker Pack', price: 10, badge: '', added: '2026-09-01',
      detail: '4 die-cut vinyl stickers',
      mockup: { type: 'stickers' },
      colorways: [{ name: 'Mixed', garment: '#ece9e1', ink: '#141414' }],
      sizes: [],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: [], vibes: ['jdm', 'urban', 'neon'], colors: [],
    },
    {
      id: 'acc-chain', category: 'accessories', title: 'Curb Chain #001', price: 69.99, badge: 'Classic', added: '2025-11-01',
      detail: 'Stainless steel · plated',
      mockup: { type: 'chain' },
      colorways: [
        { name: 'Gold', garment: '#c9a24a', ink: '#141414', shopifyHandle: '001-gold-chain' },
        { name: 'Silver', garment: '#b9bcc1', ink: '#141414', shopifyHandle: '001-silver-chain' },
      ],
      sizes: [],
      status: 'available', shopifyHandle: '001-gold-chain', href: '', image: '',
      seasons: ['summer'], vibes: ['golden-hour', 'warm', 'italian'], colors: ['Fork Gold'],
    },
    {
      id: 'acc-bracelet', category: 'accessories', title: 'Curb Bracelet #001', price: 49.99, badge: 'Classic', added: '2025-11-01',
      detail: 'Stainless steel · plated',
      mockup: { type: 'chain', rx: 82, ry: 82, links: 30, cy: 240, linkW: 10, linkT: 5 },
      colorways: [
        { name: 'Silver', garment: '#b9bcc1', ink: '#141414', shopifyHandle: '001-silver-bracelet' },
        { name: 'Gold', garment: '#c9a24a', ink: '#141414', shopifyHandle: '001-gold-bracelet' },
      ],
      sizes: [],
      status: 'available', shopifyHandle: '001-silver-bracelet', href: '', image: '',
      seasons: ['spring', 'summer'], vibes: ['clean', 'coastal', 'heritage'], colors: ['Bridge Grey', 'Hudson Haze'],
    },

    /* ---- Digital ---- */
    {
      id: 'film-andy-q50', category: 'films', title: 'Real Slummy — Andy’s Q50', price: 15, badge: 'Digital', added: '2026-10-01',
      detail: 'Full-res download · the Q50 film',
      mockup: { type: 'vhs', label: 'Real Slummy', sub: 'ANDY · Q50' },
      colorways: [{ name: 'Obsidian', garment: '#3b6b92', ink: '#efe9dc' }],
      sizes: [],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall'], vibes: ['daylight', 'urban', 'autumn'], colors: [],
    },
    {
      id: 'film-issue-01-anthology', category: 'films', title: 'Issue 01 — Hudson Line', price: 29, badge: 'Digital', added: '2026-10-01',
      detail: 'Every Issue 01 film as a download',
      mockup: { type: 'vhs', label: 'Hudson Line', sub: 'ISSUE 01' },
      colorways: [{ name: 'Asphalt', garment: '#141416', ink: '#efe9dc' }],
      sizes: [],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: [], vibes: [], colors: [],
    },
    {
      id: 'lut-hudson-november', category: 'luts', title: 'Hudson November LUTs', price: 29, badge: 'Digital', added: '2026-10-01',
      detail: '.cube · built from the Real Slummy palette',
      mockup: { type: 'lutbox', label: 'Hudson November', sub: 'ISSUE 01 · .CUBE', swatches: ['#0b0b0e', '#5d6c79', '#3b6b92', '#87633f', '#ae1518'] },
      colorways: [{ name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' }],
      sizes: [],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter'], vibes: ['daylight', 'autumn', 'clean'], colors: ['Bridge Steel', 'Hudson Blue', 'Oak Brown'],
    },
    {
      id: 'lut-bridge-dusk', category: 'luts', title: 'Bridge Dusk LUTs', price: 29, badge: 'Digital', added: '2026-10-01',
      detail: '.cube · built from the Under the Bridge palette',
      mockup: { type: 'lutbox', label: 'Bridge Dusk', sub: 'ISSUE 01 · .CUBE', swatches: ['#14181d', '#364679', '#9a782e', '#a8aba8', '#d1cec7'] },
      colorways: [{ name: 'Racing Blue', garment: '#364679', ink: '#f2f0eb' }],
      sizes: [],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['spring', 'fall'], vibes: ['dusk', 'urban', 'moody'], colors: ['Carbon', 'Bridge Grey', 'Fork Gold'],
    },
    {
      id: 'lut-vintage-stock', category: 'luts', title: 'Vintage Stock LUTs', price: 24, badge: 'Digital', added: '2026-08-20',
      detail: '8 film emulations · .cube',
      mockup: { type: 'lutbox', label: 'Vintage Stock', sub: '8 FILM LOOKS', swatches: ['#d9b59a', '#5a2e1b', '#a7a39a', '#4a1416', '#1b1f27'] },
      colorways: [{ name: 'Candy Brown', garment: '#5a2e1b', ink: '#e9dcc4' }],
      sizes: [],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['vintage', 'film-grain', 'heritage', 'craft'], colors: ['Portra Skin'],
    },
  ],
};
