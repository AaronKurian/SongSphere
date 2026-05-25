#!/usr/bin/env python3
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SOURCE = os.path.join(ROOT, "assets", "songsphere.png")
OUT_DIR = os.path.join(ROOT, "public", "icon")
SIZES = [16, 32, 48, 96, 128]


def main() -> None:
    if not os.path.isfile(SOURCE):
        raise SystemExit(f"Missing source image: {SOURCE}")

    src = Image.open(SOURCE).convert("RGBA")
    os.makedirs(OUT_DIR, exist_ok=True)

    for size in SIZES:
        out = os.path.join(OUT_DIR, f"{size}.png")
        resized = src.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(out, "PNG", optimize=True)
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
