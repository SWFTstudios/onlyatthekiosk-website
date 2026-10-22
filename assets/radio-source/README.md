# Radio window source images

Drop licensed plane-window stills here, then run:

```bash
node scripts/build-radio-window.js
```

Expected filenames (any one of each group is enough):

- `window-frame.png` (or `AdobeStock_647282758.png`) — oval frame with black interior
- `clouds.jpg` (or `AdobeStock_477558982.jpg`) — sky / cloud carpet through the glass
- `below.jpg` (or `AdobeStock_2003133876.jpg`) — wing over landscape

Without these files the build script writes lightweight procedural WebP stand-ins into `images/radio/` so the page still works in CI.
