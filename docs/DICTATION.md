# Dictating the Journal

Every film and photo set is also a blog post in the **Journal** (`journal.html`). Each post is split into **chapters**. Until a chapter has words it stays hidden from visitors, so posts can go live now and fill in over time.

## How to send a chapter

Talk it through as a voice note, or just type it, and send it to Claude with the post and chapter:

> **Andy Q50 — the car:** "So the Q50 is Andy's daily, he's had it since…"

Claude cleans up the transcript (filler words, false starts, punctuation) without changing your voice, types it into that chapter's `body` in `js/kiosk-content.js`, and pushes it. Leave a blank line between paragraphs.

- Say "new chapter" with a heading to add one that isn't listed below.
- Pull quotes from the owner can go in as `{ type: 'quote', text, cite }` blocks.
- Nothing gets invented. If a detail is unclear (a name, a date, a part number), Claude asks before publishing it.

## Preview what's left

Add `&draft=1` to any story URL, e.g. `story.html?s=andy-q50&draft=1`, or open `journal.html?draft=1`. Draft view shows every unwritten chapter as a dashed box with its prompt, plus a "3 of 6 chapters written" counter. Visitors never see the prompts.

## Chapters by post

## Lunar New Year Meet — `lunar-new-year-meet`

Preview: `story.html?s=lunar-new-year-meet&draft=1`

| # | Chapter id | Heading | Talk about |
| --- | --- | --- | --- |
| 01 | `the-meet` | The meet | Where was it, who put it on, and what was the energy like? |
| 02 | `standouts` | The builds that stood out | Which cars caught your eye and why? |
| 03 | `the-people` | The people | Who did you meet or talk to? |
| 04 | `cutting-the-film` | Cutting the film | How is the edit coming together? |

## Real Slummy — `andy-q50`

Preview: `story.html?s=andy-q50&draft=1`

| # | Chapter id | Heading | Talk about |
| --- | --- | --- | --- |
| 01 | `meeting-andy` | Meeting Andy | How did you and Andy link up, and what made the Q50 worth a shoot? |
| 02 | `the-car` | The Q50 | What has been done to the car — stance, wheels, gold calipers? What makes it Andy’s? |
| 03 | `the-route` | Why the bridge and the parkway | Why this route? What was the plan going in? |
| 04 | `on-the-day` | On the day | How did the day go — the rollers, the statics by the spillway, anything that went wrong or right? |
| 05 | `cutting-real-slummy` | Cutting “Real Slummy” | How did the edit come together — the music, the pacing, the name? |
| 06 | `whats-next` | What’s next | What’s next for Andy, the car or the series? |

## Doom Racing × Prospect Powersports — `doom-racing-prospect-meet`

Preview: `story.html?s=doom-racing-prospect-meet&draft=1`

| # | Chapter id | Heading | Talk about |
| --- | --- | --- | --- |
| 01 | `the-meet` | The meet | What was the meet, who put it on, and how did you end up shooting it? |
| 02 | `doom-racing` | Doom Racing × Prospect Powersports | Who are Doom Racing and Prospect Powersports, and how are they connected? |
| 03 | `the-machines` | The machines | Which builds stood out and why? |
| 04 | `into-the-night` | Golden hour into the night | How did the light change from 6 p.m. to 9:30, and how did you shoot it? |
| 05 | `cutting-the-film` | Cutting the film | How is the edit coming together? |

## Under the Bridge — `moses-r1m`

Preview: `story.html?s=moses-r1m&draft=1`

| # | Chapter id | Heading | Talk about |
| --- | --- | --- | --- |
| 01 | `meeting-moses` | Meeting Moses | How did you and Moses meet, and why the R1M? |
| 02 | `the-r1m` | The R1M | What should people know about the bike — the carbon, the gold forks, the blue wheels? |
| 03 | `night-run` | The night run — 16 April | What happened on the night session? |
| 04 | `dusk-at-the-bridge` | Dusk at the bridge — 19 April | Why the George Washington Bridge, and how did the dusk shoot go? |
| 05 | `whats-next` | What’s next | What’s next for Moses and the bike? |
