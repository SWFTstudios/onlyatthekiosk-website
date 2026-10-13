"""Lifestyle composites: a garment render hung on a hanger in front of a KIOSK shoot photo.

Usage: python3 scripts/render-lifestyle.py <garment.webp> <background.webp> <out.webp> [focusX 0-1]
Shallow-focus background, light wrap from the scene onto the garment, film grain, vignette.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

W, H = 1600, 2000


def cover(img, fx=0.5):
    r = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * r), round(img.height * r)), Image.LANCZOS)
    x = int((img.width - W) * fx)
    y = (img.height - H) // 2
    return img.crop((x, y, x + W, y + H))


def main(gpath, bpath, out, fx=0.5):
    bg = cover(Image.open(bpath).convert('RGB'), fx).filter(ImageFilter.GaussianBlur(16))
    b = np.asarray(bg, np.float32) / 255
    b = b * 0.86 + 0.02                                   # pull the scene back a stop
    mean = b.reshape(-1, 3).mean(0)

    g = Image.open(gpath).convert('RGBA')
    gw = 1240
    g = g.resize((gw, round(g.height * gw / g.width)), Image.LANCZOS)
    a = np.asarray(g, np.float32) / 255
    alpha = np.clip((a[..., 3] - 0.4) / 0.6, 0, 1)        # drop the studio shadow, keep the garment
    rgb = a[..., :3]
    # Light wrap: the scene's colour bleeds onto the garment's edges
    edge = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18)), np.float32) / 255
    wrap = np.clip(alpha - edge, 0, 1)[..., None] * 1.6
    rgb = rgb * (0.92 - 0.25 * wrap) + mean * (0.08 + 0.25 * wrap)

    ys, xs = np.where(alpha > 0.5)
    top, left = ys.min(), xs.min()
    cx = (xs.min() + xs.max()) / 2
    ox, oy = int(W / 2 - cx), int(H * 0.17 - top)

    # Hanger hook, drawn behind the garment
    hook = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(hook)
    hx, hy = W / 2, oy + top + 40
    for width, col in ((13, (40, 40, 42, 220)), (8, (196, 196, 198, 255)), (3, (245, 245, 245, 255))):
        d.line([(hx, hy), (hx, hy - 120)], fill=col, width=width)
        d.arc([hx - 46, hy - 210, hx + 46, hy - 118], start=-10, end=200, fill=col, width=width)

    comp = Image.fromarray((np.clip(b, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    comp.alpha_composite(hook)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    garment = Image.fromarray(np.dstack([np.clip(rgb, 0, 1), alpha]).__mul__(255).astype(np.uint8), 'RGBA')
    layer.paste(garment, (ox, oy))
    comp.alpha_composite(layer)

    c = np.asarray(comp.convert('RGB'), np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W]
    vig = 1 - 0.28 * (((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.75)) ** 2)
    c = c * vig[..., None]
    rng = np.random.default_rng(7)
    c = c + rng.normal(0, 0.018, (H, W, 1))              # film grain
    Image.fromarray((np.clip(c, 0, 1) * 255).astype(np.uint8)).save(out, 'WEBP', quality=82, method=6)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 0.5)
