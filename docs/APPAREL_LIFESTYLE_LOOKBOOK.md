# Apparel Lifestyle Lookbook — Only at The Kiosk

Starter lookbook for tees and hoodies: 6 distinct prints, 3 colorways each, streetwear + airport/travel cozy contexts.

**Brand refs:** `images/KiosK.jpg`, `images/KiosK-BOX-Logo-NO-BG.jpg`, `images/Wht-Logo.png`  
**Assets:** `images/product-lifestyle/` (`tees/`, `hoodies/`, `_staging/` JPEG sources)  
**ChatGPT prompts:** [`APPAREL_LIFESTYLE_CHATGPT_PROMPTS.md`](APPAREL_LIFESTYLE_CHATGPT_PROMPTS.md) (paste-ready for ChatGPT Create image if regenerating)

**v1 generation note:** ChatGPT MCP was not available in Cursor; hero frames were produced in-session with logo references, then normalized to WebP (≤1200px long edge). Use the ChatGPT prompt pack to refine or replace any frame.

---

## Print concepts

### Tees

| ID | Name | Graphic | Colorways |
|----|------|---------|-----------|
| 001 | Box Mark | Centered chest: KIOSK double-K monogram + wordmark (box-logo family). Heavy geometric, high-contrast print. | `black` (white print), `oat` (black print), `charcoal` (muted ink print) |
| 002 | Wordmark Stack | Small–medium stacked vertical “KIOSK” geometric wordmark, left-chest / slightly off-center. | `white` (black print), `stone` (black print), `bone` (olive print) |
| 003 | Terminal Code | Ultra-minimal left-chest: thin horizontal rules + tiny “ONLY AT THE KIOSK” / terminal-board typography. | `black` (grey print), `sand` (black print), `slate` (burgundy accent) |

### Hoodies

| ID | Name | Graphic | Colorways |
|----|------|---------|-----------|
| 001 | Emblem | Large centered chest: full KIOSK monogram + wordmark (same DNA as Box Mark, bigger for fleece). | `black` (white print), `oat` (black print), `charcoal` (off-white print) |
| 002 | Travel Stamp | Circular passport-stamp style “KIOSK” mark, mid-chest; travel/airport vibe. | `heather` (black stamp), `sand` (black stamp), `bone` (olive stamp) |
| 003 | Quiet Bar | Single horizontal bar across chest + tiny KIOSK wordmark under bar. Quiet luxury / cozy travel. | `black` (subtle grey), `white` (black), `taupe` (black) |

---

## Colorway palette

| Slug | Hex (approx) | Role |
|------|--------------|------|
| black | `#0a0a0a` | Neutral core |
| white | `#f5f5f5` | Neutral core |
| charcoal | `#2c2c2c` | Street complementary |
| oat | `#c4b5a0` | Warm travel neutral |
| sand | `#d2c4b0` | Warm travel neutral |
| stone | `#9a9690` | Neutral heather |
| heather | `#8e8e8e` | Neutral fleece |
| bone | `#e8e0d4` | Warm light |
| slate | `#4a5560` | Street complementary |
| taupe | `#8b7e6e` | Warm travel |

---

## File naming

```
images/product-lifestyle/{tees|hoodies}/{id}-{colorway}-{street|airport}-01.webp
```

Example: `images/product-lifestyle/tees/001-black-street-01.webp`

---

## Shot inventory (36 heroes)

| Print | Colorway | Street | Airport |
|-------|----------|--------|---------|
| Tee 001 Box Mark | black, oat, charcoal | ✓ | ✓ |
| Tee 002 Wordmark Stack | white, stone, bone | ✓ | ✓ |
| Tee 003 Terminal Code | black, sand, slate | ✓ | ✓ |
| Hoodie 001 Emblem | black, oat, charcoal | ✓ | ✓ |
| Hoodie 002 Travel Stamp | heather, sand, bone | ✓ | ✓ |
| Hoodie 003 Quiet Bar | black, white, taupe | ✓ | ✓ |

---

## Shopify handle mapping (suggested)

Map lookbook colorways to existing catalog handles where they match black/white; other colorways are new variants to add in Shopify when ready.

### T-shirts

| Lookbook file stem | Suggested Shopify handle | Notes |
|--------------------|--------------------------|-------|
| `tees/001-black-*` | `001-black-tshirt` | Existing |
| `tees/001-oat-*` | `001-oat-tshirt` | New colorway |
| `tees/001-charcoal-*` | `001-charcoal-tshirt` | New colorway |
| `tees/002-white-*` | `002-white-tshirt` | Existing white series |
| `tees/002-stone-*` | `002-stone-tshirt` | New |
| `tees/002-bone-*` | `002-bone-tshirt` | New |
| `tees/003-black-*` | `003-black-tshirt` | Existing |
| `tees/003-sand-*` | `003-sand-tshirt` | New |
| `tees/003-slate-*` | `003-slate-tshirt` | New |

### Hoodies

| Lookbook file stem | Suggested Shopify handle | Notes |
|--------------------|--------------------------|-------|
| `hoodies/001-black-*` | `001-black-hoodie` | Existing |
| `hoodies/001-oat-*` | `001-oat-hoodie` | New |
| `hoodies/001-charcoal-*` | `001-charcoal-hoodie` | New |
| `hoodies/002-heather-*` | `002-heather-hoodie` | New (closest to grey) |
| `hoodies/002-sand-*` | `002-sand-hoodie` | New |
| `hoodies/002-bone-*` | `002-bone-hoodie` | New |
| `hoodies/003-black-*` | `003-black-hoodie` | Existing |
| `hoodies/003-white-*` | `003-white-hoodie` | Existing |
| `hoodies/003-taupe-*` | `003-taupe-hoodie` | New |

Upload: Shopify Admin → product → Media. Prefer street as primary image, airport as secondary. No Admin API upload in this batch.

---

## Specs

- Format: WebP
- Long edge: ~800–1200px
- Target size: ≤500KB where practical
- Style: photoreal lifestyle ecommerce; garment hero; no watermarks/overlays
