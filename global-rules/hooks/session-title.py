#!/usr/bin/env python3
"""Freeze the session title and force the "Month N: Title" format.

Claude Code re-titles a session over and over (it writes an `ai-title` record
each time), so the name in the sidebar drifts while you work. This hook runs
after every turn and writes the settled name back as the newest ai-title.

WHEN it settles is the whole difficulty. Title too early and you get the
opening message back as a name - "hi", or "May kulang dito" typed under a
screenshot. Neither says what the session was for, and once frozen that is the
name for good. So the name only settles once the session has actually done
something, and only on a title that is not just the message repeated back.
Until then it keeps following Claude Code. After that it never moves again.
"""
import json
import os
import re
import sys
from datetime import datetime

MONTHS = ("January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December")

# Tool calls the session must have run before any name is allowed to stick.
WORK_BEFORE_LOCKING = 3

# Titles that name the greeting rather than the work.
JUNK = {"untitled", "hi", "hey", "hello", "yo", "hi there", "hello there",
        "test", "greeting", "casual greeting", "simple greeting", "kamusta",
        "kumusta", "musta", "greetings", "new session", "conversation"}

TS = re.compile(r'"timestamp":"([^"]+)"')
WORD = re.compile(r"[a-z0-9]+")


def words(text):
    return WORD.findall((text or "").lower())


def strip_prefix(title):
    """Drop an existing "Month N: " prefix so it is never doubled."""
    head, sep, tail = title.partition(": ")
    if not sep:
        return title
    bits = head.split()
    if len(bits) == 2 and bits[0] in MONTHS and bits[1].isdigit():
        return tail
    return title


def echoes_a_message(title, messages):
    """True when the title is just a short user message handed back.

    Only SHORT messages count. A title lifted out of a real instruction
    ("fix the venue directory counts" -> "Venue directory counts") is a good
    name; a title that is the entire message ("may kulang dito") is not a name
    at all, it is the prompt with capital letters.
    """
    t = " ".join(words(title))
    if not t:
        return True
    for msg in messages:
        m = words(msg)
        if len(m) <= 4 and t in " ".join(m):
            return True
    return False


def read_transcript(path):
    titles, messages = [], []
    started, tools = None, 0
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if started is None and '"timestamp"' in line:
                found = TS.search(line)
                if found:
                    started = found.group(1)
            if '"type":"tool_use"' in line:
                tools += 1
            if '"ai-title"' in line:
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                if rec.get("type") == "ai-title":
                    title = strip_prefix((rec.get("aiTitle") or "").strip())
                    if title:
                        titles.append((title, tools))
            elif len(messages) < 6 and '"role":"user"' in line:
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                content = (rec.get("message") or {}).get("content")
                if isinstance(content, str):
                    messages.append(content)
                elif isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text":
                            messages.append(part.get("text") or "")
    return titles, messages, started


def settle(titles, messages):
    """The name to freeze on, or the newest one while nothing is trustworthy."""
    for title, tools_by_then in titles:
        if tools_by_then < WORK_BEFORE_LOCKING:
            continue
        if title.lower().strip(" .!?") in JUNK:
            continue
        if len(words(title)) < 2:
            continue
        if echoes_a_message(title, messages):
            continue
        return title
    return titles[-1][0] if titles else None


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    path = payload.get("transcript_path")
    sid = payload.get("session_id")
    if not path or not sid or not os.path.exists(path):
        return 0

    titles, messages, started = read_transcript(path)
    settled = settle(titles, messages)
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

    # Nothing to write when the newest record already says exactly this.
    current = None
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
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
