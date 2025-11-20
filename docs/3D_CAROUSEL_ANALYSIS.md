# 3D Carousel Swiper - Reverse Engineering Analysis

## Overview

This Webflow-based 3D carousel creates a stunning circular carousel effect where images rotate in 3D space, synchronized with a Swiper.js slider that controls navigation and displays titles.

**Live Demo**: https://3d-carousel-swiper-2026.webflow.io/

## Key Technologies

1. **Swiper.js** (v10) - Main slider library for navigation
2. **GSAP** (v3.12.2) - Animation library for smooth 3D rotations
3. **jQuery** (v3.5.1) - DOM manipulation and event handling
4. **Webflow** - Hosting platform with custom code injection
5. **CSS 3D Transforms** - Core 3D positioning and rotation

## Architecture Breakdown

### 1. HTML Structure

```html
<div carousel="component" class="carousel_component">
  <!-- 3D Image Carousel -->
  <div carousel="wrap" class="carousel_wrap w-dyn-list">
    <div role="list" class="carousel_list w-dyn-items">
      <div role="listitem" class="carousel_item w-dyn-item">
        <img src="..." class="carousel_img"/>
        <div class="carousel_ratio"></div>
      </div>
      <!-- More items... -->
    </div>
  </div>

  <!-- Swiper Slider for Titles -->
  <div fade-up="" class="swiper is-slider1 w-dyn-list">
    <div role="list" class="swiper-wrapper is-slider1 w-dyn-items">
      <div role="listitem" class="swiper-slide is-slider1 w-dyn-item">
        <h2>NeoTech</h2>
        <a href="#" class="button w-button">view case</a>
      </div>
      <!-- More slides... -->
    </div>
  </div>

  <!-- Navigation Arrows -->
  <div fade-up="" class="carousel_arrow_wrap">
    <a carousel="prev" href="#" class="carousel_arrow_link"></a>
    <a carousel="next" href="#" class="carousel_arrow_link is-right"></a>
  </div>
</div>
```

### 2. CSS 3D Transform Setup

```css
/* Custom CSS Variables for 3D Positioning */
[carousel="wrap"] {
  --3d-carousel-item-width: 40vw;  /* Desktop width */
  --3d-carousel-gap: 7vw;
  --3d-carousel-rotate: 0deg;       /* Y-axis rotation */
  --3d-carousel-rotate-x: 0deg;     /* X-axis rotation */
  --3d-carousel-z: 0px;             /* Z-axis translation */
}

/* Tablet Responsive */
@media screen and (max-width: 991px) {
  [carousel="wrap"] {
    --3d-carousel-item-width: 70vw;
    --3d-carousel-gap: 6vw;
  }
}

/* 3D Transform Container */
[carousel="wrap"] > div {
  transform-style: preserve-3d;
  transform: translate3d(0px, 0px, var(--3d-carousel-z)) 
             rotateX(var(--3d-carousel-rotate-x)) 
             rotateY(var(--3d-carousel-rotate));
}

/* Individual Item Width */
[carousel="wrap"] > div > div {
  width: var(--3d-carousel-item-width);
}
```

### 3. JavaScript Implementation

#### Core Calculation Logic

```javascript
$("[carousel='component']").each(function () {
  let componentEl = $(this);
  let wrapEl = componentEl.find("[carousel='wrap']");
  let swiperEl = componentEl.find(".swiper");
  let itemEl = wrapEl.children().children();
  let nextEl = componentEl.find("[carousel='next']");
  let prevEl = componentEl.find("[carousel='prev']");
  
  // Calculate rotation angle per item (360° / number of items)
  let rotateAmount = 360 / itemEl.length;
  
  // Calculate Z-distance for proper 3D perspective
  let zTranslate = 2 * Math.tan((rotateAmount / 2) * (Math.PI / 180));
  
  // Calculate translate values
  let negTranslate = `calc(var(--3d-carousel-item-width) / -${zTranslate} - var(--3d-carousel-gap))`;
  let posTranslate = `calc(var(--3d-carousel-item-width) / ${zTranslate} + var(--3d-carousel-gap))`;

  // Set perspective and Z-position
  wrapEl.css("--3d-carousel-z", negTranslate);
  wrapEl.css("perspective", posTranslate);
  
  // Position each item in 3D space
  itemEl.each(function (index) {
    $(this).css("transform", 
      `rotateY(${rotateAmount * index}deg) translateZ(${posTranslate})`
    );
  });
```

#### Animation Sequence

```javascript
  // 1. INTRO ANIMATION
  let introTl = gsap.timeline({
    onComplete: () => {
      swiperCode(); // Start Swiper after intro
    }
  });
  
  // Fade in
  introTl.to(wrapEl, { opacity: 1, duration: 0.3 });
  
  // Rotate from off-screen to position
  introTl.fromTo(
    wrapEl, 
    { 
      "--3d-carousel-rotate": 100,    // Start rotated
      "--3d-carousel-rotate-x": -90   // Start tilted
    }, 
    { 
      "--3d-carousel-rotate": 0,      // End at center
      "--3d-carousel-rotate-x": -4,   // Slight tilt for depth
      duration: 4, 
      ease: "power2.inOut" 
    }, 
    "<" // Start with previous animation
  );
  
  // Fade in titles and arrows
  introTl.to("[fade-up]", { opacity: 1 }, ">-0.3");
```

#### Swiper Integration

