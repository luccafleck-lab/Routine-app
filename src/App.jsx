import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

const T = {
  bg:"#F7F7F5",surface:"#FFFFFF",border:"#E4E4E0",border2:"#EFEFEC",
  text:"#0F0F0F",text2:"#6B6B6B",text3:"#ABABAB",
  accent:"#2563EB",accentL:"#EEF3FF",accentM:"#BFCFFD",
  red:"#DC2626",redL:"#FEF2F2",orange:"#EA580C",orangeL:"#FFF7ED",
  amber:"#D97706",amberL:"#FFFBEB",green:"#16A34A",greenL:"#F0FDF4",
  purple:"#7C3AED",purpleL:"#F5F3FF",teal:"#0D9488",tealL:"#F0FDFA",
};

const COMPANIES = [
  {id:"el-distrito",name:"El Distrito",icon:"🏕️"},
  {id:"distrito-facas",name:"Distrito Facas",icon:"🔪"},
  {id:"pablo-severo",name:"Pablo Severo",icon:"🚗"},
  {id:"pessoal",name:"Pessoal",icon:"👤"},
  {id:"outros",name:"Outros",icon:"📁"},
];

const URGENCY = [
  {id:"critico",label:"Crítico",sub:"Hoje",color:T.red,bg:T.redL,rank:0},
  {id:"urgente",label:"Urgente",sub:"2–3 dias",color:T.orange,bg:T.orangeL,rank:1},
  {id:"importante",label:"Importante",sub:"Esta semana",color:T.amber,bg:T.amberL,rank:2},
  {id:"normal",label:"Normal",sub:"Sem prazo",color:T.green,bg:T.greenL,rank:3},
  {id:"paralelo",label:"Paralelo",sub:"Quando sobrar",color:T.accent,bg:T.accentL,rank:4},
];

const ENTRY_TYPES = [
  {id:"tarefa",label:"Tarefa",icon:"▫",color:T.text2},
  {id:"habito",label:"Hábito",icon:"◎",color:T.green},
  {id:"pessoal",label:"Pessoal",icon:"◇",color:T.purple},
];

const EVENT_CATS = [
  {id:"reuniao",label:"Reunião",icon:"⊙",color:T.accent},
  {id:"mentoria",label:"Mentoria",icon:"◉",color:T.purple},
  {id:"medico",label:"Médico",icon:"♦",color:T.red},
  {id:"pessoal",label:"Pessoal",icon:"◇",color:T.teal},
  {id:"outro",label:"Outro",icon:"○",color:T.text2},
];

