#!/usr/bin/env python3
"""Lightweight site checker for link integrity and basic accessibility.

Usage: python tools/site_checker.py
Runs on the `src/` folder in the repository root.
"""
import os
import sys
from html.parser import HTMLParser

ROOT = os.path.join(os.path.dirname(__file__), '..', 'src')

class MyParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.images = []
        self.labels = []
        self.inputs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])
        if tag == 'img':
            self.images.append(attrs.get('alt'))
        if tag == 'label' and 'for' in attrs:
            self.labels.append(attrs['for'])
        if tag in ('input','select','textarea') and 'id' in attrs:
            self.inputs.append(attrs['id'])

def find_html_files(root):
    for dirpath,_,filenames in os.walk(root):
        for f in filenames:
            if f.lower().endswith('.html'):
                yield os.path.join(dirpath,f)

def check_file(path):
    with open(path,'r',encoding='utf-8',errors='ignore') as fh:
        data = fh.read()
    p = MyParser()
    p.feed(data)
    results = []
    # check links: internal links only (starting without http)
    for href in p.links:
        if href.startswith('http') or href.startswith('mailto:') or href.startswith('#'):
            continue
        target = os.path.normpath(os.path.join(os.path.dirname(path), href.split('#')[0]))
        if not os.path.exists(target):
            results.append(('bad-link', href))
    # images without alt
    for alt in p.images:
        if alt is None or alt.strip() == '':
            results.append(('missing-alt', None))
    # label -> input mapping
    for l in p.labels:
        if l not in p.inputs:
            results.append(('label-without-input', l))
    return results

def main():
    root = os.path.abspath(ROOT)
    print('Checking HTML files under', root)
    total = 0
    issues = 0
    for path in sorted(find_html_files(root)):
        total += 1
        res = check_file(path)
        if res:
            issues += len(res)
            print('\nIssues in', os.path.relpath(path, root))
            for r,t in res:
                print(' -', r, t)
    print('\nFiles checked:', total, 'Issues found:', issues)
    if issues:
        sys.exit(2)

if __name__ == '__main__':
    main()
