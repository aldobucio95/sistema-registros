# -*- coding: utf-8 -*-
"""Map lines with U+FFFD to correct UTF-8 from HEAD using ascii_fold(strip JSX)."""
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "App.jsx"

MOJIBAKE_Q = re.compile(r"(?<=[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ])\?(?=[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ])")


def ascii_fold(s: str) -> str:
    s = s.replace("\ufffd", "")
    s = MOJIBAKE_Q.sub("", s)
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if ord(c) < 128)


def strip_jsx_expr(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\{[^{}]*\}", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def main():
    good_lines = subprocess.check_output(["git", "show", "HEAD:src/App.jsx"], cwd=ROOT).decode("utf-8").splitlines()

    from collections import defaultdict

    idx: dict[str, list[str]] = defaultdict(list)
    for gl in good_lines:
        k = ascii_fold(strip_jsx_expr(gl))
        if len(k) >= 12:
            idx[k].append(gl)

    lines = APP.read_text(encoding="utf-8").splitlines()
    fixed = 0
    for i, line in enumerate(lines):
        if "\ufffd" not in line:
            continue
        k = ascii_fold(strip_jsx_expr(line))
        cands = idx.get(k, [])
        if len(cands) == 1:
            lines[i] = cands[0]
            fixed += 1

    APP.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"fixed {fixed}, ufffd left {open(APP,encoding='utf-8').read().count(chr(0xfffd))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
