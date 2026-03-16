import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './auth.jsx';
import * as api from './api.js';

// ─── BRAND SYSTEM (from logo files) ──────────────────────────
const B = {
  bg0:"#07090E",bg1:"#0C1118",bg2:"#111820",bg3:"#17202A",bg4:"#1E2836",bg5:"#263040",
  border:"#1E2836",borderMid:"#283848",borderHi:"#384A5E",
  blue:"#2479C8",blueBright:"#3A94E8",blueDim:"#1A5CA0",
  blueFaint:"rgba(36,121,200,.11)",blueBorder:"rgba(36,121,200,.28)",
  gold:"#F5A623",goldBright:"#FFBE45",goldDim:"#C07810",
  goldFaint:"rgba(245,166,35,.10)",goldBorder:"rgba(245,166,35,.26)",
  green:"#2EC47A",greenFaint:"rgba(46,196,122,.11)",greenBorder:"rgba(46,196,122,.28)",
  coral:"#E85040",coralFaint:"rgba(232,80,64,.11)",coralBorder:"rgba(232,80,64,.28)",
  purple:"#9080F0",purpleFaint:"rgba(144,128,240,.11)",purpleBorder:"rgba(144,128,240,.28)",
  teal:"#22BFA8",tealFaint:"rgba(34,191,168,.11)",tealBorder:"rgba(34,191,168,.28)",
  text:"#E0ECF8",textMid:"#7A96B0",textLow:"#465870",textFaint:"#1E3040",
};

const css = {
  input:{background:B.bg1,border:`1px solid ${B.border}`,color:B.text,borderRadius:8,padding:"9px 13px",fontFamily:"inherit",fontSize:13,outline:"none",width:"100%",transition:"border-color .15s"},
  label:{display:"block",fontSize:10,fontWeight:700,color:B.textLow,textTransform:"uppercase",letterSpacing:".6px",marginBottom:5},
  card:{background:B.bg2,border:`1px solid ${B.border}`,borderRadius:12,padding:20},
};

// ─── SHARED PRIMITIVES ────────────────────────────────────────
function Pill({c="gray",children,sm}){
  const m={gray:[B.bg4,B.textMid,B.border],green:[B.greenFaint,B.green,B.greenBorder],gold:[B.goldFaint,B.gold,B.goldBorder],blue:[B.blueFaint,B.blue,B.blueBorder],purple:[B.purpleFaint,B.purple,B.purpleBorder],coral:[B.coralFaint,B.coral,B.coralBorder],teal:[B.tealFaint,B.teal,B.tealBorder]};
  const[bg,tx,bd]=m[c]||m.gray;
  return<span style={{display:"inline-flex",alignItems:"center",padding:sm?"2px 8px":"3px 11px",borderRadius:20,fontSize:sm?10:11,fontWeight:600,background:bg,color:tx,border:`1px solid ${bd}`,whiteSpace:"nowrap"}}>{children}</span>;
}
function Av({i,s=32,c=B.gold}){return<div style={{width:s,height:s,borderRadius:"50%",background:B.blueFaint,border:`1px solid ${B.blueBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:s*.35,fontWeight:700,color:c,flexShrink:0}}>{i}</div>;}
function Bar({v,h=4,color=B.gold,w}){return<div style={{width:w||"100%",height:h,background:B.bg4,borderRadius:h,overflow:"hidden",flexShrink:0}}><div style={{width:`${v}%`,height:"100%",background:color,borderRadius:h,transition:"width .5s"}}/></div>;}
function Btn({children,onClick,v="gold",sm,disabled,full,type}){
  const s={gold:{background:`linear-gradient(135deg,${B.gold},${B.goldBright})`,color:"#07090E",border:"none"},blue:{background:`linear-gradient(135deg,${B.blue},${B.blueBright})`,color:"#fff",border:"none"},ghost:{background:"transparent",color:B.textMid,border:`1px solid ${B.border}`},outline:{background:"transparent",color:B.gold,border:`1px solid ${B.goldBorder}`},danger:{background:B.coralFaint,color:B.coral,border:`1px solid ${B.coralBorder}`}};
  return<button type={type||"button"} onClick={onClick} disabled={disabled} style={{...s[v],fontFamily:"inherit",fontWeight:700,fontSize:sm?12:13,padding:sm?"7px 16px":"10px 22px",borderRadius:9,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,whiteSpace:"nowrap",width:full?"100%":undefined,display:"inline-flex",alignItems:"center",gap:6}}>{children}</button>;
}
function Stat({label,value,delta,accent,c}){
  return<div style={{background:accent?B.goldFaint:c?`${c}18`:B.bg2,border:`1px solid ${accent?B.goldBorder:c?`${c}40`:B.border}`,borderRadius:11,padding:"16px 18px"}}>
    <div style={{fontSize:10,fontWeight:700,color:B.textLow,textTransform:"uppercase",letterSpacing:".6px",marginBottom:7}}>{label}</div>
    <div style={{fontSize:26,fontWeight:800,color:accent?B.gold:c||B.text,lineHeight:1,marginBottom:4}}>{value}</div>
    {delta&&<div style={{fontSize:12,color:B.textMid}}>{delta}</div>}
  </div>;
}
function useToast(){
  const[toasts,setToasts]=useState([]);
  const add=useCallback((title,body,type="info")=>{const id=Date.now();setToasts(p=>[...p,{id,title,body,type}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4000);},[]);
  const remove=useCallback(id=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
  return{toasts,add,remove};
}
function Toast({toasts,remove}){
  return<div style={{position:"fixed",top:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
    {toasts.map(t=>(
      <div key={t.id} style={{background:B.bg3,border:`1px solid ${t.type==="error"?B.coralBorder:t.type==="success"?B.greenBorder:B.blueBorder}`,borderRadius:10,padding:"12px 16px",maxWidth:320,display:"flex",gap:10,animation:"slideIn .2s ease",pointerEvents:"all"}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:t.type==="error"?B.coral:t.type==="success"?B.green:B.blue,marginTop:4,flexShrink:0}}/>
        <div style={{flex:1}}>{t.title&&<div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{t.title}</div>}<div style={{fontSize:12,color:B.textMid}}>{t.body}</div></div>
        <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:B.textLow,fontSize:16,lineHeight:1}}>×</button>
      </div>
    ))}
  </div>;
}
function Shell({title,sub,badge,right,children,noPad}){
  return<div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{padding:"18px 26px 14px",borderBottom:`1px solid ${B.border}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div><h2 style={{fontSize:19,fontWeight:800,color:B.text,letterSpacing:"-0.3px"}}>{title}</h2>{sub&&<p style={{fontSize:11,color:B.textLow,marginTop:2}}>{sub}</p>}</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>{badge&&<Pill c="blue">{badge}</Pill>}{right}</div>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:noPad?0:"22px 26px"}}>{children}</div>
  </div>;
}

// SydCrest logo mark (SVG recreation of brand asset)
function LogoMark({size=30}){
  return<svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <rect x="4" y="7" width="13" height="4.5" rx="1.2" transform="rotate(-18 4 7)" fill="url(#lga)"/>
    <rect x="10" y="11" width="11" height="4.5" rx="1.2" transform="rotate(-18 10 11)" fill="url(#lga)"/>
    <rect x="13" y="5" width="13" height="4.5" rx="1.2" transform="rotate(-18 13 5)" fill="url(#lgb)"/>
    <rect x="7" y="17" width="13" height="4.5" rx="1.2" transform="rotate(-18 7 17)" fill="url(#lgb)"/>
    <defs>
      <linearGradient id="lga" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#F5A623"/><stop offset="1" stopColor="#FFBE45"/></linearGradient>
      <linearGradient id="lgb" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#2479C8"/><stop offset="1" stopColor="#0A3A6A"/></linearGradient>
    </defs>
  </svg>;
}

