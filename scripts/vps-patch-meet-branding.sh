#!/usr/bin/env bash
set -euo pipefail
CFG=/opt/plugNmeet/config.yaml
sudo cp "$CFG" "$CFG.bak.brand.$(date +%Y%m%d%H%M%S)"
sudo python3 <<'PY'
from pathlib import Path
p = Path('/opt/plugNmeet/config.yaml')
text = p.read_text()
old = 'Powered by <a href="https://www.plugnmeet.org" target="_blank">plugNmeet</a>'
new = 'Powered by <a href="https://zenleader.xyz" target="_blank">ZenLeader</a>'
if old not in text:
    if 'zenleader.xyz' in text and 'copyright_conf' in text:
        print('copyright already ZenLeader')
    else:
        raise SystemExit('copyright pattern not found')
else:
    text = text.replace(old, new)
    print('replaced copyright text')

# Ensure display: true under copyright_conf
idx = text.find('copyright_conf:')
if idx >= 0:
    # look at next ~400 chars for display
    snippet = text[idx:idx+500]
    if 'display:' not in snippet.split('room_')[0] and 'display:' not in snippet.split('\nroom')[0]:
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
