#!/usr/bin/env python3
"""Read an existing progress.html and report what is already published on it.

This is the guard that stops the skill re-posting work the client has already
read. It answers three questions:

  * what sections are on the page already (number + title + stamp)
  * what the next section number is
  * where the last `</section>` ends, so new panels can be inserted before the
    closing markup instead of appended to the end of the document

Usage:
    python3 page_index.py <progress.html>              # human summary
    python3 page_index.py <progress.html> --json       # machine-readable

A section is identified two ways, in this order:

  1. `data-report="<who>/<date>#<slug>"` on the <section> — written by this
     skill from now on. Exact, survives retitling.
  2. The <h2> text with its leading number stripped — the fallback for pages
     written before the stamp existed (everything up to 08-12-2026).

Never treat "no stamp" as "not published". Fall back to the title, and when the
titles are close but not identical, ask rather than guess: posting a duplicate
section to a client-facing page is worse than asking one question.
"""

import html as _html
import json
import os
import re
import sys

SECTION_RE = re.compile(r'<section\b[^>]*class="[^"]*\bpanel\b[^"]*"[^>]*>', re.I)
STAMP_RE = re.compile(r'data-report="([^"]+)"', re.I)
H2_RE = re.compile(r"<h2[^>]*>(.*?)</h2>", re.I | re.S)
TAG_RE = re.compile(r"<[^>]+>")
NUM_RE = re.compile(r"^\s*(\d+)\s*[.)]\s*")


def _text(fragment):
    """Tags out, entities decoded. The page is full of &ldquo; and &#8369;, and a
    title compared with those still in it never matches the same title written
    fresh — which would silently re-publish a section."""
    t = _html.unescape(TAG_RE.sub("", fragment))
    return re.sub(r"\s+", " ", t.replace("\xa0", " ")).strip()


def slug(title):
    s = NUM_RE.sub("", title).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80]


def index(path):
    """Return {sections: [...], next_number, insert_at, exists}."""
    if not os.path.exists(path):
        return {"exists": False, "sections": [], "next_number": 1, "insert_at": None}

    html = open(path, encoding="utf-8", errors="replace").read()

    # Split on the section opening tags so each chunk is one panel.
    opens = list(SECTION_RE.finditer(html))
    sections = []
    for i, m in enumerate(opens):
        start = m.start()
        end = opens[i + 1].start() if i + 1 < len(opens) else len(html)
        chunk = html[start:end]

        h2 = H2_RE.search(chunk)
        title = _text(h2.group(1)) if h2 else ""
        num = None
        nm = NUM_RE.match(title)
        if nm:
            num = int(nm.group(1))
            title = NUM_RE.sub("", title)

        stamp = STAMP_RE.search(m.group(0))
        sections.append({
            "number": num,
            "title": title,
            "slug": slug(title),
            "stamp": stamp.group(1) if stamp else None,
            "offset": start,
        })

    nums = [s["number"] for s in sections if s["number"]]
    next_number = (max(nums) + 1) if nums else 1

    # Insert point: just after the final </section>. Everything after it is the
    # page's closing chrome (footer, lightbox markup, scripts) and must stay put.
    last_close = html.rfind("</section>")
    insert_at = (last_close + len("</section>")) if last_close != -1 else None

    return {
        "exists": True,
        "path": path,
        "bytes": len(html),
        "sections": sections,
        "next_number": next_number,
        "insert_at": insert_at,
        "stamps": [s["stamp"] for s in sections if s["stamp"]],
        "slugs": [s["slug"] for s in sections],
    }


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    data = index(path)

    if "--json" in sys.argv:
        print(json.dumps(data, indent=2))
        return

    if not data["exists"]:
        print(f"{path}\n  does not exist yet — this will be a NEW page, section numbering starts at 1.")
        return

    print(f"{path}  ({data['bytes']//1024} kB)")
    print(f"  {len(data['sections'])} section(s) already published")
    print(f"  next section number: {data['next_number']}")
    print(f"  insert new panels at byte offset: {data['insert_at']}")
    print()
    for s in data["sections"]:
        n = f"{s['number']:>3}." if s["number"] else "  ?"
        tag = f"  [{s['stamp']}]" if s["stamp"] else ""
        print(f"  {n} {s['title'][:88]}{tag}")


if __name__ == "__main__":
    main()