"""Technical extraction/repair of existing authored PNGs; masters stay unchanged.
Development only: python3 -m pip install pillow numpy scipy
"""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image,ImageOps
from scipy import ndimage
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'assets/source/animation';DST=ROOT/'assets/packed/animation'
FORMS={'goku':['base','ssj','ssj2','ssj3','god','blue','ui'],'vegeta':['base','ssj','ssj2','god','blue','ue'],'gohan':['base','ssj','ssj2','ultimate','beast'],'buu':['base'],'krillin':['base']}
HEIGHTS={'goku':66,'vegeta':64,'gohan':66,'buu':58,'krillin':55}
STRUCT=np.ones((3,3),int)
manifest=[];frame_data={};extraction_report={}

def extract(name,expected):
    im=Image.open(SRC/(name+'.png')).convert('RGBA');rgba=np.asarray(im)
    lab,n=ndimage.label(rgba[:,:,3]>=144,STRUCT);areas=np.bincount(lab.ravel());areas[0]=0
    cutoff=max(180,int(np.percentile(areas[areas>180],75)*.16));objects=[]
    for i,sl in enumerate(ndimage.find_objects(lab),1):
        if sl is None or areas[i]<cutoff:continue
        yy,xx=sl;ys,xs=np.where(lab[sl]==i)
        objects.append({'id':i,'cx':float(xx.start+xs.mean()),'cy':float(yy.start+ys.mean()),'box':[xx.start,yy.start,xx.stop,yy.stop]})
    xs=np.array([o['cx'] for o in objects]);centres=np.linspace(np.percentile(xs,5),np.percentile(xs,95),4)
    for _ in range(25):
        groups=np.argmin(abs(xs[:,None]-centres),axis=1);centres=np.array([np.median(xs[groups==i]) for i in range(4)])
    cols=[sorted([o for o,k in zip(objects,groups) if k==j],key=lambda o:o['cy']) for j in range(4)]
    references=[v for v in cols if len(v)==expected]
    if not references:raise ValueError(f'{name}: no trustworthy complete source column')
    row_y=np.median([[o['cy'] for o in col] for col in references],axis=0)
    result={};splits=[]
    for col,items in enumerate(cols):
        if len(items)==expected:
            masks=[lab==o['id'] for o in items]
        else:
            # Bodies touching in a source column: choose the thinnest separator near
            # the corresponding complete rows, not a guessed image-height division.
            mask=np.isin(lab,[o['id'] for o in items]);counts=mask.sum(axis=1);edges=[0]
            for r in range(1,expected):
                middle=(row_y[r-1]+row_y[r])/2;span=(row_y[r]-row_y[r-1])*.28
                lo=max(edges[-1]+8,int(middle-span));hi=min(im.height-1,int(middle+span))
                edge=min(range(lo,hi),key=lambda y:float(counts[y])+.025*abs(y-middle));edges.append(edge)
            edges.append(im.height);masks=[]
            for r in range(expected):
                part=mask.copy();part[:edges[r]]=False;part[edges[r+1]:]=False
                labels,count=ndimage.label(part,STRUCT);sizes=np.bincount(labels.ravel());sizes[0]=0
                if not count or sizes.max()<cutoff:raise ValueError(f'{name}: ambiguous source {r},{col}')
                masks.append(labels==sizes.argmax())
            splits.append({'column':col,'edges':edges})
        for row,mask in enumerate(masks):
            ys,xx=np.where(mask);x0,x1=int(xx.min()),int(xx.max()+1);y0,y1=int(ys.min()),int(ys.max()+1)
            data=rgba[y0:y1,x0:x1].copy();selected=mask[y0:y1,x0:x1];data[~selected]=0;data[selected,3]=255
            result[row,col]={'image':Image.fromarray(data),'box':[x0,y0,x1,y1]}
    extraction_report[name]={'sourceHash':hashlib.sha256((SRC/(name+'.png')).read_bytes()).hexdigest(),'columnCounts':[len(v) for v in cols],'splitColumns':splits}
    return result

