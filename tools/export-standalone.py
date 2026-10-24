"""Embed ES modules and runtime PNGs for a single-file offline distribution."""
from pathlib import Path
import base64
import json
import re
import sys

root = Path(__file__).resolve().parent.parent
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / 'Dragon-Ball-Survivors.html'
manifest = json.loads((root / 'assets/manifest.json').read_text())
manifest['sheets'] += json.loads((root/'assets/animation-manifest.json').read_text())['sheets']
images = {s['file']: 'data:image/png;base64,' + base64.b64encode((root/'assets'/s['runtime']).read_bytes()).decode() for s in manifest['sheets']}
modules = {}
for file in (root / 'src').glob('*.js'):
    source = file.read_text()
    if file.stem == 'sprites':
        source = re.sub(r'const rawAssets = .*?;', 'const rawAssets = false;', source)
        source = re.sub(r'const root = new URL\([\s\S]*?\);', 'const root = null;', source, count=1)
        source = source.replace('new URL(file, root).href', 'window.__SPRITE_URLS[file]')
    source = re.sub(r'([\"\'])\./([^\"\']+)\.js\1', lambda m: '"dbs/' + m.group(2) + '"', source)
    modules['dbs/' + file.stem] = 'data:text/javascript;base64,' + base64.b64encode(source.encode()).decode()
html = (root / 'index.html').read_text()
html = re.sub(r'<link\s+rel="stylesheet"\s+href="style.css"\s*/?>', '<style>' + (root / 'style.css').read_text() + '</style>', html)
boot = '<script>window.__SPRITE_URLS=' + json.dumps(images) + ';</script><script type="importmap">' + json.dumps({'imports': modules}) + '</script><script type="module">import "dbs/main";</script>'
html = re.sub(r'<script type="module" src="src/main.js"></script>', lambda _: boot, html)
output.write_text(html)
print(f'Exported {output.name}: {output.stat().st_size:,} bytes, {len(images)} embedded PNG atlases')
