"""Original, deterministic pixel artwork. Pillow only; no service or image download.
Each cell is drawn at 48px, then exported at 2x nearest-neighbour, 8 poses/style.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math,json
ROOT=Path(__file__).resolve().parent.parent
NAMES=['beam-blue','beam-violet','beam-gold','helix','ki','disc','genki','bang','planet','charge','explosion','impact','elastic','flash','explosion-blue','explosion-pink','ki-blue','ki-pink']
PALETTES=[('#0c496c','#238fac','#63d9ed','#e8ffff'),('#352258','#7048ad','#c890ff','#fcdeff'),('#8c4b29','#d68f36','#ffe385','#ffffec'),('#4d2262','#bd70c2','#ffdb73','#fff6d7'),('#a86526','#e8ac40','#ffe67b','#fffde2'),('#a35f26','#dcb541','#fff28a','#ffffed'),('#165e92','#419ac5','#9be8fa','#efffff'),('#183f86','#386dd6','#8cbcff','#e7ffff'),('#66234d','#b43b83','#ee82c0','#ffe0f3'),('#155480','#4396b7','#92e2ed','#f4ffff'),('#893f28','#df7b3b','#ffcf74','#fff5d2'),('#73465c','#ce839b','#ffe2b5','#ffffff'),('#9c4c76','#c66c9f','#ed9dc6','#ffd1e5'),('#998057','#d5bf75','#fff0b0','#ffffff')]
PALETTES += [PALETTES[6], PALETTES[8], PALETTES[7], PALETTES[8]]
def poly(d,points,c):d.polygon([(round(x),round(y)) for x,y in points],fill=c)
def star(d,x,y,r,c,n=8,phase=0,inner=.45):
 poly(d,[(x+math.cos(i*math.pi/n+phase)*r*(1 if i%2==0 else inner),y+math.sin(i*math.pi/n+phase)*r*(1 if i%2==0 else inner)) for i in range(n*2)],c)
def orb(d,kind,f,c):
 r=13+(f%3-1);x=y=24
 if kind=='planet':star(d,x,y,21,c[0],n=7,phase=f*.12,inner=.78)
 elif kind=='bang':star(d,x,y,21,c[1],n=4,phase=f*.16,inner=.55)
 elif kind=='genki':star(d,x,y,21,c[0],n=12,phase=f*.07,inner=.86)
 d.ellipse((x-r,y-r,x+r,y+r),fill=c[0]);d.ellipse((x-r+2,y-r+1,x+r-2,y+r-3),fill=c[1]);d.ellipse((x-r+4,y-r+2,x+r-3,y+r-5),fill=c[2])
 # Changing facets and swirls are separate drawings, not a shifted static ball.
 for i in range(3):
  a=f*.65+i*2.1;px=round(x+math.cos(a)*(r-4));py=round(y+math.sin(a)*(r-4));d.rectangle((px-2,py-1,px+2,py+1),fill=c[3])
 d.rectangle((x-5,y-8,x-2,y-6),fill=c[3]);d.rectangle((x-8,y-5,x-6,y-2),fill=c[3])
 if kind=='planet':
  for i in range(3):
   a=f*.15+i*2;poly(d,[(24+math.cos(a)*4,24+math.sin(a)*4),(24+math.cos(a+.3)*12,24+math.sin(a+.3)*12),(24+math.cos(a+.6)*10,24+math.sin(a+.6)*10)],c[0])
def cell(kind,f,c):
 im=Image.new('RGBA',(48,48));d=ImageDraw.Draw(im)
 if kind.startswith('beam') or kind=='helix':
  edge=[(x,24+round(math.sin((x+f*5)*.42)*2)+8) for x in range(-2,51,3)]
  poly(d,[(-2,13),(50,13)]+edge[::-1],c[0]);d.rectangle((0,17,47,30),fill=c[1]);d.rectangle((0,20,47,27),fill=c[2]);d.rectangle((0,23,47,24),fill=c[3])
  for x in range(-12,55,12):
   k=(x+f*7)%60-6;y=18 if (x//12+f)%2 else 28;d.rectangle((k,y,k+5,y+1),fill=c[3])
  if kind=='helix':
   for x in range(48):
    y=round(24+math.sin(x*.25-f*.8)*10);d.rectangle((x,y,x+1,y+1),fill=c[2])
 elif kind=='disc':
  height=[3,4,6,7,6,4,3,2][f];star(d,24,24,21,c[0],n=8,phase=f*.25,inner=.8);d.ellipse((4,24-height,44,24+height),fill=c[1]);d.ellipse((7,25-height,41,23+height),fill=c[2]);d.line((8,23,39,23),fill=c[3],width=1)
 elif kind in ['ki','ki-blue','ki-pink','impact']:
  r=16 if kind.startswith('ki') else [4,11,18,21,17,13,8,3][f];star(d,24,24,r,c[0],n=4,phase=f*.08,inner=.3);star(d,24,24,r*.8,c[2],n=4,phase=f*.08,inner=.28);star(d,24,24,r*.5,c[3],n=4,phase=f*.08,inner=.4)
 elif kind.startswith('explosion'):
  r=[5,11,18,22,22,20,17,13][f]
  star(d,24,25,r,c[0],n=9,phase=f*.12,inner=.76);star(d,24,24,r*.84,c[1],n=7,phase=f*.15,inner=.78);star(d,24,23,r*.65,c[2],n=8,phase=f*.11,inner=.85)
  if f<4:star(d,24,23,r*.43,c[3],n=6,phase=f*.1,inner=.8)
  else:
   # Holes grow through the smoke and the outer lobes break into sparks.
   for j in range(f-2):
    a=j*2.3+f*.4;x=24+math.cos(a)*r*.55;y=24+math.sin(a)*r*.55;q=f-3;d.rectangle((round(x-q),round(y-q),round(x+q),round(y+q)),fill=(0,0,0,0))
 elif kind=='elastic':
  d.rectangle((0,19,47,29),fill=c[0]);d.rectangle((0,20,47,26),fill=c[1]);d.rectangle((0,21,47,23),fill=c[2]);
  for x in range(-9,48,9):
   k=x+f;d.line((k,20,k+3,27),fill=c[0],width=1)
   d.rectangle((k+3,21,k+5,22+(f%2)),fill=c[3])
 elif kind=='flash':
  star(d,24,24,[10,17,23,20,17,14,9,5][f],c[2],n=12,phase=f*.04,inner=.2);star(d,24,24,9,c[3],n=8,inner=.65)
 else:orb(d,kind,f,c)
 return im.resize((96,96),Image.Resampling.NEAREST)
out=Image.new('RGBA',(384,len(NAMES)*192))
for n,kind in enumerate(NAMES):
 for f in range(8):out.alpha_composite(cell(kind,f,PALETTES[n]),((f%4)*96,(n*2+f//4)*96))
p=ROOT/'assets/packed/effects/combat-fx.png';out.save(p,optimize=True)
m=ROOT/'assets/animation-manifest.json';data=json.loads(m.read_text());data['sheets']=[s for s in data['sheets'] if s['key']!='combat-fx'];data['sheets'].append({'key':'combat-fx','file':'effects/combat-fx.png','runtime':'packed/effects/combat-fx.png','source':'../tools/draw-combat-fx.py','rows':len(NAMES)*2,'cell':96,'frames':len(NAMES)*8,'artStatus':'effect','styles':NAMES});m.write_text(json.dumps(data,indent=2)+'\n')
print('Drew',len(NAMES)*8,'original pixel effect frames;',p.stat().st_size,'bytes')
