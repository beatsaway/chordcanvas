"""
Trim GSL instrument folders:
- Melodic instruments: reduce to 11 zones (11 WAVs) using piano-style key splits.
- Drum kits (120_*, 128_*, or name contains " Kit"): one zone per articulation (unique key range).
"""
import json
import os
import shutil
import re
from pathlib import Path

GSL_ROOT = Path(__file__).resolve().parent / "instruments" / "GSL"

# Piano-style 11 key ranges (inclusive) for full keyboard 0-127
MELODIC_RANGES = [
    (0, 34),
    (35, 41),
    (42, 47),
    (48, 52),
    (53, 57),
    (58, 62),
    (63, 68),
    (69, 75),
    (76, 83),
    (84, 92),
    (93, 127),
]


def is_drum_folder(name: str) -> bool:
    return name.startswith("120_") or name.startswith("128_") or " Kit" in name


def load_zones(folder: Path) -> list:
    path = folder / "zones.json"
    if not path.is_file():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_zones(folder: Path, zones: list) -> None:
    with open(folder / "zones.json", "w", encoding="utf-8") as f:
        json.dump(zones, f, indent=2)


def zone_overlaps_range(zone: dict, rlow: int, rhigh: int) -> bool:
    return zone["keyLow"] <= rhigh and zone["keyHigh"] >= rlow


def center_cents_for_range(rlow: int, rhigh: int) -> int:
    mid_key = (rlow + rhigh) / 2
    return int(mid_key * 100)


def pick_best_zone_for_range(zones: list, rlow: int, rhigh: int) -> dict | None:
    candidates = [z for z in zones if zone_overlaps_range(z, rlow, rhigh)]
    if not candidates:
        return None
    target_cents = center_cents_for_range(rlow, rhigh)
    return min(candidates, key=lambda z: abs((z.get("originalPitchCents") or 0) - target_cents))


def trim_melodic(folder: Path, zones: list) -> None:
    """Keep 11 zones (piano splits), one WAV per range."""
    kept = []
    files_to_keep = set()
    for i, (rlow, rhigh) in enumerate(MELODIC_RANGES):
        best = pick_best_zone_for_range(zones, rlow, rhigh)
        if not best:
            continue
        fname = best.get("file") or best.get("file", "")
        if not fname:
            continue
        src_file = folder / fname
        if not src_file.is_file():
            continue
        new_fname = f"zone_{i}_midi0_keys_{rlow}-{rhigh}.wav"
        dest_file = folder / new_fname
        if src_file.resolve() != dest_file.resolve():
            shutil.copy2(src_file, dest_file)
        files_to_keep.add(dest_file.name)
        kept.append({
            "keyLow": rlow,
            "keyHigh": rhigh,
            "originalPitchCents": best.get("originalPitchCents", center_cents_for_range(rlow, rhigh)),
            "file": new_fname,
            "loopStart": best.get("loopStart", 0),
            "loopEnd": best.get("loopEnd", 0.5),
        })
    if not kept:
        return
    for wav in folder.glob("*.wav"):
        if wav.name not in files_to_keep:
            wav.unlink()
    save_zones(folder, kept)


def trim_drum(folder: Path, zones: list) -> None:
    """One zone per articulation: unique (keyLow, keyHigh). Pick first zone per group."""
    seen = {}
    for z in zones:
        key = (z["keyLow"], z["keyHigh"])
        if key not in seen:
            seen[key] = z
    by_order = sorted(seen.items(), key=lambda x: (x[0][0], x[0][1]))
    kept = []
    files_to_keep = set()
    for i, ((rlow, rhigh), z) in enumerate(by_order):
        fname = z.get("file") or ""
        if not fname:
            continue
        src_file = folder / fname
        if not src_file.is_file():
            continue
        new_fname = f"zone_{i}_midi0_keys_{rlow}-{rhigh}.wav"
        dest_file = folder / new_fname
        if src_file.resolve() != dest_file.resolve():
            shutil.copy2(src_file, dest_file)
        files_to_keep.add(dest_file.name)
        kept.append({
            "keyLow": rlow,
            "keyHigh": rhigh,
            "originalPitchCents": z.get("originalPitchCents", 6000),
            "file": new_fname,
            "loopStart": z.get("loopStart", 0),
            "loopEnd": z.get("loopEnd", 0.5),
        })
    for wav in folder.glob("*.wav"):
        if wav.name not in files_to_keep:
            wav.unlink()
    save_zones(folder, kept)


def main():
    if not GSL_ROOT.is_dir():
        print("GSL root not found:", GSL_ROOT)
        return
    for sub in sorted(GSL_ROOT.iterdir()):
        if not sub.is_dir():
            continue
        zones = load_zones(sub)
        if not zones:
            continue
        name = sub.name
        if is_drum_folder(name):
            trim_drum(sub, zones)
            print("Drum:", name, "->", len([z for z in load_zones(sub)]), "zones")
        else:
            trim_melodic(sub, zones)
            print("Melodic:", name, "-> 11 zones")
    print("Done.")


if __name__ == "__main__":
    main()
