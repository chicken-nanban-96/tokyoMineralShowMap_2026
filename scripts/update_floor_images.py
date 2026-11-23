#!/usr/bin/env python3
"""Refresh official floor-map JPEGs for the public GitHub Pages site.

Downloads existing official image URLs from map.json.  Does not change JSON
coordinates, guest records, or shops.json.  Previous images remain on failure.
"""
import json
import pathlib
import requests

ROOT = pathlib.Path(__file__).resolve().parents[1]
map_data = json.loads((ROOT / "map.json").read_text(encoding="utf-8"))
dest = ROOT / "floor_images"
dest.mkdir(exist_ok=True)
any_saved = 0
for floor in map_data.get("floors", []):
    target = dest / (str(floor["id"]) + "f.jpg")
    try:
        response = requests.get(
            floor["image"], timeout=30,
            headers={"User-Agent": "Mozilla/5.0 MineralShowMap/1.0"},
        )
        response.raise_for_status()
        data = response.content
        if len(data) < 10_000 or not data.startswith(b"\xff\xd8\xff"):
            raise ValueError("JPEGとして検証できません")
        if not target.exists() or target.read_bytes() != data:
            target.write_bytes(data)
            any_saved += 1
            print(f"Updated {target.name}: {len(data)} bytes")
        else:
            print(f"Unchanged {target.name}")
    except Exception as exc:
        print(f"WARNING: {floor['id']}F image could not be refreshed: {exc}")
print(f"Updated {any_saved} images. Existing image files were preserved.")
