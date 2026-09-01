#!/usr/bin/env python3
"""Annotated screenshots with numbered callouts, for the client progress page.

The pattern this draws is called an **annotated screenshot with keyed callouts**:
numbered circles on the image (the callouts), optional arrows and highlight
boxes, and a caption underneath that lists what each number means (the legend).
The legend lives in the HTML `<figcaption>`, not in the image, so it stays
selectable, translatable and readable on a phone.

Two ways to use it:

  1. From a spec file (what the skill normally does):
         python3 callout.py spec.json

  2. As a library, when a shot needs something the spec cannot express:
         from callout import load, marker, arrow, redact, box, label, save

Everything is re-runnable by design: it reads `raw/…` and writes `shots/…`, so a
wrong coordinate is fixed by editing the spec and running again — never by
taking the screenshot a second time.

Spec format (JSON) — a list of figures:

[
  {
    "src":  "raw/owner-gcash-setup.png",
    "out":  "shots/owner-gcash-setup.png",
    "crop": [0, 100, 1410, 812],          // optional, applied FIRST
    "redact":  [[281,300,392,413], [846,476,1010,506]],
    "markers": [ {"n":1, "at":[30,290]},
                 {"n":6, "at":[1236,685], "colour":"coral"} ],
    "arrows":  [ {"from":[600,404], "to":[300,388], "colour":"coral"} ],
    "boxes":   [ {"rect":[18,262,482,434], "colour":"coral"} ],
    "labels":  [ {"at":[606,392], "text":"Click here", "colour":"coral"} ]
  }
]

Coordinates are pixels in the image AFTER `crop`. Get them by opening the raw
shot at 100% and reading the cursor position, or from a DOM bounding box.
"""

import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── The page's palette, so callouts match the report they sit in ─────────────
BLUE = (0, 64, 224)
CORAL = (207, 48, 0)
LIME_INK = (58, 70, 8)
WHITE = (255, 255, 255)
FRAME = (147, 160, 191)

COLOURS = {"blue": BLUE, "coral": CORAL, "lime": LIME_INK, "white": WHITE}

