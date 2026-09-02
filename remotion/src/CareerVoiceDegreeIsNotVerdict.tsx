import React from 'react';
import {Audio} from '@remotion/media';
import {AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BRAND, Caption, InkStamp, MarkerUnderline, PaperCard, PaperGrain, SceneTransition, WorkModeCard, steppedFrame} from './components';

export type CareerVoiceDegreeProps = {
  brand?: Partial<typeof BRAND>;
  title?: string;
  captionOptions?: {enabled?: boolean};
  assets?: {student?: string | null; logo?: string | null};
  audio?: {narration?: string | null; music?: string | null; stampSfx?: string | null; musicVolume?: number; narrationVolume?: number};
};

export const defaultCareerVoiceDegreeProps: CareerVoiceDegreeProps = {
  title: 'CareerVoice',
  captionOptions: {enabled: true},
  assets: {student: null, logo: null},
  audio: {
    narration: 'audio/careervoice-degree-narration.mp3',
    music: 'audio/careervoice-paper-bed.mp3',
    stampSfx: 'audio/paper-stamp.wav',
    musicVolume: 0.08,
    narrationVolume: 1,
  },
};

const safe = (children: React.ReactNode) => <AbsoluteFill style={{padding: '96px 70px 92px', overflow: 'hidden'}}>{children}</AbsoluteFill>;

const StudentGlyph: React.FC<{asset?: string | null; small?: boolean}> = ({asset, small = false}) => {
  const size = small ? 150 : 270;
  if (asset) {
    return <Img src={staticFile(asset)} style={{width: size, height: size, objectFit: 'contain'}} onError={() => undefined}/>;
  }
  return <div style={{width: size, height: size, position: 'relative'}}>
    <div style={{position: 'absolute', left: '32%', top: 0, width: '36%', height: '36%', borderRadius: '50%', background: BRAND.ink}} />
    <div style={{position: 'absolute', left: '16%', top: '32%', width: '68%', height: '62%', borderRadius: '48% 48% 18% 18%', background: BRAND.ink}} />
    <div style={{position: 'absolute', left: '42%', top: '50%', width: '16%', height: '44%', background: BRAND.cream}} />
  </div>;
};

const Scene1: React.FC = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const f = steppedFrame(frame); const enter = spring({frame: f, fps, config: {damping: 18, stiffness: 120}});
  const push = interpolate(frame, [0, 119], [1, 1.055], {extrapolateRight: 'clamp'});
  return <SceneTransition>{safe(<>
    <div style={{position:'absolute', inset:0, display:'grid', placeItems:'center', scale: push}}>
      <PaperCard rotate={-2} style={{width: 820, minHeight: 720, opacity: enter, scale: enter}}>
        <div style={{fontFamily:'Georgia, Times New Roman, serif', fontStyle:'italic', fontSize:74, lineHeight:1.1, fontWeight:700}}>
          “I chose CSE because everyone said it was <span style={{position:'relative', display:'inline-block'}}>safe</span>.”
        </div>
        <div style={{fontSize:30, marginTop:50, opacity:.62, letterSpacing:2}}>ANONYMOUS STUDENT CONFESSION</div>
        <InkStamp text="SAFE" delay={46} style={{position:'absolute', right:78, bottom:78}} />
      </PaperCard>
    </div>
    <Caption text="I chose CSE because everyone said it was safe." />
  </>)}</SceneTransition>;
};

const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = Array.from({length: 12});
  return <SceneTransition>{safe(<>
    {cards.map((_, i) => <PaperCard key={i} rotate={(i%5)-2} style={{position:'absolute', width:430, height:260, left: 40 + (i%3)*320, top: 130 + Math.floor(i/3)*290, opacity:.11, padding:24}}><div style={{fontSize:28,fontStyle:'italic'}}>I chose CSE because everyone said it was safe.</div></PaperCard>)}
    <div style={{position:'absolute', top:480, left:0, right:0, textAlign:'center'}}>
      <div style={{fontSize:84,fontWeight:900}}>Nothing unusual.</div>
      <div style={{fontSize:90,fontWeight:950,color:BRAND.red,marginTop:20}}>That’s the problem.</div>
      <InkStamp text="SAFE" delay={12} style={{marginTop:70, scale: interpolate(steppedFrame(frame), [0,20],[.7,1], {extrapolateRight:'clamp'})}} />
    </div>
    <Caption text="Nothing unusual. That’s the problem." />
  </>)}</SceneTransition>;
};

