import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { decodeRGBA, inspectFrame } from '../tools/png-audit.mjs';
import { MOVING_FRAME_DATA, FORM_CAST_DATA, FORM_SIGNATURE_DATA } from '../src/action-frames.js';
import { ALL_FRAME_DATA } from '../src/frame-metadata.js';
import { Animator, handAnchor } from '../src/animation.js';
import { presentCasts, castPose } from '../src/combat-animation.js';
import { playerFrame, FORM_FILES } from '../src/sprite-layout.js';
import { TECHNIQUES } from '../src/weapons.js';
const dirs=['south','west','east','north'];
const loadouts={goku:['ki','kamehameha','genki'],vegeta:['galick','bang','final'],buu:['elastic','barrage','planet'],krillin:['kienzan','taiyoken','discs'],gohan:['masenko','kamehameha','cannon']};
function cast(key,dir,channel=1){const def=TECHNIQUES[key];return {key,def,elapsed:def.windup+def.charge+def.active*.1,direction:dir,channel,token:Symbol(key)};}
test('new action PNGs contain complete connected actors with real bounds, grounded feet and visible palm anchors',()=>{
 for(const [key,frames] of Object.entries({...MOVING_FRAME_DATA,...FORM_CAST_DATA,...FORM_SIGNATURE_DATA})){
  const folder=key.includes('-moving-')?'moving':key.includes('-signature-cast')?'form-signatures':'form-casts';const file=key.includes('-moving-')?key.replace('-moving-','-'):key.replace(/-signature-cast$|-cast$/,'');
  const image=decodeRGBA(new URL(`../assets/packed/${folder}/${file}.png`,import.meta.url));
  assert.equal(image.width,384);assert.equal(image.height,384);assert.equal(frames.length,16);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
   const name=`${key} ${row},${col}`,r=inspectFrame(image,row,col),m=frames[row*4+col];
   assert.equal(r.components.length,1,name);assert.equal(r.border,0,name);assert.equal(r.below,0,name);assert.deepEqual(r.bounds,m.slice(0,4),name);
   assert.equal(m[7],84,name);assert.ok(image.pixels[((row*96+m[5])*384+col*96+m[4])*4+3]>=144,name);
  }
 }
});
test('each moving cast has four different leg drawings in each view, not only a shifted static torso',()=>{
 assert.equal(Object.keys(MOVING_FRAME_DATA).filter(k=>k.endsWith("-moving-cast")).length,20);
 for(const key of Object.keys(MOVING_FRAME_DATA)){
  const actor=key.replace('-moving-','-');
  const image=decodeRGBA(new URL(`../assets/packed/moving/${actor}.png`,import.meta.url));
  for(let row=0;row<4;row++){
   const legs=[];
   for(let col=0;col<4;col++){
    const bytes=[];for(let y=62;y<84;y++){
     const offset=((row*96+y)*384+col*96)*4;bytes.push(image.pixels.subarray(offset,offset+384));
    }legs.push(Buffer.concat(bytes));
   }
   assert.equal(new Set(legs.map(b=>b.toString('base64'))).size,4,actor+' '+row);
   for(let frame=0;frame<4;frame++){
    let different=0;for(let i=0;i<legs[frame].length;i+=4)if(!legs[frame].subarray(i,i+4).equals(legs[(frame+1)%4].subarray(i,i+4)))different++;
    assert.ok(different>30,actor+' must change its actual lower-body pixels');
   }
  }
 }
});
test('moving release samples the measured stride in all four views and reverses it when backpedalling',()=>{
 for(const actor of Object.keys(loadouts))for(let d=0;d<4;d++)for(let frame=0;frame<4;frame++){
  const p={x:100,y:100,spriteId:actor,form:0,anim:new Animator()};p.anim.motion='run';p.anim.direction=dirs[d];p.anim.travel=(frame+.1)/4;
  const c=cast(loadouts[actor][0],dirs[d],0);presentCasts(p,[c]);let sample=p.anim.sample(),pose=playerFrame(actor,0,sample);
  assert.equal(pose.key,actor+'-moving-cast');assert.equal(pose.row,d);assert.equal(pose.frame,frame);
  const m=ALL_FRAME_DATA[pose.key][d*4+frame];assert.deepEqual(handAnchor(p,dirs[d]),{x:100+m[4]-48,y:100+m[5]-66});
  p.anim.direction=dirs[[3,2,1,0][d]];pose=playerFrame(actor,0,p.anim.sample());assert.equal(pose.frame,3-frame);assert.equal(pose.row,d);
  p.anim.direction=dirs[(d+1)%4];if(p.anim.direction!==dirs[[3,2,1,0][d]])assert.notEqual(playerFrame(actor,0,p.anim.sample()).key,actor+'-moving-cast');
 }
});
test('the end of recovery returns to the existing gait phase without restarting the feet',()=>{
 const p={anim:new Animator()};p.anim.motion='run';p.anim.direction='east';p.anim.travel=.62;const c=cast('kamehameha','east');c.elapsed=c.def.windup+c.def.charge+c.def.active+c.def.recovery*.9;
 presentCasts(p,[c]);const sample=p.anim.sample();assert.equal(sample.combatPhase,'recovery');assert.equal(sample.pack,'motion');assert.equal(sample.group,4);assert.equal(sample.frame,2);assert.equal(p.anim.travel,.62);
});
test('lateral launch poses put the palm on the target side, including former reversed Gohan frames',()=>{
 for(const [actor,keys] of Object.entries(loadouts))for(const [channel,key] of keys.entries())for(const direction of ['west','east']){
  if(key==='taiyoken')continue;
  for(const progress of [.1,.7]){
   const c=cast(key,direction,channel);c.elapsed=c.def.windup+c.def.charge+c.def.active*progress;
   const pose=playerFrame(actor,0,castPose(c)),m=ALL_FRAME_DATA[pose.key][pose.row*4+pose.frame];
   assert.ok(direction==='west'?m[4]<43:m[4]>53,`${actor}/${key}/${direction}: palm ${m[4]} points away from target`);
  }
 }
});
test('transformed generic casts select their own complete model and four authored poses',()=>{
 for(const [key,frames] of Object.entries(FORM_CAST_DATA)){
  const model=key.replace(/-cast$/,''),actor=model.split('-')[0],suffix=model.slice(actor.length+1),form=FORM_FILES[actor].indexOf(suffix);assert.ok(form>0);
  const c=cast('kamehameha','east');const d=c.def;const poses=[];
  for(const t of [0,d.windup+d.charge*.5,d.windup+d.charge+.01,d.windup+d.charge+d.active+d.recovery*.3]){
   c.elapsed=t;const p=playerFrame(actor,form,castPose(c));assert.equal(p.key,key);poses.push(p.frame);
  }
  assert.deepEqual(poses,[0,1,2,3]);assert.equal(frames.length,16);
 }
});
test('new masters retain their original bytes and never use torso, leg or hair composition',()=>{
 const report=JSON.parse(readFileSync(new URL('../assets/action-art-report.json',import.meta.url)));
 for(const [key,r] of Object.entries(report)){
  assert.equal(r.bodyComposition,false,key);
  const bytes=readFileSync(new URL('../assets/'+r.source,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sourceHash,key);
  assert.equal(Object.keys(r.cells).length,16,key);
 }
});
test('all moving pose families route charge effects to their actual raised or cupped hands',()=>{
 assert.equal(Object.keys(MOVING_FRAME_DATA).length,29);
 for(const [actor,keys] of Object.entries(loadouts))for(const [channel,key] of keys.entries())for(const direction of dirs){
  const c=cast(key,direction,channel);c.elapsed=c.def.windup+c.def.charge*.5;
  const p={x:10,y:20,spriteId:actor,form:0,anim:new Animator()};p.anim.motion='walk';p.anim.direction=direction;p.anim.travel=.4;
  presentCasts(p,[c]);const sample=p.anim.sample(),pose=playerFrame(actor,0,sample);
  const role=c.def.hand==='overhead'?'overhead':c.def.hand==='forehead'?'forehead':'charge';
  assert.equal(pose.key,`${actor}-moving-${role}`,actor+'/'+key);
  const m=MOVING_FRAME_DATA[pose.key][pose.row*4+pose.frame];assert.deepEqual(handAnchor(p,direction,c.def.hand),{x:10+m[4]-48,y:20+m[5]-66});
  if(role==='overhead')assert.ok(m[5]<35,actor+' overhead charge anchored below its raised palm');
 }
});
test('all fifteen physical transformations have four different complete combat drawings per direction',()=>{
 assert.equal(Object.keys(FORM_CAST_DATA).length,15);
 for(const key of Object.keys(FORM_CAST_DATA)){
  const file=key.replace(/-cast$/,'');const image=decodeRGBA(new URL(`../assets/packed/form-casts/${file}.png`,import.meta.url));
  for(let row=0;row<4;row++){
   const drawings=new Set();for(let col=0;col<4;col++){
    const bytes=[];for(let y=0;y<96;y++){const offset=((row*96+y)*384+col*96)*4;bytes.push(image.pixels.subarray(offset,offset+384));}
    drawings.add(Buffer.concat(bytes).toString('base64'));
   }assert.equal(drawings.size,4,key+' '+row+' repeats a guard in place of action poses');
  }
 }
});

test('all physical forms have their own moving release and complete signature phases',()=>{
 assert.equal(Object.keys(FORM_SIGNATURE_DATA).length,18);
 for(const key of Object.keys(FORM_CAST_DATA)){
  const model=key.replace(/-cast$/,''),id=model.split('-')[0],form=FORM_FILES[id].indexOf(model.slice(id.length+1));
  for(const direction of dirs){
   const c=cast(id==='vegeta'?'final':id==='gohan'?'masenko':'genki',direction,2);
   const p={anim:new Animator()};p.anim.motion='run';p.anim.direction=direction;p.anim.travel=.4;presentCasts(p,[c]);
   assert.equal(playerFrame(id,form,p.anim.sample()).key,model+'-moving-cast');
   p.anim.motion='idle';assert.equal(playerFrame(id,form,p.anim.sample()).key,model+'-signature-cast');
  }
 }
});
