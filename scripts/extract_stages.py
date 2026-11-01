"""Extract platform occupancy from the user-specified reference images."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import urllib.request, json, subprocess
from collections import Counter
from PIL import Image
root=Path(__file__).resolve().parent.parent
ref=root/'reference'; ref.mkdir(exist_ok=True)
def fetch(n):
 p=ref/f'round{n}.png'
 if not p.exists():
  subprocess.run(['curl','-fLs','--retry','3',f'https://www.arcadequartermaster.com/bubbob/round{n}.png','-o',str(p)],check=True)
 im=Image.open(p).convert('RGB')
 blocks=[[im.crop((x*8,y*8,x*8+8,y*8+8)).tobytes() for x in range(32)] for y in range(28)]
 counts=Counter(block for row in blocks for block in row)
 rows=[]
 for row in blocks:
  result=''
  for block in row:
   colors=list(zip(block[0::3],block[1::3],block[2::3]))
   visible=sum(max(c)>35 for c in colors)
   result+='#' if counts[block]>=4 and (visible>=40 or (visible>=24 and (len({c for c in colors if max(c)>35})>=2 or max(max(c) for c in colors)>=150))) else '.'
  rows.append(result)
 return {'round':n,'tiles':rows}
with ThreadPoolExecutor(max_workers=5) as pool: stages=list(pool.map(fetch,range(1,101)))
(root/'stages.js').write_text('window.STAGES = '+json.dumps(stages,separators=(',',':'))+';\n')
print(f'Extracted {len(stages)} rounds')