const miniIcon = (label:string, i:number) => <div key={label} style={{width:190,height:150,border:`3px solid ${BRAND.ink}`,display:'grid',placeItems:'center',fontSize:27,fontWeight:900,opacity:.55,background:BRAND.paper,rotate:`${(i-2.5)*2}deg`}}>{label}</div>;

const Scene3: React.FC = () => {
  const frame = useCurrentFrame(); const {fps}=useVideoConfig();
  const slam=spring({frame:steppedFrame(frame),fps,config:{damping:10,stiffness:180}});
  return <SceneTransition>{safe(<>
    <div style={{fontSize:70,fontWeight:900}}>He chose the <span style={{color:BRAND.red}}>label</span> before the work.</div>
    <div style={{position:'absolute',left:95,right:95,top:520,display:'flex',flexWrap:'wrap',gap:34,justifyContent:'center'}}>{['BUILD','ANALYSE','DESIGN','EXPLAIN','SELL','OPERATE'].map(miniIcon)}</div>
    <PaperCard rotate={-4} style={{position:'absolute',left:205,top:585,width:670,height:360,display:'grid',placeItems:'center',scale:slam,background:'#EAE3D5'}}>
      <div style={{fontSize:150,fontWeight:950,letterSpacing:8}}>CSE</div>
      <div style={{fontSize:28,fontWeight:800,letterSpacing:4}}>DEGREE LABEL</div>
    </PaperCard>
    <div style={{position:'absolute',bottom:260,left:90,fontSize:65,fontWeight:900}}>Label first.</div>
    <div style={{position:'absolute',bottom:180,right:90,fontSize:65,fontWeight:900}}>Work later.</div>
  </>)}</SceneTransition>;
};

const Scene4: React.FC<{student?:string|null}> = ({student}) => {
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const f=steppedFrame(frame);
  const s=interpolate(f,[0,26],[2.7,1],{extrapolateRight:'clamp'}); const x=interpolate(f,[0,26],[290,0],{extrapolateRight:'clamp'});
  return <SceneTransition>{safe(<>
    <div style={{display:'grid',placeItems:'center',marginTop:210}}><StudentGlyph asset={student}/></div>
    <PaperCard rotate={-3} style={{position:'absolute',left:120,top:350,width:230,height:130,padding:20,scale:s,translate:`${x}px 0`,display:'grid',placeItems:'center',background:'#EAE3D5'}}><div style={{fontSize:52,fontWeight:950}}>CSE</div></PaperCard>
    <div style={{position:'absolute',left:100,right:100,top:790,fontSize:79,fontWeight:950,lineHeight:1.12}}>
      Your degree = <span style={{color:BRAND.teal}}>context</span><MarkerUnderline width={320} delay={24}/>
    </div>
    <div style={{position:'absolute',left:100,top:1080,fontSize:82,fontWeight:950}}>Not a <span style={{position:'relative'}}>verdict<span style={{position:'absolute',left:-10,right:-10,top:'52%',height:12,background:BRAND.red,rotate:'-4deg'}}/></span>.</div>
    <Caption text="A degree gives context. It should not become a verdict." />
  </>)}</SceneTransition>;
};

const Scene5: React.FC<{student?:string|null}> = ({student}) => {
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const pop=spring({frame:steppedFrame(frame),fps,config:{damping:14,stiffness:130}});
  return <SceneTransition>{safe(<>
    <div style={{position:'absolute',left:92,top:310}}><StudentGlyph asset={student} small/></div>
    <div style={{position:'absolute',left:248,top:390,width:340,height:8,background:BRAND.teal,rotate:'-7deg',scale:pop}}/>
    <div style={{position:'absolute',left:550,top:330,fontSize:100,color:BRAND.teal,rotate:'11deg'}}>➜</div>
    <PaperCard rotate={2} style={{position:'absolute',left:110,top:650,width:860,height:600,scale:pop}}>
      <div style={{fontSize:46,fontWeight:900,color:BRAND.teal,letterSpacing:2}}>A BETTER CAREER QUESTION:</div>
      <div style={{fontSize:210,lineHeight:.9,fontWeight:900,marginTop:58}}>?</div>
    </PaperCard>
    <Caption text="So CareerVoice asks a different question." />
  </>)}</SceneTransition>;
};