// ─── AUTH SCREENS ─────────────────────────────────────────────
function LoginPage({onLogin,onGoRegister,toast}){
  const[email,setEmail]=useState('');const[pw,setPw]=useState('');const[loading,setLoading]=useState(false);
  async function submit(e){e.preventDefault();setLoading(true);try{await onLogin(email,pw);}catch(err){toast("Login failed",err.message,"error");}setLoading(false);}
  return<div style={{minHeight:"100vh",background:B.bg0,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{width:"100%",maxWidth:400}}>
      <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"center",marginBottom:32}}>
        <LogoMark size={40}/><div><div style={{fontSize:22,fontWeight:800,color:B.text}}>SydCrest</div><div style={{fontSize:11,color:B.textLow,letterSpacing:".5px",textTransform:"uppercase"}}>Launchpad</div></div>
      </div>
      <div style={css.card}>
        <div style={{fontSize:17,fontWeight:700,marginBottom:4}}>Welcome back</div>
        <div style={{fontSize:13,color:B.textMid,marginBottom:20}}>Sign in to your account</div>
        <form onSubmit={submit}>
          <div style={{marginBottom:14}}><label style={css.label}>Email</label><input style={css.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoFocus/></div>
          <div style={{marginBottom:20}}><label style={css.label}>Password</label><input style={css.input} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" required/></div>
          <Btn full type="submit" disabled={loading}>{loading?"Signing in…":"Sign in →"}</Btn>
        </form>
        <div style={{textAlign:"center",marginTop:16,fontSize:13,color:B.textMid}}>No account? <span style={{color:B.blue,cursor:"pointer"}} onClick={onGoRegister}>Register here</span></div>
      </div>
    </div>
  </div>;
}

function RegisterPage({onLogin,onGoLogin,toast}){
  const[form,setForm]=useState({email:"",password:"",full_name:"",role:"mentee",phone:"",region:"",device_access:"smartphone"});
  const[loading,setLoading]=useState(false);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  async function submit(e){
    e.preventDefault();setLoading(true);
    try{
      const data=await api.auth.register(form);
      localStorage.setItem('sc_token',data.token);
      localStorage.setItem('sc_profile',JSON.stringify(data.profile));
      onLogin(data.profile);
    }catch(err){toast("Registration failed",err.message,"error");}
    setLoading(false);
  }
  return<div style={{minHeight:"100vh",background:B.bg0,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{width:"100%",maxWidth:460}}>
      <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"center",marginBottom:28}}>
        <LogoMark size={40}/><div><div style={{fontSize:22,fontWeight:800,color:B.text}}>SydCrest</div><div style={{fontSize:11,color:B.textLow,letterSpacing:".5px",textTransform:"uppercase"}}>Launchpad</div></div>
      </div>
      <div style={css.card}>
        <div style={{fontSize:17,fontWeight:700,marginBottom:4}}>Create account</div>
        <div style={{fontSize:13,color:B.textMid,marginBottom:20}}>Start your tech journey</div>
        <form onSubmit={submit}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={{gridColumn:"1/-1"}}><label style={css.label}>Full name</label><input style={css.input} value={form.full_name} onChange={e=>set("full_name",e.target.value)} placeholder="Ama Boateng" required/></div>
            <div><label style={css.label}>Email</label><input style={css.input} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="you@email.com" required/></div>
            <div><label style={css.label}>Password</label><input style={css.input} type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Min 8 chars" required/></div>
            <div><label style={css.label}>I am a</label>
              <select style={css.input} value={form.role} onChange={e=>set("role",e.target.value)}>
                <option value="mentee">Mentee — I want to learn</option>
                <option value="mentor">Mentor — I want to teach</option>
              </select>
            </div>
            <div><label style={css.label}>Region</label>
              <select style={css.input} value={form.region} onChange={e=>set("region",e.target.value)}>
                <option value="">Select region</option>
                {["Navrongo","Bolgatanga","Tamale","Wa","Kumasi","Accra","Other"].map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><label style={css.label}>Phone (WhatsApp)</label><input style={css.input} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+233..."/></div>
            <div><label style={css.label}>Device access</label>
              <select style={css.input} value={form.device_access} onChange={e=>set("device_access",e.target.value)}>
                <option value="smartphone">Smartphone only</option>
                <option value="laptop">Laptop available</option>
                <option value="both">Smartphone &amp; laptop</option>
              </select>
            </div>
          </div>
          <Btn full type="submit" disabled={loading}>{loading?"Creating account…":"Create account →"}</Btn>
        </form>
        <div style={{textAlign:"center",marginTop:16,fontSize:13,color:B.textMid}}>Already have an account? <span style={{color:B.blue,cursor:"pointer"}} onClick={onGoLogin}>Sign in</span></div>
      </div>
    </div>
  </div>;
}

