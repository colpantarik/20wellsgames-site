"""Regenerate the hero scenery: python3 dev/tools/gen_scene.py > /tmp/scene.txt && python3 dev/tools/splice_scene.py /tmp/scene.txt  (run from the site root)"""
import sys, re
src = open(sys.argv[1]).read()
defs = src.split('<!--DEFS-->')[1].split('<!--BODY-->')[0].strip('\n')
body = src.split('<!--BODY-->')[1].strip('\n')
p = 'index.html'; s = open(p).read()
a = s.index('<svg class="scene"'); z = s.index('</svg>', a)
svg = s[a:z]
# keep the chalk filter, drop any old masks, rebuild defs + body
filt = re.search(r'<filter id="chalk-scene".*?</filter>', svg, re.S).group(0)
head = svg[:svg.index('<defs>')]
new = head + '<defs>\n      ' + filt + '\n' + defs + '\n    </defs>\n' + body + '\n  '
s = s[:a] + new + s[z:]
open(p, 'w').write(s); print('scene spliced')