const Scene6: React.FC = () => {
  const frame=useCurrentFrame(); const f=steppedFrame(frame);
  const fade=interpolate(f,[20,70],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}); const q=interpolate(f,[50,120],[.78,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <SceneTransition>{safe(<>
    <div style={{fontSize:62,fontWeight:900,lineHeight:1.08}}>If every career paid the same tomorrow…</div>
    <div style={{position:'absolute',top:450,left:140,right:140,height:420}}>
      <div style={{position:'absolute',left:100,right:100,top:220,height:12,background:BRAND.ink}}/>
      <div style={{position:'absolute',left:'50%',top:70,width:14,height:330,background:BRAND.ink}}/>
      <div style={{position:'absolute',left:70,top:250,width:260,height:8,background:BRAND.ink,rotate:'8deg'}}/>
      <div style={{position:'absolute',right:70,top:250,width:260,height:8,background:BRAND.ink,rotate:'-8deg'}}/>
      <div style={{position:'absolute',left:60,top:120,opacity:fade,fontSize:58,fontWeight:900}}>₹ $$$</div>
      <div style={{position:'absolute',right:45,top:120,opacity:fade,fontSize:46,fontWeight:900}}>ROLE LABELS</div>
    </div>
    <PaperCard rotate={-1} style={{position:'absolute',left:90,right:90,top:980,minHeight:390,scale:q,background:'#E7F6F4',border:`4px solid ${BRAND.teal}`}}>
      <div style={{fontSize:75,fontWeight:950,lineHeight:1.08}}>What work would you choose?</div>
    </PaperCard>
    <Caption text="If every career paid the same, what work would you choose?" />
  </>)}</SceneTransition>;
};

const WORKS = [
  {label:'BUILD' as const,x:80,y:290,r:-3},{label:'ANALYSE' as const,x:670,y:300,r:2},{label:'DESIGN' as const,x:70,y:610,r:2},
  {label:'EXPLAIN' as const,x:680,y:620,r:-2},{label:'SELL' as const,x:85,y:930,r:-1},{label:'OPERATE' as const,x:670,y:940,r:3},
];
const Scene7: React.FC<{student?:string|null}> = ({student}) => <SceneTransition>{safe(<>
  <div style={{position:'absolute',left:405,top:710,zIndex:10,background:BRAND.cream,borderRadius:'50%',padding:28,border:`3px solid ${BRAND.ink}`}}><StudentGlyph asset={student} small/></div>
  {WORKS.map((w,i)=><WorkModeCard key={w.label} label={w.label} index={i} x={w.x} y={w.y} rotate={w.r}/>)}
  <div style={{position:'absolute',left:110,right:110,top:1320,fontSize:55,fontWeight:900,textAlign:'center'}}>BUILD · ANALYSE · DESIGN · EXPLAIN · SELL · OPERATE</div>
  <Caption text="Which kind of work would you rather spend your day doing?" />
</>)}</SceneTransition>;

const Scene8: React.FC<{student?:string|null}> = ({student}) => {
  const frame=useCurrentFrame(); const f=steppedFrame(frame); const path=interpolate(f,[16,90],[0,1],{extrapolateRight:'clamp'});
  return <SceneTransition>{safe(<>
    <div style={{fontSize:73,fontWeight:950,lineHeight:1.05}}>Notice your repeated choices.</div>
    <svg style={{position:'absolute',inset:0}} width="1080" height="1920" viewBox="0 0 1080 1920"><path d="M535 810 C350 760 260 1050 210 1180 C340 1240 470 1160 525 990 C620 1140 790 1235 875 1135" fill="none" stroke={BRAND.teal} strokeWidth="10" strokeDasharray="18 22" strokeDashoffset={800*(1-path)} strokeLinecap="round"/></svg>
    <div style={{position:'absolute',left:410,top:580}}><StudentGlyph asset={student}/></div>
    <WorkModeCard label="BUILD" index={0} x={90} y={1010} rotate={-3} selected/>
    <WorkModeCard label="DESIGN" index={1} x={660} y={1020} rotate={2} selected/>
    <WorkModeCard label="EXPLAIN" index={2} x={375} y={1320} rotate={-1} selected/>
    <div style={{position:'absolute',left:790,top:760,fontSize:90,color:BRAND.teal,rotate:'8deg'}}>✓ ✓ ✓</div>
    <Caption text="Patterns emerge from what you repeatedly choose." />
  </>)}</SceneTransition>;
};

const Scene9: React.FC<{title?:string; logo?:string|null}> = ({title='CareerVoice',logo}) => {
  const frame=useCurrentFrame(); const f=steppedFrame(frame); const enter=interpolate(f,[0,24],[0,1],{extrapolateRight:'clamp'});
  return <SceneTransition>{safe(<>
    <div style={{opacity:.12,position:'absolute',right:50,top:110,fontSize:190,fontWeight:950,rotate:'-8deg'}}>CSE</div>
    <div style={{fontSize:78,fontWeight:950,lineHeight:1.06,marginTop:160}}>If nobody saw your degree…</div>
    <div style={{fontSize:100,fontWeight:950,lineHeight:1.02,color:BRAND.teal,marginTop:60}}>What work would you choose?</div>
    <div style={{position:'absolute',left:78,right:78,top:720,display:'flex',flexWrap:'wrap',gap:24,justifyContent:'center',opacity:enter}}>{['BUILD','ANALYSE','DESIGN','EXPLAIN','SELL','OPERATE'].map((x,i)=><div key={x} style={{border:`3px solid ${BRAND.ink}`,padding:'22px 26px',fontSize:31,fontWeight:900,rotate:`${(i%3)-1}deg`,background:BRAND.paper}}>{x}</div>)}</div>
    <div style={{position:'absolute',left:80,right:80,bottom:355,textAlign:'center'}}>
      {logo ? <Img src={staticFile(logo)} style={{height:72,maxWidth:600,objectFit:'contain',margin:'0 auto 28px'}}/> : <div style={{fontSize:45,fontWeight:950,letterSpacing:1,color:BRAND.teal}}>{title}</div>}
      <div style={{fontSize:75,fontWeight:950,marginTop:28}}>Comment one word</div>
      <div style={{fontSize:120,color:BRAND.red,lineHeight:.9,rotate:'4deg'}}>↓</div>
    </div>
  </>)}</SceneTransition>;
};

export const CareerVoiceDegreeIsNotVerdict: React.FC<CareerVoiceDegreeProps> = (props) => {
  const merged={...defaultCareerVoiceDegreeProps,...props,audio:{...defaultCareerVoiceDegreeProps.audio,...props.audio},assets:{...defaultCareerVoiceDegreeProps.assets,...props.assets},captionOptions:{...defaultCareerVoiceDegreeProps.captionOptions,...props.captionOptions}};
  const audio=merged.audio!;
  return <AbsoluteFill style={{backgroundColor:BRAND.cream,color:BRAND.ink,fontFamily:'Inter, Arial, Helvetica, sans-serif'}}>
    <Sequence from={0} durationInFrames={120}><Scene1/></Sequence>
    <Sequence from={120} durationInFrames={120}><Scene2/></Sequence>
    <Sequence from={240} durationInFrames={168}><Scene3/></Sequence>
    <Sequence from={408} durationInFrames={144}><Scene4 student={merged.assets?.student}/></Sequence>
    <Sequence from={552} durationInFrames={144}><Scene5 student={merged.assets?.student}/></Sequence>
    <Sequence from={696} durationInFrames={264}><Scene6/></Sequence>
    <Sequence from={960} durationInFrames={264}><Scene7 student={merged.assets?.student}/></Sequence>
    <Sequence from={1224} durationInFrames={120}><Scene8 student={merged.assets?.student}/></Sequence>
    <Sequence from={1344} durationInFrames={96}><Scene9 title={merged.title} logo={merged.assets?.logo}/></Sequence>
    <PaperGrain/>
    {audio.narration ? <Audio src={staticFile(audio.narration)} volume={audio.narrationVolume ?? 1}/> : null}
    {audio.music ? <Audio src={staticFile(audio.music)} volume={audio.musicVolume ?? .08}/> : null}
    {audio.stampSfx ? <Sequence from={47} durationInFrames={24}><Audio src={staticFile(audio.stampSfx)} volume={0.45}/></Sequence> : null}
  </AbsoluteFill>;
};
