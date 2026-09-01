#!/usr/bin/env python3
"""Splice new <section class="panel"> blocks into an existing progress.html.

Why this is a script and not an Edit: these pages are written by more than one
session in the same day and they are client-facing. The failure that matters is
not a broken tag, it is **silently dropping a section somebody else published an
hour ago**. So the insert is mechanical, and it refuses to write unless every
section that was on the page before is still on it afterwards.

Usage:
    python3 insert_panels.py <progress.html> <new-panels.html> [--dry-run]

`new-panels.html` is a fragment: one or more complete
`<section class="panel" data-report="...">…</section>` blocks and nothing else.
No <html>, no <head>, no wrapper div.

What it guarantees, and refuses to proceed without:

  * every pre-existing section title is still present afterwards
  * the file got bigger, never smaller
  * the closing chrome (footer, lightbox, scripts) stays after the new panels
  * a timestamped .bak of the original sits beside the file

It does NOT renumber existing sections, and it does not touch anything above the
insert point. Section numbers in the new fragment are the caller's job — read
them off `page_index.py --json` → `next_number`.
"""

import os
import re
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from page_index import index, _text, H2_RE  # noqa: E402


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if len(args) != 2:
        sys.exit(__doc__)
    page_path, frag_path = args

    frag = open(frag_path, encoding="utf-8").read().strip()
    if "<section" not in frag:
        sys.exit("ERROR: the fragment contains no <section> — nothing to insert.")
    if "<html" in frag.lower() or "<body" in frag.lower():
        sys.exit("ERROR: the fragment must be panels only, not a whole document.")

    before = index(page_path)

    # ── New page ────────────────────────────────────────────────────────────
    if not before["exists"]:
        sys.exit(
            f"ERROR: {page_path} does not exist.\n"
            "Build it from assets/page-template.html first, then run this to add panels.\n"
            "Never let this script create the page — the template carries the hero, the\n"
            "styles and the lightbox, and a page without them renders as unstyled text."
        )

    html = open(page_path, encoding="utf-8").read()
    at = before["insert_at"]
    if at is None:
        sys.exit("ERROR: no </section> found — this does not look like a progress page.")

    titles_before = [s["title"] for s in before["sections"] if s["title"]]
    new_titles = [_text(m.group(1)) for m in H2_RE.finditer(frag)]

    # ── Refuse to publish the same section twice ────────────────────────────
    dupes = []
    for t in new_titles:
        stripped = re.sub(r"^\s*\d+\s*[.)]\s*", "", t)
        for old in titles_before:
            if stripped and stripped.lower() == old.lower():
                dupes.append(stripped)
    if dupes:
        sys.exit(
            "ERROR: these sections are already on the page:\n  - "
            + "\n  - ".join(dupes)
            + "\nRemove them from the fragment. The point of this skill is to add only\n"
              "what is new, never to repeat what the client has already read."
        )

    out = html[:at] + "\n\n" + frag + "\n" + html[at:]

    # ── Post-conditions ─────────────────────────────────────────────────────
    if len(out) <= len(html):
        sys.exit("ERROR: the result is not larger than the original. Refusing to write.")
    for t in titles_before:
        if t and t not in _text(out):
            sys.exit(f"ERROR: existing section vanished from the result: {t!r}. Refusing to write.")

    tail = html[at:]
    if tail.strip() and not out.endswith(tail):
        sys.exit("ERROR: the page's closing markup was not preserved. Refusing to write.")

    if dry:
        print(f"DRY RUN — would insert {len(new_titles)} section(s) at offset {at}")
        for t in new_titles:
            print(f"  + {t}")
        print(f"  {len(html)//1024} kB -> {len(out)//1024} kB")
        return

    bak = f"{page_path}.{time.strftime('%H%M%S')}.bak"
    shutil.copy2(page_path, bak)
    with open(page_path, "w", encoding="utf-8") as fh:
        fh.write(out)

    after = index(page_path)
    print(f"Inserted {len(new_titles)} section(s) into {page_path}")
    for t in new_titles:
        print(f"  + {t}")
    print(f"  sections: {len(before['sections'])} -> {len(after['sections'])}")
    print(f"  size:     {len(html)//1024} kB -> {len(out)//1024} kB")
    print(f"  backup:   {bak}")


if __name__ == "__main__":
    main()