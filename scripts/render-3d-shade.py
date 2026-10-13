"""2.5D studio render of a flat garment mockup: heightmap from silhouette + folds, lit with normals."""
import sys, numpy as np
from PIL import Image, ImageFilter

def _box(a, r, axis):
    if r < 1: return a
    pad = [(0, 0)] * a.ndim; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)

def blur(a, sigma):
    """Gaussian approximation: three box passes per axis."""
    r = max(int(round(np.sqrt(12 * sigma * sigma / 3 + 1) / 2 - 0.5)), 0) if sigma > 0.3 else 0
    out = a.astype(np.float32)
    for _ in range(3):
        out = _box(_box(out, r, 0), r, 1)
    return out

def shift(a, dy, dx):
    out = np.zeros_like(a)
    H, W = a.shape
    out[dy:, dx:] = a[:H - dy, :W - dx]
    return out

def smooth_noise(h, w, cell, seed):
    rng = np.random.default_rng(seed)
    g = rng.standard_normal((h // cell + 3, w // cell + 3)).astype(np.float32)
    im = Image.fromarray(g, 'F').resize((w + 3 * cell, h + 3 * cell), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32)[cell:cell + h, cell:cell + w]

def persp_coeffs(src, dst):
    A = []; B = []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()

def render(path, out, kind, seed=7, yaw=0.06, W=1200):
    im = Image.open(path).convert('RGBA')
    H = int(W * im.height / im.width)
    im = im.resize((W, H), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255.0
    rgb, alpha = a[..., :3], np.clip((a[..., 3] - 0.2) / 0.8, 0, 1)
    m = (alpha > 0.5).astype(np.float32)
    s = W / 400.0  # svg units → px
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u, v = xx / s, yy / s  # svg coords

    # Volume: torso inflates more than sleeves
    inflate = 0.45 * blur(m, 10 * s) + 0.55 * blur(m, 34 * s)
    inflate = np.clip(inflate, 0, None) ** 0.8 * m
    h = inflate * 36 * s

    # Gravity folds: vertical drapes, stronger toward hem
    hem = np.clip((v - 150) / 290, 0, 1) ** 1.3
    n1 = smooth_noise(H, W, int(26 * s), seed)
    drape = np.sin(u * 0.075 + 1.2 * n1) * 0.6 + np.sin(u * 0.033 + 2.1) * 0.4
    h += drape * hem * 2.6 * s
    # Diagonal drag lines from the armpits toward the centre
    for side in (-1, 1):
        ax, ay = 200 + side * 104, 168
        d = (u - ax) * 0.55 * -side + (v - ay) * 0.85
        reach = np.exp(-((u - ax) ** 2) / (2 * 55 ** 2)) * np.exp(-((v - ay - 40) ** 2) / (2 * 60 ** 2))
        h += np.sin(d * 0.16) * reach * 2.4 * s
    # Fabric micro-undulation
    h += smooth_noise(H, W, int(16 * s), seed + 1) * 0.35 * s
    h += smooth_noise(H, W, int(4 * s), seed + 2) * 0.025 * s
    if kind == 'hoodie':
        hood = np.exp(-(((u - 200) / 46) ** 2 + ((v - 50) / 34) ** 2))
        h += hood * 16 * s
        pocket = ((v > 326) & (v < 404) & (np.abs(u - 200) < 72 + (v - 326) * 0.28)).astype(np.float32)
        h += blur(pocket, 3 * s) * 3 * s
        cuffs = ((v > 404) & (v < 440)).astype(np.float32)
        h -= blur(cuffs, 2 * s) * 1.2 * s
    # Seams sink slightly where the flat mockup draws them (dark thin lines)
    lumi = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    seam = np.clip(blur(lumi, 1.2 * s) - lumi, 0, 1) * m
    h -= seam * 4 * s
    h = blur(h, 0.8 * s) * m + blur(h * m, 2.5 * s) * (1 - m)

    gy, gx = np.gradient(h)
    n = np.stack([-gx, -gy, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    L = np.array([-0.5, -0.62, 0.6], np.float32); L /= np.linalg.norm(L)
    V = np.array([0, 0, 1], np.float32); Hh = (L + V) / np.linalg.norm(L + V)
    wrap = 0.35
    ndl = (n @ L + wrap) / (1 + wrap)
    flat = (L[2] + wrap) / (1 + wrap)
    amb = 0.42
    shade = (amb + np.clip(ndl, 0, None)) / (amb + flat)
    fill = np.clip(n @ np.array([0.6, 0.1, 0.8], np.float32), 0, None) * 0.08
    # Ambient occlusion from cavity depth
    cav = np.clip(blur(h, 14 * s) - h, 0, None) / (6 * s)
    ao = np.clip(1 - cav * 0.55, 0.55, 1)
    # Edge darkening (fabric turning away)
    edge = np.clip(1 - n[..., 2], 0, 1)
    ao *= 1 - edge * 0.35
    spec = np.clip(n @ Hh, 0, 1) ** 24 * 0.12
    sheen = edge ** 2 * 0.10
    dark = lumi.mean() if False else np.median(lumi[m > 0])
    lift = 0.06 if dark < 0.2 else 0.0  # keep black cotton from crushing
    col = (rgb * (shade + fill)[..., None] * ao[..., None]) + (spec + sheen + lift * shade)[..., None] * (0.55 + 0.45 * (1 - dark))
    col = np.clip(col, 0, 1)

    # Soft drop shadow + contact shadow (garment hovers over the tile)
    sh = blur(m, 22 * s) * 0.30
    sh = shift(sh, int(10 * s), int(8 * s))
    cont = blur(m, 6 * s) * 0.18
    cont = shift(cont, int(3 * s), 0)
    shadow_a = np.clip(np.maximum(sh, cont), 0, 1)
    A = alpha + shadow_a * (1 - alpha)
    C = (col * alpha[..., None]) / np.maximum(A[..., None], 1e-6)  # shadow colour is black
    outim = Image.fromarray((np.dstack([C, A]) * 255).clip(0, 255).astype(np.uint8), 'RGBA')

    # Slight yaw: far side a touch shorter, like a 3/4 product shot
    if yaw:
        d = yaw * H
        src = [(0, 0), (W, 0), (W, H), (0, H)]
        dst = [(0, 0), (W * 0.97, d * 0.5), (W * 0.97, H - d * 0.5), (0, H)]
        outim = outim.transform((W, H), Image.PERSPECTIVE, persp_coeffs(src, dst), Image.BICUBIC)
    # Crop to content with margin, keep 5:6 canvas
    bbox = outim.getchannel('A').point(lambda p: 255 if p > 6 else 0).getbbox()
    cx = (bbox[0] + bbox[2]) / 2; cy = (bbox[1] + bbox[3]) / 2
    bw = (bbox[2] - bbox[0]) * 1.12; bh = (bbox[3] - bbox[1]) * 1.12
    if bw / bh > 5 / 6: bh = bw * 6 / 5
    else: bw = bh * 5 / 6
    outim = outim.crop((int(cx - bw / 2), int(cy - bh / 2), int(cx + bw / 2), int(cy + bh / 2))).resize((1000, 1200), Image.LANCZOS)
    outim.save(out, 'WEBP', quality=86, method=6)

if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2], sys.argv[3], yaw=float(sys.argv[4]) if len(sys.argv) > 4 else 0.06)
