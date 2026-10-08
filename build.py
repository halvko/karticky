#!/usr/bin/env python3
"""Build the static site into dist/.

Copies the app files and stamps sw.js with a content hash and the list of files to precache,
so every deploy that changes anything ships a fresh offline cache.

    python3 build.py            # -> dist/
"""
import hashlib, json, pathlib, shutil

ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist"
APP = ["index.html", "style.css", "app.js", "decks.js", "manifest.webmanifest"]
DIRS = ["fonts", "icons"]

def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    files = list(APP)
    for name in APP:
        shutil.copy(ROOT / name, DIST / name)
    for d in DIRS:
        shutil.copytree(ROOT / d, DIST / d)
        files += sorted(str(p.relative_to(ROOT)) for p in (ROOT / d).rglob("*") if p.is_file())

    h = hashlib.sha256()
    for f in files:
        h.update(f.encode()); h.update((ROOT / f).read_bytes())
    version = h.hexdigest()[:12]

    sw = (ROOT / "sw.js").read_text()
    sw = sw.replace("__VERSION__", version).replace("__FILES__", json.dumps(["./"] + ["./" + f for f in files], ensure_ascii=False))
    (DIST / "sw.js").write_text(sw)
    (DIST / ".nojekyll").write_text("")  # GitHub Pages: serve files as-is
    print(f"built dist/ ({len(files)} files, version {version})")

if __name__ == "__main__":
    main()
