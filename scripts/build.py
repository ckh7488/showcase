"""Package only publishable files. Run in a clean checkout or without an existing _site/."""
from pathlib import Path
import shutil
from validate import ROOT, validate

if not validate():
    raise SystemExit(1)
out = ROOT / '_site'
if out.exists():
    raise SystemExit('_site already exists. Use a fresh checkout for the release build.')
out.mkdir()
for name in ('index.html', 'reports.json', '.nojekyll'):
    shutil.copy2(ROOT / name, out / name)
for name in ('assets', 'reports'):
    shutil.copytree(ROOT / name, out / name)
print('Static website prepared in _site/')
