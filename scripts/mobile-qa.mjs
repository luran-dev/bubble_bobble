import {loadOmowright} from '/Users/jasper/.codex/plugins/cache/sisyphuslabs/omo/5.1.35/skills/browser/scripts/omowright.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {omowright}=await loadOmowright();
const browser=await omowright.connectPipe({browserPath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',browserArgs:['--headless','--no-first-run','--user-data-dir=/tmp/bubble-mobile-qa'],storageRoot:'/tmp/bubble-mobile-qa',dialogPolicy:{accept:true}});
const results=[];
try{
 const page=await browser.newTab('http://localhost:4173');
 for(const [width,height] of [[390,844],[375,667],[844,390],[932,430],[568,320]]){
  await page.goto('http://localhost:4173');
  await omowright.emulate(page,{width,height,deviceScaleFactor:1,mobile:true,hasTouch:true});
  await new Promise(r=>setTimeout(r,150));
  await page.evaluate(()=>window.scrollTo(0,0));
  const bounds=await page.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
   return{viewport:rect(document.querySelector('#viewport')),buttons:[...document.querySelectorAll('[data-key]')].map(rect),width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,settings:!!document.querySelector('#settings-content aside')};
  });
  assert.equal(bounds.width,width);assert.ok(bounds.scrollWidth<=width);assert.ok(bounds.settings);
  for(const b of [bounds.viewport,...bounds.buttons]){assert.ok(b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1,JSON.stringify({width,height,b}));}
  for(const b of bounds.buttons){assert.ok(b.width>=44&&b.height>=44);const v=bounds.viewport;assert.ok(b.right<=v.x||b.x>=v.right||b.bottom<=v.y||b.y>=v.bottom,'Control overlaps arena');}
  assert.ok(Math.abs(bounds.viewport.width/bounds.viewport.height-768/672)<.02,'Distorted arena');
  await fs.writeFile(`evidence/mobile-${width}x${height}-ready.png`,await page.screenshot({type:'png'}));
  await page.locator('#play').click();
  await new Promise(r=>setTimeout(r,100));
  const points=await page.evaluate(()=>['ArrowRight','Space','KeyZ'].map((key,i)=>{const r=document.querySelector(`[data-key="${key}"]`).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:i+1,radiusX:5,radiusY:5,force:1}}));
  const before=await page.evaluate(()=>BubbleGame.snapshot());
  await page._sendToTarget('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
  await new Promise(r=>setTimeout(r,250));
  const after=await page.evaluate(()=>BubbleGame.snapshot());
  assert.ok(after.players[0].x>before.players[0].x+20,'Multi-touch movement');assert.ok(after.players[0].y<before.players[0].y-20,'Multi-touch jump');assert.ok(after.bubbles>0,'Multi-touch shooting');
  await page._sendToTarget('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.evaluate(()=>document.querySelectorAll('.is-pressed').length),0);
  const stopped=await page.evaluate(()=>BubbleGame.snapshot().players[0].x);await new Promise(r=>setTimeout(r,120));assert.equal(await page.evaluate(()=>BubbleGame.snapshot().players[0].x),stopped);
  await page._sendToTarget('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});
  await page._sendToTarget('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await page.evaluate(()=>document.querySelectorAll('.is-pressed').length),0);
  await fs.writeFile(`evidence/mobile-${width}x${height}-playing.png`,await page.screenshot({type:'png'}));
  await page.locator('#settings-open').click();assert.equal(await page.evaluate(()=>BubbleGame.snapshot().phase),'paused');await fs.writeFile(`evidence/mobile-${width}x${height}-settings.png`,await page.screenshot({type:'png'}));
  await page.locator('#stages-open').click();await page.locator('[aria-label="2라운드 시작"]').click();assert.equal(await page.evaluate(()=>document.querySelectorAll('dialog[open]').length),0);assert.equal(await page.evaluate(()=>BubbleGame.snapshot().stage),2);
  results.push({width,height,checks:'arena + six 44px controls visible; no overlap/overflow; aspect ratio; simultaneous move/jump/fire; release/cancel; settings pause; stage selection closes dialogs'});
 }
 await page.locator('#fullscreen').click();assert.ok(await page.evaluate(()=>!!document.fullscreenElement));assert.ok(await page.evaluate(()=>[...document.querySelectorAll('[data-key]')].every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=innerHeight})));await fs.writeFile('evidence/mobile-fullscreen.png',await page.screenshot({type:'png'}));await page.evaluate(()=>document.exitFullscreen());
 await omowright.emulate(page,'desktop-1440');await new Promise(r=>setTimeout(r,150));assert.ok(await page.evaluate(()=>!!document.querySelector('.arcade-layout>aside')));await fs.writeFile('evidence/mobile-update-desktop.png',await page.screenshot({type:'png'}));
 await fs.writeFile('evidence/mobile-qa.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