```javascript
  function swiperCode() {
    // Create continuous rotation timeline
    let tl = gsap.timeline({ paused: true });
    tl.fromTo(
      wrapEl, 
      { "--3d-carousel-rotate": 0 }, 
      { 
        "--3d-carousel-rotate": -(360 - rotateAmount), // Almost full rotation
        duration: 30, 
        ease: "none" 
      }
    );

    // Progress tracker for syncing
    let progress = { value: 0 };

    // Initialize Swiper
    const swiper = new Swiper(swiperEl[0], {
      effect: "creative",
      creativeEffect: {
        prev: {
          translate: [0, "-100%", 0],
          scale: 0.5,
          opacity: 0
        },
        next: {
          translate: [0, "100%", 0],
          scale: 0.5,
          opacity: 0
        }
      },
      grabCursor: true,
      keyboard: true,
      speed: 500,
      mousewheel: {
        eventsTarget: "[carousel='component']"
      },
      navigation: {
        nextEl: nextEl[0],
        prevEl: prevEl[0]
      }
    });
    
    // Sync Swiper progress with 3D rotation
    swiper.on("progress", function (e) {
      gsap.to(progress, {
        value: e.progress,
        onUpdate: () => {
          tl.progress(progress.value); // Update 3D rotation
        }
      });
    });
  }
});
```

## Key Technical Concepts

### 1. CSS Custom Properties (Variables)
- Uses CSS variables for dynamic 3D transforms
- Allows JavaScript to update CSS values for smooth animations
- Variables: `--3d-carousel-rotate`, `--3d-carousel-rotate-x`, `--3d-carousel-z`

### 2. 3D Transform Mathematics
- **Rotation Angle**: `360° / number of items` (evenly spaces items)
- **Z-Translation**: Uses trigonometry to position items at correct depth
- **Perspective**: Calculated based on item width and rotation angle

### 3. GSAP Timeline Sync
- Main timeline controls the 3D carousel rotation
- Progress is controlled by Swiper's `progress` event
- Creates seamless synchronization between slider and 3D rotation

### 4. Swiper.js Creative Effect
- Custom slide transitions (vertical + scale + fade)
- Mousewheel navigation support
- Keyboard navigation support
- Progress tracking for external animations

### 5. Responsive Design
- Desktop: 40vw item width, 7vw gap
- Tablet/Mobile: 70vw item width, 6vw gap
- Uses viewport units for fluid scaling

## Animation Flow

1. **Initial Load**
   - Carousel starts hidden (opacity: 0)
   - Rotated 100° on Y-axis, -90° on X-axis
   
2. **Intro Animation (4 seconds)**
   - Fades in
   - Rotates to center position (0° Y, -4° X)
   - Titles and arrows fade in

3. **User Interaction**
   - User clicks arrow or uses mousewheel
   - Swiper.js handles slide change
   - Swiper's `progress` event fires
   - GSAP updates 3D rotation timeline progress
   - 3D carousel rotates to match slider position

4. **Synchronization**
   - Each slider position corresponds to a specific rotation angle
   - Progress value (0-1) maps to rotation (0° to ~360°)
   - Smooth interpolation between positions

## Implementation Steps (To Recreate)

### Step 1: HTML Structure
- Create carousel container with `[carousel="component"]`
- Add image carousel wrapper with `[carousel="wrap"]`
- Add Swiper slider for titles/text
- Add navigation arrows

### Step 2: CSS Setup
- Define CSS custom properties for 3D transforms
- Set up `transform-style: preserve-3d`
- Create responsive breakpoints
- Style navigation arrows

### Step 3: JavaScript Calculations
- Calculate rotation angle per item
- Calculate Z-translation using trigonometry
- Position each item in 3D space
- Set up perspective

### Step 4: GSAP Animations
- Create intro animation timeline
- Animate from starting position to center
- Fade in additional elements

### Step 5: Swiper Integration
- Initialize Swiper with creative effect
- Set up navigation (arrows, mousewheel, keyboard)
- Listen to `progress` event
- Sync Swiper progress with GSAP timeline

### Step 6: Synchronization
- Map Swiper progress (0-1) to rotation timeline
- Update GSAP timeline progress on Swiper change
- Ensure smooth transitions

## Performance Optimizations

1. **CSS Will-Change**: `will-change: contents` on carousel wrapper
2. **GPU Acceleration**: Uses `translate3d()` for hardware acceleration
3. **Perspective**: Set once on container, not per item
4. **CSS Variables**: Efficient updates without DOM manipulation

## Browser Compatibility

- Modern browsers with CSS 3D transform support
- Requires JavaScript enabled
- Works on desktop and mobile devices

## Dependencies

```html
<!-- Swiper CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css"/>

<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>

<!-- GSAP -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>

<!-- Swiper JS -->
<script src="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js"></script>
```

## Key Insights

1. **Dual System**: Two separate carousels (images + titles) synchronized via JavaScript
2. **Mathematical Precision**: Uses trigonometry for accurate 3D positioning
3. **Smooth Sync**: GSAP timeline progress synced with Swiper progress
4. **Performance**: CSS variables + GPU acceleration for smooth 60fps animations
5. **User Experience**: Multiple interaction methods (arrows, mousewheel, keyboard)

## Potential Improvements

1. **Touch Gestures**: Add swipe gestures for mobile
2. **Auto-play**: Optional auto-rotation
3. **Lazy Loading**: Load images as needed
4. **Accessibility**: ARIA labels and keyboard navigation enhancements
5. **Loading States**: Show loader during initial animation

## Code Location in Original

- **HTML**: Embedded in Webflow page
- **CSS**: Inline in `<style>` tag within `<div class="page_code_custom w-embed">`
- **JavaScript**: Inline `<script>` tag before closing `</body>`

