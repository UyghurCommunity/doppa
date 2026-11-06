from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import subprocess

root = Path(__file__).resolve().parents[2]
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids = set(); self.links = []; self.refs = []
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, 'Duplicate HTML ID: ' + attrs['id']
            self.ids.add(attrs['id'])
        for name in ['href', 'src']:
            if attrs.get(name): self.links.append(attrs[name])
        for name in ['aria-controls', 'aria-labelledby', 'aria-describedby']:
            if attrs.get(name): self.refs.extend(attrs[name].split())

files = subprocess.check_output(['git', 'ls-files', '*.html'], cwd=root, text=True).splitlines()
for filename in files:
    path = root / filename; page = Page(); page.feed(path.read_text())
    for reference in page.refs: assert reference in page.ids, f'{filename}: missing ARIA target {reference}'
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc: continue
        if not url.path:
            if url.fragment: assert url.fragment in page.ids, f'{filename}: missing fragment {url.fragment}'
            continue
        target = path.parent / unquote(url.path)
        assert target.exists(), f'{filename}: missing local asset {link}'
print(f'Validated local links, HTML IDs and ARIA targets in {len(files)} pages.')