def mapping(name,raw_rows,out_rows):
    result=[];kind=name.split('-')[-1];enemy=name.startswith('enemy-')
    for row in range(out_rows):
        for col in range(4):
            sr,sc,mirror=row,col,False
            if kind=='motion' and raw_rows==7:
                if name=='enemy-guldo-motion':sr=[0,1,1,2,3,4,4,6][row];mirror=row in [2,6]
                else:
                    sr=[0,1,2,3,4,5,5,6][row];mirror=row==6
                    if name=='krillin-motion' and row in [5,6]:mirror=row==5
            if name in ['buu-motion','enemy-burter-motion','enemy-jeice-motion'] and row>=4:
                sr=[4,4,5,6][row-4];mirror=False
            if name=='enemy-ginyu-motion' and row in [5,6]:sr=6 if row==5 else 5
            if name=='enemy-ginyu-combat' and row==2:sr=1;mirror=True
            if kind=='reaction' and name=='vegeta-reaction':
                direction,group=row%4,row//4;sc=direction;sr=col if group==0 else 4+col if group==1 else 7 if col==0 else 7+col
            elif kind=='reaction' and raw_rows==11:
                if 4<=row<8:sr=[4,5,5,6][row-4];mirror=row==6
                elif row>=8:sr=row-1
            if kind=='combat' and enemy:
                if 4<=row<8:sr=[4,5,5,6][row-4];mirror=row==6
                elif row>=8:sr=row-1
            # Reject the front-run frames that turn sideways in the master.
            if name=='goku-motion' and row==4:sc=[0,2,0,2][col];mirror=col>=2
            if name=='krillin-motion' and row==4:
                sc=[0,2,0,2][col];mirror=col>=2
            result.append((row,col,sr,sc,mirror))
    return result

