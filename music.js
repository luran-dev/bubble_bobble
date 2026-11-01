'use strict';
// An original, jaunty chip-tune arrangement: melody, offbeat chords and walking bass.
// Audio-clock scheduling keeps the loop independent of rendering frame rate.
window.CavernMusic = class CavernMusic {
 constructor(){this.context=null;this.output=null;this.timer=null;this.voices=new Set();this.step=0;this.nextTime=0;this.scheduled=0;}
 note(midi,time,duration,type,volume){
  if(midi===null)return;
  const c=this.context,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(440*2**((midi-69)/12),time);
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.008);
  g.gain.setValueAtTime(volume*.65,time+duration*.55);g.gain.linearRampToValueAtTime(0,time+duration);
  o.connect(g);g.connect(this.output);this.voices.add(o);
  o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};
  o.start(time);o.stop(time+duration+.015);this.scheduled++;
 }
 schedule(){
  const c=this.context;if(!c||c.state!=='running')return;
  if(this.nextTime<c.currentTime-.2)this.nextTime=c.currentTime+.025;
  const melody=[
   [76,79,81,79,76,72,74,76],[79,null,76,74,72,null,67,72],
   [77,81,84,81,79,77,76,74],[74,77,79,null,77,74,71,67],
   [76,79,84,83,81,79,76,72],[77,76,74,72,69,null,72,77],
   [76,74,72,69,74,71,67,71],[72,null,79,76,72,null,74,75],
   [76,79,81,84,83,79,76,79],[81,79,76,74,72,null,76,79],
   [81,84,86,84,81,77,79,81],[79,77,74,71,67,null,71,74],
   [76,79,84,79,81,76,74,72],[77,81,79,77,76,74,72,69],
   [74,77,76,74,71,74,79,83],[84,null,79,76,72,null,null,null]
  ];
  const chords=[[48,52,55],[48,52,55],[53,57,60],[43,47,50],[48,52,55],[45,48,52],[43,47,50],[48,52,55]];
  const eighth=60/138/2;
  while(this.nextTime<c.currentTime+.13){
   const bar=Math.floor(this.step/8)%16,beat=this.step%8,chord=chords[bar%8];
   const duration=eighth*(beat%2===0?1.12:.88);
   this.note(melody[bar][beat],this.nextTime,duration*.82,'square',.025);
   if(beat%2===0)this.note(chord[0]+(beat===4?7:beat===6?12:0),this.nextTime,eighth*1.35,'triangle',.085);
   else for(const pitch of chord)this.note(pitch+12,this.nextTime,eighth*.44,'triangle',.022);
   this.nextTime+=duration;this.step=(this.step+1)%128;
  }
 }
 setPlaying(playing,context){
  if(!playing){this.stop();return;}
  if(!context||this.timer!==null)return;
  this.context=context;
  if(!this.output){this.output=context.createGain();this.output.gain.value=.7;this.output.connect(context.destination);}
  // Resume is called from the user's start/resume/sound gesture, never on page load.
  if(context.state==='suspended')context.resume().catch(()=>{});
  this.nextTime=context.currentTime+.03;this.schedule();this.timer=setInterval(()=>this.schedule(),25);
 }
 stop(){
  if(this.timer!==null)clearInterval(this.timer);this.timer=null;
  for(const voice of this.voices){try{voice.stop();}catch{}}
  this.voices.clear();
 }
 reset(){this.stop();this.step=0;}
 snapshot(){return{playing:this.timer!==null,step:this.step,scheduledNotes:this.scheduled,activeVoices:this.voices.size};}
};
