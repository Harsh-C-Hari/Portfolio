#!/usr/bin/env python3
"""
Build step for the portfolio site.

Reads src/layout.html, replaces each `<!-- include:PATH -->` marker with the
raw contents of that file (relative to this script), and writes the result
to index.html in this directory.

Usage:
    python3 build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
LAYOUT = ROOT / 'src' / 'layout.html'
OUTPUT = ROOT / 'index.html'

INCLUDE_RE = re.compile(r'<!-- include:([^\s]+?\.html) -->\r?\n')


def read(path):
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


def build():
    layout = read(LAYOUT)

    def replace(match):
        rel_path = match.group(1)
        partial_path = ROOT / rel_path
        if not partial_path.exists():
            raise FileNotFoundError(f'Partial not found: {partial_path}')
        return read(partial_path)

    assembled = INCLUDE_RE.sub(replace, layout)
    with open(OUTPUT, 'w', encoding='utf-8', newline='') as f:
        f.write(assembled)
    print(f'Built {OUTPUT} ({len(assembled)} bytes)')


if __name__ == '__main__':
    build()
