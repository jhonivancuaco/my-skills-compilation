#!/usr/bin/env python3
"""Freeze the session title and force the "Month N: Title" format.

Claude Code re-titles a session over and over (it writes an `ai-title` record
each time), so the name in the sidebar drifts while you work. This hook runs
after every turn and writes the settled name back as the newest ai-title.

Which title settles matters. A session that opens with "hey" or "hi" gets
titled after the greeting, which says nothing about the work - so the name is
only locked once the session has actually done something (the first tool call).
Before that it keeps following whatever Claude Code last called it. Once
locked, it never moves again, and it always carries the day the session began.
"""
import json
import os
import re
import sys
from datetime import datetime

MONTHS = ("January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December")

# Titles that describe the greeting rather than the work.
JUNK = {"untitled", "hi", "hey", "hello", "yo", "hi there", "hello there",
        "test", "greeting", "casual greeting", "simple greeting", "kamusta",
        "kumusta", "musta", "greetings"}

TS = re.compile(r'"timestamp":"([^"]+)"')


def strip_prefix(title):
    """Drop an existing "Month N: " prefix so it is never doubled."""
    head, sep, tail = title.partition(": ")
    if not sep:
        return title
    bits = head.split()
    if len(bits) == 2 and bits[0] in MONTHS and bits[1].isdigit():
        return tail
    return title


def usable(title):
    return title.lower().strip(" .!?") not in JUNK


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    path = payload.get("transcript_path")
    sid = payload.get("session_id")
    if not path or not sid or not os.path.exists(path):
        return 0

    locked = None       # the name we settle on, once there is real work
    last = None         # whatever Claude Code called it most recently
    started = None      # when the session began
    worked = False      # has this session run a tool yet?

    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if started is None and '"timestamp"' in line:
                found = TS.search(line)
                if found:
                    started = found.group(1)
            if '"type":"tool_use"' in line:
                worked = True
            if '"ai-title"' not in line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            if rec.get("type") != "ai-title":
                continue
            title = strip_prefix((rec.get("aiTitle") or "").strip())
            if not title:
                continue
            last = title
            if locked is None and worked and usable(title):
                locked = title

    # No real work yet: let the name keep following Claude Code, just dated.
    settled = locked or last
    if not settled:
        return 0

    when = None
    if started:
        try:
            when = datetime.fromisoformat(started.replace("Z", "+00:00")).astimezone()
        except Exception:
            when = None
    if when is None:
        when = datetime.now()

    wanted = "%s %d: %s" % (MONTHS[when.month - 1], when.day, settled)
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        current = None
        for line in fh:
            if '"ai-title"' in line:
                try:
                    current = json.loads(line).get("aiTitle")
                except Exception:
                    pass
    if current == wanted:
        return 0

    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps({"type": "ai-title", "aiTitle": wanted,
                             "sessionId": sid}, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