// ─── NOTIFICATION PANEL ──────────────────────────────────────
function NotifPanel({notifs,markAll,close}){
  return<div style={{position:"absolute",top:52,right:16,width:310,background:B.bg2,border:`1px solid ${B.border}`,borderRadius:12,boxShadow:`0 20px 60px rgba(0,0,0,.7)`,zIndex:100,overflow:"hidden"}}>
    <div style={{padding:"13px 16px",borderBottom:`1px solid ${B.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:14,fontWeight:700}}>Notifications</span>
      <div style={{display:"flex",gap:12}}><span style={{fontSize:12,color:B.blue,cursor:"pointer"}} onClick={markAll}>Mark all read</span><span style={{fontSize:16,color:B.textLow,cursor:"pointer"}} onClick={close}>×</span></div>
    </div>
    {notifs.length===0&&<div style={{padding:24,textAlign:"center",fontSize:13,color:B.textLow}}>All caught up!</div>}
    {notifs.map((n,i)=>(
      <div key={n.id} style={{padding:"11px 16px",borderBottom:i<notifs.length-1?`1px solid ${B.border}`:"none",background:n.is_read?"transparent":B.blueFaint,display:"flex",gap:10}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:n.is_read?B.textFaint:B.blue,marginTop:4,flexShrink:0}}/>
        <div><div style={{fontSize:13,fontWeight:n.is_read?400:600,marginBottom:2}}>{n.title}</div><div style={{fontSize:12,color:B.textMid}}>{n.body}</div><div style={{fontSize:10,color:B.textFaint,marginTop:3}}>{n.created_at}</div></div>
      </div>
    ))}
  </div>;
}

// ─── DASHBOARD ────────────────────────────────────────────────
function Dashboard({setPage,profile}){
  const isAdmin=['platform_admin','super_admin'].includes(profile?.role);
  const isMentor=['mentor','cohort_admin'].includes(profile?.role);
  return<Shell title="Overview" sub={`Welcome back, ${profile?.full_name?.split(' ')[0]}`}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
      <Stat label="Progress" value="52%" delta="Week 5 of 8" accent/>
      <Stat label="XP Points" value="340" delta="Rank #4 cohort" c={B.blue}/>
      <Stat label="Streak" value="4 days" delta="Keep it up!" c={B.green}/>
      {isAdmin?<Stat label="Active mentees" value="24" delta="↑ 4 this week" c={B.purple}/>:<Stat label="Sessions" value="4 / 4" delta="100% attendance" c={B.teal}/>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
      <div style={css.card}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Quick access</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {l:"AI Learning Paths",p:"learning",c:B.blue,desc:"Generate your personalised roadmap"},
            {l:"Study Buddy Chat",p:"chat",c:B.purple,desc:"Ask anything, anytime"},
            {l:"Opportunity Engine",p:"opportunities",c:B.gold,desc:"Research jobs & scholarships"},
            {l:"Mentor Marketplace",p:"marketplace",c:B.green,desc:"Book 1:1 sessions"},
            ...(isMentor||isAdmin?[{l:"Projects to Review",p:"projects",c:B.teal,desc:"Pending assessments"},{l:"Admin Panel",p:"admin",c:B.coral,desc:"Platform management"}]:[{l:"My Projects",p:"projects",c:B.teal,desc:"Submit & track work"},{l:"Community Feed",p:"community",c:B.coral,desc:"Connect with cohort"}]),
          ].map((a,i)=>(
            <div key={i} onClick={()=>setPage(a.p)} style={{padding:"14px 16px",borderRadius:10,background:B.bg3,border:`1px solid ${B.border}`,cursor:"pointer",transition:"border-color .15s"}}>
              <div style={{fontSize:13,fontWeight:600,color:B.text,marginBottom:3}}>{a.l}</div>
              <div style={{fontSize:12,color:B.textMid}}>{a.desc}</div>
              <div style={{marginTop:8,fontSize:12,color:a.c}}>Open →</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...css.card,background:B.goldFaint,borderColor:B.goldBorder}}>
          <div style={{fontSize:11,fontWeight:700,color:B.goldDim,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Opportunity Engine</div>
          <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:5}}>We do the hard work</div>
          <div style={{fontSize:12,color:B.textMid,lineHeight:1.6,marginBottom:10}}>Research any job, school, scholarship or fellowship. Claude handles it all.</div>
          <Btn sm onClick={()=>setPage("opportunities")}>Explore →</Btn>
        </div>
        <div style={css.card}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>This week</div>
          <div style={{fontSize:13,fontWeight:600,color:B.text,marginBottom:4}}>Week 5: Fetch API &amp; Async JS</div>
          <Bar v={60} h={3}/>
          <div style={{fontSize:12,color:B.textMid,marginTop:6}}>3 of 5 lessons completed</div>
          <div style={{marginTop:10,display:"flex",gap:8}}><Btn sm onClick={()=>setPage("lesson")}>Continue lesson</Btn><Btn sm v="ghost" onClick={()=>setPage("quiz")}>Take quiz</Btn></div>
        </div>
      </div>
    </div>
  </Shell>;
}

// ─── AI LEARNING PATHS ────────────────────────────────────────
function AILearning({toast}){
  const[form,setForm]=useState({name:"",track:"web",level:"beginner",device:"smartphone",goals:"",team:false});
  const[loading,setLoading]=useState(false);const[result,setResult]=useState(null);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const TRACKS={web:"Web Development",data:"Data Science",uiux:"UI/UX Design",mobile:"Mobile Dev",backend:"Backend Engineering"};
  const LEVELS={beginner:"Beginner",basic:"Some courses done",intermediate:"Built small projects"};
  async function generate(){
    setLoading(true);setResult(null);
    try{
      const data=await api.learning.generatePath({track:TRACKS[form.track],level:LEVELS[form.level],device:form.device,goals:form.goals,team_learning:form.team});
      setResult(data.path);
      toast("Path generated!","Your 8-week roadmap is ready.","success");
    }catch(e){toast("Failed",e.message,"error");}
    setLoading(false);
  }
  return<Shell title="AI Learning Paths" sub="Personalised roadmaps powered by Claude" badge="Claude API">
    <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:18,alignItems:"start"}}>
      <div style={css.card}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>Generate a path</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div><label style={css.label}>Your name</label><input style={css.input} placeholder="e.g. Ama Boateng" value={form.name} onChange={e=>set("name",e.target.value)}/></div>
          <div><label style={css.label}>Track</label><select style={css.input} value={form.track} onChange={e=>set("track",e.target.value)}>{Object.entries(TRACKS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
          <div><label style={css.label}>Level</label><select style={css.input} value={form.level} onChange={e=>set("level",e.target.value)}>{Object.entries(LEVELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
          <div><label style={css.label}>Device</label><select style={css.input} value={form.device} onChange={e=>set("device",e.target.value)}><option value="smartphone">Smartphone only</option><option value="laptop">Laptop</option><option value="both">Both</option></select></div>
          <div><label style={css.label}>Goals</label><textarea style={{...css.input,minHeight:65,resize:"vertical"}} placeholder="Freelancing, fintech, 10hrs/week…" value={form.goals} onChange={e=>set("goals",e.target.value)}/></div>
          <div onClick={()=>set("team",!form.team)} style={{display:"flex",gap:10,padding:"10px 12px",borderRadius:8,background:form.team?B.purpleFaint:B.bg3,border:`1px solid ${form.team?B.purpleBorder:B.border}`,cursor:"pointer",alignItems:"center"}}>
            <div style={{width:15,height:15,borderRadius:4,background:form.team?B.purple:B.bg5,border:`1.5px solid ${form.team?B.purple:B.borderHi}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",flexShrink:0}}>{form.team?"✓":""}</div>
            <div style={{fontSize:12}}><div style={{fontWeight:500}}>Team learning weeks</div><div style={{color:B.textLow}}>2 collaborative checkpoints</div></div>
          </div>
          <Btn full onClick={generate} disabled={loading}>{loading?"Generating with Claude…":"Generate 8-week path →"}</Btn>
        </div>
      </div>
      <div>
        {!result&&!loading&&<div style={{...css.card,textAlign:"center",padding:56}}><div style={{fontSize:40,color:B.textFaint,marginBottom:12}}>◈</div><div style={{fontSize:13,color:B.textLow}}>Your personalised roadmap will appear here.<br/>All resources will be free and mobile-friendly.</div></div>}
        {loading&&<div style={{display:"flex",flexDirection:"column",gap:10}}>{[...Array(4)].map((_,i)=><div key={i} style={{height:110,borderRadius:10,background:B.bg3,opacity:.4}}/>)}</div>}
        {result&&(
          <div>
            <div style={{...css.card,background:B.blueFaint,borderColor:B.blueBorder,marginBottom:12}}>
              <div style={{fontSize:17,fontWeight:800,color:B.blue,marginBottom:3}}>{result.title}</div>
              <div style={{fontSize:12,color:B.textMid}}>{form.name||"Mentee"} · {TRACKS[form.track]} · {result.tagline}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {result.raw_json?.weeks?.map((w,i)=>(
                <div key={i} style={{...css.card,padding:14,borderColor:w.team?B.purpleBorder:B.border,background:w.team?B.purpleFaint:B.bg2}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <span style={{fontSize:10,fontWeight:700,color:B.gold,textTransform:"uppercase",letterSpacing:".4px"}}>Week {w.week}</span>
                    {w.team&&<Pill c="purple" sm>team</Pill>}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:B.text,marginBottom:7,lineHeight:1.3}}>{w.theme}</div>
                  {w.objectives?.slice(0,2).map((o,j)=><div key={j} style={{fontSize:12,color:B.textMid,display:"flex",gap:5,marginBottom:3}}><span style={{color:B.blue,flexShrink:0}}>→</span>{o}</div>)}
                  <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${B.border}`}}>
                    <div style={{fontSize:11,color:B.textFaint,marginBottom:2}}>Free resource</div>
                    <div style={{fontSize:12,color:B.gold}}>{w.resource_name}</div>
                    <div style={{fontSize:11,color:B.textFaint,margin:"6px 0 2px"}}>Assignment</div>
                    <div style={{fontSize:12,color:B.textMid}}>{w.assignment}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </Shell>;
}

// ─── STUDY BUDDY CHAT ─────────────────────────────────────────
function StudyBuddy({toast}){
  const[msgs,setMsgs]=useState([{role:"assistant",content:"Hi! I'm your SydCrest study buddy. I know you're on Week 5 — Fetch API & async JavaScript.\n\nAsk me anything: explain a concept, review code, practice problems, or type 'quiz me' to start a quick quiz."}]);
  const[input,setInput]=useState("");const[loading,setLoading]=useState(false);
  const bottomRef=useRef();
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  async function send(text){
    const msg=text||input.trim();if(!msg)return;
    setInput("");setMsgs(p=>[...p,{role:"user",content:msg}]);setLoading(true);
    let reply="";
    setMsgs(p=>[...p,{role:"assistant",content:"",streaming:true}]);
    try{
      await api.streamChat([...msgs,{role:"user",content:msg}],{track:"Web Development",currentWeek:5,level:"beginner",device:"smartphone"},
        chunk=>{reply+=chunk;setMsgs(p=>{const last=[...p];last[last.length-1]={...last[last.length-1],content:reply};return last;});},
        ()=>{setMsgs(p=>{const last=[...p];last[last.length-1]={...last[last.length-1],streaming:false};return last;});}
      );
    }catch{setMsgs(p=>{const last=[...p];last[last.length-1]={role:"assistant",content:"Network error — please try again."};return last;});}
    setLoading(false);
  }
  return<Shell title="Study Buddy" sub="Powered by Claude · Week 5 · Fetch API" badge="AI" noPad>
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{flex:1,overflowY:"auto",padding:"20px 26px",display:"flex",flexDirection:"column",gap:12}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:10,flexDirection:m.role==="user"?"row-reverse":"row"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:m.role==="user"?B.goldFaint:B.blueFaint,border:`1px solid ${m.role==="user"?B.goldBorder:B.blueBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:m.role==="user"?B.gold:B.blue,flexShrink:0}}>{m.role==="user"?"ME":"AI"}</div>
            <div style={{maxWidth:"78%",background:m.role==="user"?B.goldFaint:B.bg3,border:`1px solid ${m.role==="user"?B.goldBorder:B.border}`,borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"10px 14px",fontSize:13,color:B.textMid,lineHeight:1.7,whiteSpace:"pre-wrap"}}>
              {m.content}{m.streaming&&<span style={{opacity:.5}}>▋</span>}
            </div>
          </div>
        ))}
        {loading&&!msgs[msgs.length-1]?.streaming&&<div style={{display:"flex",gap:10}}><div style={{width:28,height:28,borderRadius:"50%",background:B.blueFaint,border:`1px solid ${B.blueBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:B.blue}}>AI</div><div style={{background:B.bg3,border:`1px solid ${B.border}`,borderRadius:"12px 12px 12px 2px",padding:"10px 14px",display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:B.blue,animation:`pulse .8s ease ${i*.15}s infinite alternate`}}/>)}</div></div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"14px 26px",borderTop:`1px solid ${B.border}`,background:B.bg1}}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
          {["Explain async/await","Give me a practice problem","Quiz me on Fetch API","Review my code"].map((s,i)=>(
            <button key={i} onClick={()=>send(s)} style={{background:B.bg3,border:`1px solid ${B.border}`,borderRadius:20,padding:"5px 11px",fontSize:11,color:B.textMid,cursor:"pointer"}}>{s}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Ask anything…" style={{...css.input,flex:1}}/>
          <Btn v="blue" onClick={()=>send()} disabled={loading||!input.trim()}>Send</Btn>
        </div>
      </div>
    </div>
  </Shell>;
}

// ─── OPPORTUNITY ENGINE ───────────────────────────────────────
function Opportunities({toast}){
  const[opps,setOpps]=useState([]);const[loading,setLoading]=useState(true);
  const[view,setView]=useState("list");const[sel,setSel]=useState(null);
  const[research,setResearch]=useState(null);const[roadmap,setRoadmap]=useState(null);
  const[aiLoading,setAiLoading]=useState(false);
  const[form,setForm]=useState({type:"job",title:"",org:"",location:"",deadline:"",notes:""});
  const[chatMsgs,setChatMsgs]=useState([]);const[chatInput,setChatInput]=useState("");const[chatLoading,setChatLoading]=useState(false);
  const[resTab,setResTab]=useState("overview");
  const bottomRef=useRef();

  useEffect(()=>{
    api.opportunities.list().then(d=>setOpps(d.opportunities||[])).catch(()=>setOpps([])).finally(()=>setLoading(false));
  },[]);

  const OPP_TYPES={job:"Job",school:"School",scholarship:"Scholarship",fellowship:"Fellowship",internship:"Internship"};
  const OPP_COLORS={job:B.blue,school:B.purple,scholarship:B.gold,fellowship:B.teal,internship:B.green};

  async function addOpp(){
    try{const d=await api.opportunities.add(form);setOpps(p=>[d.opportunity,...p]);setView("list");toast("Added!",`${form.title} is now tracked.`,"success");}
    catch(e){toast("Failed",e.message,"error");}
  }
  async function doResearch(opp){
    setSel(opp);setResearch(null);setRoadmap(null);setResTab("overview");setView("detail");setAiLoading(true);
    try{const d=await api.opportunities.research(opp.id);setResearch(d.research);}catch(e){toast("Research failed",e.message,"error");}
    setAiLoading(false);
  }
  async function doRoadmap(opp){
    setAiLoading(true);setResTab("roadmap");
    try{const d=await api.opportunities.roadmap(opp.id);setRoadmap(d.roadmap);}catch(e){toast("Roadmap failed",e.message,"error");}
    setAiLoading(false);
  }
  async function sendChat(text){
    const msg=text||chatInput.trim();if(!msg)return;
    setChatInput("");setChatMsgs(p=>[...p,{role:"user",content:msg}]);setChatLoading(true);
    let reply="";setChatMsgs(p=>[...p,{role:"assistant",content:"",streaming:true}]);
    try{
      await api.streamAssistant(sel.id,[...chatMsgs,{role:"user",content:msg}],
        chunk=>{reply+=chunk;setChatMsgs(p=>{const l=[...p];l[l.length-1]={...l[l.length-1],content:reply};return l;});},
        ()=>{setChatMsgs(p=>{const l=[...p];l[l.length-1]={...l[l.length-1],streaming:false};return l;});}
      );
    }catch{setChatMsgs(p=>{const l=[...p];l[l.length-1]={role:"assistant",content:"Network error."};return l;});}
    setChatLoading(false);
  }

  if(view==="add") return<Shell title="Add opportunity" right={<Btn sm v="ghost" onClick={()=>setView("list")}>← Back</Btn>}>
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <div style={css.card}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          {Object.entries(OPP_TYPES).map(([k,v])=>(
            <div key={k} onClick={()=>setForm(p=>({...p,type:k}))} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${form.type===k?OPP_COLORS[k]:B.border}`,background:form.type===k?`${OPP_COLORS[k]}18`:B.bg3,color:form.type===k?OPP_COLORS[k]:B.textMid,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>{v}</div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/-1"}}><label style={css.label}>Title / role / programme</label><input style={css.input} placeholder="e.g. Frontend Engineer" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/></div>
            <div><label style={css.label}>Organisation</label><input style={css.input} placeholder="e.g. Paystack" value={form.org} onChange={e=>setForm(p=>({...p,org:e.target.value}))}/></div>
            <div><label style={css.label}>Location</label><input style={css.input} placeholder="Remote / Accra" value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))}/></div>
            <div style={{gridColumn:"1/-1"}}><label style={css.label}>Deadline</label><input style={css.input} type="date" value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))}/></div>
            <div style={{gridColumn:"1/-1"}}><label style={css.label}>Notes (optional)</label><textarea style={{...css.input,minHeight:60,resize:"vertical"}} placeholder="How you found it, why you're interested…" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></div>
          </div>
          <Btn full onClick={addOpp} disabled={!form.title||!form.org}>Add &amp; start research →</Btn>
        </div>
      </div>
    </div>
  </Shell>;

  if(view==="detail"&&sel) return<Shell title={sel.title} sub={`${sel.org} · ${OPP_TYPES[sel.type]}`} right={<div style={{display:"flex",gap:8}}><Btn sm v="blue" onClick={()=>{setView("assistant");if(!chatMsgs.length)setChatMsgs([{role:"assistant",content:`Hi! I'm your assistant for the **${sel.title}** at **${sel.org}**. I can draft emails, write cover letters, build checklists, and coach you for interviews. What would you like to work on?`}]);}}>Personal assistant →</Btn><Btn sm v="ghost" onClick={()=>setView("list")}>← Back</Btn></div>}>
    <div style={{display:"flex",gap:6,marginBottom:20,borderBottom:`1px solid ${B.border}`,paddingBottom:0}}>
      {[["overview","Overview"],["culture","Culture"],["process","Process"],["cheatsheet","Cheatsheet"],["roadmap","Roadmap"]].map(([id,label])=>(
        <button key={id} onClick={()=>{setResTab(id);if(id==="roadmap"&&!roadmap&&!aiLoading)doRoadmap(sel);}} style={{background:"none",border:"none",borderBottom:`2px solid ${resTab===id?B.gold:"transparent"}`,color:resTab===id?B.gold:B.textMid,fontWeight:resTab===id?700:400,fontSize:13,padding:"8px 14px",cursor:"pointer",transition:"all .15s",marginBottom:-1}}>{label}</button>
      ))}
    </div>
    {aiLoading&&!research&&!roadmap&&<div style={{display:"flex",flexDirection:"column",gap:10}}>{[...Array(3)].map((_,i)=><div key={i} style={{height:100,borderRadius:10,background:B.bg3,opacity:.4}}/>)}<div style={{textAlign:"center",fontSize:13,color:B.textMid}}>Claude is researching {sel.org}…</div></div>}
    {research&&resTab!=="roadmap"&&(
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {resTab==="overview"&&<><div style={{gridColumn:"1/-1",...css.card,background:B.blueFaint,borderColor:B.blueBorder}}><div style={{fontSize:11,fontWeight:700,color:B.blue,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Overview</div><p style={{fontSize:14,color:B.text,lineHeight:1.8}}>{research.overview}</p></div><InfoBox title="Salary / value" content={research.salary_or_value} c={B.gold}/><InfoBox title="Competitiveness" content={research.success_rate} c={B.coral}/><InfoBox title="What they want" list={research.what_they_want} c={B.green}/><InfoBox title="Ghana notes" content={research.ghana_notes} c={B.teal}/></>}
        {resTab==="culture"&&<><div style={{gridColumn:"1/-1"}}><InfoBox title="Organisation culture" content={research.org_culture} c={B.purple}/></div><InfoBox title="Insider tips" list={research.insider_tips} c={B.gold}/><InfoBox title="Red flags" list={research.red_flags} c={B.coral}/></>}
        {resTab==="process"&&<div style={{gridColumn:"1/-1"}}><InfoBox title="Full selection process" content={research.hiring_process} c={B.blue}/></div>}
        {resTab==="cheatsheet"&&<div style={{gridColumn:"1/-1",...css.card,background:B.goldFaint,borderColor:B.goldBorder}}>
          <div style={{fontSize:11,fontWeight:700,color:B.gold,textTransform:"uppercase",letterSpacing:".5px",marginBottom:14}}>Interview cheatsheet</div>
          {research.interview_cheatsheet?.map((tip,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<research.interview_cheatsheet.length-1?`1px solid ${B.border}`:"none"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:B.goldFaint,border:`1px solid ${B.goldBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:B.gold,flexShrink:0}}>{i+1}</div>
              <span style={{fontSize:13,color:B.textMid,lineHeight:1.6}}>{tip}</span>
            </div>
          ))}
        </div>}
      </div>
    )}
    {resTab==="roadmap"&&(
      <div>
        {aiLoading&&!roadmap&&<div style={{textAlign:"center",padding:40,fontSize:13,color:B.textMid}}>Building your roadmap…</div>}
        {roadmap&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{...css.card,background:B.goldFaint,borderColor:B.goldBorder,marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:14,fontWeight:700,color:B.gold}}>{roadmap.total_weeks}-week application roadmap</div>
              <div style={{display:"flex",gap:12}}>{roadmap.key_dates?.map((d,i)=><span key={i} style={{fontSize:12,color:B.textMid}}><span style={{color:B.gold,fontWeight:600}}>{d.label}:</span> {d.date}</span>)}</div>
            </div>
          </div>
          {roadmap.phases?.map((ph,i)=>(
            <div key={i} style={{...css.card,borderLeft:`3px solid ${ph.status==="current"?B.gold:B.borderHi}`,background:ph.status==="current"?B.goldFaint:B.bg2}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div><div style={{fontSize:14,fontWeight:700,color:ph.status==="current"?B.gold:B.text}}>{ph.phase}</div><div style={{fontSize:11,color:B.textLow}}>{ph.duration}</div></div>
                {ph.status==="current"&&<Pill c="gold" sm>current</Pill>}
              </div>
              {ph.tasks?.map((t,j)=><div key={j} style={{display:"flex",gap:8,marginBottom:5}}><div style={{width:13,height:13,borderRadius:3,border:`1.5px solid ${B.borderHi}`,marginTop:2,flexShrink:0}}/><span style={{fontSize:12,color:B.textMid}}>{t}</span></div>)}
              <div style={{fontSize:12,color:B.blue,paddingTop:8,borderTop:`1px solid ${B.border}`,marginTop:4}}>↳ {ph.deliverable}</div>
            </div>
          ))}
        </div>}
      </div>
    )}
  </Shell>;

  if(view==="assistant"&&sel) return<Shell title="Personal Assistant" sub={`${sel.title} · ${sel.org}`} right={<Btn sm v="ghost" onClick={()=>setView("detail")}>← Back</Btn>} noPad>
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{flex:1,overflowY:"auto",padding:"20px 26px",display:"flex",flexDirection:"column",gap:12}}>
        {chatMsgs.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:10,flexDirection:m.role==="user"?"row-reverse":"row"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:m.role==="user"?B.goldFaint:B.blueFaint,border:`1px solid ${m.role==="user"?B.goldBorder:B.blueBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:m.role==="user"?B.gold:B.blue,flexShrink:0}}>{m.role==="user"?"ME":"AI"}</div>
            <div style={{maxWidth:"78%",background:m.role==="user"?B.goldFaint:B.bg3,border:`1px solid ${m.role==="user"?B.goldBorder:B.border}`,borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"10px 14px",fontSize:13,color:B.textMid,lineHeight:1.7,whiteSpace:"pre-wrap"}}>
              {m.content}{m.streaming&&<span style={{opacity:.5}}>▋</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"14px 26px",borderTop:`1px solid ${B.border}`,background:B.bg1}}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
          {[`Draft intro email to ${sel.org}`,"Write my cover letter","5 likely interview questions","Build my prep checklist"].map((s,i)=>(
            <button key={i} onClick={()=>sendChat(s)} style={{background:B.bg3,border:`1px solid ${B.border}`,borderRadius:20,padding:"5px 11px",fontSize:11,color:B.textMid,cursor:"pointer"}}>{s}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()} placeholder="Ask me to draft an email, cover letter, checklist, interview prep…" style={{...css.input,flex:1}}/>
          <Btn v="blue" onClick={()=>sendChat()} disabled={chatLoading||!chatInput.trim()}>Send</Btn>
        </div>
      </div>
    </div>
  </Shell>;

  // List view
  return<Shell title="Opportunity Engine" sub="Jobs · Schools · Scholarships · Fellowships" badge="AI-powered" right={<Btn sm onClick={()=>setView("add")}>+ Add opportunity</Btn>}>
    <div style={{...css.card,background:B.bg3,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px"}}>
      <div><div style={{fontSize:15,fontWeight:800,color:B.text,marginBottom:4}}>We do the hard work. You focus on showing up.</div><div style={{fontSize:13,color:B.textMid,maxWidth:460}}>Add any opportunity — Claude researches it, builds your roadmap, and acts as your personal assistant throughout the process.</div></div>
      <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0,marginLeft:20}}>
        {[["◈","Deep research",B.blue],["◉","Roadmap builder",B.gold],["◎","Personal assistant",B.green]].map(([icon,label,c])=>(
          <div key={label} style={{display:"flex",gap:8,alignItems:"center",fontSize:12}}><span style={{color:c,fontSize:14}}>{icon}</span><span style={{color:B.textMid}}>{label}</span></div>
        ))}
      </div>
    </div>
    {loading&&<div style={{textAlign:"center",padding:40,color:B.textMid}}>Loading…</div>}
    {!loading&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {opps.map(o=>(
        <div key={o.id} style={{...css.card,borderLeft:`3px solid ${OPP_COLORS[o.type]||B.blue}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div><div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{o.title}</div><div style={{fontSize:12,color:B.textMid}}>{o.org} · {o.location}</div></div>
            <Pill c={o.type==="scholarship"?"gold":o.type==="fellowship"?"teal":o.type==="school"?"purple":"blue"} sm>{OPP_TYPES[o.type]}</Pill>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><Bar v={o.progress||0} h={3} color={OPP_COLORS[o.type]||B.blue}/><span style={{fontSize:11,color:B.textLow,flexShrink:0}}>{o.progress||0}%</span></div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{fontSize:11,color:B.textLow}}>Deadline: {o.deadline||"Not set"}</div><Pill c="gray" sm>{o.stage}</Pill></div>
          <div style={{display:"flex",gap:8}}><Btn sm v="blue" onClick={()=>doResearch(o)}>Research →</Btn><Btn sm v="ghost" onClick={()=>{setSel(o);doRoadmap(o);setView("detail");}}>Roadmap</Btn></div>
        </div>
      ))}
      <div onClick={()=>setView("add")} style={{border:`2px dashed ${B.borderMid}`,borderRadius:12,padding:24,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,color:B.textLow,minHeight:160}}>
        <span style={{fontSize:28}}>+</span><span style={{fontSize:13,fontWeight:600}}>Track new opportunity</span>
      </div>
    </div>}
  </Shell>;
}

function InfoBox({title,content,list,c,full}){
  return<div style={{...css.card,gridColumn:full?"1/-1":undefined}}>
    <div style={{fontSize:11,fontWeight:700,color:c,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>{title}</div>
    {content&&<p style={{fontSize:13,color:B.textMid,lineHeight:1.7,margin:0}}>{content}</p>}
    {list?.map((item,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:5}}><span style={{color:c,flexShrink:0}}>→</span><span style={{fontSize:13,color:B.textMid,lineHeight:1.5}}>{item}</span></div>)}
  </div>;
}

// ─── ADMIN PANEL ─────────────────────────────────────────────
function AdminPanel({toast,profile}){
  const[stats,setStats]=useState(null);const[users,setUsers]=useState([]);const[tab,setTab]=useState("stats");
  const[search,setSearch]=useState("");const[roleFilter,setRoleFilter]=useState("");
  useEffect(()=>{
    api.admin.stats().then(d=>setStats(d)).catch(()=>{});
    api.admin.users().then(d=>setUsers(d.users||[])).catch(()=>{});
  },[]);
  const filtered=users.filter(u=>{
    if(search&&!u.full_name.toLowerCase().includes(search.toLowerCase())&&!u.email.toLowerCase().includes(search.toLowerCase()))return false;
    if(roleFilter&&u.role!==roleFilter)return false;
    return true;
  });
  return<Shell title="Admin Panel" sub="Platform management" badge={profile?.role==="super_admin"?"Super Admin":"Platform Admin"}>
    <div style={{display:"flex",gap:6,marginBottom:20,borderBottom:`1px solid ${B.border}`,paddingBottom:0}}>
      {[["stats","Stats"],["users","Users"],["cohorts","Cohorts"],["audit","Audit Logs"]].map(([id,label])=>(
        <button key={id} onClick={()=>setTab(id)} style={{background:"none",border:"none",borderBottom:`2px solid ${tab===id?B.gold:"transparent"}`,color:tab===id?B.gold:B.textMid,fontWeight:tab===id?700:400,fontSize:13,padding:"8px 14px",cursor:"pointer",marginBottom:-1}}>{label}</button>
      ))}
    </div>
    {tab==="stats"&&stats&&(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          <Stat label="Total mentees" value={stats.mentees||0} delta="registered" c={B.blue}/>
          <Stat label="Total mentors" value={stats.mentors||0} delta="registered" c={B.green}/>
          <Stat label="Active cohorts" value={stats.active_cohorts||0} delta="running" c={B.purple}/>
          <Stat label="Platform revenue" value={`GHS ${stats.platform_revenue||0}`} delta="15% of GMV" accent/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={css.card}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Platform GMV</div>
            <div style={{fontSize:28,fontWeight:800,color:B.gold,marginBottom:4}}>GHS {stats.total_gmv||"0.00"}</div>
            <div style={{fontSize:13,color:B.textMid}}>Total marketplace transaction volume</div>
          </div>
          <div style={css.card}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Approved projects</div>
            <div style={{fontSize:28,fontWeight:800,color:B.green,marginBottom:4}}>{stats.approved_projects||0}</div>
            <div style={{fontSize:13,color:B.textMid}}>Projects reviewed and approved</div>
          </div>
        </div>
      </div>
    )}
    {tab==="users"&&(
      <div>
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <input style={{...css.input,maxWidth:260}} placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <select style={{...css.input,width:"auto"}} value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {["mentee","mentor","cohort_admin","platform_admin","super_admin"].map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={css.card}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr",gap:0,fontSize:10,fontWeight:700,color:B.textLow,textTransform:"uppercase",letterSpacing:".5px",padding:"0 0 10px",borderBottom:`1px solid ${B.border}`,marginBottom:2}}>
            {["Name","Email","Role","Region","Status"].map(h=><span key={h}>{h}</span>)}
          </div>
          {filtered.slice(0,50).map((u,i)=>(
            <div key={u.id} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr",gap:0,padding:"10px 0",borderBottom:`1px solid ${B.border}`,alignItems:"center",fontSize:13}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}><Av i={u.full_name?.slice(0,2).toUpperCase()} s={24}/>{u.full_name}</div>
              <span style={{color:B.textMid,fontSize:12}}>{u.email}</span>
              <Pill c={u.role==="super_admin"?"coral":u.role==="platform_admin"?"gold":u.role==="mentor"?"blue":"gray"} sm>{u.role}</Pill>
              <span style={{color:B.textMid,fontSize:12}}>{u.region||"—"}</span>
              <Pill c={u.is_active?"green":"coral"} sm>{u.is_active?"active":"inactive"}</Pill>
            </div>
          ))}
          {filtered.length===0&&<div style={{textAlign:"center",padding:24,color:B.textLow}}>No users found.</div>}
        </div>
      </div>
    )}
    {tab==="cohorts"&&<div style={{textAlign:"center",padding:40,color:B.textMid}}>Cohort management — connect to live backend data.</div>}
    {tab==="audit"&&<div style={{textAlign:"center",padding:40,color:B.textMid}}>Audit logs — available for super_admin only. Connect to live backend.</div>}
  </Shell>;
}

// ─── MARKETPLACE ─────────────────────────────────────────────
function Marketplace({toast}){
  const[booking,setBooking]=useState(null);const[booked,setBooked]=useState(false);const[pm,setPm]=useState("mtn_momo");
  const MENTORS=[
    {id:1,i:"KA",n:"Dr. Kwame Asante",spec:"Full-stack Dev",rate:80,rating:4.9,sessions:42,avail:true,bio:"Senior engineer at Vodafone Ghana. React, Node.js, mobile-first for African markets."},
    {id:2,i:"AO",n:"Abena Osei-Bonsu",spec:"Data Science",rate:65,rating:4.8,sessions:31,avail:true,bio:"Data analyst at GCB Bank. Python, SQL, Power BI. Fintech data in West Africa."},
    {id:3,i:"CT",n:"Charles Tabi",spec:"Backend Engineering",rate:90,rating:5.0,sessions:55,avail:true,bio:"CTO at a fintech startup. Django, PostgreSQL, AWS. 4 SydCrest cohorts mentored."},
    {id:4,i:"EF",n:"Esi Fordjour",spec:"Mobile Dev",rate:70,rating:4.6,sessions:24,avail:false,bio:"Android developer at mPharma. Flutter, Kotlin. Low-spec device optimisation."},
  ];
  if(booking) return<Shell title="Book a session" right={<Btn sm v="ghost" onClick={()=>{setBooking(null);setBooked(false);}}>← Back</Btn>}>
    <div style={{maxWidth:480,margin:"0 auto"}}>
      {!booked?<div style={css.card}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,paddingBottom:16,borderBottom:`1px solid ${B.border}`}}>
          <Av i={booking.i} s={44}/><div><div style={{fontSize:15,fontWeight:700}}>{booking.n}</div><div style={{fontSize:12,color:B.textMid}}>{booking.spec} · GHS {booking.rate}/hr</div></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
          <div><label style={css.label}>Session focus</label><textarea style={{...css.input,minHeight:70}} placeholder="What do you want to cover?"/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={css.label}>Date</label><input style={css.input} type="date"/></div>
            <div><label style={css.label}>Duration</label><select style={css.input}><option>1hr — GHS {booking.rate}</option><option>1.5hr — GHS {Math.round(booking.rate*1.5)}</option></select></div>
          </div>
        </div>
        <div style={{background:B.bg3,borderRadius:9,padding:14,marginBottom:14,border:`1px solid ${B.border}`}}>
          <div style={{fontSize:10,fontWeight:700,color:B.textLow,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>Pay with Mobile Money</div>
          {[["mtn_momo","MTN MoMo"],["vodafone_cash","Vodafone Cash"],["airteltigo_money","AirtelTigo Money"]].map(([k,label],i)=>(
            <div key={k} onClick={()=>setPm(k)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<2?`1px solid ${B.border}`:"none",cursor:"pointer"}}>
              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${pm===k?B.gold:B.borderHi}`,background:pm===k?B.gold:"transparent",flexShrink:0,transition:"all .15s"}}/>
              <span style={{fontSize:13,color:pm===k?B.text:B.textMid}}>{label}</span>
              {pm===k&&<Pill c="gold" sm>selected</Pill>}
            </div>
          ))}
          <div style={{fontSize:11,color:B.textLow,marginTop:10}}>Payment held in escrow until session confirmed complete by both parties.</div>
        </div>
        <Btn full onClick={()=>{setBooked(true);toast("Session booked!",`GHS ${booking.rate} held in escrow. WhatsApp confirmation sent.`,"success");}}>Confirm &amp; pay GHS {booking.rate} →</Btn>
      </div>:<div style={{...css.card,textAlign:"center",padding:48}}>
        <div style={{fontSize:40,color:B.green,marginBottom:12}}>✓</div>
        <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>Session booked!</div>
        <div style={{fontSize:13,color:B.textMid,lineHeight:1.7,marginBottom:20}}>GHS {booking.rate} held in escrow.<br/>WhatsApp confirmation sent to your number.</div>
        <Btn onClick={()=>{setBooking(null);setBooked(false);}}>Back to marketplace</Btn>
      </div>}
    </div>
  </Shell>;
  return<Shell title="Mentor Marketplace" sub="Book verified tech mentors by the hour" badge="MoMo enabled">
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {MENTORS.map(m=>(
        <div key={m.id} style={css.card}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
            <Av i={m.i} s={44}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div><div style={{fontSize:14,fontWeight:700}}>{m.n}</div><div style={{fontSize:12,color:B.textMid}}>{m.spec}</div></div>
                <Pill c={m.avail?"green":"gray"} sm>{m.avail?"Available":"Busy"}</Pill>
              </div>
            </div>
          </div>
          <p style={{fontSize:12,color:B.textMid,lineHeight:1.6,marginBottom:12}}>{m.bio}</p>
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:`1px solid ${B.border}`,borderBottom:`1px solid ${B.border}`,marginBottom:12,alignItems:"center"}}>
            <span><span style={{fontSize:18,fontWeight:800,color:B.gold}}>GHS {m.rate}</span><span style={{fontSize:12,color:B.textLow}}>/hr</span></span>
            <span style={{fontSize:12,color:B.textMid}}>★ {m.rating} · {m.sessions} sessions</span>
          </div>
          {m.avail?<Btn sm full onClick={()=>setBooking(m)}>Book session →</Btn>:<Btn sm full v="ghost" disabled>Not available</Btn>}
        </div>
      ))}
    </div>
  </Shell>;
}

// ─── SIMPLE STUBS for remaining pages ────────────────────────
function Community(){return<Shell title="Community" sub="Delta Cohort · 24 members"><div style={{...css.card,textAlign:"center",padding:56}}><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Community feed</div><div style={{fontSize:13,color:B.textMid}}>Connect to the backend API to load live posts, leaderboard, and events.</div></div></Shell>;}
function Projects(){return<Shell title="Projects &amp; Assessment" sub="Week 5 · active submissions"><div style={{...css.card,textAlign:"center",padding:56}}><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Project portal</div><div style={{fontSize:13,color:B.textMid}}>Submit projects and run AI assessments via the backend API.</div></div></Shell>;}
function Events(){return<Shell title="Events &amp; Shows" sub="Public calendar"><div style={{...css.card,textAlign:"center",padding:56}}><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Events calendar</div><div style={{fontSize:13,color:B.textMid}}>Connect to /api/community/events to load the live schedule.</div></div></Shell>;}
function MentorDashboard(){return<Shell title="Mentor Dashboard" sub="Dr. Kwame Asante · Web Development cohort"><div style={{...css.card,textAlign:"center",padding:56}}><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Mentor view</div><div style={{fontSize:13,color:B.textMid}}>Cohort heatmap, session management, and project reviews connect to the backend API.</div></div></Shell>;}
function LessonPage({goBack}){return<Shell title="Week 5: Fetch API & Async JS" sub="Lesson 1 of 5" right={<Btn sm v="ghost" onClick={goBack}>← Back</Btn>}><div style={{...css.card,textAlign:"center",padding:56}}><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Lesson viewer</div><div style={{fontSize:13,color:B.textMid}}>Full lesson content loads from the learning_weeks table in Supabase.</div></div></Shell>;}
function QuizPage({goBack}){return<Shell title="Week 5 Quiz" right={<Btn sm v="ghost" onClick={goBack}>← Back</Btn>}><div style={{...css.card,textAlign:"center",padding:56}}><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Quiz engine</div><div style={{fontSize:13,color:B.textMid}}>Adaptive quizzes generated by Claude via /api/learning/quiz/generate.</div></div></Shell>;}

// ─── NAVIGATION ───────────────────────────────────────────────
const NAV = [
  {id:"dashboard",label:"Overview",g:"platform"},
  {id:"mentor",label:"Mentor view",g:"dashboards"},
  {id:"opportunities",label:"Opportunity Engine",g:"career",hot:true},
  {id:"learning",label:"AI learning paths",g:"learn"},
  {id:"chat",label:"Study buddy",g:"learn"},
  {id:"lesson",label:"Lesson viewer",g:"learn"},
  {id:"quiz",label:"Weekly quiz",g:"learn"},
  {id:"projects",label:"Projects",g:"learn"},
  {id:"community",label:"Community",g:"engage"},
  {id:"events",label:"Events",g:"engage"},
  {id:"marketplace",label:"Marketplace",g:"engage"},
  {id:"admin",label:"Admin Panel",g:"admin",adminOnly:true},
];
const GROUPS={platform:"Platform",dashboards:"Dashboards",career:"Career",learn:"Learning",engage:"Engage",admin:"Admin"};

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App(){
  const{profile,loading,login,logout}=useAuth();
  const[page,setPage]=useState("dashboard");
  const[authScreen,setAuthScreen]=useState("login");
  const{toasts,add:toast,remove}=useToast();
  const[showNotifs,setShowNotifs]=useState(false);
  const[notifs,setNotifs]=useState([
    {id:1,title:"Project reviewed",body:"Portfolio Site scored 88/100",is_read:false,created_at:"2h ago"},
    {id:2,title:"Session in 1 hour",body:"Dr. Kwame Asante at 6:00 PM",is_read:false,created_at:"3h ago"},
    {id:3,title:"New opportunity match",body:"3 scholarships match your profile",is_read:false,created_at:"5h ago"},
  ]);
  const unread=notifs.filter(n=>!n.is_read).length;

  if(loading) return<div style={{minHeight:"100vh",background:"#07090E",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"#2479C8",fontSize:24,fontWeight:800}}>SydCrest</div></div>;

  if(!profile){
    if(authScreen==="register") return<><RegisterPage onLogin={p=>{setPage("dashboard");}} onGoLogin={()=>setAuthScreen("login")} toast={toast}/><Toast toasts={toasts} remove={remove}/></>;
    return<><LoginPage onLogin={async(e,p)=>{await login(e,p);setPage("dashboard");}} onGoRegister={()=>setAuthScreen("register")} toast={toast}/><Toast toasts={toasts} remove={remove}/></>;
  }

  const isAdmin=['platform_admin','super_admin'].includes(profile?.role);
  const grouped=NAV.filter(t=>!t.adminOnly||isAdmin).reduce((acc,t)=>{(acc[t.g]=acc[t.g]||[]).push(t);return acc;},{});

  const views={
    dashboard:<Dashboard setPage={setPage} profile={profile}/>,
    mentor:<MentorDashboard/>,
    opportunities:<Opportunities toast={toast}/>,
    learning:<AILearning toast={toast}/>,
    chat:<StudyBuddy toast={toast}/>,
    lesson:<LessonPage goBack={()=>setPage("dashboard")}/>,
    quiz:<QuizPage goBack={()=>setPage("dashboard")}/>,
    projects:<Projects/>,
    community:<Community/>,
    events:<Events/>,
    marketplace:<Marketplace toast={toast}/>,
    admin:<AdminPanel toast={toast} profile={profile}/>,
  };

  return<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400&display=swap');
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:${B.bg0};color:${B.text};font-family:'Inter',sans-serif;font-size:14px}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:${B.bg0}}
      ::-webkit-scrollbar-thumb{background:${B.bg4};border-radius:2px}
      select option{background:${B.bg1};color:${B.text}}
      textarea,input,select{color-scheme:dark}
      @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      @keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
      @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
      input:focus,textarea:focus,select:focus{border-color:${B.blueBorder}!important}
    `}</style>
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:B.bg0}}>
      {/* Sidebar */}
      <aside style={{width:208,background:B.bg1,borderRight:`1px solid ${B.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 15px 13px",borderBottom:`1px solid ${B.border}`,display:"flex",gap:10,alignItems:"center"}}>
          <LogoMark size={32}/>
          <div><div style={{fontSize:15,fontWeight:800,color:B.text,letterSpacing:"-0.3px"}}>SydCrest</div><div style={{fontSize:9,color:B.textLow,fontWeight:600,letterSpacing:".8px",textTransform:"uppercase"}}>Launchpad</div></div>
        </div>
        <nav style={{padding:"12px 9px",flex:1,overflowY:"auto"}}>
          {Object.entries(GROUPS).map(([gid,gl])=>{
            const items=grouped[gid];
            if(!items?.length)return null;
            return<div key={gid} style={{marginBottom:14}}>
              <div style={{fontSize:9,fontWeight:700,color:B.textFaint,textTransform:"uppercase",letterSpacing:".7px",padding:"0 9px",marginBottom:4}}>{gl}</div>
              {items.map(t=>(
                <div key={t.id} onClick={()=>setPage(t.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,cursor:"pointer",color:page===t.id?B.gold:B.textLow,background:page===t.id?B.goldFaint:"transparent",fontWeight:page===t.id?700:400,marginBottom:1,fontSize:12.5,transition:"all .1s",justifyContent:"space-between"}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{width:5,height:5,borderRadius:"50%",background:"currentColor",opacity:page===t.id?1:.4,flexShrink:0}}/>{t.label}</div>
                  {t.hot&&<span style={{fontSize:9,fontWeight:700,background:`linear-gradient(135deg,${B.gold},${B.goldBright})`,color:"#07090E",padding:"1px 5px",borderRadius:6}}>NEW</span>}
                </div>
              ))}
            </div>;
          })}
        </nav>
        {/* API status */}
        <div style={{padding:"10px 14px",borderTop:`1px solid ${B.border}`}}>
          <div style={{fontSize:9,fontWeight:700,color:B.textFaint,textTransform:"uppercase",letterSpacing:".6px",marginBottom:7}}>Services</div>
          {[["Claude API",B.blue],["Supabase",B.green],["MoMo",B.gold]].map(([l,c])=>(
            <div key={l} style={{display:"flex",gap:7,alignItems:"center",marginBottom:5}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:c}}/>
              <span style={{fontSize:11,color:B.textLow}}>{l}</span>
              <span style={{fontSize:10,color:c,marginLeft:"auto"}}>live</span>
            </div>
          ))}
          <button onClick={logout} style={{marginTop:10,background:"none",border:"none",cursor:"pointer",color:B.coral,fontSize:11,padding:"4px 0",display:"block"}}>Sign out</button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {/* Topbar */}
        <div style={{height:50,background:B.bg1,borderBottom:`1px solid ${B.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",flexShrink:0,position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Av i={(profile?.full_name||"U").slice(0,2).toUpperCase()} s={28}/>
            <div><div style={{fontSize:12,fontWeight:700}}>{profile?.full_name}</div><div style={{fontSize:10,color:B.textLow}}>{profile?.role} · {profile?.region||"Ghana"}</div></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <div style={{background:B.greenFaint,border:`1px solid ${B.greenBorder}`,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:600,color:B.green,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:B.green}}/>Live
            </div>
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowNotifs(v=>!v)} style={{background:unread>0?B.goldFaint:"transparent",border:`1px solid ${unread>0?B.goldBorder:B.border}`,borderRadius:8,padding:"5px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:7,color:unread>0?B.gold:B.textMid,fontSize:12,fontWeight:600}}>
                ◉ <span>Alerts</span>
                {unread>0&&<span style={{background:B.coral,color:"#fff",borderRadius:"50%",width:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{unread}</span>}
              </button>
              {showNotifs&&<NotifPanel notifs={notifs} markAll={()=>setNotifs(n=>n.map(x=>({...x,is_read:true})))} close={()=>setShowNotifs(false)}/>}
            </div>
          </div>
        </div>
        <div style={{flex:1,overflow:"hidden",animation:"fadeIn .2s ease"}}>{views[page]||views.dashboard}</div>
      </div>
    </div>
    <Toast toasts={toasts} remove={remove}/>
  </>;
}
