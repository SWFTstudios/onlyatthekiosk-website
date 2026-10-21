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
  /* Why the kiosk (home): readers in their own words. Each one becomes a
   * slide (quote on one side, a lifestyle photo on the other) ahead of the
   * KIOSK's own lines. Only real quotes, with the reader's OK to print them:
   *   { quote: '…', name: 'Ama', place: 'Accra', role: 'Reader since Issue 01', image: 'images/…jpg', story: 'slug' }
   * image (or the story's photo) is optional; without one a story photo is used. */
  voices: [],

  issue: {
    number: '01',
    title: 'Hudson Line',
    dek: 'Our first projects: Andy’s Q50, Moses’s R1M and a Honda F4i in the shop. Shot on location, scored in phonk.',
    // Optional looping hero reel (muted, autoplay). Empty → lead story's cover image.
    reel: 'videos/kiosk-reel.mp4',              // full-screen cover video (muted loop)
    reelWebm: 'videos/kiosk-reel.webm',
    reelPoster: 'videos/kiosk-reel-poster.webp',
    // Full-screen hero slideshow (muted, autoplay; each slide plays once, then the next).
    // Each slide: src (mp4) + webm + poster, a kicker/title/caption, and the story it opens.
    // Empty → the single reel above.
    heroSlides: [
      { src: 'videos/hero/q50.mp4', webm: 'videos/hero/q50.webm', poster: 'videos/hero/q50-poster.webp', story: 'andy-q50', kicker: 'Automotive', title: 'Real Slummy', caption: 'Andy’s Q50 on the Hudson Line' },
      { src: 'videos/hero/r1m.mp4', webm: 'videos/hero/r1m.webm', poster: 'videos/hero/r1m-poster.webp', story: 'moses-r1m', kicker: 'Motorcycles', title: 'Under the Bridge', caption: 'Moses’ R1M under the George Washington Bridge' },
      { src: 'videos/hero/bts.mp4', webm: 'videos/hero/bts.webm', poster: 'videos/hero/bts-poster.webp', story: 'andy-q50', kicker: 'On set', title: 'Behind the scenes · Hudson Line', caption: 'Raw footage from the Q50 shoot' },
    ],
    lead: 'andy-q50',
    // Atlas globe on the home page: up to 4 featured stories, each
    // pinned at its `geo` ({ lat, lon } on the story). The first one carries
    // the hero slideshow. Empty → the lead and hero-slide stories.
    featured: ['andy-q50', 'moses-r1m', 'l0st-tapes', 'ksenia-r3-moses-r1m'],
  },

  /* ----------------------------------------------------------
   * THE JOURNAL — one volume a month (archive.html, archive.html?v=YYYY-MM)
   * Volumes build themselves from what's dated below: stories published
   * or shot that month, timeline milestones and shop drops (`added`).
   * Write a month up here to give it a cover, a caption and a note, or to
   * add a month that has nothing dated in it yet:
   *   '2026-10': { title: 'Lead line on the shelf', cover: 'images/…webp',
   *                caption: 'Under the cover photo. By Name.', note: 'A paragraph from the desk.' },
   * -------------------------------------------------------- */
  journal: {},

  /* ----------------------------------------------------------
   * GARAGE — every shoot is a story
   * Source footage: Google Drive › RollerReels Video Files
   * -------------------------------------------------------- */
  features: [
    {
      slug: 'andy-q50',
      desk: 'automotive',   // magazine department: travel | automotive | music | fashion
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
      geo: { lat: 41.71, lon: -73.93 },   // pin on the Atlas globe
      country: 'NY',
      coords: '',
      shotOn: 'Sony A7C II',
      lens: 'Sigma 28–70mm f/2.8 · Sony FE 50mm f/1.8',
      runtime: '',
      published: '2025-11-28',
      tone: 'graphite',
      tags: ['Stance', 'Rollers', 'Film'],
      media: ['photo', 'film'],
      machines: ['infiniti-q50'],   // spec sheets (MACHINES below)
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
        { src: 'images/garage/andy-q50/06.webp', caption: 'Parkway, river side', meta: 'A7C II · 41mm · 1/50 · f/8 · ISO 100', desk: 'travel' },
        { src: 'images/garage/andy-q50/07.webp', caption: 'Parkway, head-on', meta: 'A7C II · 57mm · 1/50 · f/8 · ISO 100' },
        { src: 'images/garage/andy-q50/08.webp', caption: 'Parkway, long lens', meta: 'A7C II · 54mm · 1/50 · f/9 · ISO 100' },
        { src: 'images/garage/andy-q50/09.webp', caption: 'Profile on the grass', meta: 'A7C II · 50mm · 1/4000 · f/1.8 · ISO 64' },
        { src: 'images/garage/andy-q50/10.webp', caption: 'Face-on', meta: 'A7C II · 50mm · 1/4000 · f/1.8 · ISO 64' },
        { src: 'images/garage/andy-q50/11.webp', caption: 'Face-on, warm', meta: 'A7C II · 50mm · 1/4000 · f/1.8 · ISO 64' },
        { src: 'images/garage/andy-q50/12.webp', caption: 'Below the spillway', meta: 'A7C II · 50mm · 1/1250 · f/1.8 · ISO 100', desk: 'travel' },
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
      desk: 'automotive',
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
      geo: { lat: 40.85, lon: -73.95 },   // pin on the Atlas globe
      country: 'NY / NJ',
      coords: '',
      shotOn: 'iPhone 14 Pro',
      lens: '3× telephoto (77mm eq.)',
      runtime: '',
      published: '2025-04-19',
      tone: 'ice',
      tags: ['Superbike', 'Dusk', 'Photo story'],
      media: ['photo'],
      machines: ['yamaha-r1m'],   // spec sheets (MACHINES below)
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
        // Raw clips (19 April evening, Osmo) played straight from Google Drive.
        driveClips: [
          { id: '1jvffEeJc3-3hK8An1i9Q5dPiiqAihHFl', clip: '01', time: '19:38:22' },
          { id: '1YxOLS0vrDkv_PUtbWDwIWm-bk5zCXL2F', clip: '02', time: '19:43:49' },
          { id: '1PyNlevKZZ-QiDYdf6-uYzDeymkFTelIr', clip: '03', time: '19:44:37' },
          { id: '1G6maCGnho1Cr1Pkiw0nllAcZ3yF9oGJv', clip: '04', time: '19:46:16' },
          { id: '1MrZ33zY6RV1jC-SgdkfvlGCzRImBipHs', clip: '05', time: '19:46:35' },
          { id: '1Nb0yYGHAJI55O6Eiq330ET3ExzFbgGUe', clip: '06', time: '19:47:42' },
          { id: '1QJNceOKspGFFfdUHN5HKF_H7SZPwBrPR', clip: '07', time: '19:50:12' },
          { id: '18I5Db1q9-2cEV4jGQfHg9f4qTxXM23f7', clip: '08', time: '19:52:40' },
          { id: '1qn26egea9kUqT8z7Cnrnr0yNZHeHtF8I', clip: '09', time: '19:52:40' },
          { id: '1ePs-eanZxb_p4vqtf8YqINsPEzjMAsvB', clip: '10', time: '19:58:46' },
          { id: '1CQ2kdEwsmQ1QxyOhnx3BM1NMviAcOW4q', clip: '11', time: '19:59:24' },
          { id: '195JLW-rzuJg1mDJu-aNSGQGostFmuuB_', clip: '12', time: '20:00:51' },
          { id: '1t_Kd_Kz4loTA5bNiIbzHfFibUDmA1huC', clip: '13', time: '20:01:33' },
          { id: '1g39pe_8jBTK-L8jPDEH8wlVy2CkY3wsy', clip: '14', time: '20:02:18' },
          { id: '15XgZ2zmvw2_vjO_dugVEYFD8s8C--hnr', clip: '15', time: '20:04:05' },
          { id: '1Li60p-5O-XmQE47m2NPuWSePMsMBaEcM', clip: '16', time: '20:07:40' },
          { id: '13SFcUhXHtYtVL3gFlhqI0qEY1zfzCACc', clip: '17', time: '20:08:00' }
        ],
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
        { src: 'images/garage/moses-r1m/01.webp', caption: 'Bridge tower, three-quarter', meta: 'iPhone 14 Pro · 3× · 1/25 · f/2.8 · ISO 500', desk: 'travel' },
        { src: 'images/garage/moses-r1m/02.webp', caption: 'On the yellow curb', meta: 'iPhone 14 Pro · 3× · 1/105 · f/2.8 · ISO 250' },
        { src: 'images/garage/moses-r1m/03.webp', caption: 'On the yellow curb, wider', meta: 'iPhone 14 Pro · 3× · 1/30 · f/2.8 · ISO 400' },
        { src: 'images/garage/moses-r1m/04.webp', caption: 'Front fairing', meta: 'iPhone 14 Pro · 3× · 1/15 · f/2.8 · ISO 500' },
        { src: 'images/garage/moses-r1m/05.webp', caption: 'Last light', meta: 'iPhone 14 Pro · 3× · 1/25 · f/2.8 · ISO 500', desk: 'travel' },
        { src: 'images/garage/moses-r1m/06.webp', caption: 'Tank detail, bridge behind', meta: 'iPhone 14 Pro · 1× · 1/60 · f/1.8 · ISO 640' },
        { src: 'images/garage/moses-r1m/07.webp', caption: 'Helmet + Midtown', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 320', desk: 'travel' },
        { src: 'images/garage/moses-r1m/08.webp', caption: 'Helmet + Midtown, tighter', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 250', desk: 'travel' },
        { src: 'images/garage/moses-r1m/09.webp', caption: 'Helmet + tower', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 250', desk: 'travel' },
        { src: 'images/garage/moses-r1m/10.webp', caption: 'Helmet, river level', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 250', desk: 'travel' },
        { src: 'images/garage/moses-r1m/11.webp', caption: 'Helmet, bridge and skyline', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 250', desk: 'travel' },
        { src: 'images/garage/moses-r1m/12.webp', caption: 'Helmet under the span', meta: 'iPhone 14 Pro · 3× · 1/40 · f/2.8 · ISO 250', desk: 'travel' },
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
      desk: 'automotive',
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
        // Raw footage played straight from Google Drive (files shared "Anyone with the link").
        driveClips: [
          { id: '1FJuVPPNSIFcCN-2aeWB6L0Q26TzDlOXG', clip: '0065', time: '11:15:55' },
          { id: '1u_qjymkOeedOzT2Up7vIr1Qqn7pOb77c', clip: '0066', time: '11:15:59' },
          { id: '1Euzy6A1Notx88bnIshx9fWWBruv_GqJU', clip: '0067', time: '11:17:04' },
          { id: '1ZLK8A7YlPaz5ndzwuv5vQJEluF0hQwP3', clip: '0068', time: '11:17:25' },
          { id: '1gYPwz-MJ2S0w276W7X8RfGwbmhJWoRnf', clip: '0069', time: '11:17:56' },
          { id: '1coybsiDZ6rGcL307R0MovD4b4V4d87Es', clip: '0070', time: '11:18:12' },
          { id: '1qRCyC1Xj8ilaJcHZpr1fJf1wZSBBkEi8', clip: '0071', time: '11:18:33' },
          { id: '1wJvMj4GAWEW0zxyC_9iyNeuDSljmdht7', clip: '0072', time: '11:19:10' },
          { id: '1TcxquZh9y12LxMrS3KhGZutjLFWXjQdK', clip: '0073', time: '11:19:39' },
          { id: '10GWOE8iIAF5KxZFOYczF8eI-7emW_0Mx', clip: '0074', time: '11:20:22' },
          { id: '13CK6J-Fv9xPWB1hWmTmCM5mTFFvANfbO', clip: '0075', time: '11:21:20' },
          { id: '1lUVF5REIcx-1XH4bNa4A2o2gdz23IK_Q', clip: '0076', time: '11:21:52' },
          { id: '1bKD9nEtpKMkOMlWjPs_U_L-HiMBK-H35', clip: '0077', time: '11:22:31' },
          { id: '1Ym1UztKevFPL--4NAO3Vx0NTbg3QMI-m', clip: '0078', time: '11:23:19' },
          { id: '1mNSXFXDDorueyxp231IK3MCO9RzdIm6s', clip: '0079', time: '11:23:40' },
          { id: '1LUhVYiuj1EljmigEsbJvDS7bu1tKyJQq', clip: '0080', time: '11:24:31' },
          { id: '1-vrIdbe7UTG2QHRPTeVUCpDdC-K2X1Av', clip: '0081', time: '11:24:55' },
          { id: '1HOoBbDUytDDBT5AzKu2YZmybmVLQNskG', clip: '0082', time: '11:25:25' },
          { id: '1o0JnGmQFl_PRMRG3d_4fMF6Jr3z1tJm2', clip: '0083', time: '11:26:40' },
          { id: '1PrNcW0Lxyy_A6ALWyMG_NtSdi-9WCu2S', clip: '0084', time: '11:27:59' },
          { id: '1A3BuS_vN-r86jxjfsOFYRQfY14YdBm-Q', clip: '0085', time: '11:28:50' },
          { id: '1EwszLxKIe7hi-_FRhXGtNppPTVFZD2ez', clip: '0086', time: '11:29:05' },
          { id: '1PsfPOo6myM39SWIRqqfMhMb-KSu5PDoi', clip: '0087', time: '11:29:45' },
          { id: '1rBckNhaKVzbHJ1EiotB_5_f7lmFsoeof', clip: '0088', time: '11:30:12' },
          { id: '1dd93h-X0Taqg-Vj6jkjzknYoQXjxm7GT', clip: '0089', time: '11:31:20' },
          { id: '1_Xs65k-K6bGaedl9_JpkfYE1YjBRXSJu', clip: '0090', time: '11:32:09' },
          { id: '19ZIIOFMq29lIl7GgfRV7Xka2xqRV8Vky', clip: '0091', time: '11:32:35' },
          { id: '1quRvU2pvTf9dHswB2S30f9y3r67V39Xp', clip: '0092', time: '11:33:08' },
          { id: '1i0KTpMeptm1jQMwMju2C7UEbjyvRu5Sm', clip: '0093', time: '11:33:48' },
          { id: '1bEgEKrFC_BeEpNaidnv3DZZgNJxGwEYZ', clip: '0094', time: '11:34:19' },
          { id: '1fGXH8vDrZt6t3qZPb1FuvDQ0BoN4pfdG', clip: '0095', time: '11:35:07' },
          { id: '1S8sNO5I_0Pgx9Qy3Wfrp5SgGMKdyQ7jQ', clip: '0096', time: '11:35:39' },
          { id: '1dytEnck_zY93QjFYiX9MbLZwsYgzWLum', clip: '0097', time: '11:36:01' },
          { id: '1A4aG4qjtXt6HPW4u-NW79mAMkKC-QVmW', clip: '0098', time: '11:36:41' },
          { id: '1NX4BoBzqJchuarJaPXWsvi00C9BdB5V_', clip: '0099', time: '11:37:00' },
          { id: '1EP3q5Lf5sC6guq3CzPAoZYvislClxNCN', clip: '0100', time: '11:38:39' },
          { id: '1a-9DJZr3i6Q4FPIoIwNiBHVzxU5rh1ZI', clip: '0101', time: '11:39:31' },
          { id: '1JorSftxMPjq-d9YX9cWe5J4o9ewVHsZ5', clip: '0102', time: '11:39:52' },
          { id: '1DmegQFLX_GJh2Ygqmhas8yMK1NXiSpV0', clip: '0103', time: '11:40:29' },
          { id: '1N5nZMXRhr1_XVspym7CIGp5gSNAQsVV_', clip: '0104', time: '11:41:54' },
          { id: '124SxoY3Rteb0qBUuGaVc275VYGzc28Qf', clip: '0105', time: '11:42:35' },
          { id: '1l0SpFXHxW4a5PyBcljdLXNGRx-IVlJA-', clip: '0106', time: '11:43:24' },
          { id: '1CxcgS44kabbG240ta842DZeH9sWqu_QO', clip: '0107', time: '11:44:13' },
          { id: '1N-SUIQNj11ZOkfnLqntxUUNROt5x2g_K', clip: '0108', time: '11:45:23' },
          { id: '17nOqWXmAMz0nn1GD3R110zNnSPaupCPz', clip: '0109', time: '11:46:17' },
          { id: '1FCsEnRRH3qiBWtdmAjnIKHj_uz7h-UZO', clip: '0110', time: '11:47:34' },
          { id: '1wS94a6f_pZTqpw4XLIJC56PrmbuSwArA', clip: '0111', time: '11:48:44' },
          { id: '1OFgkGauykfnM5GfMdt3Ooy6Hnp0xXVtO', clip: '0112', time: '11:49:49' },
          { id: '16LRqEKKqhuK0sQWjHMpyF2__0hmXPGCB', clip: '0113', time: '11:50:19' },
          { id: '13zxGiCXrW7jz04l-Z_Ugx3hUWGCJxfFf', clip: '0114', time: '11:50:58' },
          { id: '16kYNfiQaJHsOQfKcWDsUR7OUy-nSi946', clip: '0115', time: '11:54:52' },
          { id: '1rzr9t71UVK0dK__srGhVEfpDJBp-b_3X', clip: '0116', time: '11:55:46' },
          { id: '1aSWd-EWN6m6sa1PNGgSVdX3yopEFbdoS', clip: '0117', time: '11:56:03' },
          { id: '1nlv0Qt4Xh2uO_lrnNWJVJ91GXWUvAkjy', clip: '0118', time: '11:56:21' },
          { id: '12PsvHW8mJSE8-sHEsrGGhihYEs6tTAu3', clip: '0119', time: '11:56:35' },
          { id: '1aXByUYyZ_JWYVBpr0pZZaSbmkIyiOim5', clip: '0120', time: '11:57:15' },
          { id: '1FPoF0f8yzqbzdeVxqfBNAaV9w-H_DSaZ', clip: '0121', time: '11:57:39' },
          { id: '1kyJwbGEZvf4bpHBK1r4VdiLHEfhvzU0j', clip: '0122', time: '11:58:02' },
          { id: '1YyICpSSDOf8yTS4J7acC63G6JBFCwxnr', clip: '0123', time: '11:58:49' },
          { id: '1D5LNPkk6AQzQvfSmimMOClCOy17FGkSZ', clip: '0124', time: '12:00:02' },
          { id: '1xIay7LfM0NbJw87OWrbFyK-hTb8b3eIo', clip: '0125', time: '12:04:37' },
          { id: '1spIxs2xWSfluVSpoYk1rHnILmvHoCCqd', clip: '0126', time: '12:19:53' },
          { id: '1ANb2OuVe4_4ix6ID7hGRmScBO35o8EeQ', clip: '0127', time: '12:27:59' },
          { id: '1SVJapdZFqyhpL3G7eSIrFAxj3gqKn9xf', clip: '0128', time: '12:28:45' },
          { id: '1nuNXdSe3-hZeHLtmF60IQnHpqwCD2o9d', clip: '0129', time: '12:29:12' },
          { id: '1dfDjW8SAQxB7f2mEfcl8kQDIPasnlNv0', clip: '0130', time: '12:33:00' },
          { id: '18LWqBAGX23DI3iPPP5hEHyqiEW2-5oI0', clip: '0131', time: '12:33:30' },
          { id: '1EtntOjJQyYJ60tJatPEeA-bldoaVxj_3', clip: '0132', time: '12:33:57' },
          { id: '1WPnsfipdyls98iYaBTNqb6NrI19uzqny', clip: '0133', time: '12:34:30' },
          { id: '1ohcdQjz-dqiRp9EeGMrrYApyF-FvoTxW', clip: '0134', time: '12:35:15' },
          { id: '1NR5XeCmNzNTGaIklMKEWe1iXMgbLm4OG', clip: '0135', time: '12:35:44' },
          { id: '1tuGIl15LfGq7giT3qUD2iuglQd1Xd4cn', clip: '0136', time: '12:38:27' },
          { id: '1KqGIpT4IE9zdnHcxdI-9pktHDvNE9--5', clip: '0137', time: '12:49:55' },
          { id: '1t9rycfnN46r2roynRGzQ9jDoEYZWzyKP', clip: '0138', time: '12:50:29' },
          { id: '1E1CtFxLM5UE-I_8eFHAiJyCOeyf33xx7', clip: '0139', time: '12:51:04' }
        ],
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
      desk: 'automotive',
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
    {
      slug: 'honda-f4i-shop',
      desk: 'automotive',
      type: 'motorcycle',
      format: 'film',
      year: '',
      make: 'Honda',
      model: 'CBR600F4i',
      code: 'F4i',
      title: 'In the Shop',
      tagline: 'Setting up my F4i in a friend’s garage — wiring, front fender and headlights.',
      excerpt: 'Me and my friends setting up my Honda F4i in his garage: going through the internal wiring, cleaning it up, then connecting it and the headlights to the rest of the bike.',
      era: '',
      season: '',
      vibes: ['garage', 'workshop', 'craft'],
      location: 'A friend’s garage',
      city: '',
      country: '',
      coords: '',
      shotOn: '',
      lens: '',
      runtime: '',
      published: '',
      tone: 'graphite',
      tags: ['Build', 'Garage', 'Film'],
      media: ['film'],
      machines: ['honda-cbr600f4i'],   // spec sheets (MACHINES below)
      specs: [
        { label: 'Bike', value: 'Honda CBR600F4i' },
        { label: 'Job', value: 'Wiring + headlights' },
        { label: 'Where', value: 'Friend’s garage' },
      ],
      subjects: [
        { name: 'The F4i', role: 'Machine', bio: 'My Honda, mid-build: internal wiring cleaned up and reconnected, headlights wired back in.' },
      ],
      owner: { name: '', quote: '' },
      story: [
        { type: 'text', lead: 'In the shop.', body: 'Me and my friends setting up my bike in his garage. I’m holding the front fender while we look through the internal wiring and clean it up, then connect it and the headlights to the rest of the bike.' },
      ],
      author: 'RollerReels',
      // Blog chapters: dictate a chapter and it gets typed into `body`.
      // Empty chapters stay hidden (preview them with story.html?s=<slug>&draft=1).
      chapters: [
        { id: 'the-f4i', heading: 'The F4i', prompt: 'How did you get the bike, and what state was it in?', body: '' },
        { id: 'the-garage', heading: 'The garage and the crew', prompt: 'Whose garage is it, and who was there helping?', body: '' },
        { id: 'the-wiring', heading: 'Into the wiring', prompt: 'What was going on with the wiring, and how did you sort it out?', body: '' },
        { id: 'lights-on', heading: 'Lights on', prompt: 'Connecting the front end and headlights back up — did it all work first time?', body: '' },
        { id: 'whats-next', heading: 'What’s next', prompt: 'What’s left on the build, and what are the plans for the bike?', body: '' },
      ],
      palette: [],
      bts: {
        crew: [{ role: 'Video', name: 'RollerReels' }],
        gear: [],
        conditions: [],
        notes: '',
        frames: [],
      },
      timeline: [],
      interview: [],
      image: '', poster: '', gallery: [], video: '',
      vimeo: { id: '1212483051', hash: 'f428c5372f' },   // cover image is pulled from Vimeo
      embed: 'https://player.vimeo.com/video/1212483051?h=f428c5372f&title=0&byline=0&portrait=0&dnt=1',
      soundtrack: '',
      gradedWith: '',
      filmProduct: '',
      products: ['crew-cafe', 'beanie-night', 'acc-keytag'],
    },
    {
      slug: 'l0st-tapes',
      desk: 'travel',
      type: 'car',
      format: 'film',
      year: '',
      make: '',
      model: 'L0ST TAPES',
      code: 'VHS',
      title: 'L0ST TAPES',
      tagline: 'Recovered VHS footage of a night drive through New York.',
      excerpt: 'Mixed media and recovered footage from an old VHS camera: a couple of friends, out in the middle of New York at night, from Chinatown to the highways and across a bridge lit up in colour.',
      era: '',
      season: '',
      vibes: ['night', 'vintage', 'urban', 'neon'],
      location: 'Chinatown to the highways',
      city: 'New York',
      geo: { lat: 40.71, lon: -74.0 },   // pin on the Atlas globe
      country: 'NY',
      coords: '',
      shotOn: 'VHS camcorder',
      lens: '',
      runtime: '',
      published: '',
      tone: 'sodium',
      tags: ['VHS', 'Night drive', 'Mixed media', 'Film'],
      media: ['film'],
      specs: [
        { label: 'Format', value: 'VHS + mixed media' },
        { label: 'Route', value: 'Chinatown → highways → bridge' },
        { label: 'When', value: 'Night' },
        { label: 'City', value: 'New York' },
      ],
      subjects: [],
      owner: { name: '', quote: '' },
      story: [
        { type: 'text', lead: 'Recovered footage.', body: 'Mixed media and recovered footage from an old VHS camera. I shot a couple of friends out in the middle of New York at night: we drove from Chinatown onto the highways, then across a bridge lit up in colour.' },
      ],
      author: 'RollerReels',
      // Blog chapters: dictate a chapter and it gets typed into `body`.
      // Empty chapters stay hidden (preview them with story.html?s=<slug>&draft=1).
      chapters: [
        { id: 'the-tape', heading: 'The tape', prompt: 'What VHS camera was it, and how did the footage get recovered?', body: '' },
        { id: 'the-crew', heading: 'The crew', prompt: 'Who was out that night?', body: '' },
        { id: 'chinatown', heading: 'Chinatown', prompt: 'Starting in Chinatown — what was the plan, and what was the feel?', body: '' },
        { id: 'the-highways', heading: 'Onto the highways', prompt: 'What was it like shooting on the move at night?', body: '' },
        { id: 'the-bridge', heading: 'The bridge', prompt: 'Which bridge was it, and what were the lights doing when you crossed?', body: '' },
        { id: 'mixing-the-media', heading: 'Mixing the media', prompt: 'How did you put the VHS and the other footage together?', body: '' },
      ],
      palette: [],
      bts: {
        crew: [{ role: 'Camera', name: 'RollerReels' }],
        gear: ['VHS camcorder'],
        conditions: [{ label: 'Time', value: 'Night' }],
        notes: '',
        frames: [],
      },
      timeline: [],
      interview: [],
      image: '', poster: '', gallery: [], video: '',
      vimeo: { id: '1066971784', hash: '' },   // cover image is pulled from Vimeo
      aspect: '4/3',                            // the film is 4:3
      embed: 'https://player.vimeo.com/video/1066971784?title=0&byline=0&portrait=0&dnt=1',
      soundtrack: '',
      gradedWith: '',
      filmProduct: '',
      products: ['lut-vintage-stock', 'beanie-night', 'tee-phonk'],
    },
    {
      slug: 'ksenia-r3-moses-r1m',
      desk: 'automotive',
      type: 'motorcycle',
      format: 'film',
      year: '',
      make: '',
      model: 'R3 × R1M',
      code: 'R3×R1M',
      title: 'Ksenia’s R3 × Moses’ R1M',
      tagline: 'Two riders, two Yamahas, one film.',
      excerpt: 'Ksenia on her R3 and Moses on his R1M, on film.',
      era: '',
      season: '',
      vibes: ['urban', 'clean', 'moody'],
      location: '',
      city: '',
      country: '',
      coords: '',
      shotOn: '',
      lens: '',
      runtime: '',
      published: '',
      tone: 'ice',
      tags: ['Superbike', 'Film', 'Riders'],
      media: ['film'],
      machines: ['yamaha-r3', 'yamaha-r1m'],   // spec sheets (MACHINES below)
      specs: [
        { label: 'Riders', value: 'Ksenia + Moses' },
        { label: 'Bikes', value: 'R3 + Yamaha YZF-R1M' },
        { label: 'Format', value: 'Film · 4:3' },
      ],
      subjects: [
        { name: 'Ksenia', role: 'Rider · R3', bio: '' },
        { name: 'Moses', role: 'Rider · R1M', bio: 'Also in Under the Bridge, the R1M photo story.' },
      ],
      owner: { name: '', quote: '' },
      story: [
        { type: 'text', lead: 'Two riders.', body: 'Ksenia on her R3 and Moses on his R1M.' },
      ],
      author: 'RollerReels',
      // Blog chapters: dictate a chapter and it gets typed into `body`.
      // Empty chapters stay hidden (preview them with story.html?s=<slug>&draft=1).
      chapters: [
        { id: 'the-riders', heading: 'Ksenia and Moses', prompt: 'Who are Ksenia and Moses, and how do they ride together?', body: '' },
        { id: 'the-bikes', heading: 'The R3 and the R1M', prompt: 'What should people know about each bike?', body: '' },
        { id: 'the-day', heading: 'The ride', prompt: 'Where did you shoot, and how did the day go?', body: '' },
        { id: 'the-cut', heading: 'Cutting the film', prompt: 'How did the edit come together — the music, the 4:3 look?', body: '' },
      ],
      palette: [],
      bts: { crew: [{ role: 'Film', name: 'RollerReels' }], gear: [], conditions: [], notes: '', frames: [] },
      timeline: [],
      interview: [],
      image: '', poster: '', gallery: [], video: '',
      vimeo: { id: '1019207124', hash: '' },   // cover image is pulled from Vimeo
      aspect: '4/3',
      embed: 'https://player.vimeo.com/video/1019207124?title=0&byline=0&portrait=0&badge=0&dnt=1',
      soundtrack: '',
      gradedWith: '',
      filmProduct: '',
      products: ['cap-kmark', 'tee-q-tired', 'hoodie-q-glitch'],
    },
  ],

  /* ----------------------------------------------------------
   * MACHINES — spec sheets for the cars and bikes in the stories.
   * A story lists the ones it features in `machines: ['<id>']` and
   * gets a Spec sheet section: the schematic, the numbers and facts.
   *   schematic  side-elevation line drawing (scripts/draw-schematics.js)
   *   drawn      which version the drawing and numbers describe
   *   stats      [{ label, value }]   facts  ['…']   sources  [{ label, url }]
   *   factory    a drawing from that manual { src, caption, credit }
   *   street     the Street File editorial (the-garage.html): { role, dek,
   *              numbers: [{ label, value, note }], secrets: ['…'], sources }
   *   manual     the factory owner’s manual: its parts-location pages are the
   *              manufacturer’s own line drawings (linked, not copied)
   * -------------------------------------------------------- */
  machines: [
    {
      id: 'infiniti-q50',
      make: 'Infiniti',
      model: 'Q50',
      years: '2014–2024 model years',
      schematic: 'images/schematics/infiniti-q50.svg',
      drawn: 'V37 sedan, 2018-on dimensions',
      manual: { label: '2023 Q50 Owner’s Manual (Infiniti, PDF)', url: 'https://www.infinitiusa.com/content/dam/Infiniti/US/manuals_guides/q50/2023/2023-infiniti-q50-owner-manual.pdf' },
      stats: [
        { label: 'Engine', value: '3.0 L twin-turbo V6 (VR30DDTT)' },
        { label: 'Power', value: '300 hp · 400 hp in the Red Sport 400' },
        { label: 'Torque', value: '350 lb-ft at 1,600–5,200 rpm (Red Sport 400)' },
        { label: 'Gearbox', value: '7-speed automatic' },
        { label: 'Wheelbase', value: '2,850 mm · 112.2 in' },
        { label: 'Length', value: '4,816 mm · 189.6 in' },
        { label: 'Width', value: '1,824 mm · 71.8 in' },
        { label: 'Height', value: '1,453 mm · 57.2 in' },
      ],
      facts: [
        'Unveiled at the 2013 Detroit auto show and sold from the 2014 model year, replacing the G37 sedan. It was the first Infiniti to carry the brand’s new Q naming.',
        'Optional Direct Adaptive Steering, which Infiniti called the world’s first production steer-by-wire system. A clutch in the split steering column re-connects the wheel mechanically if the electronics fail.',
        'Launched with a 3.7-litre V6 and a V6 hybrid; the 3.0-litre twin-turbo VR30 arrived for 2016. The Red Sport 400 makes 400 hp at 6,400 rpm.',
        '2024 was the last model year. U.S. sales peaked at 44,007 in 2016, and Infiniti went crossover- and SUV-only for 2025.',
      ],
      street: {
        role: 'The sleeper',
        dek: 'Four doors, a commuter-car silhouette and, in Red Sport 400 trim, the same twin-turbo V6 Nissan later dropped into the Z. Andy’s runs low on polished wheels and gold calipers, rolling across the Hudson.',
        numbers: [
          { label: '0–60 mph', value: '4.5 s', note: 'Car and Driver, 2016 Red Sport 400' },
          { label: '¼ mile', value: '13.0 s @ 112 mph', note: 'Car and Driver, 2016 Red Sport 400' },
          { label: 'Output', value: '400 hp · 350 lb-ft', note: 'Red Sport 400' },
        ],
        secrets: [
          'The VR30DDTT V6 debuted in the Q50 and is the same engine Nissan put in the 2023 Z: same 400 hp at 6,400 rpm, same 350 lb-ft.',
          'It made Wards 10 Best Engines twice: in the Q50 for 2017 and in the Q60 coupe for 2018.',
          'There was almost a GT-R-engined Q50. The Eau Rouge concept made about 560 hp from the GT-R’s 3.8-litre twin-turbo V6, and Infiniti shelved it in 2015 as too expensive to build.',
          'Tuners say the factory Garrett turbos are small. Dyno builds at Z Car Garage went from about 325–348 whp stock to 388–412 whp with intake, exhaust, a heat exchanger and an EcuTek tune, and Stillen found the turbos’ efficiency caps how much more boost pays off.',
        ],
        sources: [
          { label: '0-60specs: Q50 tested times (Car and Driver)', url: 'https://www.0-60specs.com/infiniti/q50-0-60-times' },
          { label: 'Motor1: the Nissan Z’s VR30DDTT', url: 'https://www.motor1.com/news/669178/see-through-nissan-z-vr30ddtt-engine-video/' },
          { label: 'CAR: Q50 Eau Rouge cancelled', url: 'https://www.carmagazine.co.uk/car-news/motor-shows-events/frankfurt/2015/infiniti-kills-off-gtr-powered-q50-eau-rouge/' },
          { label: 'Z Car Blog: VR30DDTT builds', url: 'https://www.zcarblog.com/tag/vr30ddtt/page/2' },
          { label: 'Stillen: Red Sport turbo maps', url: 'https://blog.stillen.com/?p=12822' },
        ],
      },
      sources: [
        { label: 'Infiniti 2016 Q50 specifications', url: 'https://global.infinitinews.com/en/channels/channel-0207b8333061e10e7184bb242a019643' },
        { label: 'Infiniti 2023 Q50 specifications', url: 'https://canada.infinitinews.com/en-CA/releases/release-5ac4eb09db8c0dedca705b2277000fa3-2023-infiniti-q50-specifications' },
        { label: 'Infiniti: Direct Adaptive Steering', url: 'https://global.infinitinews.com/en/releases/direct-adaptive-steering' },
        { label: 'Motor1: Infiniti Q50 is dead', url: 'https://www.motor1.com/news/730907/infiniti-q50-dead/' },
      ],
    },
    {
      id: 'yamaha-r1m',
      make: 'Yamaha',
      model: 'YZF-R1M',
      years: '2015–present',
      schematic: 'images/schematics/yamaha-r1m.svg',
      drawn: '2025–26 U.S. specification',
      factory: { src: 'images/schematics/factory/yamaha-r1-right.webp', caption: 'Right view, YZF-R1 (the R1M shares its frame and engine)', credit: 'Yamaha Motor Co., Ltd. · 2021 YZF-R1 Owner’s Manual, p. 2-2' },
      manual: { label: '2021 YZF-R1 series Owner’s Manual (Yamaha, PDF)', url: 'https://www2.yamaha-motor.co.jp/Manual/pdf/mc/2021B3L6.pdf' },
      stats: [
        { label: 'Engine', value: '998 cc inline-four, crossplane crank' },
        { label: 'Power', value: '≈200 PS' },
        { label: 'Compression', value: '13.0 : 1' },
        { label: 'Gearbox', value: '6-speed, assist-and-slipper clutch' },
        { label: 'Suspension', value: 'Öhlins ERS: 43 mm NPX fork + shock, 4.7 in travel' },
        { label: 'Rake · trail', value: '24.0° · 102 mm (4.0 in)' },
        { label: 'Wheelbase', value: '1,405 mm · 55.3 in' },
        { label: 'Seat height', value: '861 mm · 33.9 in' },
        { label: 'Wet weight', value: '205 kg · 452 lb' },
        { label: 'Fuel', value: '17 L · 4.5 gal' },
      ],
      facts: [
        'Launched for 2015 alongside the all-new R1 as its track-focused sibling. U.S. price was $21,990, $5,500 over the R1, and only 500 were built for the U.S. that first year.',
        'Öhlins Electronic Racing Suspension adjusts damping on the move. It is where Moses’ gold forks come from.',
        'Carbon-fibre upper fairing, side fairings and front fender, plus a Communication Control Unit that logs laps with GPS and sends them to Yamaha’s Y-TRAC app over Wi-Fi.',
        'The crossplane crank, first used on the 2009 R1 and taken from Yamaha’s YZR-M1 MotoGP bike, fires at uneven intervals so the rear tyre gets smoother drive out of corners.',
      ],
      street: {
        role: 'The flagship',
        dek: 'A superbike sold with the electronics and Öhlins kit of a race bike and a licence plate. Moses’ sits on blue wheels and gold forks under the George Washington Bridge.',
        numbers: [
          { label: '¼-mile trap', value: '150.25 mph', note: 'AMCN AUSTest, Western Sydney drag strip' },
          { label: 'Output', value: '≈200 PS', note: '998 cc crossplane four' },
          { label: 'Wet weight', value: '452 lb', note: 'Yamaha, 2025–26' },
        ],
        secrets: [
          'The crossplane crank fires at 270°–180°–90°–180°, an uneven beat that sounds more V4 than inline-four. Yamaha says the sound is a side effect: the point is smoother drive at the rear tyre.',
          'Yamaha first ran an uneven-firing crossplane crank in its M1 MotoGP bike in 2004; the 2009 R1 brought it to the street.',
          'Its factory model code is YZF1000D. The plain R1 is the YZF1000.',
          'Only 500 came to the U.S. in its first year, at $21,990.',
          'At AMCN’s drag-strip test it was one of only three bikes through the quarter-mile traps above 150 mph.',
        ],
        sources: [
          { label: 'AMCN AUSTest: YZF-R1M', url: 'https://amcn.com.au/editorial/amcn-austest-yamaha-yzf-r1m/' },
          { label: 'Yamaha: the crossplane R1', url: 'https://global.yamaha-motor.com/stories/yamaha-handling/list/vol10/01.html' },
          { label: 'ManualsLib: YZF1000 / YZF1000D owner’s manual', url: 'https://www.manualslib.com/manual/2755477/Yamaha-Yzf-R1.html' },
        ],
      },
      sources: [
        { label: 'Yamaha: 2025 YZF-R1M specs', url: 'https://yamahamotorsports.com/models/25-yzf-r1m/specs' },
        { label: 'Rider: 2015 YZF-R1 and R1M first look', url: 'https://ridermagazine.com/2014/11/05/2015-yamaha-yzf-r1-and-r1m-first-look-review/' },
        { label: 'Ultimate Motorcycling: 2015 YZF-R1M', url: 'https://ultimatemotorcycling.com/2014/11/04/2015-yamaha-yzf-r1m-first-look/' },
      ],
    },
    {
      id: 'yamaha-r3',
      make: 'Yamaha',
      model: 'YZF-R3',
      years: '2015–present',
      schematic: 'images/schematics/yamaha-r3.svg',
      drawn: '2025–26 U.S. specification',
      manual: { label: '2019 YZF-R3 Owner’s Manual (Yamaha Europe, PDF)', url: 'https://cdn2.yamaha-motor.eu/prod/owner-manuals/Motorcycles/PB7PF8199E0E.PDF' },
      stats: [
        { label: 'Engine', value: '321 cc parallel twin, DOHC, 8 valves' },
        { label: 'Bore × stroke', value: '68.0 × 44.1 mm' },
        { label: 'Power', value: '≈42 hp · 21.8 lb-ft' },
        { label: 'Tyres', value: '110/70-17 · 140/70-17' },
        { label: 'Rake · trail', value: '25.0° · 94 mm (3.7 in)' },
        { label: 'Wheelbase', value: '1,380 mm · 54.3 in' },
        { label: 'Seat height', value: '780 mm · 30.7 in' },
        { label: 'Wet weight', value: '169 kg · 373 lb' },
        { label: 'Fuel', value: '14 L · 3.7 gal' },
      ],
      facts: [
        'Yamaha’s entry-level supersport, sold in the U.S. since 2015. A 250 cc version, the YZF-R25, is sold in Asia.',
        'The 2019 update brought MotoGP M1-style bodywork that Yamaha says cuts drag by 7%, a 37 mm KYB upside-down fork in place of the old 41 mm conventional one, and handlebars 22 mm lower.',
        'Wet weight with a full tank is 373 lb on the 2025–26 bikes and 375 lb on 2023–24.',
      ],
      street: {
        role: 'The gateway',
        dek: 'The 321 cc way into Yamaha’s R-series: light, low and happy to rev. Ksenia rides one next to Moses’ R1M, 321 cc beside 998.',
        numbers: [
          { label: '0–60 mph', value: '5.1 s', note: 'Motostatz test' },
          { label: '¼ mile', value: '14.0 s @ 95 mph', note: 'Motostatz test' },
          { label: 'Top speed', value: '≈112 mph', note: 'Motostatz test' },
        ],
        secrets: [
          'Its factory name is the YZF320. “R3” is the street name.',
          'Even the European owner’s manual carries the copyright of PT Yamaha Indonesia Motor Manufacturing.',
          'The 2019 facelift’s M1-style bodywork cut drag by 7%, Yamaha says. The bars dropped 22 mm and the fork went upside-down.',
          'With a 68 mm bore and a 44.1 mm stroke the twin is heavily oversquare: short-stroke, built to rev.',
          'Full of fuel it weighs 373 lb, about 80 lb less than an R1M.',
        ],
        sources: [
          { label: 'Motostatz: YZF-R3 acceleration', url: 'https://motostatz.com/?p=780' },
          { label: 'Yamaha Europe: YZF320-A owner’s manual', url: 'https://cdn2.yamaha-motor.eu/prod/owner-manuals/Motorcycles/PB7PF8199E0E.PDF' },
        ],
      },
      sources: [
        { label: 'Yamaha: 2025 YZF-R3 specs', url: 'https://yamahamotorsports.com/models/25-yzf-r3/specs' },
        { label: 'Rider: 2019 YZF-R3 first look', url: 'https://ridermagazine.com/2018/10/16/2019-yamaha-yzf-r3-first-look-review/' },
        { label: 'Visordown: Yamaha unveils updated R3', url: 'https://www.visordown.com/news/new-bikes/yamaha-unveils-updated-r3' },
      ],
    },
    {
      id: 'honda-cbr600f4i',
      make: 'Honda',
      model: 'CBR600F4i',
      years: '2001–2006',
      schematic: 'images/schematics/honda-cbr600f4i.svg',
      drawn: '2005 U.S. specification',
      manual: { label: '2006 CBR600F4i Owner’s Manual (Honda, PDF)', url: 'https://www.acura.com/assets/OWNERLINK/Model/own_man/powersports/2006/2006_CBR600F4.pdf' },
      stats: [
        { label: 'Engine', value: '599 cc inline-four, DOHC, 16 valves' },
        { label: 'Bore × stroke', value: '67 × 42.5 mm' },
        { label: 'Fuel system', value: 'PGM-FI, 38 mm throttle bodies' },
        { label: 'Power', value: '≈110 hp at 12,500 rpm' },
        { label: 'Tyres', value: '120/70ZR-17 · 180/55ZR-17' },
        { label: 'Rake · trail', value: '24.0° · 96 mm (3.8 in)' },
        { label: 'Wheelbase', value: '1,385 mm · 54.5 in' },
        { label: 'Seat height', value: '805 mm · 31.7 in' },
        { label: 'Dry weight', value: '168 kg · 370 lb' },
        { label: 'Fuel', value: '18 L · 4.8 gal incl. reserve' },
      ],
      facts: [
        'The “i” is for injection: in 2001 it became Honda’s first fuel-injected 600 cc sport four, with four injectors fed at 50 psi.',
        'An F4i won the 2002 Supersport World Championship.',
        'When the race-replica CBR600RR arrived in 2003, the F4i stayed on as Honda’s more street-friendly 600 until 2006.',
        'Fuel injection added only about 5 hp over the carburetted CBR600F4 it replaced.',
      ],
      street: {
        role: 'The garage build',
        dek: 'The last of Honda’s do-everything 600s, and the bike on the lift in A Friend’s Garage: wiring cleaned up, headlights wired back in.',
        numbers: [
          { label: '¼ mile', value: '11.09 s @ 126 mph', note: 'Motostatz test' },
          { label: 'Output', value: '≈110 hp', note: 'at 12,500 rpm' },
          { label: 'Dry weight', value: '370 lb', note: 'Honda' },
        ],
        secrets: [
          'The “i” is for injection: in 2001 it became Honda’s first fuel-injected 600 sport four.',
          'It won the 2002 World Supersport title, lost its racing job to the CBR600RR a year later, and stayed on as Honda’s street 600 until 2006.',
          'Injection was worth only about 5 hp over the carburetted F4 it replaced.',
          'Four injectors, one per 38 mm throttle body, fed at 50 psi.',
        ],
        sources: [
          { label: 'Motostatz: CBR600F4i acceleration', url: 'https://motostatz.com/honda-cbr600f4i-top-speed-acceleration/' },
          { label: 'Cycle World: CBR600F4i test, March 2001', url: 'https://issues.cycleworld.com/article/2001/3/1/honda-cbr600f4i' },
        ],
      },
      sources: [
        { label: 'Honda: 2005 CBR600F4i specifications', url: 'https://hondanews.com/en-US/powersports/releases/release-5ee13d1a1d3d0059c9fb1f004c34c320-2005-honda-cbr600f4i-specifications' },
        { label: 'Motorcyclist: 2001–2006 CBR600F4i buying tips', url: 'https://motorcyclistonline.com/buying-tips-used-honda-sportbikes-motorcycles-2001-2006-cbr600f4i-smart-money' },
        { label: 'Total Motorcycle: 2005 CBR600F4i', url: 'https://www.totalmotorcycle.com/photos/2005models/2005models-Honda-CBR600F4i/' },
      ],
    },
    {
      id: 'honda-shadow-1100',
      make: 'Honda',
      model: 'Shadow 1100',
      years: '1985–2007',
      schematic: 'images/schematics/honda-shadow-1100.svg',
      drawn: 'VT1100C Shadow Spirit',
      manual: { label: '2006 VT1100C Shadow Spirit Owner’s Manual (Honda, PDF)', url: 'https://www.acura.com/assets/OWNERLINK-Temp/OWNERLINK/Model/own_man/powersports/2006/2006_VT1100C.pdf' },
      stats: [
        { label: 'Engine', value: '1,099 cc liquid-cooled 45° V-twin, SOHC, 3 valves per cylinder' },
        { label: 'Bore × stroke', value: '87.5 × 91.4 mm' },
        { label: 'Carburettors', value: 'Two 36 mm CV' },
        { label: 'Drive', value: '5-speed, shaft final drive' },
        { label: 'Tyres', value: '110/90-19 · 170/80-15' },
        { label: 'Rake · trail', value: '32°40′ · 152.5 mm (6.0 in)' },
        { label: 'Wheelbase', value: '1,651 mm · 65.0 in' },
        { label: 'Seat height', value: '729 mm · 28.7 in' },
        { label: 'Dry weight', value: '≈251 kg · 553 lb' },
        { label: 'Fuel', value: '15.9 L · 4.2 gal' },
      ],
      facts: [
        'The VT1100 ran from 1985 to 2007 as the Shadow 1100, the Spirit, the A.C.E. (1995–1999), the Aero (1998–2001), the A.C.E. Tourer and the Sabre (2000–2007).',
        'The A.C.E. and Aero used a single-pin crank for a loping, Harley-style idle. It cost about 10 hp and 10 lb-ft against the dual-pin engine in the other 1100s.',
        'The first 1985–86 bikes made the most power of any VT1100, around 78 hp.',
        'Shaft drive means no chain to clean, oil or adjust.',
      ],
      street: {
        role: 'The outlier',
        dek: 'Not a drag bike: a long, low V-twin built for the boulevard, born in the middle of the tariff fight between Harley-Davidson and the Japanese makers.',
        numbers: [
          { label: 'Seat height', value: '28.7 in', note: 'VT1100C Spirit' },
          { label: 'Wheelbase', value: '65.0 in', note: 'VT1100C Spirit' },
          { label: 'Output', value: '≈78 hp', note: '1985–86 engines, the strongest VT1100s' },
        ],
        secrets: [
          'In 1983, after a Harley-Davidson petition, the U.S. put a tariff starting at 49.4% on imported bikes of 700 cc and up. Honda answered by sleeving its Shadow 750 down to 694 cc and selling it in America as the VT700C.',
          'The 1100 arrived in 1985, in the middle of the tariff years.',
          'The A.C.E. and Aero swapped to a single-pin crank just for the loping, Harley-style idle, and gave up about 10 hp to get it.',
          'One model code, two bikes: VT1100C2 was both the 1995–99 A.C.E. and the 2000–07 Sabre.',
          'Shaft drive: no chain to clean, oil or adjust.',
        ],
        sources: [
          { label: 'RideApart: the Asian 700s and the tariff', url: 'https://www.rideapart.com/features/254267/kickstand-the-strange-case-of-the-asian-700s-and-hondas-1985-vf700c/' },
          { label: 'Sun Coast Cycle Sports: VT1100 Sabre', url: 'https://suncoastcyclesports.com/vt1100-sabre/' },
        ],
      },
      sources: [
        { label: 'webBikeWorld: 2001 Shadow Spirit 1100', url: 'https://www.webbikeworld.com/honda-spirit/' },
        { label: 'Total Motorcycle: 1999 VT1100C Shadow Spirit', url: 'https://www.totalmotorcycle.com/motorcyclespecshandbook/honda/1999-honda-VT1100CShadowSpirit/' },
        { label: 'Wikipedia: Honda VT1100', url: 'https://en.wikipedia.org/wiki/Honda_VT1100' },
        { label: 'Sun Coast Cycle Sports: VT1100 1985–86', url: 'https://suncoastcyclesports.com/vt1100-85-86/' },
      ],
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
    { id: '1212483051', hash: 'f428c5372f', title: '', story: 'honda-f4i-shop' },
    { id: '1066971784', hash: '', title: 'L0ST TAPES', story: 'l0st-tapes', aspect: '4/3' },
    { id: '1019207124', hash: '', title: 'Ksenia’s R3 × Moses’ R1M', story: 'ksenia-r3-moses-r1m', aspect: '4/3' },
  ],

  /* ----------------------------------------------------------
   * FILMS — the screening room (films.html), laid out like a streaming
   * service: a billboard and rows. Each film:
   *   { id, title, rows: ['new', …], year, runtime, blurb, tone,
   *     vimeo: { id, hash } | youtube: '<video id>' | video: 'file.mp4',
   *     poster: 'image', story: '<story slug>', featured: true }
   * Leave the video fields empty and the film shows as "Coming soon".
   * `featured: true` puts it on the billboard (first one wins).
   * -------------------------------------------------------- */
  filmRows: [
    { id: 'new', title: 'New on KIOSK' },
    { id: 'machines', title: 'Cars & motorcycles' },
    { id: 'travel', title: 'Travel diaries' },
    { id: 'interviews', title: 'Interviews' },
    { id: 'edits', title: 'Cinematic edits' },
    { id: 'home', title: 'Home movies' },
    { id: 'bts', title: 'Behind the scenes' },
  ],
  films: [
    { id: 'friends-garage', title: 'A Friend’s Garage', rows: ['new', 'machines'], story: 'honda-f4i-shop', vimeo: { id: '1212483051', hash: 'f428c5372f' }, featured: true, blurb: 'A Honda F4i, a cramped shop and the friends who keep it running.' },
    { id: 'l0st-tapes', title: 'L0ST TAPES', rows: ['new', 'edits', 'home'], story: 'l0st-tapes', vimeo: { id: '1066971784', hash: '' }, aspect: '4/3', blurb: 'Found footage from nights that never made the edit.' },
    { id: 'r3-r1m', title: 'Ksenia’s R3 × Moses’ R1M', rows: ['machines', 'edits'], story: 'ksenia-r3-moses-r1m', vimeo: { id: '1019207124', hash: '' }, aspect: '4/3', blurb: 'Two riders, two Yamahas and one long evening on the river roads.' },
    { id: 'real-slummy', title: 'Real Slummy', rows: ['new', 'machines'], story: 'andy-q50', blurb: 'Andy’s Q50, low and black, rolling across the Hudson.' },
    // Placeholders: swap in a vimeo / youtube / video link when each one is ready
    { id: 'tokyo-after-midnight', title: 'Tokyo After Midnight', rows: ['travel', 'edits'], runtime: '18 min', tone: 'sodium', blurb: 'Convenience-store coffee, Daikoku and the city at 3 a.m.' },
    { id: 'long-way-to-lisbon', title: 'The Long Way to Lisbon', rows: ['travel'], runtime: '24 min', tone: 'desert', blurb: 'A coastal road trip with no plan past the next tank of fuel.' },
    { id: 'night-market', title: 'Night Market, Bangkok', rows: ['travel', 'home'], runtime: '9 min', tone: 'ember', blurb: 'Smoke, neon and the best food we have eaten standing up.' },
    { id: 'kiosk-conversations-1', title: 'Conversations at the Kiosk · Ep. 1', rows: ['interviews', 'new'], runtime: '32 min', tone: 'graphite', blurb: 'Builders, riders and makers on how they ended up here.' },
    { id: 'kiosk-conversations-2', title: 'Conversations at the Kiosk · Ep. 2', rows: ['interviews'], runtime: '28 min', tone: 'chrome', blurb: 'A thrift curator on finding the one piece in a thousand.' },
    { id: 'garage-talk', title: 'Garage Talk', rows: ['interviews', 'machines'], runtime: '21 min', tone: 'moss', blurb: 'What owners wish they had known before the first build.' },
    { id: 'sunday-at-the-track', title: 'Sunday at the Track', rows: ['machines', 'edits'], runtime: '12 min', tone: 'ice', blurb: 'Track day from the paddock to the last session.' },
    { id: 'mountain-pass', title: 'Mountain Pass, No Map', rows: ['machines', 'travel'], runtime: '15 min', tone: 'moss', blurb: 'Two bikes, one pass and a forecast nobody checked.' },
    { id: 'thrift-run', title: 'Thrift Run: Brooklyn', rows: ['travel', 'bts'], runtime: '11 min', tone: 'desert', blurb: 'Six shops, one afternoon and what made the cut.' },
    { id: 'home-movies-1', title: 'Home Movies · Vol. 1', rows: ['home'], runtime: '8 min', tone: 'ember', blurb: 'Camcorder tapes from the road, unedited and unfiltered.' },
    { id: 'rooftop-session', title: 'Rooftop Session', rows: ['edits', 'home'], runtime: '6 min', tone: 'chrome', blurb: 'Skate, sunset and a borrowed rooftop.' },
    { id: 'making-real-slummy', title: 'Behind the Lens: Real Slummy', rows: ['bts'], runtime: '14 min', tone: 'graphite', blurb: 'Rigs, rollers and the shots we almost lost.' },
    { id: 'making-the-kiosk', title: 'Making the Kiosk', rows: ['bts', 'interviews'], runtime: '19 min', tone: 'sodium', blurb: 'From sketch to sample: how the first pieces got made.' },
  ],

  /* ----------------------------------------------------------
   * RADIO — curated playlists that keep playing while people browse.
   * Each mix uses ONE source:
   *   spotify:    the playlist ID from its share link (open.spotify.com/playlist/<ID>)
   *   soundcloud: any SoundCloud track, playlist or likes link
   *   apple:      an Apple Music playlist link (music.apple.com/…/playlist/…/pl.…)
   *   audio:      an MP3 URL for a self-hosted mix
   * Leave every source empty and the mix shows as "drops soon".
   * Radio is free to listen to: nothing here is sold.
   *
   * The radio page shows each mix as a 3D song wheel of covers. Spotify
   * playlists fill it on their own (song titles and album art come from
   * /api/radio/tracks), SoundCloud links too. To set the songs by hand
   * (or for an MP3 / Apple Music mix), fill `tracks` with
   *   { title, artist, cover: 'image URL', spotify: 'track ID', audio: 'MP3 URL' }
   * (only title is required; plain strings work as titles).
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
    {
      slug: 'soundcloud-likes',
      title: 'Liked on SoundCloud',
      volume: 'Playlist 03',
      length: '',
      bpm: '',
      mood: 'Phonk likes · curated on SoundCloud',
      tone: 'ember',
      soundcloud: 'https://on.soundcloud.com/hZrsAbhlhyPSPwlry1',   // any SoundCloud track, playlist or likes link
      audio: '',
      cover: '',
      tracks: [],
    },
    {
      slug: 'apple-in-rotation',
      title: 'In Rotation',
      volume: 'Playlist 04',
      length: '',
      bpm: '',
      mood: 'What we’re playing on the road · curated on Apple Music',
      tone: 'sodium',
      apple: '',   // paste an Apple Music playlist link, e.g. https://music.apple.com/us/playlist/name/pl.xxxx
      audio: '',
      cover: '',
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
  /* ----------------------------------------------------------
   * STORES — the kiosk is a marketplace. Each store sells through its
   * own Shopify (see docs/CONTENT_GUIDE.md › Marketplace); products
   * point at a store with `store: '<id>'` (default 'kiosk').
   * -------------------------------------------------------- */
  /* Each store gets a page at store.html?s=<id> and shows up in search and
   * on the Hunt map (lat/lon). Fields:
   *   id, name, city, country, lat, lon
   *   url      the store's own site (its Shopify). "Visit store" goes through
   *            /go/<id>, which counts the visit and adds KIOSK referral tags
   *            (functions/go/[store].js). Leave empty for the KIOSK itself.
   *   note     one line for cards · about: a paragraph for the store page
   *   cover    wide image for the store page · tags: words people search for
   * Example partner (fill in for real before adding):
   *   { id: 'example', name: 'Example Vintage', city: 'Osaka', country: 'JP', lat: 34.69, lon: 135.5,
   *     url: 'https://example-vintage.myshopify.com', note: '…', about: '…', cover: 'images/stores/example.webp', tags: ['vintage', 'denim'] },
   */
  stores: [
    {
      id: 'kiosk', name: 'KIOSK', city: 'New York', country: 'US', lat: 40.7128, lon: -74.006, url: '',
      note: 'Our own label. Pieces you can only find at the kiosk.',
      about: 'The kiosk’s own label, cut from the shoots: prints named after the cars, colourways pulled from each story’s palette, and Lost & Found pieces you have to travel to collect.',
      cover: 'images/product-lifestyle/hoodies/001-black-airport-01.webp',
      tags: ['streetwear', 'tees', 'hoodies', 'travel', 'luts', 'films'],
    },
  ],

  /* ----------------------------------------------------------
   * GARMENT GUIDES: what customers always ask (size chart, fabric,
   * care, fit, FAQ). Keyed by mockup type; a product can override any
   * field with `guide: { … }` (e.g. guide: { fabric: [...] }).
   * Measurements are flat, in inches, garment laid on a table. These are
   * the target specs for sampling: confirm them against the factory's
   * production sample before selling.
   * -------------------------------------------------------- */
  guides: {
    tee: {
      fit: 'Relaxed and boxy with a dropped shoulder. True to size for an easy fit; size down for a closer fit.',
      fabric: ['100% long-staple Supima® cotton, 230 gsm single jersey', 'Enzyme- and silicone-washed for a soft, broken-in hand from the first wear', 'Garment-dyed and pre-shrunk', '1x1 rib collar, twin-needle sleeve and bottom hems', 'Breathable, packs flat, keeps its shape on long-haul days'],
      care: ['Machine wash cold, inside out, with like colours', 'Mild detergent, no bleach or fabric softener', 'Hang dry or tumble dry low', 'Warm iron inside out; never iron the lettering', 'Do not dry clean'],
      chart: { points: ['Chest (pit to pit)', 'Body length (HPS)', 'Sleeve length'], rows: { XS: [20.5, 26.5, 8.25], S: [21.5, 27.5, 8.5], M: [22.5, 28.5, 8.75], L: [23.5, 29.5, 9], XL: [24.5, 30.5, 9.25], XXL: [25.5, 31.5, 9.5] } },
      shrink: 'Pre-shrunk. Expect under 3% after washing; wash cold and hang dry to keep the exact fit.',
    },
    longsleeve: {
      fit: 'Relaxed with a dropped shoulder and a slightly long sleeve that stacks at the cuff. True to size.',
      fabric: ['100% long-staple Supima® cotton, 200 gsm single jersey', 'Enzyme-washed for a soft, smooth hand', 'Garment-dyed and pre-shrunk', '1x1 rib collar, twin-needle cuffs and hem', 'Light enough to layer under a jacket in transit'],
      care: ['Machine wash cold, inside out, with like colours', 'Mild detergent, no bleach or fabric softener', 'Hang dry or tumble dry low', 'Warm iron inside out; avoid the print', 'Do not dry clean'],
      chart: { points: ['Chest (pit to pit)', 'Body length (HPS)', 'Sleeve length (shoulder seam)'], rows: { S: [21, 27.5, 24.5], M: [22, 28.5, 25], L: [23, 29.5, 25.5], XL: [24, 30.5, 26], XXL: [25, 31.5, 26.5] } },
      shrink: 'Pre-shrunk. Expect under 3% after washing; wash cold and hang dry to keep the fit.',
    },
    crew: {
      fit: 'Relaxed with a dropped shoulder; rib cuffs and waistband hold the shape. True to size, size up for an oversized fit.',
      fabric: ['100% long-staple cotton loopback French terry, 400 gsm', 'Enzyme-washed for a soft face; loopback inside breathes on planes and trains', 'Garment-dyed and pre-shrunk', '1x1 rib collar, cuffs and waistband with spandex for recovery'],
      care: ['Machine wash cold, inside out, with like colours', 'Mild detergent, no bleach or fabric softener', 'Lay flat or hang to dry; tumble dry low if needed', 'Do not iron the print', 'Do not dry clean'],
      chart: { points: ['Chest (pit to pit)', 'Body length (HPS)', 'Sleeve length (shoulder seam)'], rows: { S: [22, 26.5, 24], M: [23, 27.5, 24.5], L: [24, 28.5, 25], XL: [25, 29.5, 25.5], XXL: [26, 30.5, 26] } },
      shrink: 'Pre-shrunk. Expect under 3% after washing; air dry to keep the length.',
    },
    hoodie: {
      fit: 'Relaxed with a dropped shoulder and room to layer. True to size; size up for an oversized fit.',
      fabric: ['Heavyweight brushed-back fleece, 450 gsm: 100% long-staple cotton face, cloud-soft brushed interior', 'Enzyme-washed and garment-dyed for a lived-in hand', 'Pre-shrunk', 'Double-layer lined hood with flat cotton drawcord and metal eyelets', '1x1 rib cuffs and waistband with spandex for recovery', 'Warm for cold cabins and airport floors, breathable enough for the walk to the gate'],
      care: ['Machine wash cold, inside out, with like colours', 'Mild detergent, no bleach or fabric softener (it flattens the brushed fleece)', 'Lay flat or hang to dry; tumble dry low if needed', 'Do not iron the print or embroidery', 'Do not dry clean'],
      chart: { points: ['Chest (pit to pit)', 'Body length (HPS)', 'Sleeve length (shoulder seam)'], rows: { S: [22.5, 27, 24], M: [23.5, 28, 24.5], L: [24.5, 29, 25], XL: [25.5, 30, 25.5], XXL: [26.5, 31, 26] } },
      shrink: 'Pre-shrunk. Expect under 3% after washing; air dry to keep the fleece lofty.',
    },
    cap: {
      fit: 'Unstructured six-panel, low crown, adjustable strapback. Fits most heads (21.5–23.5 in / 55–60 cm).',
      fabric: ['100% washed cotton twill', 'Unstructured crown, pre-curved visor', 'Embroidered eyelets, adjustable strapback with metal clasp'],
      care: ['Spot clean with a damp cloth and mild soap', 'Hand wash cold if needed; reshape and air dry', 'Do not machine wash or tumble dry'],
    },
    beanie: {
      fit: 'One size, stretches to fit. Wear it slouched or with the cuff folded.',
      fabric: ['Soft merino wool and cotton blend rib knit', 'Folded cuff with woven patch', 'Warm, breathable, packs into a pocket'],
      care: ['Hand wash cold with wool-safe detergent', 'Reshape and dry flat', 'Do not tumble dry'],
    },
    socks: {
      fit: 'Crew height with a cushioned foot. S/M fits US men’s 6–9 / women’s 7–10; L/XL fits US men’s 9.5–13.',
      fabric: ['Combed cotton with nylon and spandex for stretch', 'Cushioned sole and reinforced heel and toe', 'Ribbed arch support'],
      care: ['Machine wash cold, inside out', 'Tumble dry low', 'No bleach'],
    },
    tote: {
      fit: 'Holds a 14" laptop, a camera and a jacket. Long handles go over the shoulder.',
      fabric: ['Heavy cotton canvas', 'Reinforced handle stitching', 'Flat bottom'],
      care: ['Spot clean', 'Hand wash cold if needed and air dry', 'Do not tumble dry'],
    },
  },

  /* Colours the guide suggests wearing with each colourway ("Pairs well with"). */
  pairPalette: [
    { name: 'Obsidian', hex: '#121214' }, { name: 'Hudson Haze', hex: '#e4e1da' }, { name: 'Bridge Grey', hex: '#a8aba8' },
    { name: 'Raw Denim', hex: '#2b3a55' }, { name: 'Oak Brown', hex: '#6e5034' }, { name: 'Olive', hex: '#4b5a32' },
    { name: 'Sand', hex: '#d2c4b0' }, { name: 'Bone', hex: '#e8e0d4' }, { name: 'Tail Red', hex: '#7a2430' }, { name: 'Racing Blue', hex: '#364679' },
  ],

  /* ----------------------------------------------------------
   * PROMOS — the cards that lead the shop's 3D hero carousel, ahead of
   * one card per collection (made from `categories` automatically).
   * Each: eyebrow, title, note, cta (button text) and what a tap does:
   *   cat:   a gate (category id below)
   *   sort:  'new' | 'price-asc' | 'price-desc'
   *   avail: 'pickup' | 'digital' | 'ships'
   *   href:  any link instead (a drop page, a story…)
   * image is optional: it defaults to a photo of a matching piece.
   * A promo with no matching pieces is skipped.
   * -------------------------------------------------------- */
  promos: [
    { eyebrow: 'Just landed', title: 'New drops', note: 'The newest pieces at the kiosk, first off the plane.', sort: 'new', cta: 'See new drops' },
    { eyebrow: 'Collect in person', title: 'Pickup only', note: 'Pieces you can only collect at the kiosk.', avail: 'pickup', cta: 'See pickup pieces' },
    { eyebrow: 'Instant download', title: 'Digital', note: 'Films and LUT packs, delivered straight away.', avail: 'digital', cta: 'See downloads' },
  ],

  categories: [
    { id: 'quotes', label: 'Words to wear', kind: 'physical' },
    { id: 'travel', label: 'Travel goods', kind: 'physical' },
    { id: 'hunt', label: 'Lost & Found', kind: 'physical' },
    { id: 'apparel', label: 'Apparel', kind: 'physical' },
    { id: 'headwear', label: 'Headwear', kind: 'physical' },
    { id: 'skate', label: 'Skate', kind: 'physical' },
    { id: 'accessories', label: 'Accessories', kind: 'physical' },
    { id: 'films', label: 'Films', kind: 'digital' },
    { id: 'luts', label: 'LUT Packs', kind: 'digital' },
  ],

  products: [
    /* ---- Words to wear: small K on the chest, the quote on the back ---- */
    {
      id: 'tee-q-direction', category: 'quotes', store: 'kiosk', title: 'Direction Tee', price: 42, badge: 'New', added: '2026-10-13',
      detail: 'Supima® cotton jersey · small K on the chest · quote hand-lettered small over the right shoulder blade',
      quote: 'Focus on direction, not speed.',
      mockup: { type: 'tee', chest: true, quote: 'Focus on direction, not speed.', quoteStyle: 'serif', quoteFont: 'quill' },
      colorways: [
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' },
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['urban', 'travel', 'clean'], colors: [],
    },
    {
      id: 'hoodie-q-exist', category: 'quotes', store: 'kiosk', title: 'Make It Exist Hoodie', price: 98, badge: 'New', added: '2026-10-13',
      detail: 'Brushed-back cotton fleece · small K on the chest · quote embroidered small over the right shoulder blade',
      quote: 'Just make it exist first. You can make it good later.',
      mockup: { type: 'hoodie', chest: true, quote: 'Just make it exist first. You can make it good later.', quoteStyle: 'grotesk', quoteFont: 'hand', quoteFinish: 'stitch' },
      colorways: [
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
        { name: 'Bridge Grey', garment: '#a8aba8', ink: '#121214' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['urban', 'travel', 'clean'], colors: [],
    },
    {
      id: 'tee-q-curious', category: 'quotes', store: 'kiosk', title: 'Curious Tee', price: 42, badge: 'New', added: '2026-10-13',
      detail: 'Supima® cotton jersey · small K on the chest · quote hand-lettered small over the right shoulder blade',
      quote: 'The future belongs to the curious.',
      mockup: { type: 'tee', chest: true, quote: 'The future belongs to the curious.', quoteStyle: 'serif', quoteFont: 'fell' },
      colorways: [
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' },
        { name: 'Hudson Blue', garment: '#3b6b92', ink: '#f2f0eb' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['urban', 'travel', 'clean'], colors: [],
    },
    {
      id: 'hoodie-q-nets', category: 'quotes', store: 'kiosk', title: 'Repair The Nets Hoodie', price: 98, badge: 'New', added: '2026-10-13',
      detail: 'Brushed-back cotton fleece · small K on the chest · quote embroidered small over the right shoulder blade',
      quote: 'When fishermen cannot go to sea, they repair nets.',
      mockup: { type: 'hoodie', chest: true, quote: 'When fishermen cannot go to sea, they repair nets.', quoteStyle: 'serif', quoteFont: 'flourish', quoteFinish: 'stitch' },
      colorways: [
        { name: 'Oak Brown', garment: '#6e5034', ink: '#ece9e1' },
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['urban', 'travel', 'clean'], colors: [],
    },
    {
      id: 'tee-q-spiral', category: 'quotes', store: 'kiosk', title: 'Spiral Tee', price: 42, badge: 'New', added: '2026-10-13',
      detail: 'Supima® cotton jersey · small K on the chest · quote embroidered small over the right shoulder blade',
      quote: 'Life is a spiral, not a straight line.',
      mockup: { type: 'tee', chest: true, quote: 'Life is a spiral, not a straight line.', quoteStyle: 'grotesk', quoteFont: 'quill', quoteFinish: 'stitch' },
      colorways: [
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' },
        { name: 'Carbon', garment: '#14181d', ink: '#f2f0eb' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['urban', 'travel', 'clean'], colors: [],
    },
    {
      id: 'tee-q-tired', category: 'quotes', store: 'kiosk', title: 'Do It Tired Tee', price: 42, badge: 'New', added: '2026-10-13',
      detail: 'Supima® cotton jersey · small K on the chest · quote hand-lettered small over the right shoulder blade',
      quote: 'If you are tired, do it tired.',
      mockup: { type: 'tee', chest: true, quote: 'If you are tired, do it tired.', quoteStyle: 'grotesk', quoteFont: 'hand' },
      colorways: [
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
        { name: 'Racing Blue', garment: '#364679', ink: '#f2f0eb' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['urban', 'travel', 'clean'], colors: [],
    },
    {
      id: 'hoodie-q-glitch', category: 'quotes', store: 'kiosk', title: 'Glitch Hoodie', price: 98, badge: 'New', added: '2026-10-13',
      detail: 'Brushed-back cotton fleece · small K on the chest · quote embroidered small over the right shoulder blade',
      quote: 'Be the glitch you want to see in the matrix.',
      mockup: { type: 'hoodie', chest: true, quote: 'Be the glitch you want to see in the matrix.', quoteStyle: 'grotesk', quoteFont: 'fell', quoteFinish: 'stitch' },
      colorways: [
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['urban', 'travel', 'clean'], colors: [],
    },
    {
      id: 'tee-q-understand', category: 'quotes', store: 'kiosk', title: 'Others Don’t Understand Tee', price: 42, badge: 'New', added: '2026-10-13',
      detail: 'Supima® cotton jersey · small K on the chest · quote hand-lettered small over the right shoulder blade',
      quote: 'It’s okay to live a life others don’t understand.',
      mockup: { type: 'tee', chest: true, quote: 'It’s okay to live a life others don’t understand.', quoteStyle: 'serif', quoteFont: 'flourish' },
      colorways: [
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' },
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter', 'spring'], vibes: ['urban', 'travel', 'clean'], colors: [],
    },
    /* ---- Travel goods ---- */
    {
      id: 'tote-q-curious', category: 'travel', store: 'kiosk', title: 'Carry-On Tote', price: 34, badge: 'New', added: '2026-10-13',
      detail: 'Heavy canvas · fits a 14" laptop and a camera',
      quote: 'The future belongs to the curious.',
      mockup: { type: 'tote', print: 'quote', quote: 'The future belongs to the curious.', quoteStyle: 'serif', quoteFont: 'hand', printW: 128 },
      colorways: [{ name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' }, { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' }],
      sizes: ['One size'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['spring', 'summer', 'fall'], vibes: ['travel', 'clean'], colors: [],
    },
    {
      id: 'tag-luggage', category: 'travel', store: 'kiosk', title: 'Luggage Tag', price: 22, badge: 'New', added: '2026-10-13',
      detail: 'Leather tag · K mark · address card inside',
      mockup: { type: 'keytag' },
      colorways: [{ name: 'Oak Brown', garment: '#6e5034', ink: '#ece9e1' }, { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' }],
      sizes: ['One size'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['spring', 'summer', 'fall', 'winter'], vibes: ['travel'], colors: [],
    },
    {
      id: 'stickers-q', category: 'travel', store: 'kiosk', title: 'Passport Sticker Pack', price: 10, badge: 'New', added: '2026-10-13',
      detail: 'Six vinyl stickers for cases, decks and laptops',
      mockup: { type: 'stickers' },
      colorways: [{ name: 'Mixed', garment: '#e4e1da', ink: '#121214' }],
      sizes: ['One size'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['spring', 'summer', 'fall', 'winter'], vibes: ['travel', 'urban'], colors: [],
    },
    /* ---- Lost & Found: pickup-only pieces. Travel to the coordinates to collect.
     * pickup.coords stays empty until you announce the drop. ---- */
    {
      id: 'hunt-hudson-hoodie', category: 'hunt', store: 'kiosk', title: 'Hudson Valley Find Hoodie', price: 120, badge: 'Pickup only', added: '2026-10-13',
      detail: 'Numbered run · collect in person · the quote changes with every drop',
      quote: 'Focus on direction, not speed.',
      mockup: { type: 'hoodie', chest: true, quote: 'Focus on direction, not speed.', quoteStyle: 'serif', quoteFont: 'quill', quoteFinish: 'stitch' },
      colorways: [{ name: 'Oak Brown', garment: '#6e5034', ink: '#ece9e1' }],
      sizes: ['S', 'M', 'L', 'XL'],
      // area: the map shows this zone until the exact coordinates drop
      pickup: { place: 'Hudson Valley, NY', area: { lat: 41.71, lon: -73.93, radiusKm: 40 }, coords: '', window: 'Date announced in the Dispatch', note: 'Packed and cleared by us. You travel to the coordinates to collect it.' },
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter'], vibes: ['travel', 'adventure'], colors: [],
    },
    {
      id: 'hunt-bridge-tee', category: 'hunt', store: 'kiosk', title: 'Under the Bridge Find Tee', price: 60, badge: 'Pickup only', added: '2026-10-13',
      detail: 'Numbered run · collect in person at the bridge',
      quote: 'When fishermen cannot go to sea, they repair nets.',
      mockup: { type: 'tee', chest: true, quote: 'When fishermen cannot go to sea, they repair nets.', quoteStyle: 'serif', quoteFont: 'fell' },
      colorways: [{ name: 'Racing Blue', garment: '#364679', ink: '#f2f0eb' }],
      sizes: ['S', 'M', 'L', 'XL'],
      pickup: { place: 'George Washington Bridge, NY / NJ', area: { lat: 40.8517, lon: -73.9527, radiusKm: 2 }, coords: '', window: 'Date announced in the Dispatch', note: 'Packed and cleared by us. You travel to the coordinates to collect it.' },
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['spring', 'summer'], vibes: ['travel', 'adventure'], colors: [],
    },
    /* ---- Apparel ---- */
    {
      id: 'tee-hudson', category: 'apparel', title: 'Hudson Line Tee', price: 42, badge: 'Issue 01', added: '2026-10-01',
      detail: 'Heavyweight cotton · boxy fit · screen print',
      mockup: { type: 'tee', print: 'hudson' },
      colorways: [
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
        { name: 'Hudson Blue', garment: '#3b6b92', ink: '#f2f0eb' },
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' },
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
        { name: 'Bridge Grey', garment: '#a8aba8', ink: '#121214' },
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
        { name: 'Oak Brown', garment: '#6e5034', ink: '#ece9e1' },
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
        { name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' },
        { name: 'Obsidian', garment: '#121214', ink: '#f2f0eb' },
        { name: 'Racing Blue', garment: '#364679', ink: '#f2f0eb' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['summer', 'spring'], vibes: ['urban', 'clean', 'dusk'], colors: [],
    },
    /* ---- Lookbook: six prints shot on the street and in the terminal
     * (images/product-lifestyle/, docs/APPAREL_LIFESTYLE_LOOKBOOK.md).
     * Colourways marked status: 'soon' aren't in Shopify yet. ---- */
    {
      id: 'ess-hoodie', category: 'apparel', title: 'Essential Hoodie #001', design: 'Emblem', price: 89.99, badge: 'Classic', added: '2025-11-01',
      detail: 'Brushed fleece · large KIOSK monogram and wordmark across the chest',
      description: 'The original KIOSK hoodie. The full double-K monogram and wordmark, printed big across the chest of a heavy brushed fleece, the same mark as the Box Mark tee scaled up for the hood. Shot on the street and in the terminal.',
      mockup: { type: 'hoodie', print: 'kmark', printW: 56 },
      colorways: [
        { name: 'Black', garment: '#0a0a0a', ink: '#f2f0eb', shopifyHandle: '001-black-hoodie', image: 'images/shop/3d/ess-hoodie-0.webp', lifestyle: ['images/product-lifestyle/hoodies/001-black-street-01.webp', 'images/product-lifestyle/hoodies/001-black-airport-01.webp'] },
        { name: 'White', garment: '#f1efe9', ink: '#141414', shopifyHandle: '001-white-hoodie', image: 'images/shop/3d/ess-hoodie-1.webp' },
        { name: 'Oat', garment: '#c4b5a0', ink: '#141414', shopifyHandle: '001-oat-hoodie', status: 'soon', lifestyle: ['images/product-lifestyle/hoodies/001-oat-street-01.webp', 'images/product-lifestyle/hoodies/001-oat-airport-01.webp'] },
        { name: 'Charcoal', garment: '#2c2c2c', ink: '#ece9e1', shopifyHandle: '001-charcoal-hoodie', status: 'soon', lifestyle: ['images/product-lifestyle/hoodies/001-charcoal-street-01.webp', 'images/product-lifestyle/hoodies/001-charcoal-airport-01.webp'] },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'available', shopifyHandle: '001-black-hoodie', href: '', image: '',
      seasons: ['fall', 'winter'], vibes: ['clean', 'urban', 'night', 'travel'], colors: ['Obsidian', 'Carbon'],
    },
    {
      id: 'ess-tee', category: 'apparel', title: 'Essential Tee #001', design: 'Box Mark', price: 39.99, badge: 'Classic', added: '2025-11-01',
      detail: 'Heavyweight cotton · KIOSK box mark centred on the chest',
      description: 'The original KIOSK tee. The double-K monogram over the wordmark, centred on the chest in a heavy, high-contrast print from the box-logo family. Shot on the street and in the terminal.',
      mockup: { type: 'tee', print: 'wordmark' },
      colorways: [
        { name: 'Black', garment: '#0a0a0a', ink: '#f2f0eb', shopifyHandle: '001-black-tshirt', image: 'images/shop/3d/ess-tee-0.webp', lifestyle: ['images/product-lifestyle/tees/001-black-street-01.webp', 'images/product-lifestyle/tees/001-black-airport-01.webp'] },
        { name: 'White', garment: '#f1efe9', ink: '#141414', shopifyHandle: '001-white-tshirt', image: 'images/shop/3d/ess-tee-1.webp' },
        { name: 'Oat', garment: '#c4b5a0', ink: '#141414', shopifyHandle: '001-oat-tshirt', status: 'soon', lifestyle: ['images/product-lifestyle/tees/001-oat-street-01.webp', 'images/product-lifestyle/tees/001-oat-airport-01.webp'] },
        { name: 'Charcoal', garment: '#2c2c2c', ink: '#cfcdc8', shopifyHandle: '001-charcoal-tshirt', status: 'soon', lifestyle: ['images/product-lifestyle/tees/001-charcoal-street-01.webp', 'images/product-lifestyle/tees/001-charcoal-airport-01.webp'] },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'available', shopifyHandle: '001-black-tshirt', href: '', image: '',
      seasons: ['summer', 'spring'], vibes: ['clean', 'urban', 'daylight', 'travel'], colors: ['Obsidian', 'Hudson Haze'],
    },
    {
      id: 'tee-002-stack', category: 'apparel', title: 'Wordmark Stack Tee #002', design: 'Wordmark Stack', price: 39.99, badge: 'Lookbook', added: '2026-10-14',
      detail: 'Heavyweight cotton · stacked KIOSK wordmark, left of centre',
      description: 'A small-to-medium stacked KIOSK wordmark set just off-centre on the chest. Quiet enough for the flight, loud enough for the street. Shot on the street and in the terminal.',
      mockup: { type: 'tee', print: 'wordmark' },
      colorways: [
        { name: 'White', garment: '#f5f5f5', ink: '#141414', shopifyHandle: '002-white-tshirt', lifestyle: ['images/product-lifestyle/tees/002-white-street-01.webp', 'images/product-lifestyle/tees/002-white-airport-01.webp'] },
        { name: 'Stone', garment: '#9a9690', ink: '#141414', shopifyHandle: '002-stone-tshirt', lifestyle: ['images/product-lifestyle/tees/002-stone-street-01.webp', 'images/product-lifestyle/tees/002-stone-airport-01.webp'] },
        { name: 'Bone', garment: '#e8e0d4', ink: '#4b5a32', shopifyHandle: '002-bone-tshirt', lifestyle: ['images/product-lifestyle/tees/002-bone-street-01.webp', 'images/product-lifestyle/tees/002-bone-airport-01.webp'] },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '002-white-tshirt', href: '', image: '',
      seasons: ['spring', 'summer'], vibes: ['clean', 'travel', 'daylight'], colors: ['Hudson Haze'],
    },
    {
      id: 'tee-003-terminal', category: 'apparel', title: 'Terminal Code Tee #003', design: 'Terminal Code', price: 39.99, badge: 'Lookbook', added: '2026-10-14',
      detail: 'Heavyweight cotton · minimal left-chest departures-board type',
      description: 'Ultra-minimal: thin horizontal rules and tiny “ONLY AT THE KIOSK” type on the left chest, set like a departures board. Made for the terminal. Shot on the street and in the terminal.',
      mockup: { type: 'tee', print: 'wordmark' },
      colorways: [
        { name: 'Black', garment: '#0a0a0a', ink: '#9a9690', shopifyHandle: '003-black-tshirt', lifestyle: ['images/product-lifestyle/tees/003-black-street-01.webp', 'images/product-lifestyle/tees/003-black-airport-01.webp'] },
        { name: 'Sand', garment: '#d2c4b0', ink: '#141414', shopifyHandle: '003-sand-tshirt', lifestyle: ['images/product-lifestyle/tees/003-sand-street-01.webp', 'images/product-lifestyle/tees/003-sand-airport-01.webp'] },
        { name: 'Slate', garment: '#4a5560', ink: '#7a2430', shopifyHandle: '003-slate-tshirt', lifestyle: ['images/product-lifestyle/tees/003-slate-street-01.webp', 'images/product-lifestyle/tees/003-slate-airport-01.webp'] },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '003-black-tshirt', href: '', image: '',
      seasons: ['fall', 'spring'], vibes: ['travel', 'urban', 'clean'], colors: ['Carbon', 'Bridge Grey'],
    },
    /* ---- Orbit Ringer Tee #004: the orbit wordmark (italic KIOSK, an arc to
     * a four-point star, a swoosh underneath) small on the chest and big
     * across the back, on a heavyweight boxy tee with a contrast ringer
     * collar. Four colourways, shot in the garage and on the East River.
     * Not in Shopify yet: add the products, then set status 'available' and
     * each colourway's shopifyHandle. ---- */
    {
      id: 'tee-004-orbit', category: 'apparel', title: 'Orbit Ringer Tee #004', design: 'Orbit', price: 45, badge: 'New', added: '2026-10-21',
      detail: '260 gsm heavyweight cotton · boxy fit, XS–3XL · contrast ringer collar · orbit wordmark on the chest and back',
      description: 'The KIOSK orbit wordmark: italic letters, a thin arc to a four-point star and a swoosh sweeping underneath, like something leaving the atmosphere. Small on the left chest, big across the back, on a heavyweight boxy tee with a contrast 1x1 rib ringer collar in the print colour. Five colourways named for where they were shot and what they look like: Yellow Cab, East River, Ultraviolet, Matcha and Blackout, a washed charcoal with a tonal black print.',
      mockup: { type: 'tee', chest: true, chestPrint: 'orbit', backPrint: 'orbit', backW: 150 },
      colorways: [
        { name: 'Yellow Cab', garment: '#f5d547', ink: '#c8211e', rib: '#c8211e', lifestyle: ['images/product-lifestyle/tees/004-yellowcab-street-01.webp', 'images/product-lifestyle/tees/004-yellowcab-garage-01.webp', 'images/product-lifestyle/tees/004-yellowcab-back-01.webp', 'images/product-lifestyle/tees/004-yellowcab-chest-01.webp'],
          lifestyleAlt: ['front, leaning on a black door', 'full look by a motorcycle in the garage', 'red orbit wordmark across the back', 'close-up of the red ringer collar and chest mark'] },
        { name: 'East River', garment: '#a9c8ec', ink: '#14275e', rib: '#1a2a5a', lifestyle: ['images/product-lifestyle/tees/004-eastriver-street-01.webp', 'images/product-lifestyle/tees/004-eastriver-bridge-01.webp', 'images/product-lifestyle/tees/004-eastriver-back-01.webp', 'images/product-lifestyle/tees/004-eastriver-chest-01.webp'],
          lifestyleAlt: ['front, sitting by the Brooklyn Bridge', 'full look on the East River promenade', 'navy orbit wordmark across the back', 'close-up of the navy ringer collar and chest mark'] },
        { name: 'Ultraviolet', garment: '#3d2560', ink: '#b48ff0', rib: '#b796ec', lifestyle: ['images/product-lifestyle/tees/004-ultraviolet-street-01.webp', 'images/product-lifestyle/tees/004-ultraviolet-garage-01.webp', 'images/product-lifestyle/tees/004-ultraviolet-back-01.webp', 'images/product-lifestyle/tees/004-ultraviolet-chest-01.webp'],
          lifestyleAlt: ['front, sitting by the Brooklyn Bridge', 'full look by a motorcycle in the garage', 'lilac orbit wordmark across the back', 'close-up of the lilac ringer collar and chest mark'] },
        { name: 'Matcha', garment: '#c4e3a8', ink: '#0f4d2b', rib: '#0f4d2b', lifestyle: ['images/product-lifestyle/tees/004-matcha-street-01.webp', 'images/product-lifestyle/tees/004-matcha-garage-01.webp', 'images/product-lifestyle/tees/004-matcha-back-01.webp', 'images/product-lifestyle/tees/004-matcha-chest-01.webp'],
          lifestyleAlt: ['front, sitting by the Brooklyn Bridge', 'full look in front of a roller door', 'forest green orbit wordmark across the back', 'close-up of the green ringer collar and chest mark'] },
        { name: 'Blackout', garment: '#3b3b3d', ink: '#19191a', rib: '#2f2f31', lifestyle: ['images/product-lifestyle/tees/004-blackout-street-01.webp', 'images/product-lifestyle/tees/004-blackout-garage-01.webp', 'images/product-lifestyle/tees/004-blackout-back-01.webp', 'images/product-lifestyle/tees/004-blackout-chest-01.webp'],
          lifestyleAlt: ['front, sitting in front of a motorcycle', 'full look by a motorcycle in the garage', 'tonal black orbit wordmark across the back', 'close-up of the tonal chest mark on washed charcoal'] },
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
      guide: {
        fit: 'Boxy and slightly oversized: dropped shoulder, wide body, hem on the hip and a sleeve that ends near the elbow. Take your usual size; size down one for a closer fit.',
        fabric: ['100% combed cotton heavyweight jersey, 260 gsm', 'Garment-dyed and enzyme-washed for a soft, broken-in hand', 'Pre-shrunk: under 3% after washing', 'Contrast 1x1 rib ringer collar, 2.5 cm, dyed to the print colour', 'Twin-needle sleeve and bottom hems', 'Screen-printed orbit wordmark: small on the left chest, large across the back'],
        care: ['Machine wash cold, inside out, with like colours', 'Mild detergent, no bleach or fabric softener', 'Hang dry or tumble dry low', 'Warm iron inside out; never iron the print', 'Do not dry clean'],
        chart: {
          points: ['Chest (pit to pit)', 'Body length (HPS)', 'Sleeve length (shoulder seam)'],
          rows: { XS: [21.5, 27, 8.5], S: [22.5, 28, 8.75], M: [23.5, 29, 9], L: [24.5, 30, 9.25], XL: [25.5, 31, 9.5], '2XL': [27, 32, 9.75], '3XL': [28.5, 33, 10] },
        },
        fitsChest: { XS: '32–34', S: '34–37', M: '37–40', L: '40–43', XL: '43–46', '2XL': '46–50', '3XL': '50–54' },
        shrink: 'Pre-shrunk and garment-washed. Expect under 3% after washing; wash cold and hang dry to keep the exact fit.',
      },
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['summer', 'spring'], vibes: ['urban', 'travel', 'dusk'], colors: ['Raw Denim', 'Carbon'],
    },
    /* ---- Liftoff Retro Tee #005: the retro orbit mark (a tall K, IOSK
     * beside it, an orbit swoosh to a star) printed cracked, like a tee from
     * a 70s launch. Original Cream wears it big on the front and back with
     * racing stripes; the three ringer colourways carry it small on the chest
     * and big across the back. Photos and flats from the Retro Tee lookbook.
     * Not in Shopify yet: add the products, then set status 'available' and
     * each colourway's shopifyHandle. ---- */
    {
      id: 'tee-005-liftoff', category: 'apparel', title: 'Liftoff Retro Tee #005', design: 'Liftoff', price: 45, badge: 'New', added: '2026-10-21',
      detail: '100% cotton, vintage washed · boxy fit, XS–3XL · cracked retro orbit print · made for the journey',
      description: 'A tee that looks like it flew the 70s space programme and came home: a tall italic K with IOSK tucked beside it, an orbit swoosh swinging round to a four-point star, printed cracked and faded like it has been washed a hundred times. Original Cream wears it big on the front and back with red, orange and yellow racing stripes. Yellow + Red, Light Blue + Navy and Coal Grey + Black carry it small on the chest and big across the back, with a ringer collar and a woven K label at the neck.',
      mockup: { type: 'tee', chest: true, chestPrint: 'retro', backPrint: 'retro', backW: 150 },
      colorways: [
        { name: 'Original Cream', garment: '#ece3cf', ink: '#b8382a', mockup: { chest: false, print: 'retro', printW: 150, stripes: ['#de7530', '#e7b03c'] }, lifestyle: ['images/product-lifestyle/tees/005-cream-front-01.webp', 'images/product-lifestyle/tees/005-cream-back-01.webp'],
          lifestyleAlt: ['front, big retro print with racing stripes against a roller door', 'retro K and racing stripes across the back'] },
        { name: 'Yellow + Red', garment: '#f3d35a', ink: '#cf2a20', rib: '#c8211e', lifestyle: ['images/product-lifestyle/tees/005-yellow-front-01.webp', 'images/product-lifestyle/tees/005-yellow-back-01.webp'],
          lifestyleAlt: ['front, red ringer collar and chest mark under a yellow awning', 'red retro orbit mark across the back'],
          image: 'images/product-lifestyle/tees/005-yellow-flat-back.webp', imageFront: 'images/product-lifestyle/tees/005-yellow-flat-front.webp' },
        { name: 'Light Blue + Navy', garment: '#a9c9ea', ink: '#1d3561', rib: '#1a2a4f', lifestyle: ['images/product-lifestyle/tees/005-lightblue-front-01.webp', 'images/product-lifestyle/tees/005-lightblue-back-01.webp'],
          lifestyleAlt: ['front, sitting by the river with the skyline behind', 'navy retro orbit mark across the back, facing the skyline'],
          image: 'images/product-lifestyle/tees/005-lightblue-flat-back.webp', imageFront: 'images/product-lifestyle/tees/005-lightblue-flat-front.webp' },
        { name: 'Coal Grey + Black', garment: '#4a4a4c', ink: '#1c1c1d', rib: '#2a2a2c', lifestyle: ['images/product-lifestyle/tees/005-coalgrey-front-01.webp', 'images/product-lifestyle/tees/005-coalgrey-back-01.webp'],
          lifestyleAlt: ['front, tonal chest mark on washed coal grey', 'tonal black retro orbit mark across the back'],
          image: 'images/product-lifestyle/tees/005-coalgrey-flat-back.webp', imageFront: 'images/product-lifestyle/tees/005-coalgrey-flat-front.webp' },
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
      guide: {
        fit: 'Boxy and slightly oversized: dropped shoulder, wide body, hem on the hip and a sleeve that ends near the elbow. Take your usual size; size down one for a closer fit.',
        fabric: ['100% cotton heavyweight jersey', 'Vintage-washed for a soft, faded, broken-in hand', 'Pre-shrunk: under 3% after washing', '1x1 rib collar: contrast ringer on Yellow + Red and Light Blue + Navy, tonal on Coal Grey + Black and Original Cream', 'Woven K label at the back neck', 'Cracked-finish retro orbit print: small on the chest and large across the back (big on both sides on Original Cream)'],
        care: ['Machine wash cold, inside out, with like colours', 'Mild detergent, no bleach or fabric softener', 'Hang dry or tumble dry low', 'Never iron the print; the cracks are meant to be there', 'Do not dry clean'],
        chart: {
          points: ['Chest (pit to pit)', 'Body length (HPS)', 'Sleeve length (shoulder seam)'],
          rows: { XS: [21.5, 27, 8.5], S: [22.5, 28, 8.75], M: [23.5, 29, 9], L: [24.5, 30, 9.25], XL: [25.5, 31, 9.5], '2XL': [27, 32, 9.75], '3XL': [28.5, 33, 10] },
        },
        fitsChest: { XS: '32–34', S: '34–37', M: '37–40', L: '40–43', XL: '43–46', '2XL': '46–50', '3XL': '50–54' },
        shrink: 'Pre-shrunk and vintage-washed. Expect under 3% after washing; wash cold and hang dry to keep the exact fit.',
      },
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['summer', 'spring'], vibes: ['urban', 'vintage', 'golden-hour'], colors: ['Sand', 'Carbon'],
    },
    {
      id: 'hoodie-002-stamp', category: 'apparel', title: 'Travel Stamp Hoodie #002', design: 'Travel Stamp', price: 89.99, badge: 'Lookbook', added: '2026-10-14',
      detail: 'Brushed fleece · passport-stamp KIOSK mark, mid-chest',
      description: 'A KIOSK mark set like a passport stamp in the middle of the chest: the airport hoodie, for long-haul seats and early gates. Shot on the street and in the terminal.',
      mockup: { type: 'hoodie', print: 'kmark', printW: 50 },
      colorways: [
        { name: 'Heather', garment: '#8e8e8e', ink: '#141414', shopifyHandle: '002-heather-hoodie', lifestyle: ['images/product-lifestyle/hoodies/002-heather-street-01.webp', 'images/product-lifestyle/hoodies/002-heather-airport-01.webp'] },
        { name: 'Sand', garment: '#d2c4b0', ink: '#141414', shopifyHandle: '002-sand-hoodie', lifestyle: ['images/product-lifestyle/hoodies/002-sand-street-01.webp', 'images/product-lifestyle/hoodies/002-sand-airport-01.webp'] },
        { name: 'Bone', garment: '#e8e0d4', ink: '#4b5a32', shopifyHandle: '002-bone-hoodie', lifestyle: ['images/product-lifestyle/hoodies/002-bone-street-01.webp', 'images/product-lifestyle/hoodies/002-bone-airport-01.webp'] },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '002-heather-hoodie', href: '', image: '',
      seasons: ['fall', 'winter'], vibes: ['travel', 'clean', 'warm'], colors: ['Bridge Grey'],
    },
    {
      id: 'hoodie-003-bar', category: 'apparel', title: 'Quiet Bar Hoodie #003', design: 'Quiet Bar', price: 89.99, badge: 'Lookbook', added: '2026-10-14',
      detail: 'Brushed fleece · one bar across the chest, tiny wordmark below',
      description: 'A single horizontal bar across the chest with a tiny KIOSK wordmark underneath. Quiet luxury for the lounge and the long way home. Shot on the street and in the terminal.',
      mockup: { type: 'hoodie', print: 'kmark', printW: 40 },
      colorways: [
        { name: 'Black', garment: '#0a0a0a', ink: '#6b6b6b', shopifyHandle: '003-black-hoodie', lifestyle: ['images/product-lifestyle/hoodies/003-black-street-01.webp', 'images/product-lifestyle/hoodies/003-black-airport-01.webp'] },
        { name: 'White', garment: '#f5f5f5', ink: '#141414', shopifyHandle: '003-white-hoodie', lifestyle: ['images/product-lifestyle/hoodies/003-white-street-01.webp', 'images/product-lifestyle/hoodies/003-white-airport-01.webp'] },
        { name: 'Taupe', garment: '#8b7e6e', ink: '#141414', shopifyHandle: '003-taupe-hoodie', lifestyle: ['images/product-lifestyle/hoodies/003-taupe-street-01.webp', 'images/product-lifestyle/hoodies/003-taupe-airport-01.webp'] },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      status: 'soon', shopifyHandle: '003-black-hoodie', href: '', image: '',
      seasons: ['fall', 'winter'], vibes: ['clean', 'warm', 'travel'], colors: ['Carbon'],
    },
    /* ---- KIOSK Globe Hoodie #004: the globe mark small on the chest and big
     * across the back, a heavy oversized fit graded XS–4XL. The full tech
     * pack (fabric, construction, print placement, points of measure) lives
     * in the "KIOSK Globe Hoodie — Tech Pack" doc; the size chart below is
     * its finished measurements in inches. Not in Shopify yet: add the three
     * products, then set status 'available' and each shopifyHandle. ---- */
    {
      id: 'globe-hoodie', category: 'apparel', title: 'KIOSK Globe Hoodie #004', design: 'Globe', price: 98, badge: 'New', added: '2026-10-21',
      detail: '450 gsm heavyweight fleece · oversized boxy fit, XS–4XL · globe mark on the left chest and across the back',
      description: 'The KIOSK globe, small over the heart and big across the back: the grid, the continents, the orbit ring and the star, with the wordmark across the equator. Cut oversized and boxy from a 450 gsm brushed-back fleece, with a dropped shoulder, a clean double-layer hood (no drawcord) and firm 8 cm rib cuffs and hem, so it hangs the same way on every size from XS to 4XL. Black with a worn-in chrome print, white with black line art, or espresso with cream.',
      mockup: { type: 'hoodie', chest: true, chestPrint: 'globe', backPrint: 'globe', backW: 150, drawcord: false },
      colorways: [
        { name: 'Black / Chrome', garment: '#1b1b1c', ink: '#c9cacc', lifestyle: ['images/product-lifestyle/hoodies/004-black-street-01.webp', 'images/product-lifestyle/hoodies/004-black-back-01.webp', 'images/product-lifestyle/hoodies/004-black-chest-01.webp', 'images/product-lifestyle/hoodies/004-black-duo-01.webp'],
          lifestyleAlt: ['front, worn with black cargos on concrete steps', 'back print, walking away under the overpass', 'close-up of the chrome globe on the left chest', 'front and back, two wearers'] },
        { name: 'White', garment: '#f4f3ef', ink: '#141414', lifestyle: ['images/product-lifestyle/hoodies/004-white-street-01.webp', 'images/product-lifestyle/hoodies/004-white-back-01.webp', 'images/product-lifestyle/hoodies/004-white-chest-01.webp', 'images/product-lifestyle/hoodies/004-white-duo-01.webp'],
          lifestyleAlt: ['front, worn with black cargos on concrete steps', 'back print in black line art, walking away', 'close-up of the globe on the left chest', 'front and back, two wearers'] },
        { name: 'Espresso', garment: '#4a2e22', ink: '#e9dcc2', lifestyle: ['images/product-lifestyle/hoodies/004-espresso-street-01.webp', 'images/product-lifestyle/hoodies/004-espresso-back-01.webp', 'images/product-lifestyle/hoodies/004-espresso-chest-01.webp', 'images/product-lifestyle/hoodies/004-espresso-duo-01.webp'],
          lifestyleAlt: ['front, worn with black cargos on concrete steps', 'close-up of the cream globe across the back', 'front, hands in the pocket', 'front and back, two wearers'] },
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
      // Fit model: fill in Preston's real height and the size he wears in the shoot; the line shows once both are set
      model: { name: 'Preston', height: '', size: '' },
      guide: {
        fit: 'Oversized and boxy: dropped shoulder, wide body, hem on the hip and a relaxed sleeve gathered at the cuff. Take your usual size for the oversized fit, or size down one for a closer fit. The bigger sizes grow wider, not longer, so the shape stays the same from XS to 4XL.',
        fabric: ['Heavyweight brushed-back fleece, 450 gsm, 100% combed ring-spun cotton', 'Garment-dyed and enzyme-washed (white is piece-dyed) for a soft, lived-in hand', 'Pre-shrunk: under 3% after washing', 'Double-layer three-panel hood that stands up, no drawcord', '8 cm 1x1 rib cuffs and hem with 5% elastane for recovery', 'Screen-printed globe: chrome on black, black line art on white, cream on espresso'],
        care: ['Machine wash cold, inside out, with like colours', 'Mild detergent, no bleach or fabric softener', 'Tumble dry low or hang to dry', 'Cool iron inside out; never iron the print', 'Do not dry clean'],
        chart: {
          points: ['Chest (pit to pit)', 'Body length (HPS)', 'Sleeve length (shoulder seam)'],
          rows: { XS: [24.4, 26.8, 22], S: [25.6, 27.6, 22.4], M: [26.8, 28.3, 22.8], L: [28, 29.1, 23.2], XL: [29.1, 29.9, 23.6], '2XL': [30.7, 30.7, 24], '3XL': [32.3, 31.5, 24.4], '4XL': [33.9, 32.3, 24.8] },
        },
        fitsChest: { XS: '32–34', S: '34–37', M: '37–40', L: '40–43', XL: '43–46', '2XL': '46–50', '3XL': '50–54', '4XL': '54–58' },
        shrink: 'Pre-shrunk and garment-washed. Expect under 3% in length after washing; wash cold and hang dry to keep the exact fit.',
      },
      status: 'soon', shopifyHandle: '', href: '', image: '',
      seasons: ['fall', 'winter'], vibes: ['urban', 'travel', 'night', 'clean'], colors: ['Obsidian'],
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