FONT_PATHS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def font(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _c(v, default=BLUE):
    """Accept 'blue' / 'coral' / [r,g,b] / None."""
    if v is None:
        return default
    if isinstance(v, str):
        return COLOURS.get(v.lower(), default)
    return tuple(v)


# ── Drawing primitives ───────────────────────────────────────────────────────

def redact(im, rect, mode="blur"):
    """Hide something private: a QR, an account number, a customer's name.

    Blur rather than a black bar, and keep a visible outline: the reader still
    understands *that* a number was there, which a solid block destroys. Never
    reach for `mode="fill"` unless the blurred text is still legible — a heavy
    blur is reversible in theory but not from a JPEG in a browser.
    """
    x0, y0, x1, y1 = (int(v) for v in rect)
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(im.width, x1), min(im.height, y1)
    if x1 <= x0 or y1 <= y0:
        return
    region = im.crop((x0, y0, x1, y1))
    if mode == "blur":
        region = region.filter(ImageFilter.GaussianBlur(14))
    else:
        region = Image.new("RGB", region.size, (222, 226, 236))
    im.paste(region, (x0, y0))
    ImageDraw.Draw(im).rectangle([x0, y0, x1 - 1, y1 - 1], outline=(150, 158, 175), width=2)


def marker(im, at, n, colour=BLUE, r=19):
    """A numbered callout. The white halo is not decoration — without it the
    circle vanishes the moment it lands on a button of the same colour."""
    d = ImageDraw.Draw(im)
    x, y = at
    d.ellipse([x - r - 3, y - r - 3, x + r + 3, y + r + 3], fill=WHITE)
    d.ellipse([x - r, y - r, x + r, y + r], fill=colour)
    f = font(int(r * 1.25))
    t = str(n)
    bb = d.textbbox((0, 0), t, font=f)
    d.text((x - (bb[2] - bb[0]) / 2 - bb[0], y - (bb[3] - bb[1]) / 2 - bb[1]), t, font=f, fill=WHITE)


def arrow(im, start, end, colour=BLUE, w=6):
    """Leader line with a solid head, haloed for the same reason as `marker`."""
    d = ImageDraw.Draw(im)
    for col, width in ((WHITE, w + 5), (colour, w)):
        d.line([tuple(start), tuple(end)], fill=col, width=width)
    ang = math.atan2(end[1] - start[1], end[0] - start[0])
    L = 22
    p1 = (end[0] - L * math.cos(ang - 0.42), end[1] - L * math.sin(ang - 0.42))
    p2 = (end[0] - L * math.cos(ang + 0.42), end[1] - L * math.sin(ang + 0.42))
    d.polygon([tuple(end), p1, p2], fill=colour)


def box(im, rect, colour=BLUE, w=4):
    """Highlight box around the region being talked about."""
    ImageDraw.Draw(im).rectangle([int(v) for v in rect], outline=colour, width=w)


def label(im, at, text, colour=BLUE, size=22):
    """A short pill of text burned into the image. Use sparingly — the caption
    under the figure is the better place for words, because it stays readable
    at phone width and can be translated. A label is for a single pointer."""
    d = ImageDraw.Draw(im)
    f = font(size)
    pad = 9
    bb = d.textbbox((0, 0), text, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    x, y = at
    w_, h_ = tw + pad * 2, th + pad * 2
    x = max(2, min(x, im.width - w_ - 2))
    y = max(2, min(y, im.height - h_ - 2))
    d.rounded_rectangle([x, y, x + w_, y + h_], radius=9, fill=colour)
    d.text((x + pad - bb[0], y + pad - bb[1]), text, font=f, fill=WHITE)


def frame(im, colour=FRAME):
    """A hairline border, so a white screenshot doesn't dissolve into the white
    card behind it on the progress page."""
    ImageDraw.Draw(im).rectangle([0, 0, im.width - 1, im.height - 1], outline=colour, width=2)
    return im


# ── Load / save ──────────────────────────────────────────────────────────────

def load(path, crop=None, scale=None):
    im = Image.open(path).convert("RGB")
    if crop:
        im = im.crop(tuple(crop))
    if scale:
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    return im


def save(im, path, quality=88):
    """JPEG for photographs of screens, PNG for anything with crisp UI text.
    The page loads dozens of these, so size matters — but never at the cost of
    making a label unreadable."""
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    frame(im)
    if path.lower().endswith((".jpg", ".jpeg")):
        im.save(path, quality=quality, optimize=True, progressive=True)
    else:
        im.save(path, optimize=True)
    print(f"  {os.path.basename(path)}  {im.width}x{im.height}  {os.path.getsize(path)//1024}kB")
    return path


# ── Spec runner ──────────────────────────────────────────────────────────────

def run_spec(spec_path):
    base = os.path.dirname(os.path.abspath(spec_path))
    with open(spec_path) as fh:
        figures = json.load(fh)
    if isinstance(figures, dict):
        figures = figures.get("figures", [])

    def p(rel):
        return rel if os.path.isabs(rel) else os.path.join(base, rel)

    print(f"Annotating {len(figures)} figure(s)…")
    for fig in figures:
        im = load(p(fig["src"]), crop=fig.get("crop"), scale=fig.get("scale"))
        for r in fig.get("redact", []):
            redact(im, r, mode=fig.get("redact_mode", "blur"))
        for b in fig.get("boxes", []):
            box(im, b["rect"], _c(b.get("colour")), b.get("width", 4))
        for a in fig.get("arrows", []):
            arrow(im, a["from"], a["to"], _c(a.get("colour")), a.get("width", 6))
        for m in fig.get("markers", []):
            marker(im, m["at"], m["n"], _c(m.get("colour")), m.get("r", 19))
        for l in fig.get("labels", []):
            label(im, l["at"], l["text"], _c(l.get("colour")), l.get("size", 22))
        save(im, p(fig["out"]), quality=fig.get("quality", 88))
    print("done.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    run_spec(sys.argv[1])