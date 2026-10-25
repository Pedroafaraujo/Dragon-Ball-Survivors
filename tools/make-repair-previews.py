"""Diagnostic contact sheets from the actual PNGs, never substitutes for frames."""
from pathlib import Path
from PIL import Image,ImageDraw
from io import BytesIO
import subprocess
root=Path(__file__).resolve().parent.parent;out=root/'docs/previews';out.mkdir(exist_ok=True)
BASELINE='01fd37885c048bc69fa75bc498fd2d02ad3e188d'
for name,rows in [('goku-motion',[4,5,6,7]),('goku-signature',[0,1,2,3]),('enemy-saibaman-motion',[4,5,6,7]),('goku-ssj3-motion',[4,5,6,7])]:
 for version in ['before','after']:
  rel=f'assets/packed/animation/{name}.png';image=Image.open(BytesIO(subprocess.check_output(['git','show',f'{BASELINE}:{rel}'],cwd=root))) if version=='before' else Image.open(root/rel)
  canvas=Image.new('RGB',(832,len(rows)*218+36),(25,43,49));draw=ImageDraw.Draw(canvas);draw.text((12,8),f'{name} / {version} / full 96x96 cells at 2x',fill='#ffdc91')
  for i,row in enumerate(rows):
   for col in range(4):
    tile=image.crop((col*96,row*96,(col+1)*96,(row+1)*96)).resize((192,192),Image.Resampling.NEAREST);x=col*208+8;y=i*218+42;canvas.paste(tile,(x,y),tile);draw.line((x,y+168,x+192,y+168),fill='#83b992');draw.text((x,y+193),f'row {row}, frame {col}',fill='#b8d8c9')
  canvas.save(out/f'{name}-{version}.png')
print('Saved eight before/after contact sheets')
