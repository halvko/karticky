#!/usr/bin/env python3
"""Build the static site into dist/.

Copies the app files and stamps sw.js with a content hash and the list of files to precache,
so every deploy that changes anything ships a fresh offline cache.

    python3 build.py            # -> dist/
"""
import hashlib, json, os, pathlib, shutil, subprocess

ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist"
APP = ["index.html", "style.css", "app.js", "srs.js", "decks.js", "manifest.webmanifest"]
DIRS = ["fonts", "icons"]

def commit():
    """Short hash of the commit being built, shown in the footer so you can tell which version is running."""
    try:
        sha = subprocess.run(["git", "rev-parse", "--short=7", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
        dirty = subprocess.run(["git", "status", "--porcelain", "--untracked-files=no"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
        return sha + ("+" if dirty else "")
    except (OSError, subprocess.CalledProcessError):
        return os.environ.get("GITHUB_SHA", "dev")[:7]

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

    ver = commit()
    (DIST / "index.html").write_text((DIST / "index.html").read_text(encoding="utf-8").replace("__COMMIT__", ver), encoding="utf-8")

    h = hashlib.sha256(ver.encode())  # include the commit, so the marker in the cached page always matches the deploy
    for f in files:
        h.update(f.encode()); h.update((DIST / f).read_bytes())
    version = h.hexdigest()[:12]

    sw = (ROOT / "sw.js").read_text()
    sw = sw.replace("__VERSION__", version).replace("__FILES__", json.dumps(["./"] + ["./" + f for f in files], ensure_ascii=False))
    (DIST / "sw.js").write_text(sw)
    (DIST / ".nojekyll").write_text("")  # GitHub Pages: serve files as-is
    if (ROOT / "CNAME").exists():
        shutil.copy(ROOT / "CNAME", DIST / "CNAME")  # custom domain for GitHub Pages
    print(f"built dist/ ({len(files)} files, version {version}, commit {ver})")

if __name__ == "__main__":
    main()
