#!/usr/bin/env python3
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SOURCE = os.path.join(ROOT, "assets", "songsphere.png")
OUT_DIR = os.path.join(ROOT, "public", "icon")
# Toolbar-friendly sizes (Firefox/Chrome pick the best match from default_icon).
SIZES = [16, 19, 24, 32, 38, 48, 64, 96, 128]
# Slightly zoom so the logo fills the square (less empty padding at small sizes).
ZOOM = 1.14


def render_icon(src: Image.Image, size: int) -> Image.Image:
    inner = max(size, int(round(size * ZOOM)))
    scaled = src.resize((inner, inner), Image.Resampling.LANCZOS)
    left = (inner - size) // 2
    return scaled.crop((left, left, left + size, left + size))


def main() -> None:
    if not os.path.isfile(SOURCE):
        raise SystemExit(f"Missing source image: {SOURCE}")

    src = Image.open(SOURCE).convert("RGBA")
    os.makedirs(OUT_DIR, exist_ok=True)

    for size in SIZES:
        out = os.path.join(OUT_DIR, f"{size}.png")
        render_icon(src, size).save(out, "PNG", optimize=True)
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
