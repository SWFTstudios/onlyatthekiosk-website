# Container Borders Cheat Sheet

## Overview

This cheat sheet documents the color-coded debugging system for visualizing all container divs and wrappers on the `carousel-template.html` page. Each container has a unique 2px colored border that helps identify its structure and position in the DOM hierarchy.

## How to Enable Debug Borders

### Method 1: Console Command
```javascript
toggleDebugBorders()
```

### Method 2: URL Parameter
Add `?debug=borders` to the page URL:
```
https://your-site.com/carousel-template.html?debug=borders
```

### Method 3: HTML Class
Add `class="debug-borders"` to the `<html>` element in the browser's developer tools.

## Color Reference Table

| Color Name | Hex Code | Selector | Description | DOM Location |
|------------|----------|----------|-------------|--------------|
| **Red** | `#FF0000` | `.navbar` | Main navigation bar | Top level navigation |
| **Dark Red** | `#CC0000` | `.navbar-content-wrapper` | Navbar content wrapper | Contains left/right nav sections |
| **Crimson** | `#DC143C` | `.nav-main-inner` | Nav main inner container | Inside navbar padding |
| **Fire Brick** | `#B22222` | `.nav-main-column` | Nav main column | Grid column in nav |
| **Orange** | `#FF6600` | `.navbar-left` | Left navigation section | Contains main links |
| **Orange Red** | `#FF4500` | `.navbar-left-inner` | Nav left inner wrapper | Inside navbar-left |
| **Tomato** | `#FF6347` | `.nav-links-column` | Navigation links column | Contains category links |
| **Coral** | `#FF7F50` | `.navbar-right` | Right navigation section | Contains promotional slider |
| **Salmon** | `#FA8072` | `.navbar-right-content-wrapper` | Nav right content wrapper | Wraps promotional content |
| **Light Salmon** | `#FFA07A` | `.navbar-right-content` | Nav right content | Contains promo slider |
| **Maroon** | `#800000` | `.page-padding` | Page padding container | Generic padding wrapper |
| **Blue** | `#0000FF` | `[carousel="component"]` | Main carousel component | Top-level carousel container |
| **Dark Blue** | `#0000CC` | `[carousel="wrap"]` | 3D carousel wrapper | Contains carousel_list |
| **Navy** | `#000080` | `.carousel_list` | Carousel list container | Contains all carousel items |
| **Teal** | `#008080` | `.carousel_item` | Individual carousel item | Each product image container |
| **Cyan** | `#00FFFF` | `.carousel_arrow_wrap` | Carousel navigation arrows | Left/right arrow container |
| **Green** | `#00FF00` | `.swiper:not(.promo-slider)` | Swiper container (main) | Titles slider container |
| **Dark Green** | `#00CC00` | `.swiper-wrapper:not(.promo-slider .swiper-wrapper)` | Swiper wrapper | Wraps swiper slides |
| **Lime** | `#32CD32` | `.swiper-slide:not(.promo-slider .swiper-slide)` | Swiper slide | Individual title/product slide |
| **Purple** | `#800080` | `.collection-title` | Collection title container | Animated title wrapper |
| **Violet** | `#8A2BE2` | `.collection-title-text` | Collection title text | The actual h1 title |
| **Magenta** | `#FF00FF` | `.products_collection-drawer` | Product drawer container | Slide-over drawer |
| **Dark Magenta** | `#CC00CC` | `.products_drawer-wrapper` | Drawer wrapper | Inside drawer container |
| **Fuchsia** | `#FF00CC` | `.products_drawer-content` | Drawer content section | Grid container for images/text |
| **Hot Pink** | `#FF69B4` | `.products_drawer-images` | Drawer images section | Main image + gallery |
| **Pink** | `#FFC0CB` | `.products_drawer-text` | Drawer text section | Product details, quantity, etc. |
| **Gold** | `#FFD700` | `.promo-slider` | Promotional slider | Slider in navigation menu |
| **Orange (Promo)** | `#FFA500` | `.promo-slider .swiper-wrapper` | Promo slider wrapper | Wraps promo slides |
| **Gold (Promo)** | `#FFD700` | `.promo-slider .swiper-slide` | Promo slider slide | Individual promo card |
| **Yellow** | `#FFFF00` | `.promo-card` | Promotional card | Individual promo card container |
| **Khaki** | `#F0E68C` | `.promo-slider-nav` | Promo slider navigation | Prev/next buttons |

## Container Hierarchy

```
navbar (Red)
└── navbar-content-wrapper (Dark Red)
    ├── navbar-left (Orange)
    │   └── navbar-left-inner (Orange Red)
    │       └── nav-links-column (Tomato)
    └── navbar-right (Coral)
        └── navbar-right-content-wrapper (Salmon)
            └── navbar-right-content (Light Salmon)
                └── promo-slider (Gold)
                    ├── swiper-wrapper (Orange)
                    │   └── swiper-slide (Gold)
                    │       └── promo-card (Yellow)
                    └── promo-slider-nav (Khaki)

collection-title (Purple)
└── collection-title-text (Violet)

[carousel="component"] (Blue)
├── [carousel="wrap"] (Dark Blue)
│   └── carousel_list (Navy)
│       └── carousel_item (Teal) [multiple]
├── .swiper (Green)
│   └── .swiper-wrapper (Dark Green)
│       └── .swiper-slide (Lime) [multiple]
└── carousel_arrow_wrap (Cyan)

products_collection-drawer (Magenta)
└── products_drawer-wrapper (Dark Magenta)
    └── products_drawer-content (Fuchsia)
        ├── products_drawer-images (Hot Pink)
        └── products_drawer-text (Pink)
```

## Usage Tips

1. **Identify Layout Issues**: Use different colors to quickly spot overlapping containers or unexpected spacing.

2. **Understand Structure**: The color hierarchy helps visualize the nested structure of components.

3. **Quick Toggle**: Use `toggleDebugBorders()` in the console to quickly enable/disable the visualization.

4. **URL Bookmark**: Bookmark the page with `?debug=borders` for quick access during development.

5. **Color Coding Logic**: 
   - **Navigation**: Reds and Oranges
   - **Carousel**: Blues and Cyans
   - **Swiper/Slides**: Greens
   - **Collection Title**: Purples
   - **Product Drawer**: Magentas and Pinks
   - **Promo Slider**: Golds and Yellows

## Notes

- All borders are 2px solid and use `!important` to override existing styles
- Borders are only visible when `html.debug-borders` class is present
- The system is designed for development/debugging purposes only
- Colors are chosen to be distinct and easily differentiable
- Some containers may not be visible until content is loaded or interactions occur (e.g., product drawer)

## Troubleshooting

**Borders not showing?**
- Make sure `debug-borders` class is present on `<html>` element
- Check browser console for any errors
- Verify CSS is loading correctly

**Too many borders?**
- You can disable specific borders by commenting out their CSS rules
- The system is designed to show all containers, so many borders is expected

**Need more colors?**
- Add new color rules following the same pattern: `html.debug-borders .your-class { border: 2px solid #HEXCODE !important; }`
- Update this cheat sheet with new entries

## Related Files

- `carousel-template.html` - Main file containing the debug border CSS and toggle function
- This cheat sheet provides a quick reference for developers working on the carousel page

---

**Last Updated**: 2025-01-27
**Maintained By**: Development Team

