// Kept for compatibility. The former grid guesses and hair overlays are retired.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const result=spawnSync('python3',[path.join(__dirname,'repair-atlases.py')],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
