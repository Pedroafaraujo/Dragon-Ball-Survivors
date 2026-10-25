"""Pack new complete running-cast drawings. No torso/leg/head composition.
The authored masters are retained unchanged; actors are extracted as connected
components, never by clipping a guessed uniform grid rectangle.
"""
from pathlib import Path
from PIL import Image,ImageOps
from scipy import ndimage
import numpy as np
import json,hashlib
ROOT=Path(__file__).resolve().parent.parent
HEIGHTS={'goku':66,'vegeta':64,'buu':58,'krillin':55,'gohan':66}
STRUCT=np.ones((3,3),int)
moving={};forms={};signatures={};records={};sheets=[]
curation=json.loads((ROOT/'assets/pose-curation.json').read_text()).get('moving',{})
inputs=[("moving",file.stem,file.stem.split("-")[0],file) for file in sorted((ROOT/"assets/source/moving").glob("*.png"))]
inputs += [("form-casts",file.stem,file.stem.split("-")[0],file) for file in sorted((ROOT/"assets/source/form-casts").glob("*.png"))]
inputs += [("form-signatures",file.stem,file.stem.split("-")[0],file) for file in sorted((ROOT/"assets/source/form-signatures").glob("*.png"))]
for kind,model,actor,source in inputs:
    role=model.rsplit('-',1)[1] if kind=='moving' else 'signature' if kind=='form-signatures' else 'form';physical=model.rsplit('-',1)[0] if kind=='moving' else model;height=HEIGHTS[actor]+(9 if role=='overhead' and actor=='krillin' else 0);im=Image.open(source).convert('RGBA');data=np.array(im)
    labels,n=ndimage.label(data[:,:,3]>=144,STRUCT);areas=np.bincount(labels.ravel());areas[0]=0;cells={}
    for label,sl in enumerate(ndimage.find_objects(labels),1):
        if sl is None or areas[label]<im.width*im.height*.002:continue
        yy,xx=sl;cy=(yy.start+yy.stop)/2;cx=(xx.start+xx.stop)/2
        row=min(3,int(cy/im.height*4));col=min(3,int(cx/im.width*4))
        if (row,col) in cells:raise ValueError(f'{actor}: multiple complete actors near {row},{col}')
        rgba=data[sl].copy();rgba[labels[sl]!=label]=0;rgba[rgba[:,:,3]>=144,3]=255
        cells[row,col]={'image':Image.fromarray(rgba),'sourceBox':[xx.start,yy.start,xx.stop,yy.stop]}
    if len(cells)!=16:raise ValueError(f'{actor}: expected 16 separate complete bodies, found {len(cells)}')
    ref_height=max(cells[row,3]['image'].height for row in range(4)) if kind=='form-signatures' else max(cell['image'].height for cell in cells.values())
    scale=min(height/ref_height,80/max(cell['image'].height for cell in cells.values()));sheet=Image.new('RGBA',(384,384));frames=[]
    for row in range(4):
        for col in range(4):
            cell=cells[row,col];body=cell['image']
            if [row,col] in curation.get(model,{}).get('mirrorCells',[]):body=ImageOps.mirror(body)
            a=np.array(body);r,g,b=[a[:,:,i].astype(float) for i in range(3)];y=round(body.height-ref_height*.34) if kind=='form-signatures' else round(body.height*(.60 if role=='overhead' else .66))
            # Use clothing around the pelvis, excluding long hair and hands.
            cloth=(r>g*1.4)&(g>35)&(b<g*.8) if actor in ['goku','krillin'] else (b>g*1.2)&(r>g*1.2)&(b>r*.8)&(b>50)&(r>35) if actor=='gohan' else (b>r*1.3)&(b>g*1.1)&(b>40) if actor=='vegeta' else (np.minimum.reduce([r,g,b])>100)&(np.maximum.reduce([r,g,b])-np.minimum.reduce([r,g,b])<70)&(r<g*1.2)
            band=(a[:,:,3]>0)&cloth;ys,xs=np.where(band[max(0,y-3):y+4])
            if len(xs)<5:ys,xs=np.where(a[max(0,y-2):y+3,:,3]>0)
            pelvis=float(np.median(xs));small=body.resize((round(body.width*scale),round(body.height*scale)),Image.Resampling.NEAREST)
            tile=Image.new('RGBA',(96,96));tile.alpha_composite(small,(round(48-pelvis*scale),84-small.height));a=np.array(tile);mask=a[:,:,3]>=144
            lab,k=ndimage.label(mask,STRUCT);sizes=np.bincount(lab.ravel());sizes[0]=0
            if sizes.max()<mask.sum()*.98:raise ValueError(f'{model} {row},{col}: resampling detached a substantial body piece')
            a[lab!=sizes.argmax()]=0;a[a[:,:,3]>=144,3]=255;a[a[:,:,3]>0,:3]=np.minimum(255,np.round(a[a[:,:,3]>0,:3]/8)*8).astype('uint8');tile=Image.fromarray(a);box=tile.getbbox()
            if not box or box[0]<2 or box[2]>94 or box[1]<1 or box[3]>84:raise ValueError(f'{actor} {row},{col}: unsafe full-body bounds {box}')
            r,g,b,alpha=[a[:,:,i].astype(float) for i in range(4)];yy,xx=np.indices(alpha.shape)
            skin=(r>g*1.25)&(b>g*1.05) if actor=='buu' else (np.minimum.reduce([r,g,b])>150)&(np.maximum.reduce([r,g,b])-np.minimum.reduce([r,g,b])<60) if actor=='vegeta' else (r>130)&(r>g+12)&(g>b+10)&(b>r*.25)&(g<r*.85)
            if kind=='form-signatures' and actor=='goku' and col<2:
                targets=[(32,5),(40,5),(56,5),(62,5)] if col==1 else [(58,35),(36,35),(60,35),(60,35)];valid=(yy<45)
            elif kind=='form-signatures' and actor=='gohan' and col<2:
                targets=[(48,35),(35,35),(61,35),(48,35)];valid=(yy>12)&(yy<58)
            elif kind=='form-signatures' and actor=='vegeta' and col<2:
                targets=[(48,52),(35,51),(61,51),(48,52)];valid=(yy>30)&(yy<70)
            elif role=='overhead':
                targets=[(58,8),(40,8),(58,8),(62,8)] if actor=='goku' else [(34,8),(38,8),(60,8),(62,8)]
                valid=(yy<45)
            elif role=='forehead':targets=[(48,35),(35,35),(61,35),(48,35)];valid=(yy>15)&(yy<58)
            elif role=='charge':
                targets=[(36,56),(65,57),(32,57),(62,57)] if actor=='goku' else [(60,57),(67,58),(30,58),(32,58)] if actor=='gohan' else [(48,51),(35,51),(61,51),(48,54)] if actor=='vegeta' else [(48,57),(36,57),(60,57),(48,57)]
                valid=(yy>37)&(yy<74)
            elif kind=='form-casts' and col<2:targets=[(48,61),(36,59),(60,59),(44,59)];valid=(yy>40)&(yy<74)
            elif kind in ['form-casts','form-signatures'] and col==3:targets=[(58,64),(36,63),(60,63),(60,64)];valid=(yy>42)&(yy<74)
            else:targets=[(58,49),(25,46),(71,46),(62,43)];valid=(yy>30)&(yy<66)
            skin&=(alpha>0)&valid
            tx,ty=targets[row];ys,xs=np.where(skin)
            if not len(xs):raise ValueError(f'{model}: no visible hand in {row},{col}')
            selected=int(np.argmin((xs-tx)**2+(ys-ty)**2));hand=[int(xs[selected]),int(ys[selected])]
            frames.append([*box,*hand,48,84,*hand,*hand]);sheet.alpha_composite(tile,(col*96,row*96))
    target=ROOT/('assets/packed/'+kind+'/'+(model+'.png'));sheet.save(target,optimize=True);key=physical+'-moving-'+role if kind=='moving' else model+'-signature-cast' if kind=='form-signatures' else model+'-cast';(moving if kind=='moving' else signatures if kind=='form-signatures' else forms)[key]=frames
    sheets.append({'key':key,'file':str(target.relative_to(ROOT/'assets/packed')),'runtime':str(target.relative_to(ROOT/'assets')),'source':str(source.relative_to(ROOT/'assets')),'rows':4,'cell':96,'frames':16,'anchors':[{'ground':84}]*16,'artStatus':'authored-moving-'+role if kind=='moving' else 'authored-form-signature' if kind=='form-signatures' else 'authored-form-cast'})
    records[key]={'source':str(source.relative_to(ROOT/'assets')),'sourceHash':hashlib.sha256(source.read_bytes()).hexdigest(),'cells':{f'{r},{c}':v['sourceBox'] for (r,c),v in cells.items()},'bodyComposition':False}
manifest_path=ROOT/'assets/animation-manifest.json';m=json.loads(manifest_path.read_text());m['sheets']=[s for s in m['sheets'] if not s.get('artStatus','').startswith('authored-moving-') and s.get('artStatus') not in ['authored-form-cast','authored-form-signature']]+sheets
manifest_path.write_text(json.dumps(m,indent=2)+'\n')
(ROOT/'src/action-frames.js').write_text('// Generated from newly drawn complete actors. No body-part layers.\nexport const MOVING_FRAME_DATA='+json.dumps(moving,separators=(',',':'))+';\nexport const FORM_CAST_DATA='+json.dumps(forms,separators=(',',':'))+';\nexport const FORM_SIGNATURE_DATA='+json.dumps(signatures,separators=(',',':'))+';\n')
(ROOT/'assets/action-art-report.json').write_text(json.dumps(records,indent=2)+'\n')
print('Packed',len(moving)*16,'new moving-cast frames and',len(forms)*16,'new form-cast frames and',len(signatures)*16,'signature frames')