def normalized(images,height,signature=False):
    # A clean reference guard pose defines physical size. Raised hands do not
    # shrink the body; a fallen pose does not set scale for the standing frames.
    refs=[v for i,v in enumerate(images) if (i%4==3 if signature else i//4<4)]
    ref_h=max(v['image'].height for v in refs)
    scale=height/ref_h
    roots=[]
    for entry in images:
        arr=np.asarray(entry['image'])[:,:,3]>0;h,w=arr.shape
        line=round(h-1-height*.33/scale);band=arr[max(0,line-2):max(0,line+3)]
        yy,xx=np.where(band);root=float(np.median(xx)) if len(xx)>4 else (w-1)/2
        roots.append(root)
        scale=min(scale,42/max(root+1,w-root),80/h)
    output=[]
    for entry,root in zip(images,roots):
        image=entry['image'];w,h=max(1,round(image.width*scale)),max(1,round(image.height*scale));small=image.resize((w,h),Image.Resampling.NEAREST)
        canvas=Image.new('RGBA',(96,96));x=round(48-root*scale);y=84-h;canvas.alpha_composite(small,(x,y));output.append(canvas)
    return output

def full_variant(image,id,suffix,direction,frame,kind,row):
    if suffix=='base':return image.copy()
    # A complete authored form is the only source for that form. Never recolor
    # or paste hair onto another body. Missing action art is an explicit guard
    # fallback; it is not presented as a newly drawn combat animation.
    column=([1,2,3,2][frame] if kind=='motion' and row>=4 else 0)
    original=Image.open(ROOT/f'assets/packed/sprites/{id}-{suffix}.png').convert('RGBA')
    tile=original.crop((column*96,direction*96,(column+1)*96,(direction+1)*96))
    rgba=np.array(tile);mask=rgba[:,:,3]>=144;labels,n=ndimage.label(mask,STRUCT);areas=np.bincount(labels.ravel());areas[0]=0
    rgba[labels!=areas.argmax()]=0;rgba[rgba[:,:,3]>=144,3]=255
    return Image.fromarray(rgba)

def hand_metadata(image,id,kind,row,col,style_override=None):
    data=np.asarray(image);r,g,b,a=[data[:,:,i].astype(float) for i in range(4)];yy,xx=np.indices(a.shape)
    if id=='buu':skin=(r>g*1.25)&(b>g*1.05)&(a>0)
    elif id=='vegeta':skin=(np.minimum.reduce([r,g,b])>150)&(np.maximum.reduce([r,g,b])-np.minimum.reduce([r,g,b])<60)&(a>0)
    else:skin=(r>130)&(r>g+12)&(g>b+10)&(a>0)
    direction=row%4;style='overhead' if kind=='signature' and id in ['goku','buu','krillin'] and col<2 else 'forehead' if kind=='signature' and id=='gohan' and col<2 else 'palm'
    if style_override:style=style_override
    targets={'palm':[(58,53),(26,49),(70,49),(39,43)],'forehead':[(48,31),(38,31),(58,31),(48,31)],'overhead':[(48,6)]*4}
    tx,ty=targets[style][direction];valid=skin&(yy<67)&(yy>(0 if style=='overhead' else 33 if style=='palm' else 10))
    ys,xs=np.where(valid)
    if len(xs):
        scores=(xs-tx)**2+(ys-ty)**2;k=int(np.argmin(scores));hx,hy=int(xs[k]),int(ys[k])
    else:
        ys,xs=np.where(a>0);k=int(np.argmin((xs-tx)**2+(ys-ty)**2));hx,hy=int(xs[k]),int(ys[k])
    bbox=image.getbbox();result=[*bbox,hx,hy,48,84]
    if style_override is None:
        result+=hand_metadata(image,id,kind,row,col,'forehead')[4:6]
        result+=hand_metadata(image,id,kind,row,col,'overhead')[4:6]
    return result

def write_sheet(key,tiles,rows,source,id,kind):
    out=Image.new('RGBA',(384,rows*96));data=[]
    for i,tile in enumerate(tiles):
        # Hard alpha and stable 5-bit shade ramps; no smoothing or geometric redraw.
        a=np.array(tile);mask=a[:,:,3]>=144;a[~mask]=0;a[mask,3]=255;a[mask,:3]=np.minimum(255,np.round(a[mask,:3]/8)*8).astype('uint8');tile=Image.fromarray(a)
        lab,n=ndimage.label(mask,STRUCT);sizes=np.bincount(lab.ravel());sizes[0]=0
        if n>1:
            # No source dust or detached neighbor is allowed into the final atlas.
            a[lab!=sizes.argmax()]=0;tile=Image.fromarray(a)
        bbox=tile.getbbox()
        if not bbox or bbox[0]<2 or bbox[2]>94 or bbox[1]<1 or bbox[3]>85:raise ValueError(f'{key} cell {i}: unsafe bounds {bbox}')
        out.alpha_composite(tile,((i%4)*96,(i//4)*96));data.append(hand_metadata(tile,id,'guard' if not key.startswith('enemy-') and key!=f'{id}-{kind}' and kind!='motion' else kind,i//4,i%4))
    out.save(DST/(key+'.png'),optimize=True)
    manifest.append({'key':key,'file':f'animation/{key}.png','rows':rows,'cell':96,'frames':rows*4,'source':source if key.startswith('enemy-') or key==f'{id}-{kind}' else 'packed/sprites/'+key.split('-'+kind)[0]+'.png','runtime':f'packed/animation/{key}.png','anchors':[{'ground':84} for _ in tiles], 'sourceMaster':source if key.startswith('enemy-') or key==f'{id}-{kind}' else 'source/sprites/'+key.split('-'+kind)[0]+'.png', 'artStatus':'authored' if key.startswith('enemy-') or key==f'{id}-{kind}' else 'complete-form-locomotion' if kind=='motion' else 'complete-form-guard-fallback'})
    frame_data[key]=data

# Validate and clean the complete form sprites too. Their authored bodies and
# colors are retained; no head/torso/palette composition is performed.
for actor,forms in FORMS.items():
    for suffix in forms:
        key=f'{actor}-{suffix}';path=ROOT/f'assets/packed/sprites/{key}.png'
        source=Image.open(path).convert('RGBA');sheet=Image.new('RGBA',source.size);metadata=[]
        for row in range(4):
            for col in range(4):
                tile=source.crop((col*96,row*96,(col+1)*96,(row+1)*96));a=np.array(tile)
                labels,n=ndimage.label(a[:,:,3]>=144,STRUCT);areas=np.bincount(labels.ravel());areas[0]=0
                if not n:raise ValueError(f'{key}: empty complete form {row},{col}')
                a[labels!=areas.argmax()]=0;a[a[:,:,3]>=144,3]=255;tile=Image.fromarray(a)
                box=tile.getbbox();shift=84-box[3]
                aligned=Image.new('RGBA',(96,96));aligned.alpha_composite(tile,(0,shift))
                sheet.alpha_composite(aligned,(col*96,row*96));metadata.append(hand_metadata(aligned,actor,'base',row,col))
        sheet.save(path,optimize=True);frame_data[key]=metadata

layouts=json.loads((ROOT/'assets/animation-layouts.json').read_text())
curation=json.loads((ROOT/'assets/pose-curation.json').read_text())
for name,layout in layouts.items():
    source=extract(name,layout['rows']);kind=name.split('-')[-1];enemy=name.startswith('enemy-');id=name.split('-')[1] if enemy else name.split('-')[0]
    rows=8 if kind=='motion' else 12;entries=[]
    for row,col,sr,sc,mirror in mapping(name,layout['rows'],rows):
        entry=dict(source[sr,sc]);entry['image']=ImageOps.mirror(entry['image']) if mirror else entry['image'];entries.append(entry)
    tiles=normalized(entries,62 if enemy else HEIGHTS[id])
    if name in ['buu-motion','enemy-burter-motion','enemy-jeice-motion']:
        # These masters omit the forward gait. Reuse the existing complete
        # forward walking poses, rather than label a side-running pose south.
        legacy=Image.open(ROOT/('assets/packed/sprites/buu-base.png' if id=='buu' else 'assets/packed/sprites/enemies.png')).convert('RGBA')
        legacy_row=0 if id=='buu' else 4 if id=='burter' else 5
        for col,source_col in enumerate([1,2,3,2]):
            tile=legacy.crop((source_col*96,legacy_row*96,(source_col+1)*96,(legacy_row+1)*96));a=np.array(tile);labels,n=ndimage.label(a[:,:,3]>=144,STRUCT);areas=np.bincount(labels.ravel());areas[0]=0;a[labels!=areas.argmax()]=0;a[a[:,:,3]>=144,3]=255;tile=Image.fromarray(a);bbox=tile.getbbox();body=tile.crop(bbox)
            tiles[16+col]=normalized([{'image':body}],HEIGHTS[id] if id=='buu' else 62)[0]
        extraction_report[name]['forwardGait']='existing complete front walk: left,passing,right,passing'

    if not enemy and kind=='combat':
        originals=[tile.copy() for tile in tiles]
        patches=curation['combat'][id]['cells']
        for patch in patches:
            tile=originals[patch['fromRow']*4+patch['fromFrame']]
            tiles[patch['row']*4+patch['frame']]=ImageOps.mirror(tile) if patch['mirror'] else tile.copy()
        # Opposite rows come from the reviewed west cells, not unreviewed rows.
        for west,east in curation['oppositeRows']:
            for col in range(4):tiles[east*4+col]=ImageOps.mirror(tiles[west*4+col])
        extraction_report[name]['poseCuration']={'file':'assets/pose-curation.json','cells':patches,'oppositeRows':curation['oppositeRows']}
    for suffix in ['base'] if enemy else FORMS[id]:
        key=name if suffix=='base' else f'{id}-{suffix}-{kind}'
        frames=[full_variant(t,id,suffix,(i//4)%4,i%4,kind,i//4) for i,t in enumerate(tiles)]
        write_sheet(key,frames,rows,f'source/animation/{name}.png',id,kind)
    print('Repaired',name,flush=True)

sources={name:extract(name,n) for name,n in [('signature-saiyans',11),('signature-earth',7)]}
specs=[('goku','signature-saiyans',[0,2,1,3]),('vegeta','signature-saiyans',[4,5,-6,6]),('gohan','signature-saiyans',[7,8,9,10]),('buu','signature-earth',[0,1,-2,3]),('krillin','signature-earth',[4,5,-6,6])]
for id,source,mapping_rows in specs:
    entries=[]
    for raw in mapping_rows:
        for col in range(4):
            entry=dict(sources[source][(-raw-1 if raw<0 else raw),col]);entry['image']=ImageOps.mirror(entry['image']) if raw<0 else entry['image'];entries.append(entry)
    tiles=normalized(entries,HEIGHTS[id],signature=True)
    combat=Image.open(DST/f'{id}-combat.png').convert('RGBA')
    for direction in range(4):
        # Recover with a guard of the same view. Several signature masters turn
        # front/back at the end, independent of the target.
        tiles[direction*4+3]=combat.crop((0,direction*96,96,(direction+1)*96))
    if id in ['vegeta','gohan']:
        # The signature release in the source points into the opposite view.
        # Reuse the complete, directional two-hand release of that same actor.
        for direction in range(4):
            tiles[direction*4+2]=combat.crop((96,(8+direction)*96,192,(9+direction)*96))
        for col in range(4):tiles[8+col]=ImageOps.mirror(tiles[4+col])
    if id=='buu':
        for col in range(4):tiles[8+col]=ImageOps.mirror(tiles[4+col])
    for col in curation['signature'].get(id,{}).get('mirrorWestFrames',[]):
        tiles[4+col]=ImageOps.mirror(tiles[4+col])
    for col in range(4):tiles[8+col]=ImageOps.mirror(tiles[4+col])
    extraction_report[source].setdefault('signatureCorrections',[]).append(id+': full-body directional release and guard recovery')
    for suffix in FORMS[id]:
        key=f'{id}-signature' if suffix=='base' else f'{id}-{suffix}-signature'
        frames=[full_variant(t,id,suffix,i//4,i%4,'signature',i//4) for i,t in enumerate(tiles)]
        write_sheet(key,frames,4,f'source/animation/{source}.png',id,'signature')
# Beast cells contained disconnected purple tails from the preceding aura row.
# Keep the complete main pink/white aura; do not clip the actor or recolor it.
aura_path=ROOT/'assets/packed/effects/auras.png'
aura=Image.open(aura_path).convert('RGBA')
for col in range(4):
    tile=np.array(aura.crop((col*96,5*96,(col+1)*96,6*96)))
    labels,n=ndimage.label(tile[:,:,3]>=144,STRUCT);areas=np.bincount(labels.ravel());areas[0]=0
    tile[labels!=areas.argmax()]=0
    aura.paste(Image.fromarray(tile),(col*96,5*96))
aura.save(aura_path,optimize=True)
extraction_report['beast-aura']={'correction':'removed disconnected purple tails from the preceding row; retained the full main pink/white aura in four cells'}
# Preserve effect manifest entries; combat FX has its own local drawing source.
old=json.loads((ROOT/'assets/animation-manifest.json').read_text());manifest += [s for s in old['sheets'] if s['key'] in ['auras','combat-fx'] or s.get('artStatus','').startswith('authored-moving-') or s.get('artStatus') in ['authored-form-cast','authored-form-signature']]
(ROOT/'assets/animation-manifest.json').write_text(json.dumps({'version':2,'sheets':manifest},indent=2)+'\n')
(ROOT/'src/frame-data.js').write_text('// Generated from individually repaired complete sprites. Pixel coordinates in 96px cells.\nexport const FRAME_DATA = '+json.dumps(frame_data,separators=(',',':'))+';\nexport const ART_STATUS = '+json.dumps({s['key']:s.get('artStatus','effect') for s in manifest},separators=(',',':'))+';\n')
(ROOT/'assets/atlas-repair-report.json').write_text(json.dumps({'sources':extraction_report,'animationSheets':98,'staticFormSheets':20,'frames':sum(len(v) for v in frame_data.values())},indent=2)+'\n')
print('Repaired',len(frame_data),'atlases;',sum(len(v) for v in frame_data.values()),'frames')
