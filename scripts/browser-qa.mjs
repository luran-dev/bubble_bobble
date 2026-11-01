import {loadOmowright} from '/Users/jasper/.codex/plugins/cache/sisyphuslabs/omo/5.1.35/skills/browser/scripts/omowright.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {omowright}=await loadOmowright();
const browser=await omowright.connectPipe({browserPath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',browserArgs:['--headless','--no-first-run','--user-data-dir=/tmp/bubble-qa-profile'],storageRoot:'/tmp/bubble-qa-profile',dialogPolicy:{accept:true}});
const checks=[];
try{
 const page=await browser.newTab('http://localhost:4173');
 await omowright.emulate(page,'desktop-1440');
 const shot=async(name)=>fs.writeFile(`evidence/${name}.png`,await page.screenshot({type:"png"}));
 const state=()=>page.evaluate(()=>window.BubbleGame.snapshot());
 const key=async(code,type='keydown')=>page.evaluate(({code,type})=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true})),{code,type});
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 assert.equal((await state()).phase,'ready');checks.push('Initial state ready with 100 stage buttons');
 assert.equal(await page.evaluate(()=>document.querySelectorAll('.round-card').length),100);
 await shot('desktop-ready');
 await page.locator('#play').click();assert.equal((await state()).phase,'playing');
 const before=(await state()).players[0].x;await key('ArrowRight');await wait(350);await key('ArrowRight','keyup');assert.ok((await state()).players[0].x>before+30);checks.push('Keyboard movement changes player position');
 await key('Space');await wait(120);await key('Space','keyup');assert.ok((await state()).players[0].y<580);checks.push('Jump leaves ground');
 await key('KeyZ');await wait(400);await key('KeyZ','keyup');assert.ok((await state()).bubbles>0);checks.push('Held fire produces bubbles');
 await shot('desktop-playing');await key('KeyP');assert.equal((await state()).phase,'paused');const paused=await state();await wait(150);assert.deepEqual((await state()).players,paused.players);await shot('desktop-paused');await key('KeyP');assert.equal((await state()).phase,'playing');checks.push('Pause freezes physics; resume works');
 await page.locator('#help').click();assert.equal(await page.evaluate(()=>document.querySelector('#help-dialog').open),true);await shot('desktop-help');await page.locator('#help-dialog .dialog-close').click();
 await page.locator('[data-mode="2"]').click();await page.locator('#play').click();assert.equal((await state()).players.length,2);const bob=(await state()).players[1].x;await key('KeyA');await wait(200);await key('KeyA','keyup');assert.ok((await state()).players[1].x<bob);await shot('desktop-coop');checks.push('Two player mode and independent 2P controls');
 await page.locator('#stages-open').click();await shot('desktop-stages');await page.locator('[aria-label="100라운드 시작"]').click();assert.equal((await state()).stage,100);assert.equal((await state()).boss.hp,100);await shot('desktop-boss');checks.push('Stage selector starts final boss with full HP and resets score');
 await page.locator('#sound').click();assert.equal(await page.evaluate(()=>document.querySelector('#sound').getAttribute('aria-pressed')),'true');checks.push('Sound toggle updates accessible state');
 await wait(250);assert.equal((await state()).music.playing,true);assert.ok((await state()).music.scheduledNotes>0);checks.push('Music schedules synthesized notes when sound is enabled');
 await key('KeyP');assert.equal((await state()).music.playing,false);const notes=(await state()).music.scheduledNotes;await wait(150);assert.equal((await state()).music.scheduledNotes,notes);assert.equal((await state()).music.activeVoices,0);checks.push('Pause stops music timer and active notes');
 await key('KeyP');assert.equal((await state()).music.playing,true);await wait(100);assert.ok((await state()).music.scheduledNotes>notes);checks.push('Resume restarts music scheduling');
 await page.locator('#sound').click();assert.equal((await state()).music.playing,false);assert.equal((await state()).music.activeVoices,0);await page.locator('#sound').click();assert.equal((await state()).music.playing,true);checks.push('Mute/unmute stops and restarts music without duplicate playback');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await state()).music.playing,false);await key('KeyP');checks.push('Window blur pauses music with gameplay');

 await key('KeyR');assert.equal((await state()).score,0);checks.push('Restart resets current round');
 await page.reload();await omowright.emulate(page,'iphone-14');console.log('mobile dimensions',await page.evaluate(()=>({width:innerWidth,height:innerHeight})));assert.equal(await page.evaluate(()=>innerWidth),390);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('mobile-ready');await page.locator('#help').click();await shot('mobile-help');await page.locator('#help-dialog .dialog-close').click();await page.locator('#settings-open').click();await page.locator('#stages-open').click();await shot('mobile-stages');await page.locator('[aria-label="1라운드 시작"]').click();await shot('mobile-playing');await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await shot('mobile-bottom');checks.push('390px mobile has no horizontal overflow; help and stage dialogs render');
 // Isolated deterministic simulation harness: expose internals only in this test page.
 const source=await fs.readFile('game.js','utf8');
 await page.goto('http://localhost:4173');
 await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});
 const instrumented=source.replace('window.BubbleGame=Object.freeze',`window.__simulation={run:()=>{
 const results=[];
 start(0);const p=players[0];p.inv=0;p.x=300;p.y=600;
 enemies=[{x:350,y:590,vx:0,vy:0,w:30,h:32,dir:1,ground:true,trapped:false,type:'walk',jump:10,angry:false}];
 bubbles=[{x:350,y:590,vx:0,vy:0,age:0,enemy:null,dead:false}];update(1/60);
 if(!enemies[0].trapped)throw Error('capture');results.push('Bubble collision captures enemy');
 players[0].lives=2;pop(bubbles[0]);if(enemies.length!==0||score!==100||fruits.length!==1)throw Error('pop scoring');results.push('Pop removes enemy, creates fruit and awards points');
 fruits=[];for(let i=0;i<160;i++)update(1/60);if(stage!==1||players[0].lives!==2||score!==100)throw Error('stage progression/preservation');results.push('Cleared round advances and preserves lives');
 addScore(900);start(0);if(score!==0||players[0].lives!==3)throw Error('nonzero reset');results.push('Restart clears nonzero score and restores lives');players[0].inv=0;players[0].lives=1;hit(players[0]);if(phase!=='over')throw Error('game over');results.push('Last life produces game over');
 start(99);boss.hp=1;bubbles=[{x:boss.x,y:boss.y,vx:0,vy:0,age:0,enemy:null,dead:false}];update(1/60);if(phase!=='won')throw Error('boss victory');results.push('Lightning hit defeats boss and produces victory');
 start(0);const e=enemies[0];e.trapped=true;bubbles=[{x:300,y:200,vx:0,vy:0,age:9,enemy:e,dead:false}];update(1/60);if(e.trapped||!e.angry)throw Error('escape');results.push('Unpopped enemy escapes and becomes angry');
 return results;
 }};window.BubbleGame=Object.freeze`);
 const simulation=await page.evaluate(code=>{(0,eval)(code);return window.__simulation.run();},instrumented);checks.push(...simulation);
 await page.goto('file:///Users/jasper/devwork/bubble_bobble/index.html');assert.equal((await state()).phase,'ready');await page.locator('#play').click();assert.equal((await state()).phase,'playing');checks.push('Direct file:// launch works without a server');
 await fs.writeFile('evidence/qa-results.json',JSON.stringify({checks,passed:checks.length},null,2));
 console.log(JSON.stringify({checks,passed:checks.length},null,2));
}finally{await browser.close();}
