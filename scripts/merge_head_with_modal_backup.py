# -*- coding: utf-8 -*-
"""
Merge git HEAD (correct Spanish) with App.corrupted.jsx (Modal + useDisclosure migration)
using difflib line opcodes. Prefer HEAD when lines are same modulo accents/mojibake;
prefer backup when Modal/structural migration differs.
"""
import difflib
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / "src" / "App.corrupted.jsx"
OUT = ROOT / "src" / "App.jsx"

MOJIBAKE_Q = re.compile(r"(?<=[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ])\?(?=[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ])")


def ascii_fold(s: str) -> str:
    s = s.replace("\ufffd", "")
    s = MOJIBAKE_Q.sub("", s)
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if ord(c) < 128)


def is_modal_line(line: str) -> bool:
    return (
        "<Modal" in line
        or "</Modal>" in line
        or "useDisclosure(" in line
        or "addEventModal" in line
        or "addLocModal" in line
        or "donationsListModal" in line
    )


def is_corrupted(line: str) -> bool:
    return "\ufffd" in line or MOJIBAKE_Q.search(line) is not None


def pick_line(g: str, b: str) -> str:
    if is_modal_line(b):
        return b
    if g == b:
        return b
    if is_corrupted(b):
        return g
    if ascii_fold(g) == ascii_fold(b):
        return g
    return b


def main():
    good = subprocess.check_output(["git", "show", "HEAD:src/App.jsx"], cwd=ROOT).decode("utf-8").splitlines()
    bad = BACKUP.read_text(encoding="utf-8", errors="replace").splitlines()

    sm = difflib.SequenceMatcher(a=good, b=bad, autojunk=False)
    out: list[str] = []

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            out.extend(bad[j1:j2])
        elif tag == "insert":
            out.extend(bad[j1:j2])
        elif tag == "delete":
            # Backup removed these lines (e.g. consolidated overlay); do not restore from HEAD
            continue
        elif tag == "replace":
            gl, bl = good[i1:i2], bad[j1:j2]
            if len(gl) == len(bl):
                for g, b in zip(gl, bl):
                    out.append(pick_line(g, b))
            else:
                out.extend(bl)

    text = "\n".join(out) + "\n"
    OUT.write_text(text, encoding="utf-8")
    print(f"Wrote {OUT} ({len(out)} lines)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
