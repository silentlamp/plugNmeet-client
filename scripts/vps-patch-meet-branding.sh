#!/usr/bin/env bash
set -euo pipefail
CFG=/opt/plugNmeet/config.yaml
sudo cp "$CFG" "$CFG.bak.brand.$(date +%Y%m%d%H%M%S)"
sudo python3 <<'PY'
from pathlib import Path
import re

p = Path('/opt/plugNmeet/config.yaml')
text = p.read_text()
new = 'Được phát triển bởi Blue Ocean Digital'
legacy = [
    'Powered by <a href="https://www.plugnmeet.org" target="_blank">plugNmeet</a>',
    'Powered by <a href="https://zenleader.xyz" target="_blank">ZenLeader</a>',
]

replaced = False
for old in legacy:
    if old in text:
        text = text.replace(old, new)
        replaced = True
        print(f'replaced legacy copyright ({old[:32]}...)')

# Normalize any copyright_conf.text value to Blue Ocean Digital
text2, n = re.subn(
    r"(copyright_conf:[\s\S]*?\n\s*text:\s*)(['\"])([^'\"]*)(\2)",
    rf"\1'{new}'",
    text,
    count=1,
)
if n:
    text = text2
    replaced = True
    print('normalized copyright_conf.text')

if new not in text:
    raise SystemExit('copyright_conf.text update failed')
if not replaced:
    print('copyright already Blue Ocean Digital')

idx = text.find('copyright_conf:')
if idx >= 0:
    snippet = text[idx:idx + 500]
    if 'display:' not in snippet:
        text = text.replace('copyright_conf:\n', 'copyright_conf:\n    display: true\n', 1)
        print('inserted display: true')

p.write_text(text)
print('--- copyright_conf ---')
in_block = False
for ln in p.read_text().splitlines():
    if ln.strip().startswith('copyright_conf:'):
        in_block = True
        print(ln)
        continue
    if in_block:
        if ln and not ln.startswith(' ') and not ln.startswith('#'):
            break
        if ln.startswith('  ') and not ln.startswith('    ') and not ln.strip().startswith('#'):
            break
        print(ln)
PY

sudo docker restart plugnmeet-plugnmeet-1
sleep 5
docker ps --filter name=plugnmeet-plugnmeet --format '{{.Names}} {{.Status}}'
echo DONE
