'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const W = 768, H = 672, T = 24, STEP = 1 / 60;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const themes = [
 {name:'MOSSY CAVERNS',top:'#153c36',bottom:'#081d22',tile:'#286458',edge:'#86c88c',glow:'#9aefab'},
 {name:'LAGOON DEPTHS',top:'#153d4d',bottom:'#0b1c34',tile:'#27657a',edge:'#78d4d3',glow:'#70d9e9'},
 {name:'AMETHYST HOLLOW',top:'#302843',bottom:'#14192d',tile:'#574c80',edge:'#b7a2dc',glow:'#c8adfa'},
 {name:'AMBER GROTTO',top:'#443326',bottom:'#241c27',tile:'#7e5942',edge:'#e3b77b',glow:'#ffd192'},
 {name:'MOONLIT GARDEN',top:'#1c3a42',bottom:'#101f30',tile:'#406779',edge:'#acd8dc',glow:'#c3f2ed'}
];
let theme=themes[0], mode=1, phase='ready', stage=0, score=0, best=0;
try { best=Number(localStorage.getItem('neon-bobble-best'))||0; } catch {}
let players=[], enemies=[], bubbles=[], particles=[], fruits=[], bolts=[], platforms=[], boss=null;
let tick=0, elapsed=0, clearTimer=-1, combo=0, comboTimer=0, toastTime=0, stageTime=0;
let sound=false, audio=null, accumulator=0, last=0, backdrop=document.createElement('canvas');
const music=new window.CavernMusic();
const keys=new Set(), pressed=new Set();
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function rounded(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function tone(freq,duration=.08,type='sine',volume=.035){
 if(!sound)return;
 try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.5,audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}
}
function addScore(n){score+=n;best=Math.max(best,score);try{localStorage.setItem('neon-bobble-best',String(best));}catch{}updateHUD();}
function notify(text,time=2){$('toast').textContent=text;toastTime=time;}
function updateHUD(){
 music.setPlaying(sound && phase==='playing',audio);
 $('score').textContent=String(score).padStart(6,'0');$('best').textContent=String(best).padStart(6,'0');$('round').textContent=String(stage+1).padStart(2,'0');
 $('lives').innerHTML=players.map((p,i)=>`${'♥ '.repeat(Math.max(0,p.lives))}<small>${i?'BOB':'BUB'}${p.lives?'':' OUT'}</small>`).join('　');
 $('world').textContent=String(Math.floor(stage/20)+1).padStart(2,'0')+' · '+theme.name;
 $('enemies').textContent=boss?`BOSS ${Math.ceil(boss.hp)} / 100`:`${enemies.length} ENEMIES`;
 $('status').textContent={ready:'READY WHEN YOU ARE',playing:mode===2?'LOCAL CO-OP · TWO LITTLE HEROES':'ONE LITTLE HERO · ONE BIG ADVENTURE',paused:'TAKE A BREATHER',over:'ANOTHER ADVENTURE AWAITS',won:'YOU MADE IT. WHAT AN ADVENTURE!'}[phase];
 $('pause').setAttribute('aria-label',phase==='paused'?'계속하기':'일시정지');
}
function makePlayer(i){return{x:i?W-90:90,y:H-90,vx:0,vy:0,w:29,h:38,dir:i?-1:1,ground:false,lives:3,inv:2,cool:0,popCool:0,drop:0,id:i};}
function loadStage(n,keepLives=false){
 stage=clamp(n,0,99);theme=themes[Math.floor(stage/20)];platforms=[];
 const rows=STAGES[stage].tiles;
 // Merge adjacent tiles into collision spans. Side walls remain screen boundaries.
 for(let y=1;y<27;y++){let start=-1;for(let x=2;x<=30;x++){const solid=x<30&&rows[y][x]==='#';if(solid&&start<0)start=x;if(!solid&&start>=0){platforms.push({x:start*T,y:y*T,w:(x-start)*T,h:T});start=-1;}}}
 // All arenas have a safe floor; the reference's open shafts are a deliberate playability adaptation.
 platforms.push({x:36,y:624,w:696,h:24});
 bubbles=[];fruits=[];bolts=[];particles=[];enemies=[];boss=null;clearTimer=-1;stageTime=0;
 players=Array.from({length:mode},(_,i)=>{const old=players[i];const p=makePlayer(i);if(keepLives&&old)p.lives=old.lives;p.y=580;return p;});
 if(stage===99){boss={x:W/2,y:180,hp:100,t:0,shot:2,hit:0};}
 else{
  const n=Math.min(3+Math.floor(stage/9),10);
  const ledges=platforms.filter(p=>p.y>120&&p.y<590&&p.w>72);
  for(let i=0;i<n;i++){const ledge=ledges[i%Math.max(1,ledges.length)]||platforms.at(-1);enemies.push({x:clamp(ledge.x+ledge.w*(i%3+1)/4,65,W-65),y:ledge.y-18,vx:(i%2?1:-1)*(42+Math.min(stage,60)*.65),vy:0,w:30,h:32,dir:i%2?1:-1,ground:false,trapped:false,type:stage>3&&i%3===0?'fly':'walk',jump:rand(1.3,3.2),angry:false});}
 }
 buildBackdrop();updateHUD();
}
function start(n=stage){clearTouch();keys.clear();pressed.clear();music.reset();score=0;combo=0;players=[];loadStage(n);phase='playing';hideOverlay();updateHUD();notify(`ROUND ${String(n+1).padStart(2,'0')}`,1.6);canvas.focus({preventScroll:true});tone(600,.15);}
function hideOverlay(){$('overlay').hidden=true;}
function showOverlay(kind){
 const copy={ready:['THE ADVENTURE STARTS HERE','Ready to<br><em>bubble?</em>','버블 속에 가두고, 터뜨리고.<br>반짝이는 동굴 속으로 출발!','모험 시작하기'],paused:['A LITTLE BREATHER','잠깐,<br><em>쉬어가요.</em>','동굴은 기다려 줄 거예요.<br>준비되면 다시 모험을 이어가세요.','계속하기'],over:['EVERY END IS A NEW START','One more<br><em>bubble?</em>',`최종 점수 ${score.toLocaleString()} · ROUND ${stage+1}<br>다음 모험은 더 멀리 갈 수 있을 거예요.`,'다시 도전하기'],won:['ALL 100 CAVERNS · CONQUERED','You are<br><em>bub-tastic!</em>',`100개의 동굴을 정복했어요!<br>최종 점수 ${score.toLocaleString()}`,'처음부터 다시']}[kind];
 $('overlay-kicker').textContent=copy[0];$('overlay-title').innerHTML=copy[1];$('overlay-desc').innerHTML=copy[2];$('play').innerHTML=copy[3]+' <span>→</span>';$('overlay-hint').textContent=kind==='paused'?'P 또는 ENTER로 계속하기':'ENTER 키로도 시작할 수 있어요';$('overlay').hidden=false;
}
function pause(){if(phase==='playing'){phase='paused';keys.clear();pressed.clear();clearTouch();showOverlay('paused');}else if(phase==='paused'){phase='playing';hideOverlay();canvas.focus({preventScroll:true});}updateHUD();}
function playAction(){if(phase==='paused')pause();else start(phase==='won'?0:stage);}
function burst(x,y,color,count=15){if(reducedMotion)count=4;for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-150,150),vy:rand(-170,80),life:rand(.3,.7),max:.7,size:rand(2,5),color});}
function hit(p){if(p.inv>0||p.lives<=0||clearTimer>=0)return;p.lives--;p.inv=3;burst(p.x,p.y,'#ffb1a5',25);tone(150,.3,'sawtooth',.025);p.x=p.id?W-90:90;p.y=580;p.vx=0;p.vy=0;updateHUD();if(players.every(p=>p.lives<=0)){phase='over';showOverlay('over');updateHUD();}}
function pop(b){
 if(b.dead)return;b.dead=true;burst(b.x,b.y,b.enemy?'#ffe49e':'#a8f6df');tone(b.enemy?720:420,.12);
 if(b.enemy){const e=b.enemy;enemies=enemies.filter(v=>v!==e);combo=comboTimer>0?combo+1:1;comboTimer=1;addScore(100*Math.min(combo,8));fruits.push({x:b.x,y:b.y,vx:rand(-35,35),vy:-100,w:20,h:22,life:12,type:Math.floor(rand(0,3)),ground:false});particles.push({x:b.x,y:b.y-20,vx:0,vy:-30,life:1,max:1,text:combo>1?`${combo}× COMBO`:'+100',color:'#ffdf94'});updateHUD();}
}
function shoot(p){if(p.cool>0)return;p.cool=.25;const b={x:p.x+p.dir*25,y:p.y-7,vx:p.dir*270,vy:-8,age:0,enemy:null,dead:false,lightning:!!boss};bubbles.push(b);tone(boss?800:450,.06);}
function moveBody(e,dt,drop=false){
 e.x+=e.vx*dt;e.x=clamp(e.x,48+e.w/2,W-48-e.w/2);
 const previous=e.y+e.h/2;e.vy=Math.min(e.vy+780*dt,510);e.y+=e.vy*dt;e.ground=false;
 if(e.vy>=0&&!drop){for(const p of platforms){if(e.x+e.w/2>p.x+2&&e.x-e.w/2<p.x+p.w-2&&previous<=p.y+2&&e.y+e.h/2>=p.y){e.y=p.y-e.h/2;e.vy=0;e.ground=true;break;}}}
 if(e.y>H+40){e.y=-20;e.vy=60;}
}
function update(dt){
 tick+=dt;elapsed+=dt;
 if(phase!=='playing')return;
 stageTime+=dt;comboTimer-=dt;
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').textContent='';}
 for(const p of players){
  if(p.lives<=0)continue;
  const map=p.id?['KeyA','KeyD','KeyW','KeyF','KeyG','KeyS']:['ArrowLeft','ArrowRight','Space','KeyZ','KeyX','ArrowDown'];
  p.inv-=dt;p.cool-=dt;p.popCool-=dt;p.drop-=dt;
  const direction=(keys.has(map[1])?1:0)-(keys.has(map[0])?1:0);p.vx=direction*205;if(direction)p.dir=direction;
  if((pressed.has(map[2])||(!p.id&&pressed.has('ArrowUp')))&&p.ground){p.vy=-490;p.ground=false;tone(330,.1);}
  if(pressed.has(map[5])&&p.ground&&p.y<570){p.drop=.2;p.y+=5;}
  if(keys.has(map[3]))shoot(p);
  if(keys.has(map[4])&&p.popCool<=0){p.popCool=.18;for(const b of bubbles)if(distance(b,p)<90)pop(b);}
  moveBody(p,dt,p.drop>0);
 }
 for(const e of enemies){
  if(e.trapped)continue;
  e.jump-=dt;
  if(e.type==='fly'){e.x+=e.vx*dt;e.y+=Math.sin(tick*2+e.x*.015)*28*dt;if(e.x<70||e.x>W-70)e.vx*=-1;e.y=clamp(e.y,85,580);}
  else{if(e.jump<=0&&e.ground){e.vy=-rand(270,370);e.jump=rand(1.5,3.5);}const before=e.x;moveBody(e,dt);if(e.x===before||e.x<=64||e.x>=W-64)e.vx*=-1;}
  e.dir=Math.sign(e.vx)||1;
  if(stageTime>50&&!e.angry){e.angry=true;e.vx*=1.5;}
  for(const p of players)if(p.lives>0&&Math.abs(p.x-e.x)<25&&Math.abs(p.y-e.y)<29)hit(p);
 }
 for(const b of bubbles){
  if(b.dead)continue;b.age+=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.enemy){b.vx*=.94;b.vy=-28;b.x+=Math.sin(tick*2+b.y*.03)*12*dt;if(b.y<70)b.y=70;}
  else if(b.age>.45){b.vx*=.97;b.vy=-43;}
  if(b.x<55||b.x>W-55){b.x=clamp(b.x,55,W-55);b.vx*=-.5;}
  if(!b.enemy){for(const e of enemies){if(!e.trapped&&distance(b,e)<27){e.trapped=true;b.enemy=e;b.age=0;b.vx*=.2;burst(b.x,b.y,'#b8f58b',7);tone(620,.1);break;}}}
  if(boss&&distance(b,boss)<67){boss.hp--;boss.hit=.12;b.dead=true;burst(b.x,b.y,'#ffe89a',6);addScore(50);updateHUD();}
  for(const p of players)if(p.lives>0&&b.enemy&&b.age>.2&&distance(p,b)<31)pop(b);
  if(b.enemy&&b.age>9){const e=b.enemy;e.trapped=false;e.x=b.x;e.y=b.y;e.vy=0;if(!e.angry){e.vx*=1.5;e.angry=true;}b.dead=true;burst(b.x,b.y,'#ff9db2',5);}
  if(!b.enemy&&(b.age>5||b.y<25))b.dead=true;
 }
 bubbles=bubbles.filter(b=>!b.dead);
 for(const f of fruits){f.life-=dt;moveBody(f,dt);for(const p of players)if(p.lives>0&&distance(f,p)<31){f.life=0;addScore(500);burst(f.x,f.y,'#ffdd85',8);tone(950,.12);break;}}
 fruits=fruits.filter(f=>f.life>0);
 if(boss){
  boss.t+=dt;boss.hit-=dt;boss.x=W/2+Math.sin(boss.t*.62)*240;boss.y=185+Math.sin(boss.t*.9)*110;boss.shot-=dt;
  if(boss.shot<=0){boss.shot=1.7;const target=players.find(p=>p.lives>0);if(target){const angle=Math.atan2(target.y-boss.y,target.x-boss.x);for(let d=-1;d<=1;d++)bolts.push({x:boss.x,y:boss.y,vx:Math.cos(angle+d*.22)*175,vy:Math.sin(angle+d*.22)*175,life:6});}}
  for(const p of players)if(p.lives>0&&distance(p,boss)<66)hit(p);
  if(boss.hp<=0){burst(boss.x,boss.y,'#ffdf85',60);addScore(10000);boss=null;phase='won';showOverlay('won');updateHUD();}
 }
 for(const b of bolts){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const p of players)if(p.lives>0&&distance(b,p)<23){hit(p);b.life=0;}}bolts=bolts.filter(b=>b.life>0);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;if(!p.text)p.vy+=160*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0).slice(-250);
 if(!boss&&enemies.length===0&&stage<99){if(clearTimer<0){clearTimer=2.5;notify('ROUND CLEAR!',2.4);tone(1000,.3);}clearTimer-=dt;if(clearTimer<=0){loadStage(stage+1,true);notify(`ROUND ${String(stage+1).padStart(2,'0')}`,1.6);}}
 pressed.clear();
}
function drawDragon(c,x,y,scale=1,color='green',dir=1,walk=0){
 c.save();c.translate(x,y);c.scale(scale*dir,scale);
 const blue=color==='blue', dark=blue?'#327fbe':'#368e4d', mid=blue?'#5ac7ee':'#8bd96d', light=blue?'#b2edff':'#d3f598';
 ellipse(c,0,23,23,5,'#00170f44');
 c.fillStyle=dark;c.beginPath();c.moveTo(-13,12);c.quadraticCurveTo(-35,15,-29,-7);c.quadraticCurveTo(-22,4,-8,1);c.fill();
 for(let i=0;i<4;i++){c.fillStyle=blue?'#d7f6f7':'#e1eca3';c.beginPath();c.moveTo(-19+i*2,-4-i*7);c.lineTo(-27+i*3,-9-i*7);c.lineTo(-15+i*2,-12-i*7);c.fill();}
 const g=c.createLinearGradient(-18,-30,21,24);g.addColorStop(0,light);g.addColorStop(.35,mid);g.addColorStop(1,dark);
 ellipse(c,-1,3,20,23,g);ellipse(c,0,-18,21,22,g);ellipse(c,15,-9,15,13,g);
 ellipse(c,6,8,11,16,'#e6f2c7');ellipse(c,12,-27,7,11,'#f6ffed');ellipse(c,15,-26,3.3,6,'#152e30');ellipse(c,16,-28,1.2,2,'#fff');ellipse(c,-1,-28,5,8,'#efffdc');ellipse(c,1,-27,2,4,'#294534');
 ellipse(c,26,-13,1.7,2,'#244f38');c.strokeStyle=dark;c.lineWidth=1.5;c.beginPath();c.moveTo(15,-2);c.quadraticCurveTo(20,1,25,-3);c.stroke();
 ellipse(c,-9,23+Math.sin(walk)*2,12,6,dark);ellipse(c,12,23-Math.sin(walk)*2,12,6,mid);
 ellipse(c,15,6,9,5,mid);ellipse(c,-9,-19,5,9,'#ffffff18');
 c.restore();
}
function drawEnemy(c,e,x=e.x,y=e.y,scale=1){
 c.save();c.translate(x,y);c.scale(scale*e.dir,scale);const fly=e.type==='fly';
 ellipse(c,0,17,18,4,'#00121d44');
 if(fly){c.fillStyle='#f9b6b4';for(const s of[-1,1]){c.beginPath();c.moveTo(s*10,-5);c.quadraticCurveTo(s*37,-25+Math.sin(tick*12)*8,s*27,7);c.lineTo(s*10,10);c.fill();}}
 const g=c.createLinearGradient(-12,-19,10,17);g.addColorStop(0,e.angry?'#ffc3b6':'#c9b9f1');g.addColorStop(1,e.angry?'#d55379':'#7566ad');rounded(c,-15,-17,30,34,11,g);
 ellipse(c,7,-5,7,10,'#f6f6ef');ellipse(c,9,-4,2.5,5,'#28213d');ellipse(c,-7,-6,4.5,7,'#f7f6e9');ellipse(c,-6,-5,2,4,'#28213d');
 c.strokeStyle='#493961';c.lineWidth=2;c.beginPath();c.moveTo(1,9);c.lineTo(9,9);c.stroke();ellipse(c,-10,17,7,4,'#b19adf');ellipse(c,11,17,7,4,'#b19adf');c.restore();
}
function drawBubble(c,x,y,r=21,trapped=false){
 const fill=c.createRadialGradient(x-r*.3,y-r*.4,r*.05,x,y,r);fill.addColorStop(0,'#d7fff011');fill.addColorStop(.72,'#a0e8df08');fill.addColorStop(1,trapped?'#b9ffa94a':'#91f5df40');ellipse(c,x,y,r,r,fill);
 const rim=c.createLinearGradient(x-r,y-r,x+r,y+r);rim.addColorStop(0,'#e6ffe9');rim.addColorStop(.3,'#8eeddd');rim.addColorStop(.55,'#a6bafa55');rim.addColorStop(.8,'#eea8d6');rim.addColorStop(1,'#c5ffe3');c.strokeStyle=rim;c.lineWidth=1.6;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.strokeStyle='#fff9';c.lineWidth=2.5;c.beginPath();c.arc(x,y,r-5,Math.PI*1.12,Math.PI*1.5);c.stroke();ellipse(c,x+r*.38,y+r*.45,3,1.5,'#fff7');
}
function buildBackdrop(){
 backdrop.width=W;backdrop.height=H;const c=backdrop.getContext('2d');
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,theme.top);g.addColorStop(1,theme.bottom);c.fillStyle=g;c.fillRect(0,0,W,H);
 const glow=c.createRadialGradient(W*.5,H*.4,20,W*.5,H*.4,430);glow.addColorStop(0,theme.glow+'18');glow.addColorStop(1,'#00000000');c.fillStyle=glow;c.fillRect(0,0,W,H);
 // Deterministic layered stone silhouettes keep the arena legible without a flat backdrop.
 for(let layer=0;layer<3;layer++){c.fillStyle=['#071d2522','#061d2444','#061a2455'][layer];for(let i=0;i<10;i++){const x=i*100-40+layer*35,depth=90+(Math.sin(i*7.3+layer)*.5+.5)*200;c.beginPath();c.moveTo(x,0);c.lineTo(x+30,depth);c.lineTo(x+50,depth*.75);c.lineTo(x+88,0);c.fill();c.beginPath();c.moveTo(x,H);c.lineTo(x+45,H-depth*.6);c.lineTo(x+100,H);c.fill();}}
 for(let i=0;i<45;i++){const x=(i*173+19)%W,y=(i*i*43+35)%H;ellipse(c,x,y,1,1,'#c3f6c121');}
 const drawTile=(x,y,w,h)=>{const gradient=c.createLinearGradient(0,y,0,y+h);gradient.addColorStop(0,theme.tile);gradient.addColorStop(1,'#12352f');rounded(c,x,y+3,w,h,5,'#020d1666');rounded(c,x,y,w,h-1,4,gradient);rounded(c,x+1,y,w-2,5,3,theme.edge+'aa');c.strokeStyle='#00000021';c.lineWidth=1;for(let k=x+T;k<x+w;k+=T){c.beginPath();c.moveTo(k,y+5);c.lineTo(k,y+h);c.stroke();}for(let k=x+6;k<x+w-4;k+=18){c.fillStyle=theme.edge+'55';c.beginPath();c.moveTo(k,y+2);c.lineTo(k+3,y-4-(k%5));c.lineTo(k+6,y+2);c.fill();}};
 for(const p of platforms)drawTile(p.x,p.y,p.w,p.h);
 for(let y=0;y<H;y+=24){drawTile(12,y,33,24);drawTile(W-45,y,33,24);}
 drawTile(12,0,W-24,24);
 // Glowing plants and crystals live in margins, never over collision-critical edges.
 for(const x of[65,115,W-95,W-145]){const y=621;for(let i=0;i<4;i++){c.strokeStyle=theme.edge+'88';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+(i-1.5)*12,y-12,x+(i-1.5)*8,y-22-i*3);c.stroke();ellipse(c,x+(i-1.5)*8,y-22-i*3,3,5,theme.edge+'aa');}}
}
function draw(){
 ctx.clearRect(0,0,W,H);ctx.drawImage(backdrop,0,0);
 if(!reducedMotion){for(let i=0;i<14;i++){const x=70+(i*137)%630+Math.sin(tick*.5+i)*9,y=45+(i*83+tick*(i%3+2))%540;ellipse(ctx,x,y,1.4,1.4,theme.glow+'66');}}
 for(const f of fruits){if(f.life<2&&Math.floor(tick*8)%2)continue;if(f.type===0){ellipse(ctx,f.x-5,f.y+3,7,8,'#f77c8c');ellipse(ctx,f.x+5,f.y+3,7,8,'#d54b75');ctx.strokeStyle='#91d56f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.x-4,f.y);ctx.lineTo(f.x,f.y-12);ctx.lineTo(f.x+5,f.y);ctx.stroke();}else{ellipse(ctx,f.x,f.y,10,11,f.type===1?'#ffd16b':'#b2e980');ellipse(ctx,f.x-3,f.y-4,3,4,'#ffffff66');ellipse(ctx,f.x+4,f.y-12,5,2,'#79b977');}}
 for(const e of enemies)if(!e.trapped)drawEnemy(ctx,e);
 for(const b of bubbles){if(b.enemy)drawEnemy(ctx,b.enemy,b.x,b.y,.8);drawBubble(ctx,b.x,b.y,b.enemy?25:19,!!b.enemy);if(b.lightning){ctx.fillStyle='#ffed9c';ctx.beginPath();ctx.moveTo(b.x+3,b.y-12);ctx.lineTo(b.x-8,b.y+2);ctx.lineTo(b.x,b.y+2);ctx.lineTo(b.x-2,b.y+12);ctx.lineTo(b.x+9,b.y-3);ctx.lineTo(b.x+1,b.y-3);ctx.fill();}}
 if(boss){ctx.save();ctx.translate(boss.x,boss.y);ctx.scale(2.6,2.6);drawEnemy(ctx,{type:'walk',angry:true,dir:1},0,0,1);ctx.fillStyle='#ffde88';ctx.beginPath();ctx.moveTo(-13,-19);ctx.lineTo(-17,-31);ctx.lineTo(-5,-25);ctx.lineTo(0,-35);ctx.lineTo(7,-25);ctx.lineTo(17,-31);ctx.lineTo(13,-19);ctx.fill();if(boss.hit>0)ellipse(ctx,0,0,24,26,'#ffffff44');ctx.restore();rounded(ctx,224,44,320,8,4,'#071b23');rounded(ctx,224,44,320*Math.max(0,boss.hp)/100,8,4,'#f5ad9b');ctx.fillStyle='#ffdcbd';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('SUPER DRUNK',W/2,36);}
 for(const b of bolts){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(tick*3);rounded(ctx,-5,-9,10,18,4,'#e9a0ef');rounded(ctx,-3,-12,6,5,2,'#ffffc6');ctx.restore();}
 for(const p of players){if(p.lives<=0||(p.inv>0&&phase==='playing'&&Math.floor(tick*10)%2))continue;drawDragon(ctx,p.x,p.y+3,.76,p.id?'blue':'green',p.dir,p.vx?tick*16:0);}
 for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);if(p.text){ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y);}else ellipse(ctx,p.x,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
 if(phase==='ready'){drawBubble(ctx,145,260,36);drawBubble(ctx,625,360,27);drawBubble(ctx,581,157,18);drawDragon(ctx,168,550,1.5,'green',1);drawDragon(ctx,598,550,1.3,'blue',-1);}
}
function drawPortrait(){const c=$('portrait').getContext('2d');c.clearRect(0,0,260,160);drawDragon(c,mode===2?95:130,93,1.4,'green',1);if(mode===2)drawDragon(c,180,98,1.1,'blue',-1);drawBubble(c,mode===2?44:192,48,14);drawBubble(c,mode===2?220:67,73,8);}
function frame(now){if(!last)last=now;accumulator+=Math.min((now-last)/1000,.1);last=now;while(accumulator>=STEP){update(STEP);accumulator-=STEP;}draw();requestAnimationFrame(frame);}
const controlCodes=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyZ','KeyX','KeyA','KeyD','KeyW','KeyS','KeyF','KeyG','KeyP','KeyR']);
window.addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]'))return;
 if(e.target instanceof HTMLButtonElement&&['Enter','Space'].includes(e.code))return;
 if(controlCodes.has(e.code))e.preventDefault();if(e.repeat)return;
 if(e.code==='Enter'&&phase!=='playing'){playAction();return;}
 if(e.code==='KeyP'||e.code==='Escape'){pause();return;}
 if(e.code==='KeyR'){start();return;}
 keys.add(e.code);pressed.add(e.code);
});
window.addEventListener('keyup',e=>{keys.delete(e.code);pressed.delete(e.code);});
window.addEventListener('blur',()=>{keys.clear();pressed.clear();if(phase==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing')pause();});
$('play').addEventListener('click',playAction);$('pause').addEventListener('click',pause);
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'배경음악 · 효과음 끄기':'배경음악 · 효과음 켜기');$('sound').innerHTML=sound?'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5ZM16 8q5 4 0 8m3-11q8 7 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6m0-6-5 6"/></svg>';$('sound').title=sound?'배경음악 · 효과음 끄기':'배경음악 · 효과음 켜기';tone(600,.1);music.setPlaying(sound&&phase==='playing',audio);});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=Number(button.dataset.mode);document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});$('mode-note').innerHTML=mode===2?'BUB + BOB, 둘이면 더 든든하죠.<br>2P: A · D 이동 / W 점프 / F 발사 / G 팡!':'혼자서도 충분히 멋진 모험.<br>100개의 동굴을 하나씩 정복해 보세요.';$('portrait').setAttribute('aria-label',mode===2?'버브와 밥 두 버블 드래곤':'초록 버블 드래곤 버브');drawPortrait();phase='ready';score=0;players=[];loadStage(stage);showOverlay('ready');updateHUD();}));
function openDialog(id){if(phase==='playing')pause();$(id).showModal();}
$('help').addEventListener('click',()=>openDialog('help-dialog'));
$('stages-open').addEventListener('click',()=>{if($('settings-dialog').open)$('settings-dialog').close();document.querySelectorAll('.round-card').forEach((b,i)=>b.classList.toggle('current',i===stage));openDialog('stages-dialog');});
document.querySelectorAll('.dialog-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.machine').requestFullscreen();}catch{notify('브라우저에서 전체화면을 지원하지 않아요.',3);}});
const touchPointers=new Map();
function releaseTouch(pointerId){
 const button=touchPointers.get(pointerId);if(!button)return;
 touchPointers.delete(pointerId);
 if(![...touchPointers.values()].includes(button)){keys.delete(button.dataset.key);pressed.delete(button.dataset.key);button.classList.remove('is-pressed');}
}
function clearTouch(){for(const id of [...touchPointers.keys()])releaseTouch(id);}
document.querySelectorAll('[data-key]').forEach(button=>{
 button.addEventListener('pointerdown',e=>{e.preventDefault();if(phase!=='playing')return;button.setPointerCapture(e.pointerId);touchPointers.set(e.pointerId,button);keys.add(button.dataset.key);pressed.add(button.dataset.key);button.classList.add('is-pressed');});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>releaseTouch(e.pointerId));
 button.addEventListener('contextmenu',e=>e.preventDefault());
});
window.addEventListener('blur',clearTouch);
const mobileLayout=matchMedia('(max-width:850px), (pointer:coarse) and (max-width:1100px)');
const sidebar=document.querySelector('aside'),arcade=document.querySelector('.arcade-layout');
function arrangeMobile(){
 clearTouch();
 if(mobileLayout.matches)$('settings-content').append(sidebar);
 else{if($('settings-dialog').open)$('settings-dialog').close();arcade.append(sidebar);}
}
mobileLayout.addEventListener('change',arrangeMobile);arrangeMobile();
$('settings-open').addEventListener('click',()=>openDialog('settings-dialog'));

