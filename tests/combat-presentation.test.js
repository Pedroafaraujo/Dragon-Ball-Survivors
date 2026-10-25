import test from 'node:test';
import assert from 'node:assert/strict';
import { Animator } from '../src/animation.js';
import { presentCasts, castPose, castPhase } from '../src/combat-animation.js';
import { TECHNIQUES, scheduleCast, advanceCasts } from '../src/weapons.js';
import { Effects } from '../src/effects.js';
import { decodeRGBA, inspectFrame } from '../tools/png-audit.mjs';
function cast(key,channel=1,elapsed=0,direction='east') {
 return {key,def:TECHNIQUES[key],channel,elapsed,direction,token:Symbol(key)};
}
test('overlapping automatic shots never restart a larger cast or omit its recovery',()=>{
 const actor={anim:new Animator()},big=cast('genki',2),shots=[];
 for(let i=0;i<94;i++){
  big.elapsed=i/60;
  if(i%6===0)shots.push(cast('ki',0));
  for(const shot of shots)shot.elapsed+=1/60;
  presentCasts(actor,[...shots,big]);
  if(big.elapsed<1.6){assert.equal(actor.anim.action.token,big.token);assert.equal(actor.anim.sample().combatPhase,castPhase(big).name);}
 }
 assert.equal(actor.anim.sample().combatPhase,'recovery');
 big.elapsed=1.7;presentCasts(actor,[big]);assert.equal(actor.anim.action,null);
});
test('a hit reaction resumes the current cast phase instead of restarting the charge',()=>{
 const actor={anim:new Animator()},big=cast('final',2,.3);
 presentCasts(actor,[big]);actor.anim.play('hurt',{token:'impact'});big.elapsed=.95;
 presentCasts(actor,[big]);assert.equal(actor.anim.sample().state,'hurt');
 actor.anim.update(.16);presentCasts(actor,[big]);
 assert.equal(actor.anim.sample().combatPhase,'launch');assert.equal(actor.anim.sample().frame,2);
 assert.equal(actor.anim.action.elapsed,.95);
});
test('a sustained beam retains its complete release pose when another technique starts',()=>{
 const actor={anim:new Animator()},beam=cast('kamehameha',1,.6);
 presentCasts(actor,[beam]);const next=cast('genki',2,.1,'north');
 presentCasts(actor,[beam,next]);assert.equal(actor.anim.action.token,beam.token);
 assert.equal(actor.anim.sample().direction,'east');
 beam.elapsed=.81;presentCasts(actor,[beam,next]);assert.equal(actor.anim.action.token,next.token);
});
test('all technique profiles have distinct preparation, charge, release and recovery poses in every view',()=>{
 for(const key of Object.keys(TECHNIQUES))for(const direction of ['south','west','east','north']){
  const c=cast(key,1,0,direction),d=c.def,poses=[];
  for(const t of [0,d.windup+d.charge*.5,d.windup+d.charge+.001,d.windup+d.charge+d.active+d.recovery*.3]){
   c.elapsed=t;const p=castPose(c);assert.equal(p.direction,direction);
   poses.push([p.pack,p.group,p.frame].join(':'));
  }
  assert.ok(new Set(poses).size>=3,key+' '+direction);
 }
});
test('contact anticipation holds until the actual contact damage boundary, including heavy bosses',()=>{
 for(const windup of [.16,.24]){
  const a=new Animator();a.play('attack',{duration:.62,contactTiming:{windup,active:.1}});
  a.action.elapsed=windup-.001;assert.equal(a.sample().frame,1);
  a.action.elapsed=windup;assert.equal(a.sample().frame,2);
  a.action.elapsed=windup+.101;assert.equal(a.sample().frame,3);
 }
});
test('run/walk hysteresis avoids sheet flicker; travel stays tied to real distance',()=>{
 const a=new Animator();a.motionStep(180/60,0,1/60,190);assert.equal(a.motion,'run');
 for(const speed of [145,151,144,149]){a.motionStep(speed/60,0,1/60,190);assert.equal(a.motion,'run');}
 a.motionStep(110/60,0,1/60,190);assert.equal(a.motion,'walk');
 for(const speed of [145,151,144,149]){a.motionStep(speed/60,0,1/60,190);assert.equal(a.motion,'walk');}
 const travel=a.travel;a.motionStep(0,0,.1,190);assert.equal(a.travel,travel);
});
test('impact sprites use a bounded pool and all eight drawings of each effect are different',()=>{
 const fx=new Effects();for(let i=0;i<100;i++)fx.strike(0,0,true);
 assert.equal(fx.impacts.length,20);fx.update(1);assert.equal(fx.impacts.length,0);
 fx.strike(3,4);assert.equal(fx.impactPool.allocated,20);
 const im=decodeRGBA(new URL('../assets/packed/effects/combat-fx.png',import.meta.url));
 assert.equal(im.width,384);assert.equal(im.height,36*96);
 for(let style=0;style<18;style++){
  const variants=new Set();
  for(let frame=0;frame<8;frame++){
   const rows=[];for(let y=0;y<96;y++){
    const start=((style*192+Math.floor(frame/4)*96+y)*im.width+(frame%4)*96)*4;
    rows.push(im.pixels.subarray(start,start+96*4));
   }
   variants.add(Buffer.concat(rows).toString('base64'));
  }
  assert.equal(variants.size,8,'effect style '+style+' must have eight distinct drawings');
 }
});
test('visual arbitration preserves all three automatic launches and damage across frame rates',()=>{
 function run(hz){
  const target={x:630,y:400,r:15,hp:10000,type:'saibaman'};
  const g={player:{x:400,y:400,level:8,form:0,area:1,crit:0,r:14},enemies:[target],casts:[],lines:[],bullets:[],orbs:[],rings:[],hostile:[],corpses:[],effects:new Effects(),gems:[],save:{reduced:true},damage:()=>1,notice(){},finish(){}};
  const casts=[scheduleCast(g,'ki',target,0),scheduleCast(g,'kamehameha',target,1),scheduleCast(g,'genki',target,2)];
  for(let i=0;i<hz*3;i++){g.player.anim.update(1/hz);advanceCasts(g,1/hz);}
  assert.ok(casts.every(c=>c.released));assert.equal(g.casts.length,0);
  assert.equal(g.player.anim.action,null);return target.hp;
 }
 const damageAt30=run(30);assert.equal(damageAt30,run(60));assert.equal(damageAt30,run(120));assert.ok(damageAt30<9800);
});

test('Beast aura cells contain no disconnected purple tails from the preceding row',()=>{
 const image=decodeRGBA(new URL('../assets/packed/effects/auras.png',import.meta.url));
 for(let col=0;col<4;col++)assert.equal(inspectFrame(image,5,col).components.length,1);
});
test('forehead and overhead techniques gather at the special hand anchor, then release from the forward palm',()=>{
 for(const key of ['masenko','cannon','genki','planet','kienzan']){
  const actor={anim:new Animator()},c=cast(key,1,.01);presentCasts(actor,[c]);
  assert.equal(actor.anim.action.hand,TECHNIQUES[key].hand);
  c.elapsed=c.def.windup+c.def.charge+.01;presentCasts(actor,[c]);
  assert.equal(actor.anim.action.hand,'palm',key+' release still attached to forehead/overhead');
 }
});
