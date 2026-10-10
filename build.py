#!/usr/bin/env python3
"""Assemble index.html from src/.

The game ships as one self-contained page (GitHub Pages, file:// for the tests), but it is
written as a set of source files, one per section, under src/js/. This script wraps them in
the page skeleton and a single closure and writes index.html.

    python build.py          write index.html
    python build.py --check  exit 1 if index.html is out of date (for CI or a pre-commit hook)
"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'index.html')


def read(path):
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


def build():
    head = read(os.path.join(SRC, 'head.html'))
    tail = read(os.path.join(SRC, 'tail.html'))
    js_dir = os.path.join(SRC, 'js')
    parts = [read(os.path.join(js_dir, name)) for name in sorted(os.listdir(js_dir)) if name.endswith('.js')]
    version = read(os.path.join(ROOT, 'VERSION')).strip()
    script = '(() => {\n' + f"const SW_VERSION = '{version}';\n" + ''.join(parts) + '})();\n'
    return head + '<script>\n' + script + '</script>\n' + tail


def main():
    html = build()
    if '--check' in sys.argv:
        current = read(OUT) if os.path.exists(OUT) else ''
        if current != html:
            print('index.html is out of date: run python build.py', file=sys.stderr)
            sys.exit(1)
        print('index.html is up to date')
        return
    with open(OUT, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    print(f'wrote index.html ({len(html):,} bytes)')


if __name__ == '__main__':
    main()