for(let i=0;i<100;i++){const b=document.createElement('button');b.className='round-card';b.setAttribute('aria-label',`${i+1}라운드 시작`);const mini=document.createElement('canvas');mini.width=96;mini.height=84;mini.setAttribute('aria-hidden','true');const c=mini.getContext('2d');c.fillStyle='#0b1c22';c.fillRect(0,0,96,84);c.fillStyle=themes[Math.floor(i/20)].edge;STAGES[i].tiles.forEach((r,y)=>[...r].forEach((v,x)=>{if(v==='#')c.fillRect(x*3,y*3,3,2);}));b.append(mini,document.createTextNode(i===99?'100 · BOSS':String(i+1).padStart(2,'0')));b.addEventListener('click',()=>{$('stages-dialog').close();start(i);});$('stage-grid').append(b);}
loadStage(0);drawPortrait();showOverlay('ready');updateHUD();requestAnimationFrame(frame);
// Read-only snapshots are useful for deterministic game diagnostics without exposing state mutation.
window.BubbleGame=Object.freeze({snapshot:()=>({phase,stage:stage+1,score,best,mode,music:music.snapshot(),boss:boss?{hp:boss.hp}:null,players:players.map(p=>({x:p.x,y:p.y,lives:p.lives,ground:p.ground})),enemies:enemies.length,trapped:enemies.filter(e=>e.trapped).length,bubbles:bubbles.length,platforms:platforms.map(p=>({...p}))})});
})();