const DAYS_FULL=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const DAYS_SHORT=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const pad=n=>String(n).padStart(2,"0");
const todayStr=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const toDate=s=>{if(!s)return new Date();const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);};
const addDays=(s,n)=>{const d=toDate(s);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const diffDays=(a,b)=>Math.round((toDate(b)-toDate(a))/(1000*60*60*24));
const fmtDate=s=>{if(!s)return"";const d=toDate(s);return `${DAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;};
const fmtShort=s=>{if(!s)return"";const d=toDate(s);return `${d.getDate()}/${pad(d.getMonth()+1)}`;};
const weekOf=s=>{const d=toDate(s);const day=d.getDay();const mon=new Date(d);mon.setDate(d.getDate()-day);return Array.from({length:7},(_,i)=>{const dd=new Date(mon);dd.setDate(mon.getDate()+i);return `${dd.getFullYear()}-${pad(dd.getMonth()+1)}-${pad(dd.getDate())}`;});};
const monthDays=(y,m)=>{const first=new Date(y,m,1);const last=new Date(y,m+1,0);const days=[];for(let i=0;i<first.getDay();i++)days.push(null);for(let d=1;d<=last.getDate();d++)days.push(`${y}-${pad(m+1)}-${pad(d)}`);return days;};
const ugInfo=id=>URGENCY.find(u=>u.id===id)??URGENCY[3];
const coInfo=id=>COMPANIES.find(c=>c.id===id)??COMPANIES[0];
const evCat=id=>EVENT_CATS.find(c=>c.id===id)??EVENT_CATS[4];
const nowH=()=>new Date().getHours();
async function loadTasks(){
  const{data,error}=await supabase.from("tasks").select("*").eq("user_id","lucca").order("created_at",{ascending:true});
  if(error){console.error(error);return[];}
  return data;
}
async function saveTask(task){
  const{data,error}=await supabase.from("tasks").upsert({...task,user_id:"lucca"}).select();
  if(error)console.error(error);
  return data;
}
async function deleteTaskDB(id){
  await supabase.from("tasks").delete().eq("id",id);
}
async function loadEvents(){
  const{data,error}=await supabase.from("events").select("*").eq("user_id","lucca").order("date",{ascending:true});
  if(error){console.error(error);return[];}
  return data;
}
async function saveEvent(event){
  const{data,error}=await supabase.from("events").upsert({...event,user_id:"lucca"}).select();
  if(error)console.error(error);
  return data;
}
async function deleteEventDB(id){
  await supabase.from("events").delete().eq("id",id);
}

function Badge({color,bg,children,small}){
  return(<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:small?"1px 7px":"2px 9px",borderRadius:20,fontSize:small?10:11,fontWeight:600,color,background:bg}}>{children}</span>);
}

function TaskRow({task,onToggle,onDelete,expanded,onExpand}){
  const u=ugInfo(task.urgency),c=coInfo(task.company);
  const ty=ENTRY_TYPES.find(t=>t.id===task.type)??ENTRY_TYPES[0];
  return(
    <div style={{background:T.surface,border:`1px solid ${expanded?T.accentM:T.border}`,borderRadius:12,marginBottom:6,overflow:"hidden",opacity:task.done?.4:1,transition:"all .18s"}}>
      <div style={{display:"flex",alignItems:"flex-start",padding:"10px 12px",gap:10,cursor:"pointer"}} onClick={()=>onExpand(task.id)}>
        <div onClick={e=>{e.stopPropagation();onToggle(task.id);}} style={{marginTop:2,width:18,height:18,borderRadius:5,flexShrink:0,border:`2px solid ${task.done?T.border:u.color}`,background:task.done?T.border2:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          {task.done&&<span style={{fontSize:10,color:T.text3}}>✓</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:task.done?T.text3:T.text,textDecoration:task.done?"line-through":"none",marginBottom:4}}>{ty.icon} {task.title}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <span style={{fontSize:10,fontWeight:700,color:u.color,background:u.bg,padding:"1px 7px",borderRadius:12}}>{u.label}</span>
            <span style={{fontSize:10,color:T.text3,background:T.border2,padding:"1px 7px",borderRadius:12}}>{c.icon} {c.name}</span>
            {task.time&&<span style={{fontSize:10,color:T.text3,background:T.border2,padding:"1px 7px",borderRadius:12}}>⏰ {task.time}</span>}
            {task.date&&<span style={{fontSize:10,color:T.accent,background:T.accentL,padding:"1px 7px",borderRadius:12}}>📅 {fmtShort(task.date)}</span>}
          </div>
        </div>
        <span style={{fontSize:10,color:T.text3,marginTop:2}}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded&&(
        <div style={{borderTop:`1px solid ${T.border2}`,padding:"10px 12px"}}>
          {task.notes&&<p style={{fontSize:12,color:T.text2,lineHeight:1.6,marginBottom:10}}>{task.notes}</p>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onToggle(task.id)} style={{padding:"7px 13px",borderRadius:9,fontSize:12,fontWeight:600,background:T.bg,border:`1px solid ${T.border}`,cursor:"pointer",color:T.text2}}>{task.done?"↩ Reabrir":"✓ Concluir"}</button>
            <button onClick={()=>onDelete(task.id)} style={{padding:"7px 13px",borderRadius:9,fontSize:12,fontWeight:600,background:T.redL,border:`1px solid ${T.red}30`,color:T.red,cursor:"pointer"}}>Excluir</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ev,onDelete,expanded,onExpand}){
  const cat=evCat(ev.cat);
  const daysUntil=ev.date?diffDays(todayStr(),ev.date):null;
  return(
    <div style={{background:T.surface,border:`1px solid ${expanded?cat.color+"60":T.border}`,borderRadius:14,marginBottom:8,overflow:"hidden",transition:"border .2s"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer"}} onClick={()=>onExpand(ev.id)}>
        <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:cat.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{cat.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:3}}>{ev.title}</div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:cat.color,fontWeight:600}}>{cat.label}</span>
            {ev.date&&<span style={{fontSize:11,color:T.text3}}>📅 {fmtDate(ev.date)}</span>}
            {ev.time&&<span style={{fontSize:11,color:T.text3}}>⏰ {ev.time}{ev.duration?` · ${ev.duration}min`:""}</span>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {daysUntil!==null&&(
            <div style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:daysUntil===0?T.redL:daysUntil<=2?T.orangeL:T.border2,color:daysUntil===0?T.red:daysUntil<=2?T.orange:T.text3}}>
              {daysUntil===0?"Hoje":daysUntil===1?"Amanhã":`em ${daysUntil}d`}
            </div>
          )}
        </div>
      </div>
      {expanded&&(
        <div style={{borderTop:`1px solid ${T.border2}`,padding:"10px 14px"}}>
          {ev.notes&&<p style={{fontSize:12,color:T.text2,lineHeight:1.6,marginBottom:10}}>{ev.notes}</p>}
          <button onClick={()=>onDelete(ev.id)} style={{padding:"7px 14px",borderRadius:9,fontSize:12,fontWeight:600,background:T.redL,color:T.red,border:`1px solid ${T.red}30`,cursor:"pointer"}}>Excluir evento</button>
        </div>
      )}
    </div>
  );
}
Cola a terceira parte:

function PlanModal({events,tasks,onClose,onApply}){
  const[step,setStep]=useState("form");
  const[form,setForm]=useState({deadline:"",eventId:"",taskIds:[],hoursPerDay:5,startHour:7});
  const[plan,setPlan]=useState(null);
  const[error,setError]=useState("");
  const pendingTasks=tasks.filter(t=>!t.done);
  const upcomingEvs=events.filter(e=>e.date>=todayStr()).sort((a,b)=>a.date.localeCompare(b.date));

  const generate=async()=>{
    setStep("loading");setError("");
    const deadline=form.eventId?(events.find(e=>e.id===Number(form.eventId))?.date||form.deadline):form.deadline;
    if(!deadline||deadline<todayStr()){setError("Escolhe uma data válida.");setStep("form");return;}
    const selectedTasks=form.taskIds.length>0?pendingTasks.filter(t=>form.taskIds.includes(t.id)):pendingTasks.filter(t=>t.urgency==="critico"||t.urgency==="urgente");
    if(selectedTasks.length===0){setError("Nenhuma tarefa selecionada.");setStep("form");return;}
    const daysAvail=diffDays(todayStr(),deadline);
    const tasksDesc=selectedTasks.map(t=>`- "${t.title}" (${t.duration||60}min, empresa: ${coInfo(t.company).name})`).join("\n");
    const eventsDesc=upcomingEvs.map(e=>`- ${e.title} em ${fmtDate(e.date)} às ${e.time||"?"}`).join("\n");
    const prompt=`Você é um assistente de produtividade. O usuário tem ${daysAvail} dia(s) até ${fmtDate(deadline)} para concluir:\n${tasksDesc}\n\nEventos fixos:\n${eventsDesc||"Nenhum"}\n\nHoras/dia: ${form.hoursPerDay}h, início às ${form.startHour}:00h.\n\nDistribua as tarefas inteligentemente. Responda SOMENTE com JSON:\n{"summary":"frase curta","days":[{"date":"YYYY-MM-DD","label":"Segunda, 19/05","blocks":[{"time":"07:00","title":"título","duration":60,"taskId":1}]}]}`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key":import.meta.env.VITE_ANTHROPIC_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]}),
      });
      const data=await res.json();
      const raw=data.content?.find(b=>b.type==="text")?.text||"";
      const clean=raw.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setPlan({...parsed,deadline,selectedTasks});
      setStep("result");
    }catch(e){setError("Erro ao gerar o plano. Tenta novamente.");setStep("form");}
  };

  const apply=()=>{
    if(!plan)return;
    const updates={};
    plan.days.forEach(day=>{day.blocks.forEach(bl=>{if(bl.taskId)updates[bl.taskId]={date:day.date,time:bl.time};});});
    onApply(updates);onClose();
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#0008",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,maxHeight:"90vh",overflowY:"auto",padding:"24px 20px 40px"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:T.text}}>Planejar com IA</div>
            <div style={{fontSize:12,color:T.text3,marginTop:2}}>Distribui as tarefas até o prazo</div>
          </div>
          <button onClick={onClose} style={{fontSize:20,background:"none",border:"none",color:T.text3,cursor:"pointer",padding:"4px 8px"}}>×</button>
        </div>

        {step==="form"&&(<>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:8}}>PRAZO — EVENTO FIXO</div>
            {upcomingEvs.length>0?upcomingEvs.map(e=>{
              const cat=evCat(e.cat);const sel=form.eventId===String(e.id);
              return(<div key={e.id} onClick={()=>setForm(f=>({...f,eventId:sel?"":String(e.id),deadline:""}))} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,marginBottom:6,cursor:"pointer",border:`1px solid ${sel?cat.color+"80":T.border}`,background:sel?cat.color+"0D":T.bg,transition:"all .15s"}}>
                <span style={{fontSize:18}}>{cat.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>{e.title}</div>
                  <div style={{fontSize:11,color:T.text3}}>{fmtDate(e.date)}{e.time?` · ${e.time}`:""}</div>
                </div>
                {sel&&<span style={{fontSize:14,color:cat.color}}>✓</span>}
              </div>);
            }):<div style={{fontSize:12,color:T.text3,padding:"8px 0"}}>Nenhum evento futuro cadastrado.</div>}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:8}}>OU PRAZO MANUAL</div>
            <input type="date" value={form.deadline} min={todayStr()} onChange={e=>setForm(f=>({...f,deadline:e.target.value,eventId:""}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${T.border}`,fontSize:13,color:T.text,background:T.bg}}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:8}}>TAREFAS A DISTRIBUIR</div>
            <div style={{fontSize:11,color:T.text3,marginBottom:8}}>Vazio = usa críticas + urgentes automaticamente</div>
            {pendingTasks.map(t=>{
              const sel=form.taskIds.includes(t.id);const u=ugInfo(t.urgency);
              return(<div key={t.id} onClick={()=>setForm(f=>({...f,taskIds:sel?f.taskIds.filter(id=>id!==t.id):[...f.taskIds,t.id]}))} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,marginBottom:5,cursor:"pointer",border:`1px solid ${sel?T.accentM:T.border2}`,background:sel?T.accentL:T.bg,transition:"all .15s"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:u.color,flexShrink:0}}/>
                <div style={{flex:1,fontSize:12,fontWeight:500,color:T.text}}>{t.title}</div>
                <div style={{fontSize:10,color:T.text3}}>{t.duration||60}min</div>
                {sel&&<span style={{fontSize:13,color:T.accent}}>✓</span>}
              </div>);
            })}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:6}}>HORAS/DIA</div>
              <div style={{display:"flex",gap:5}}>
                {[3,4,5,6].map(h=>(<button key={h} onClick={()=>setForm(f=>({...f,hoursPerDay:h}))} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:12,fontWeight:700,background:form.hoursPerDay===h?T.accent:T.bg,color:form.hoursPerDay===h?"#fff":T.text3,border:`1px solid ${form.hoursPerDay===h?T.accent:T.border}`,cursor:"pointer"}}>{h}h</button>))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:6}}>INÍCIO</div>
              <div style={{display:"flex",gap:5}}>
                {[6,7,8,9].map(h=>(<button key={h} onClick={()=>setForm(f=>({...f,startHour:h}))} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:12,fontWeight:700,background:form.startHour===h?T.accent:T.bg,color:form.startHour===h?"#fff":T.text3,border:`1px solid ${form.startHour===h?T.accent:T.border}`,cursor:"pointer"}}>{h}h</button>))}
              </div>
            </div>
          </div>
          {error&&<div style={{fontSize:12,color:T.red,marginBottom:12,padding:"8px 12px",background:T.redL,borderRadius:8}}>{error}</div>}
          <button onClick={generate} style={{width:"100%",padding:"14px",borderRadius:14,fontSize:14,fontWeight:700,background:T.accent,color:"#fff",border:"none",cursor:"pointer"}}>✦ Gerar plano com IA</button>
        </>)}

        {step==="loading"&&(
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:32,marginBottom:16}}>⊙</div>
            <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:6}}>Gerando seu plano…</div>
            <div style={{fontSize:12,color:T.text3}}>A IA está distribuindo as tarefas.</div>
          </div>
        )}

        {step==="result"&&plan&&(<>
          <div style={{background:T.accentL,border:`1px solid ${T.accentM}`,borderRadius:12,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.accent,marginBottom:4}}>✦ PLANO GERADO</div>
            <div style={{fontSize:13,color:T.text,lineHeight:1.5}}>{plan.summary}</div>
          </div>
          {plan.days.map(day=>(
            <div key={day.date} style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:8}}>{day.label||fmtDate(day.date)}</div>
              {day.blocks.map((bl,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:5}}>
                  <div style={{fontSize:11,color:T.accent,fontWeight:700,width:38,flexShrink:0}}>{bl.time}</div>
                  <div style={{flex:1,fontSize:12,fontWeight:500,color:T.text}}>{bl.title}</div>
                  <div style={{fontSize:10,color:T.text3}}>{bl.duration}min</div>
                </div>
              ))}
            </div>
          ))}
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button onClick={()=>setStep("form")} style={{flex:1,padding:"12px",borderRadius:12,fontSize:13,fontWeight:600,background:T.bg,border:`1px solid ${T.border}`,color:T.text2,cursor:"pointer"}}>Refazer</button>
            <button onClick={apply} style={{flex:2,padding:"12px",borderRadius:12,fontSize:13,fontWeight:700,background:T.accent,color:"#fff",border:"none",cursor:"pointer"}}>✓ Aplicar ao calendário</button>
          </div>
        </>)}
      </div>
    </div>
  );
}
function PlanModal({events,tasks,onClose,onApply}){
  const[step,setStep]=useState("form");
  const[form,setForm]=useState({deadline:"",eventId:"",taskIds:[],hoursPerDay:5,startHour:7});
  const[plan,setPlan]=useState(null);
  const[error,setError]=useState("");
  const pendingTasks=tasks.filter(t=>!t.done);
  const upcomingEvs=events.filter(e=>e.date>=todayStr()).sort((a,b)=>a.date.localeCompare(b.date));

  const generate=async()=>{
    setStep("loading");setError("");
    const deadline=form.eventId?(events.find(e=>e.id===Number(form.eventId))?.date||form.deadline):form.deadline;
    if(!deadline||deadline<todayStr()){setError("Escolhe uma data válida.");setStep("form");return;}
    const selectedTasks=form.taskIds.length>0?pendingTasks.filter(t=>form.taskIds.includes(t.id)):pendingTasks.filter(t=>t.urgency==="critico"||t.urgency==="urgente");
    if(selectedTasks.length===0){setError("Nenhuma tarefa selecionada.");setStep("form");return;}
    const daysAvail=diffDays(todayStr(),deadline);
    const tasksDesc=selectedTasks.map(t=>`- "${t.title}" (${t.duration||60}min, empresa: ${coInfo(t.company).name})`).join("\n");
    const eventsDesc=upcomingEvs.map(e=>`- ${e.title} em ${fmtDate(e.date)} às ${e.time||"?"}`).join("\n");
    const prompt=`Você é um assistente de produtividade. O usuário tem ${daysAvail} dia(s) até ${fmtDate(deadline)} para concluir:\n${tasksDesc}\n\nEventos fixos:\n${eventsDesc||"Nenhum"}\n\nHoras/dia: ${form.hoursPerDay}h, início às ${form.startHour}:00h.\n\nDistribua as tarefas inteligentemente. Responda SOMENTE com JSON:\n{"summary":"frase curta","days":[{"date":"YYYY-MM-DD","label":"Segunda, 19/05","blocks":[{"time":"07:00","title":"título","duration":60,"taskId":1}]}]}`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key":import.meta.env.VITE_ANTHROPIC_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]}),
      });
      const data=await res.json();
      const raw=data.content?.find(b=>b.type==="text")?.text||"";
      const clean=raw.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setPlan({...parsed,deadline,selectedTasks});
      setStep("result");
    }catch(e){setError("Erro ao gerar o plano. Tenta novamente.");setStep("form");}
  };

  const apply=()=>{
    if(!plan)return;
    const updates={};
    plan.days.forEach(day=>{day.blocks.forEach(bl=>{if(bl.taskId)updates[bl.taskId]={date:day.date,time:bl.time};});});
    onApply(updates);onClose();
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#0008",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,maxHeight:"90vh",overflowY:"auto",padding:"24px 20px 40px"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:T.text}}>Planejar com IA</div>
            <div style={{fontSize:12,color:T.text3,marginTop:2}}>Distribui as tarefas até o prazo</div>
          </div>
          <button onClick={onClose} style={{fontSize:20,background:"none",border:"none",color:T.text3,cursor:"pointer",padding:"4px 8px"}}>×</button>
        </div>

        {step==="form"&&(<>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:8}}>PRAZO — EVENTO FIXO</div>
            {upcomingEvs.length>0?upcomingEvs.map(e=>{
              const cat=evCat(e.cat);const sel=form.eventId===String(e.id);
              return(<div key={e.id} onClick={()=>setForm(f=>({...f,eventId:sel?"":String(e.id),deadline:""}))} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,marginBottom:6,cursor:"pointer",border:`1px solid ${sel?cat.color+"80":T.border}`,background:sel?cat.color+"0D":T.bg,transition:"all .15s"}}>
                <span style={{fontSize:18}}>{cat.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>{e.title}</div>
                  <div style={{fontSize:11,color:T.text3}}>{fmtDate(e.date)}{e.time?` · ${e.time}`:""}</div>
                </div>
                {sel&&<span style={{fontSize:14,color:cat.color}}>✓</span>}
              </div>);
            }):<div style={{fontSize:12,color:T.text3,padding:"8px 0"}}>Nenhum evento futuro cadastrado.</div>}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:8}}>OU PRAZO MANUAL</div>
            <input type="date" value={form.deadline} min={todayStr()} onChange={e=>setForm(f=>({...f,deadline:e.target.value,eventId:""}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${T.border}`,fontSize:13,color:T.text,background:T.bg}}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:8}}>TAREFAS A DISTRIBUIR</div>
            <div style={{fontSize:11,color:T.text3,marginBottom:8}}>Vazio = usa críticas + urgentes automaticamente</div>
            {pendingTasks.map(t=>{
              const sel=form.taskIds.includes(t.id);const u=ugInfo(t.urgency);
              return(<div key={t.id} onClick={()=>setForm(f=>({...f,taskIds:sel?f.taskIds.filter(id=>id!==t.id):[...f.taskIds,t.id]}))} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,marginBottom:5,cursor:"pointer",border:`1px solid ${sel?T.accentM:T.border2}`,background:sel?T.accentL:T.bg,transition:"all .15s"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:u.color,flexShrink:0}}/>
                <div style={{flex:1,fontSize:12,fontWeight:500,color:T.text}}>{t.title}</div>
                <div style={{fontSize:10,color:T.text3}}>{t.duration||60}min</div>
                {sel&&<span style={{fontSize:13,color:T.accent}}>✓</span>}
              </div>);
            })}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:6}}>HORAS/DIA</div>
              <div style={{display:"flex",gap:5}}>
                {[3,4,5,6].map(h=>(<button key={h} onClick={()=>setForm(f=>({...f,hoursPerDay:h}))} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:12,fontWeight:700,background:form.hoursPerDay===h?T.accent:T.bg,color:form.hoursPerDay===h?"#fff":T.text3,border:`1px solid ${form.hoursPerDay===h?T.accent:T.border}`,cursor:"pointer"}}>{h}h</button>))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:".06em",marginBottom:6}}>INÍCIO</div>
              <div style={{display:"flex",gap:5}}>
                {[6,7,8,9].map(h=>(<button key={h} onClick={()=>setForm(f=>({...f,startHour:h}))} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:12,fontWeight:700,background:form.startHour===h?T.accent:T.bg,color:form.startHour===h?"#fff":T.text3,border:`1px solid ${form.startHour===h?T.accent:T.border}`,cursor:"pointer"}}>{h}h</button>))}
              </div>
            </div>
          </div>
          {error&&<div style={{fontSize:12,color:T.red,marginBottom:12,padding:"8px 12px",background:T.redL,borderRadius:8}}>{error}</div>}
          <button onClick={generate} style={{width:"100%",padding:"14px",borderRadius:14,fontSize:14,fontWeight:700,background:T.accent,color:"#fff",border:"none",cursor:"pointer"}}>✦ Gerar plano com IA</button>
        </>)}

        {step==="loading"&&(
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:32,marginBottom:16}}>⊙</div>
            <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:6}}>Gerando seu plano…</div>
            <div style={{fontSize:12,color:T.text3}}>A IA está distribuindo as tarefas.</div>
          </div>
        )}

        {step==="result"&&plan&&(<>
          <div style={{background:T.accentL,border:`1px solid ${T.accentM}`,borderRadius:12,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.accent,marginBottom:4}}>✦ PLANO GERADO</div>
            <div style={{fontSize:13,color:T.text,lineHeight:1.5}}>{plan.summary}</div>
          </div>
          {plan.days.map(day=>(
            <div key={day.date} style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:8}}>{day.label||fmtDate(day.date)}</div>
              {day.blocks.map((bl,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:5}}>
                  <div style={{fontSize:11,color:T.accent,fontWeight:700,width:38,flexShrink:0}}>{bl.time}</div>
                  <div style={{flex:1,fontSize:12,fontWeight:500,color:T.text}}>{bl.title}</div>
                  <div style={{fontSize:10,color:T.text3}}>{bl.duration}min</div>
                </div>
              ))}
            </div>
          ))}
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button onClick={()=>setStep("form")} style={{flex:1,padding:"12px",borderRadius:12,fontSize:13,fontWeight:600,background:T.bg,border:`1px solid ${T.border}`,color:T.text2,cursor:"pointer"}}>Refazer</button>
            <button onClick={apply} style={{flex:2,padding:"12px",borderRadius:12,fontSize:13,fontWeight:700,background:T.accent,color:"#fff",border:"none",cursor:"pointer"}}>✓ Aplicar ao calendário</button>
          </div>
        </>)}
      </div>
    </div>
  );
}
export default function App(){
  const[ready,setReady]=useState(false);
  const[tasks,setTasks]=useState([]);
  const[events,setEvents]=useState([]);
  const[view,setView]=useState("today");
  const[selDate,setSelDate]=useState(todayStr());
  const[calNav,setCalNav]=useState({y:new Date().getFullYear(),m:new Date().getMonth()});
  const[expanded,setExpanded]=useState(null);
  const[showAdd,setShowAdd]=useState(false);
  const[addMode,setAddMode]=useState("task");
  const[showPlan,setShowPlan]=useState(false);
  const[saving,setSaving]=useState(false);
  const[newTask,setNewTask]=useState({title:"",type:"tarefa",company:"el-distrito",urgency:"normal",notes:"",date:todayStr(),time:"",duration:60});
  const[newEvent,setNewEvent]=useState({title:"",cat:"reuniao",date:todayStr(),time:"",duration:60,notes:"",company:"el-distrito"});

  useEffect(()=>{
    (async()=>{
      const[t,e]=await Promise.all([loadTasks(),loadEvents()]);
      setTasks(t??[]);setEvents(e??[]);setReady(true);
    })();
  },[]);

  const toggleTask=async id=>{
    const task=tasks.find(t=>t.id===id);if(!task)return;
    const updated={...task,done:!task.done};
    setTasks(ts=>ts.map(t=>t.id===id?updated:t));
    await saveTask(updated);
  };
  const deleteTask=async id=>{
    setTasks(ts=>ts.filter(t=>t.id!==id));
    await deleteTaskDB(id);setExpanded(null);
  };
  const deleteEvent=async id=>{
    setEvents(es=>es.filter(e=>e.id!==id));
    await deleteEventDB(id);setExpanded(null);
  };
  const toggleExp=id=>setExpanded(e=>e===id?null:id);

  const addTask=async()=>{
    if(!newTask.title.trim())return;
    setSaving(true);
    const saved=await saveTask(newTask);
    if(saved&&saved[0])setTasks(ts=>[...ts,saved[0]]);
    setNewTask({title:"",type:"tarefa",company:"el-distrito",urgency:"normal",notes:"",date:todayStr(),time:"",duration:60});
    setShowAdd(false);setSaving(false);
  };
  const addEvent=async()=>{
    if(!newEvent.title.trim()||!newEvent.date)return;
    setSaving(true);
    const saved=await saveEvent(newEvent);
    if(saved&&saved[0])setEvents(es=>[...es,saved[0]]);
    setNewEvent({title:"",cat:"reuniao",date:todayStr(),time:"",duration:60,notes:"",company:"el-distrito"});
    setShowAdd(false);setSaving(false);
  };
  const applyPlan=async updates=>{
    const updated=tasks.map(t=>updates[t.id]?{...t,...updates[t.id]}:t);
    setTasks(updated);
    await Promise.all(Object.keys(updates).map(id=>{
      const t=updated.find(t=>String(t.id)===String(id));
      return t?saveTask(t):null;
    }));
  };

  const critCount=tasks.filter(t=>!t.done&&t.urgency==="critico").length;
  const todayTasks=tasks.filter(t=>t.date===todayStr()&&!t.done).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));
  const todayEvents=events.filter(e=>e.date===todayStr()).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));
  const upcomingEvs=events.filter(e=>e.date>todayStr()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const weekDays=weekOf(selDate);
  const calDays=monthDays(calNav.y,calNav.m);
  const dayTasks=d=>tasks.filter(t=>t.date===d);
  const dayEvents=d=>events.filter(e=>e.date===d);
  const pendingUg=URGENCY.map(u=>({u,items:tasks.filter(t=>!t.done&&t.urgency===u.id)})).filter(g=>g.items.length>0);
  const SLOTS=["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];

  if(!ready)return(<div style={{background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif"}}><div style={{color:T.text3,fontSize:13}}>Carregando…</div></div>);
    rreturn(
    <div style={{fontFamily:"'Inter','Helvetica Neue',sans-serif",background:T.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto",color:T.text,display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:wght@600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        button{font-family:inherit;}input,textarea,select{font-family:inherit;}
        input:focus,textarea:focus,select:focus{outline:none;}
        ::-webkit-scrollbar{width:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
        .fu{animation:fadeUp .22s ease both;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}.blink{animation:blink 1.5s ease infinite;}
        @keyframes shimmer{0%{opacity:.4}50%{opacity:.8}100%{opacity:.4}}.shim{animation:shimmer 1.8s ease infinite;}
      `}</style>

      <header style={{background:T.surface,borderBottom:`1px solid ${T.border}`,position:"sticky",top:0,zIndex:30}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px 10px"}}>
          <div>
            <div style={{fontFamily:"'Lora',serif",fontSize:21,fontWeight:700,letterSpacing:"-.3px"}}>Routine<span style={{color:T.accent}}>.</span></div>
            <div style={{fontSize:11,color:T.text3,marginTop:1}}>{fmtDate(todayStr())}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {saving&&<span style={{fontSize:10,color:T.accent}} className="blink">salvando</span>}
            {critCount>0&&<span style={{background:T.red,color:"#fff",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}} className="blink">{critCount} crítico{critCount>1?"s":""}</span>}
            <button onClick={()=>setShowPlan(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:20,background:T.accentL,color:T.accent,border:`1px solid ${T.accentM}`,fontSize:12,fontWeight:700,cursor:"pointer"}}>✦ Planejar</button>
          </div>
        </div>
        <div style={{display:"flex",gap:0,padding:"0 12px 0",overflowX:"auto"}}>
          {[{id:"today",label:"Hoje"},{id:"week",label:"Semana"},{id:"month",label:"Mês"},{id:"tasks",label:"Tarefas"},{id:"events",label:"Agenda"}].map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{padding:"8px 14px",fontSize:12,fontWeight:600,whiteSpace:"nowrap",color:view===t.id?T.accent:T.text3,background:"none",border:"none",borderBottom:view===t.id?`2px solid ${T.accent}`:"2px solid transparent",cursor:"pointer",transition:"all .15s"}}>{t.label}</button>
          ))}
        </div>
      </header>

      <main style={{flex:1,overflowY:"auto",paddingBottom:88}}>
        {view==="today"&&(<div className="fu">
          <div style={{display:"flex",borderBottom:`1px solid ${T.border2}`}}>
            {[{n:critCount,label:"Críticos",c:T.red},{n:todayEvents.length,label:"Eventos",c:T.accent},{n:todayTasks.length,label:"Tarefas",c:T.text2},{n:tasks.filter(t=>t.done&&t.date===todayStr()).length,label:"Feitas",c:T.green}].map((s,i)=>(
              <div key={s.label} style={{flex:1,padding:"14px 0",textAlign:"center",borderRight:i<3?`1px solid ${T.border2}`:"none"}}>
                <div style={{fontSize:20,fontWeight:800,color:s.c,lineHeight:1}}>{s.n}</div>
                <div style={{fontSize:10,color:T.text3,marginTop:3,fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{margin:"14px 14px 10px",background:T.accentL,border:`1px solid ${T.accentM}`,borderRadius:14,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:800,color:T.accent,letterSpacing:".06em"}}>CRONOGRAMA DO DIA</div>
              <button onClick={()=>setShowPlan(true)} style={{fontSize:11,color:T.accent,fontWeight:700,background:"none",border:"none",cursor:"pointer"}}>✦ Gerar agora</button>
            </div>
            {[{time:"06:30",label:"Abertura · revisão rápida",c:T.text3},{time:"07:00",label:"Tarefa crítica — bloco 1",c:T.red},{time:"09:00",label:"Foco empresa principal",c:T.accent},{time:"11:00",label:"Reuniões / suporte",c:T.purple},{time:"12:00",label:"Encerramento do dia",c:T.text3}].map((b,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:5,alignItems:"center",opacity:.5}} className="shim">
                <div style={{fontSize:10,color:T.accent,width:34,flexShrink:0,fontWeight:700}}>{b.time}</div>
                <div style={{flex:1,height:24,borderRadius:6,background:b.c+"15",border:`1px solid ${b.c}25`,display:"flex",alignItems:"center",paddingLeft:9}}>
                  <span style={{fontSize:11,color:b.c}}>{b.label}</span>
                </div>
              </div>
            ))}
          </div>

          {todayEvents.length>0&&(
            <div style={{padding:"0 14px 10px"}}>
              <div style={{fontSize:10,fontWeight:800,color:T.text3,letterSpacing:".1em",marginBottom:10}}>EVENTOS DE HOJE</div>
              {todayEvents.map(e=><EventCard key={e.id} ev={e} onDelete={deleteEvent} expanded={expanded===e.id} onExpand={toggleExp}/>)}
            </div>
          )}

          <div style={{padding:"0 14px 14px"}}>
            <div style={{fontSize:10,fontWeight:800,color:T.text3,letterSpacing:".1em",marginBottom:10}}>TIMELINE</div>
            {SLOTS.map(slot=>{
              const sh=parseInt(slot);
              const slotTs=todayTasks.filter(t=>t.time&&parseInt(t.time)===sh);
              const slotEvs=todayEvents.filter(e=>e.time&&parseInt(e.time)===sh);
              const isCur=sh===nowH();
              return(
                <div key={slot} style={{display:"flex",gap:8,marginBottom:2,alignItems:"flex-start",borderRadius:8,padding:"3px 4px",background:isCur?T.accentL:"transparent",borderLeft:isCur?`3px solid ${T.accent}`:"3px solid transparent"}}>
                  <div style={{fontSize:10,color:isCur?T.accent:T.text3,width:32,flexShrink:0,paddingTop:5,fontWeight:isCur?700:400}}>{slot}</div>
                  <div style={{flex:1,minHeight:26}}>
                    {slotEvs.map(e=>{const cat=evCat(e.cat);return(<div key={e.id} style={{background:cat.color+"15",border:`1px solid ${cat.color}30`,borderRadius:8,padding:"5px 9px",marginBottom:3,cursor:"pointer"}} onClick={()=>toggleExp(e.id)}><span style={{fontSize:11,fontWeight:600,color:cat.color}}>{cat.icon} {e.title}</span>{e.duration&&<span style={{fontSize:10,color:T.text3,marginLeft:6}}>{e.duration}min</span>}</div>);})}
                    {slotTs.map(t=>{const u=ugInfo(t.urgency);return(<div key={t.id} style={{background:u.bg,border:`1px solid ${u.color}30`,borderRadius:8,padding:"5px 9px",marginBottom:3,cursor:"pointer",opacity:t.done?.4:1}} onClick={()=>toggleExp(t.id)}><span style={{fontSize:11,fontWeight:500,color:T.text}}>{t.title}</span>{t.duration&&<span style={{fontSize:10,color:T.text3,marginLeft:6}}>{t.duration}min</span>}{expanded===t.id&&<div style={{marginTop:6,display:"flex",gap:6}}><button onClick={e=>{e.stopPropagation();toggleTask(t.id);}} style={{padding:"4px 10px",borderRadius:7,fontSize:11,fontWeight:600,background:T.bg,border:`1px solid ${T.border}`,cursor:"pointer",color:T.text2}}>{t.done?"↩":"✓ Concluir"}</button><button onClick={e=>{e.stopPropagation();deleteTask(t.id);}} style={{padding:"4px 10px",borderRadius:7,fontSize:11,fontWeight:600,background:T.redL,border:`1px solid ${T.red}30`,color:T.red,cursor:"pointer"}}>Excluir</button></div>}</div>);})}
                    {slotEvs.length===0&&slotTs.length===0&&<div style={{height:24,borderRadius:6,borderBottom:`1px solid ${T.border2}`}}/>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>)}
                {view==="week"&&(<div className="fu">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 8px"}}>
            <button onClick={()=>setSelDate(addDays(selDate,-7))} style={{fontSize:20,background:"none",border:"none",color:T.text2,cursor:"pointer",padding:"4px 10px"}}>‹</button>
            <div style={{fontSize:13,fontWeight:700,color:T.text}}>{(()=>{const w=weekOf(selDate);const s=toDate(w[0]),e=toDate(w[6]);return `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]}`;})()}</div>
            <button onClick={()=>setSelDate(addDays(selDate,7))} style={{fontSize:20,background:"none",border:"none",color:T.text2,cursor:"pointer",padding:"4px 10px"}}>›</button>
          </div>
          <div style={{padding:"0 12px"}}>
            {weekDays.map((d,i)=>{
              const dT=dayTasks(d),dE=dayEvents(d),isT=d===todayStr();
              return(
                <div key={d} style={{background:T.surface,border:`1px solid ${isT?T.accent:T.border}`,borderRadius:14,marginBottom:8,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:isT?T.accentL:T.surface,borderBottom:(dT.length||dE.length)?`1px solid ${T.border2}`:"none"}}>
                    <div style={{width:30,height:30,borderRadius:8,background:isT?T.accent:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:13,fontWeight:700,color:isT?"#fff":T.text2}}>{toDate(d).getDate()}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:isT?T.accent:T.text}}>{DAYS_SHORT[i]}</span>
                    {isT&&<span style={{fontSize:10,fontWeight:700,color:T.accent,background:T.accentL,padding:"1px 7px",borderRadius:10}}>Hoje</span>}
                    <div style={{marginLeft:"auto",display:"flex",gap:5}}>
                      {dE.length>0&&<span style={{fontSize:10,color:T.accent,background:T.accentL,padding:"1px 7px",borderRadius:10,fontWeight:600}}>{dE.length} evento{dE.length>1?"s":""}</span>}
                      {dT.filter(t=>!t.done).length>0&&<span style={{fontSize:10,color:T.text3,background:T.border2,padding:"1px 7px",borderRadius:10,fontWeight:600}}>{dT.filter(t=>!t.done).length} tarefa{dT.filter(t=>!t.done).length>1?"s":""}</span>}
                    </div>
                  </div>
                  {(dT.length||dE.length)>0&&(<div style={{padding:"6px 12px 8px"}}>
                    {[...dE.map(e=>({...e,_ev:true})),...dT].sort((a,b)=>(a.time||"99").localeCompare(b.time||"99")).map(item=>{
                      if(item._ev){const cat=evCat(item.cat);return(<div key={"e"+item.id} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border2}`}}><span style={{fontSize:13}}>{cat.icon}</span><div style={{flex:1,fontSize:12,fontWeight:600,color:cat.color}}>{item.title}</div>{item.time&&<span style={{fontSize:10,color:T.text3}}>{item.time}</span>}</div>);}
                      const u=ugInfo(item.urgency);
                      return(<div key={"t"+item.id} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border2}`,opacity:item.done?.4:1}}><div style={{width:6,height:6,borderRadius:"50%",background:u.color,flexShrink:0}}/><div style={{flex:1,fontSize:12,fontWeight:500,color:T.text,textDecoration:item.done?"line-through":"none"}}>{item.title}</div>{item.time&&<span style={{fontSize:10,color:T.text3}}>{item.time}</span>}</div>);
                    })}
                  </div>)}
                  {!dT.length&&!dE.length&&<div style={{padding:"10px 13px",fontSize:11,color:T.text3}}>Livre</div>}
                </div>
              );
            })}
          </div>
        </div>)}

        {view==="month"&&(<div className="fu">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 8px"}}>
            <button onClick={()=>setCalNav(n=>{const pm=n.m===0?11:n.m-1;return{y:n.m===0?n.y-1:n.y,m:pm};})} style={{fontSize:20,background:"none",border:"none",color:T.text2,cursor:"pointer",padding:"4px 10px"}}>‹</button>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>{MONTHS[calNav.m]} {calNav.y}</div>
            <button onClick={()=>setCalNav(n=>{const nm=n.m===11?0:n.m+1;return{y:n.m===11?n.y+1:n.y,m:nm};})} style={{fontSize:20,background:"none",border:"none",color:T.text2,cursor:"pointer",padding:"4px 10px"}}>›</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"4px 12px"}}>
            {DAYS_SHORT.map(d=><div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:T.text3,padding:"3px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,padding:"0 12px 16px"}}>
            {calDays.map((d,i)=>{
              if(!d)return <div key={"x"+i}/>;
              const dT=dayTasks(d),dE=dayEvents(d),isT=d===todayStr();
              return(<div key={d} onClick={()=>{setSelDate(d);setView("today");}} style={{background:isT?T.accent:T.surface,border:`1px solid ${isT?T.accent:T.border}`,borderRadius:9,padding:"5px 3px",textAlign:"center",cursor:"pointer",minHeight:48,display:"flex",flexDirection:"column",alignItems:"center",transition:"all .15s"}}>
                <div style={{fontSize:12,fontWeight:700,color:isT?"#fff":T.text,marginBottom:3}}>{toDate(d).getDate()}</div>
                <div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center"}}>
                  {dE.length>0&&<div style={{width:5,height:5,borderRadius:"50%",background:isT?"#fff9":T.accent}}/>}
                  {dT.slice(0,2).map(t=><div key={t.id} style={{width:5,height:5,borderRadius:"50%",background:isT?"#fff9":ugInfo(t.urgency).color}}/>)}
                </div>
              </div>);
            })}
          </div>
          <div style={{padding:"0 12px 16px"}}>
            <div style={{fontSize:10,fontWeight:800,color:T.text3,letterSpacing:".1em",marginBottom:10}}>PRÓXIMOS EVENTOS</div>
            {upcomingEvs.length===0&&<div style={{fontSize:12,color:T.text3}}>Nenhum evento futuro.</div>}
            {upcomingEvs.map(e=><EventCard key={e.id} ev={e} onDelete={deleteEvent} expanded={expanded===e.id} onExpand={toggleExp}/>)}
          </div>
        </div>)}

        {view==="tasks"&&(<div className="fu" style={{padding:"14px"}}>
          {pendingUg.map(({u,items})=>(
            <div key={u.id} style={{marginBottom:16}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:u.color}}/>
                <span style={{fontSize:10,fontWeight:800,color:u.color,letterSpacing:".07em"}}>{u.label.toUpperCase()}</span>
                <span style={{fontSize:10,color:T.text3}}>— {u.sub}</span>
              </div>
              {items.map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} expanded={expanded===t.id} onExpand={toggleExp}/>)}
            </div>
          ))}
          {pendingUg.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:T.text3,fontSize:13}}>Nenhuma tarefa pendente. 🎉</div>}
          {tasks.filter(t=>t.done).length>0&&(
            <div style={{marginTop:8}}>
              <div style={{fontSize:10,fontWeight:700,color:T.text3,letterSpacing:".07em",marginBottom:8}}>CONCLUÍDAS</div>
              {tasks.filter(t=>t.done).map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} expanded={expanded===t.id} onExpand={toggleExp}/>)}
            </div>
          )}
        </div>)}

        {view==="events"&&(<div className="fu" style={{padding:"14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:800,color:T.text3,letterSpacing:".1em"}}>TODOS OS EVENTOS</div>
            <button onClick={()=>{setAddMode("event");setShowAdd(true);}} style={{background:"none",border:"none",color:T.accent,fontWeight:700,fontSize:12,cursor:"pointer"}}>+ Novo evento</button>
          </div>
          {events.length===0&&<div style={{fontSize:12,color:T.text3,padding:"20px 0"}}>Nenhum evento cadastrado.</div>}
          {events.sort((a,b)=>a.date.localeCompare(b.date)).map(e=><EventCard key={e.id} ev={e} onDelete={deleteEvent} expanded={expanded===e.id} onExpand={toggleExp}/>)}
        </div>)}
      </main>
      {!showAdd&&!showPlan&&(
        <div style={{position:"fixed",bottom:24,right:"calc(50% - 215px + 16px)",display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",zIndex:40}}>
          <button onClick={()=>{setAddMode("event");setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:20,background:T.surface,border:`1px solid ${T.border}`,boxShadow:"0 2px 12px #0001",fontSize:12,fontWeight:700,color:T.text2,cursor:"pointer"}}>⊙ Evento</button>
          <button onClick={()=>{setAddMode("task");setShowAdd(true);}} style={{width:52,height:52,borderRadius:"50%",background:T.accent,color:"#fff",fontSize:24,fontWeight:300,border:"none",boxShadow:`0 4px 20px ${T.accent}55`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        </div>
      )}

      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"#0007",zIndex:50,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowAdd(false)}>
          <div style={{background:T.surface,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,maxHeight:"88vh",overflowY:"auto",padding:"20px 18px 40px"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",gap:0,background:T.bg,borderRadius:10,padding:3,marginBottom:18}}>
              {["task","event"].map(m=>(
                <button key={m} onClick={()=>setAddMode(m)} style={{flex:1,padding:"7px",borderRadius:8,fontSize:13,fontWeight:700,background:addMode===m?T.surface:"transparent",color:addMode===m?T.text:T.text3,border:addMode===m?`1px solid ${T.border}`:"none",cursor:"pointer",transition:"all .15s"}}>
                  {m==="task"?"Tarefa / Hábito":"Evento fixo"}
                </button>
              ))}
            </div>

            {addMode==="task"&&(<>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>TIPO</div>
                <div style={{display:"flex",gap:6}}>
                  {ENTRY_TYPES.map(ty=>(<button key={ty.id} onClick={()=>setNewTask(n=>({...n,type:ty.id}))} style={{flex:1,padding:"7px 0",borderRadius:9,fontSize:12,fontWeight:600,background:newTask.type===ty.id?T.accentL:"transparent",color:newTask.type===ty.id?T.accent:T.text3,border:`1px solid ${newTask.type===ty.id?T.accentM:T.border}`,cursor:"pointer"}}>{ty.icon} {ty.label}</button>))}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>TÍTULO *</div>
                <input value={newTask.title} onChange={e=>setNewTask(n=>({...n,title:e.target.value}))} placeholder="Descreva a tarefa…" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${T.border}`,fontSize:14,color:T.text,background:T.bg}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>DATA</div>
                  <input type="date" value={newTask.date} onChange={e=>setNewTask(n=>({...n,date:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:9,border:`1px solid ${T.border}`,fontSize:13,color:T.text,background:T.bg}}/>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>HORÁRIO</div>
                  <input type="time" value={newTask.time} onChange={e=>setNewTask(n=>({...n,time:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:9,border:`1px solid ${T.border}`,fontSize:13,color:T.text,background:T.bg}}/>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:8,letterSpacing:".05em"}}>URGÊNCIA</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {URGENCY.map(u=>(<button key={u.id} onClick={()=>setNewTask(n=>({...n,urgency:u.id}))} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,background:newTask.urgency===u.id?u.bg:"transparent",color:newTask.urgency===u.id?u.color:T.text3,border:`1px solid ${newTask.urgency===u.id?u.color+"60":T.border2}`,cursor:"pointer"}}>{u.label}</button>))}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:8,letterSpacing:".05em"}}>EMPRESA</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {COMPANIES.map(c=>(<button key={c.id} onClick={()=>setNewTask(n=>({...n,company:c.id}))} style={{padding:"5px 11px",borderRadius:20,fontSize:11,fontWeight:600,background:newTask.company===c.id?T.accentL:"transparent",color:newTask.company===c.id?T.accent:T.text3,border:`1px solid ${newTask.company===c.id?T.accentM:T.border2}`,cursor:"pointer"}}>{c.icon} {c.name}</button>))}
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>NOTAS</div>
                <textarea value={newTask.notes} onChange={e=>setNewTask(n=>({...n,notes:e.target.value}))} placeholder="Contexto adicional…" rows={2} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${T.border}`,fontSize:13,color:T.text,background:T.bg,resize:"none"}}/>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"11px",borderRadius:12,fontSize:13,fontWeight:600,background:T.bg,border:`1px solid ${T.border}`,color:T.text2,cursor:"pointer"}}>Cancelar</button>
                <button onClick={addTask} disabled={!newTask.title.trim()} style={{flex:2,padding:"11px",borderRadius:12,fontSize:13,fontWeight:700,background:newTask.title.trim()?T.accent:"#ccc",color:"#fff",border:"none",cursor:newTask.title.trim()?"pointer":"not-allowed"}}>Adicionar tarefa</button>
              </div>
            </>)}

            {addMode==="event"&&(<>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>CATEGORIA</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {EVENT_CATS.map(cat=>(<button key={cat.id} onClick={()=>setNewEvent(n=>({...n,cat:cat.id}))} style={{padding:"6px 13px",borderRadius:20,fontSize:12,fontWeight:600,background:newEvent.cat===cat.id?cat.color+"18":"transparent",color:newEvent.cat===cat.id?cat.color:T.text3,border:`1px solid ${newEvent.cat===cat.id?cat.color+"60":T.border2}`,cursor:"pointer"}}>{cat.icon} {cat.label}</button>))}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>TÍTULO *</div>
                <input value={newEvent.title} onChange={e=>setNewEvent(n=>({...n,title:e.target.value}))} placeholder="Ex: Mentoria tráfego pago…" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${T.border}`,fontSize:14,color:T.text,background:T.bg}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>DATA *</div>
                  <input type="date" value={newEvent.date} onChange={e=>setNewEvent(n=>({...n,date:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:9,border:`1px solid ${T.border}`,fontSize:13,color:T.text,background:T.bg}}/>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>HORÁRIO</div>
                  <input type="time" value={newEvent.time} onChange={e=>setNewEvent(n=>({...n,time:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:9,border:`1px solid ${T.border}`,fontSize:13,color:T.text,background:T.bg}}/>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>DURAÇÃO</div>
                <div style={{display:"flex",gap:6}}>
                  {[30,60,90,120,180].map(d=>(<button key={d} onClick={()=>setNewEvent(n=>({...n,duration:d}))} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11,fontWeight:700,background:newEvent.duration===d?T.accentL:"transparent",color:newEvent.duration===d?T.accent:T.text3,border:`1px solid ${newEvent.duration===d?T.accentM:T.border}`,cursor:"pointer"}}>{d<60?`${d}m`:d===60?"1h":`${d/60}h`}</button>))}
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text3,marginBottom:6,letterSpacing:".05em"}}>NOTAS</div>
                <textarea value={newEvent.notes} onChange={e=>setNewEvent(n=>({...n,notes:e.target.value}))} placeholder="Observações, pauta…" rows={2} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${T.border}`,fontSize:13,color:T.text,background:T.bg,resize:"none"}}/>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"11px",borderRadius:12,fontSize:13,fontWeight:600,background:T.bg,border:`1px solid ${T.border}`,color:T.text2,cursor:"pointer"}}>Cancelar</button>
                <button onClick={addEvent} disabled={!newEvent.title.trim()||!newEvent.date} style={{flex:2,padding:"11px",borderRadius:12,fontSize:13,fontWeight:700,background:(newEvent.title.trim()&&newEvent.date)?T.accent:"#ccc",color:"#fff",border:"none",cursor:(newEvent.title.trim()&&newEvent.date)?"pointer":"not-allowed"}}>Marcar evento</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {showPlan&&<PlanModal events={events} tasks={tasks} onClose={()=>setShowPlan(false)} onApply={applyPlan}/>}
    </div>
  );
}

        





