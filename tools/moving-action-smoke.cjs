/** Verify the existing game's real renderer with the new complete action actors. */
const {chromium}=require('playwright');const fs=require('node:fs/promises');const path=require('node:path');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await b.newPage({viewport:{width:640,height:480},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(r.url());});await page.goto((process.env.GAME_URL||'http://127.0.0.1:8000')+'/?test');await page.click('#start');
 const result=await page.evaluate(async()=>{
  const {scheduleCast}=await import('./src/weapons.js'),{characters}=await import('./src/characters.js'),{draw}=await import('./src/render.js'),{spawn}=await import('./src/enemies.js'),{playerFrame}=await import('./src/sprite-layout.js'),{handAnchor,animator}=await import('./src/animation.js'),{FORM_CAST_DATA}=await import('./src/action-frames.js'),{transform,thresholds}=await import('./src/transformations.js'),sprites=await import('./src/sprites.js');
  const phases=['preparation','charge','launch','impact','recovery'],dirs=['south','west','east','north'],keys=['s','a','d','w'];
  const loadouts={goku:['ki','kamehameha','genki'],vegeta:['galick','bang','final'],buu:['elastic','barrage','planet'],krillin:['kienzan','taiyoken','discs'],gohan:['masenko','kamehameha','cannon']};const outputs={};let checked=0,originChecks=0;
  function fixture(id,direction,moving=true){const g=__game;g.selected=characters.findIndex(c=>c.id===id);g.start();g.state='pause';g.obstacles=[];g.enemies=[];g.player.invuln=0;g.spawnClock=g.shotClock=g.specialClock=g.ultimateClock=9999;g.input.keys.clear();animator(g.player).direction=direction;if(moving)g.input.keys.add(keys[dirs.indexOf(direction)]);return g;}
  function target(g,direction){spawn(g,'soldier');const e=g.enemies[0];e.x=g.player.x+(direction==='east'?600:direction==='west'?-600:0);e.y=g.player.y+(direction==='south'?600:direction==='north'?-600:0);e.speed=0;e.hp=e.maxHp=1e8;return e;}
  function step(g){g.state='play';g.update(1/120);g.state='pause';}
  function advance(g,c,t,frames){while(c.elapsed+1e-8<t){const released=c.released;step(g);if(!released&&c.released){const hand=handAnchor(g.player,c.direction,g.player.anim.action.hand);if(Math.hypot(hand.x-c.origin.x,hand.y-c.origin.y)>.001)throw Error(c.key+' launch detached from visible hand');originChecks++;}const sample=g.player.anim.sample();if(frames&&['launch','impact'].includes(c.phase))frames.add(sample.movementFrame);}}
  for(const [id,attacks] of Object.entries(loadouts)){
   await sprites.prepareAnimation(id,0);const cv=document.createElement('canvas');cv.width=1000;cv.height=12*224;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#12232e';ctx.fillRect(0,0,cv.width,cv.height);let row=0;
   for(const [channel,key] of attacks.entries())for(const direction of dirs){
    const g=fixture(id,direction);for(let i=0;i<36;i++)step(g);const c=scheduleCast(g,key,target(g,direction),channel),d=c.def;const targets=[d.windup*.3,d.windup+d.charge*.6,d.windup+d.charge+d.active*.12,d.windup+d.charge+d.active*.65,d.windup+d.charge+d.active+d.recovery*.4],frames=new Set();
    for(let col=0;col<5;col++){
     advance(g,c,targets[col],frames);const sample=g.player.anim.sample(),pose=playerFrame(id,0,sample);if(sample.combatPhase!==phases[col])throw Error(id+'/'+key+' wrong visible phase');
     if(col===1&&!pose.key.includes('-moving-'))throw Error(id+'/'+key+'/'+direction+' still holds a static charge');
     if((col===2||col===3)&&!pose.key.includes('-moving-'))throw Error(id+'/'+key+'/'+direction+' still holds a static release');
     draw(g,1);ctx.drawImage(g.canvas,220,130,200,200,col*200,row*224+24,200,200);ctx.fillStyle='#e5edbb';ctx.font='11px monospace';ctx.fillText(key+' / '+direction+' / '+phases[col],col*200+3,row*224+16);
    }
    if(key!=='taiyoken'&&frames.size<2)throw Error(id+'/'+key+'/'+direction+' legs did not advance during the active attack');row++;checked++;
   }
   outputs[id+'-moving-phases']=cv.toDataURL().split(',')[1];
  }
  const cv=document.createElement('canvas');cv.width=1000;cv.height=15*224;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#12232e';ctx.fillRect(0,0,cv.width,cv.height);let row=0,formChecks=0;
  for(const atlas of Object.keys(FORM_CAST_DATA))for(const direction of dirs){
   const model=atlas.replace(/-cast$/,''),id=model.split('-')[0],form=sprites.FORM_FILES[id].indexOf(model.slice(id.length+1));await sprites.prepareCharacter(id);await sprites.prepareAnimation(id,form);
   const g=fixture(id,direction,false);g.player.level=thresholds(g.character)[form-1];transform(g);for(let i=0;i<120;i++)step(g);const key=id==='vegeta'?'galick':'kamehameha',channel=id==='vegeta'?0:1,c=scheduleCast(g,key,target(g,direction),channel),d=c.def;
   const times=[d.windup*.3,d.windup+d.charge*.6,d.windup+d.charge+d.active*.12,d.windup+d.charge+d.active*.65,d.windup+d.charge+d.active+d.recovery*.4];
   for(let col=0;col<5;col++){advance(g,c,times[col]);const pose=playerFrame(id,form,g.player.anim.sample());if(pose.key!==atlas)throw Error(model+' used another model during '+phases[col]);if(direction==='east'){draw(g,1);ctx.drawImage(g.canvas,220,130,200,200,col*200,row*224+24,200,200);ctx.fillStyle='#e5edbb';ctx.font='11px monospace';ctx.fillText(model+' / '+phases[col],col*200+3,row*224+16);}}
   if(direction==='east')row++;formChecks++;
  }
  outputs['transformed-cast-phases']=cv.toDataURL().split(',')[1];
  for(const atlas of Object.keys(FORM_CAST_DATA))for(const direction of dirs){
   const model=atlas.replace(/-cast$/,''),id=model.split('-')[0],form=sprites.FORM_FILES[id].indexOf(model.slice(id.length+1));await sprites.prepareAnimation(id,form);
   const g=fixture(id,direction);g.player.level=thresholds(g.character)[form-1];transform(g);for(let i=0;i<120;i++)step(g);
   const key=id==='vegeta'?'final':id==='gohan'?'masenko':'genki',c=scheduleCast(g,key,target(g,direction),2),d=c.def;
   advance(g,c,d.windup+d.charge+d.active*.3);const pose=playerFrame(id,form,g.player.anim.sample());if(pose.key!==model+'-moving-cast')throw Error(model+' missing moving signature');formChecks++;
  }
  return {outputs,checked,formChecks,originChecks};
 });
 const out=path.resolve(__dirname,'../docs/previews');for(const [name,data] of Object.entries(result.outputs))await fs.writeFile(path.join(out,name+'.png'),Buffer.from(data,'base64'));
 // Real-time Canvas recording of selected attacks, still using the real update/draw paths.
 await page.evaluate(()=>{const g=__game;g.state='pause';window.__clips=[];window.__movie=new MediaRecorder(g.canvas.captureStream(30),{mimeType:'video/webm'});__movie.ondataavailable=e=>{if(e.data.size)__clips.push(e.data);};__movie.start();});
 await page.evaluate(async()=>{
  const {scheduleCast}=await import('./src/weapons.js'),{characters}=await import('./src/characters.js'),{spawn}=await import('./src/enemies.js'),{draw}=await import('./src/render.js');
  const cases=[['goku','kamehameha',1,'d'],['goku','genki',2,'w'],['vegeta','final',2,'a'],['buu','planet',2,'d'],['krillin','discs',2,'d'],['krillin','taiyoken',1,'w'],['gohan','masenko',0,'d']];
  for(const [id,key,channel,input] of cases){const g=__game;g.selected=characters.findIndex(c=>c.id===id);g.start();g.state='pause';g.obstacles=[];g.enemies=[];g.player.invuln=0;g.spawnClock=g.shotClock=g.specialClock=g.ultimateClock=9999;g.input.keys.clear();g.input.keys.add(input);spawn(g,'soldier');const e=g.enemies[0];e.speed=0;e.hp=e.maxHp=1e8;e.x=g.player.x+(input==='a'?-600:input==='d'?600:0);e.y=g.player.y+(input==='w'?-600:0);let cast;
   for(let tick=0;tick<165;tick++){if(tick===15)cast=scheduleCast(g,key,e,channel);if(g.hitStop>0)g.hitStop=Math.max(0,g.hitStop-1/60);else {g.state='play';g.update(1/60);g.state='pause';}draw(g,1);g.ctx.fillStyle='#e5edbb';g.ctx.font='12px monospace';g.ctx.fillText(id+' / '+key,16,120);await new Promise(r=>setTimeout(r,1000/60));}
  }
 });
 const video=await page.evaluate(()=>new Promise(resolve=>{__movie.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(__clips,{type:'video/webm'}));};__movie.stop();}));await fs.writeFile(path.join(out,'moving-combat.webm'),Buffer.from(video,'base64'));if(errors.length)throw Error(errors.join('\n'));console.log('PASS:',result.checked,'moving techniques/views;',result.formChecks,'transformed techniques/views;',result.originChecks,'precise launch anchors. PNGs and real Canvas video in docs/previews.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
