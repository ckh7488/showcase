"""Validate the catalog and local HTML/CSS links using only Python's standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from datetime import date
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('href', 'src', 'poster') and value:
                self.links.append(value)
            elif key == 'srcset' and value and not value.startswith('data:'):
                self.links.extend(item.strip().split()[0] for item in value.split(',') if item.strip())

def validate():
    errors = []
    def check_link(source, link):
        parsed = urlsplit(link)
        if parsed.scheme in ('http', 'https', 'mailto', 'tel', 'data', 'blob') or link.startswith('//'):
            return
        if parsed.scheme or '\\' in link or link.startswith('/'):
            errors.append(f'{source.relative_to(ROOT)}: absolute or unsupported URL: {link[:100]}')
            return
        if not parsed.path:
            return
        target = (source.parent / unquote(parsed.path)).resolve()
        if not target.is_relative_to(ROOT):
            errors.append(f'{source.relative_to(ROOT)}: path leaves site: {link}')
        elif not target.exists():
            errors.append(f'{source.relative_to(ROOT)}: missing file: {link}')
        elif target.is_dir() and not (target / 'index.html').is_file():
            errors.append(f'{source.relative_to(ROOT)}: directory has no index.html: {link}')
        elif target.exists():
            # Windows resolves wrong-case paths; GitHub Pages does not.
            current = ROOT
            for part in target.relative_to(ROOT).parts:
                if part not in {child.name for child in current.iterdir()}:
                    errors.append(f'{source.relative_to(ROOT)}: path case mismatch: {link}')
                    break
                current /= part

    manifest = json.loads((ROOT / 'reports.json').read_text(encoding='utf-8'))
    if manifest.get('version') != 1 or not isinstance(manifest.get('reports'), list):
        raise ValueError('reports.json requires version: 1 and a reports array')
    ids = set()
    fields = ('id','title','summary','category','date','path','cover','coverAlt')
    for report in manifest['reports']:
        if any(not isinstance(report.get(key), str) or not report[key].strip() for key in fields):
            errors.append('Report missing a required nonempty string field')
            continue
        slug = report['id']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or slug in ids:
            errors.append(f'Invalid or duplicate id: {slug}')
        ids.add(slug)
        try:
            if date.fromisoformat(report['date']).isoformat() != report['date']:
                raise ValueError()
        except ValueError:
            errors.append(f'{slug}: date must be YYYY-MM-DD')
        prefix = f'reports/{slug}/'
        if report['path'] not in (prefix, prefix + 'index.html'):
            errors.append(f'{slug}: path must be {prefix}')
        if not report['cover'].startswith(prefix) or '..' in report['cover']:
            errors.append(f'{slug}: cover must be inside its report folder')
        for key in ('path','cover'):
            check_link(ROOT / 'reports.json', report[key])
        entry = ROOT / prefix / 'index.html'
        if entry.is_file():
            page_links = Links(); page_links.feed(entry.read_text(encoding='utf-8'))
            themes = [(entry.parent / unquote(urlsplit(link).path)).resolve() for link in page_links.links
                      if not urlsplit(link).scheme and not link.startswith('//')]
            if ROOT / 'assets/theme.v1.css' not in themes:
                errors.append(f'{slug}: connect ../../assets/theme.v1.css (see DESIGN.md)')
        if not isinstance(report.get('tags'), list) or not all(isinstance(t, str) and t for t in report['tags']):
            errors.append(f'{slug}: tags must be an array of nonempty strings')
    for folder in (ROOT / 'reports').iterdir():
        if folder.is_dir() and folder.name not in ids:
            errors.append(f'Unregistered report: {folder.name}')

    public_files = [ROOT / 'index.html']
    for folder in ('assets','reports'):
        public_files.extend(p for p in (ROOT / folder).rglob('*') if p.is_file())
    for path in public_files:
        if path.is_symlink():
            errors.append(f'Symlink is not portable: {path.relative_to(ROOT)}')
        if path.stat().st_size > 25 * 1024 * 1024:
            errors.append(f'Asset exceeds 25 MiB: {path.relative_to(ROOT)}')
        if path.suffix.lower() in ('.html','.css'):
            text = path.read_text(encoding='utf-8')
            links = []
            if path.suffix.lower() == '.html':
                parser = Links(); parser.feed(text); links.extend(parser.links)
            links.extend(m.group(2) for m in re.finditer(r'url\(\s*([\"\']?)(.*?)\1\s*\)', text))
            for link in links:
                check_link(path, link)
    if errors:
        for error in errors:
            print('ERROR:', error)
        return False
    print(f'OK: {len(ids)} report(s), {len(public_files)} public files; catalog and static local links valid.')
    return True

if __name__ == '__main__':
    sys.exit(0 if validate() else 1)
