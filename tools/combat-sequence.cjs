/** Contact sheets from the actual renderer, not mockups or hand-selected PNGs. */
const {chromium}=require('playwright');const fs=require('node:fs/promises');const path=require('node:path');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.GAME_URL||'http://127.0.0.1:8000')+'/?test');await page.click('#start');
 const sheets=await page.evaluate(async()=>{
  const {scheduleCast,TECHNIQUES}=await import('./src/weapons.js'),{characters}=await import('./src/characters.js'),{draw}=await import('./src/render.js'),{spawn}=await import('./src/enemies.js'),sprites=await import('./src/sprites.js');
  const cases={goku:['ki','kamehameha','genki'],vegeta:['galick','bang','final'],buu:['elastic','barrage','planet'],krillin:['kienzan','taiyoken','discs'],gohan:['masenko','kamehameha','cannon']};
  const outputs={};const names=['preparation','charge','launch','impact','recovery'];
  const cv=document.createElement('canvas');cv.width=1200;cv.height=15*224;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#111f2b';ctx.fillRect(0,0,cv.width,cv.height);
  let row=0;
  for(const [id,keys] of Object.entries(cases))for(const key of keys){
   const g=__game;g.selected=characters.findIndex(c=>c.id===id);g.start();g.state='pause';g.obstacles=[];g.enemies=[];g.player.level=1;g.player.invuln=0;g.spawnClock=g.shotClock=g.specialClock=g.ultimateClock=9999;g.input.keys.clear();g.input.keys.add('d');
   await sprites.prepareAnimation(id,0);spawn(g,'soldier');const e=g.enemies[0];e.x=g.player.x+600;e.y=g.player.y;e.speed=0;e.hp=e.maxHp=1e8;const cast=scheduleCast(g,key,e,keys.indexOf(key)),d=TECHNIQUES[key];
   const targets=[d.windup*.3,d.windup+d.charge*.6,d.windup+d.charge+d.active*.12,d.windup+d.charge+d.active*.65,d.windup+d.charge+d.active+d.recovery*.4];
   for(let col=0;col<5;col++){
    while(cast.elapsed+1e-7<targets[col]){g.state='play';g.update(1/120);g.state='pause';}
    if(cast.phase!==names[col])throw Error(key+' wrong phase '+cast.phase+' expected '+names[col]);
    if(g.player.anim.sample().combatPhase!==cast.phase)throw Error(key+' visual phase not synchronized');
    draw(g,1);ctx.drawImage(g.canvas,200,135,240,200,col*240,row*224+24,240,200);ctx.fillStyle='#ddecbf';ctx.font='12px monospace';ctx.fillText(id+' / '+key+' / '+names[col],col*240+4,row*224+16);
   }
   row++;
  }
  outputs['combat-phases']=cv.toDataURL().split(',')[1];
  const walk=document.createElement('canvas');walk.width=960;walk.height=5*144;const w=walk.getContext('2d');w.imageSmoothingEnabled=false;w.fillStyle='#111f2b';w.fillRect(0,0,walk.width,walk.height);
  for(let id=0;id<characters.length;id++)for(const [dir,key] of ['s','a','d','w'].entries()){
   const g=__game;g.selected=id;g.start();g.state='pause';g.obstacles=[];g.enemies=[];g.spawnClock=g.shotClock=g.specialClock=g.ultimateClock=9999;g.player.invuln=0;g.input.keys.clear();g.input.keys.add(key);
   for(let f=0;f<4;f++){
    for(let step=0;step<7;step++){g.state='play';g.update(1/60);g.state='pause';}draw(g,1);
    w.drawImage(g.canvas,272,170,96,110,dir*240+f*58,id*144+24,58,110);
   }
   w.fillStyle='#ddecbf';w.font='12px monospace';w.fillText(characters[id].id+' / '+['south','west','east','north'][dir],dir*240+4,id*144+16);
  }
  outputs['five-character-movement']=walk.toDataURL().split(',')[1];
  const {transform,thresholds}=await import('./src/transformations.js');
  const forms=document.createElement('canvas');forms.width=720;forms.height=720;const fc=forms.getContext('2d');fc.fillStyle='#111f2b';fc.fillRect(0,0,720,720);fc.imageSmoothingEnabled=false;
  let milestones=0;
  for(let index=0;index<characters.length;index++){
   const g=__game,c=characters[index];await sprites.prepareCharacter(c.id);g.selected=index;g.start();g.state='pause';g.obstacles=[];g.enemies=[];g.player.invuln=0;g.spawnClock=g.shotClock=g.specialClock=g.ultimateClock=9999;g.input.keys.clear();
   for(let form=1;form<c.forms.length;form++){
    await sprites.prepareAnimation(c.id,form);g.player.level=thresholds(c)[form-1];transform(g);
    const from=g.player.anim.visualForm;
    for(let tick=0;tick<60;tick++){g.state='play';g.update(1/60);g.state='pause';if(tick===20&&g.player.anim.visualForm!==from)throw Error('Form swapped before charge');}
    if(g.player.form!==form||g.player.anim.visualForm!==form||g.player.anim.action)throw Error(c.id+' transition failed '+form);
    draw(g,1);fc.drawImage(g.canvas,260,146,120,132,(form-1)*120,index*144+12,120,132);fc.fillStyle='#ddecbf';fc.font='10px monospace';fc.fillText(c.id+' / '+c.forms[form],(form-1)*120+2,index*144+12);milestones++;
   }
  }
  if(milestones!==27)throw Error('Missing progression milestone');
  outputs['all-transformations']=forms.toDataURL().split(',')[1];return outputs;
 });
 if(errors.length)throw Error(errors.join('\n'));const out=path.resolve(__dirname,'../docs/previews');for(const [name,data] of Object.entries(sheets))await fs.writeFile(path.join(out,name+'.png'),Buffer.from(data,'base64'));console.log('PASS: actual renderer contact sheets, five characters × four movement directions; 15 techniques × five complete phases; all 27 transformation/technique milestones.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
