import { useState } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────
const PEOPLE = [
  { id:1, name:"José García Morales",  birth:"1842", death:"1901", place:"Oaxaca, México",       x:30, y:54, claims:3, verified:true,  gender:"m", parents:[],    children:[3,6] },
  { id:2, name:"María Luisa Vega R.",  birth:"1845", death:"1910", place:"Puebla, México",        x:30, y:38, claims:2, verified:true,  gender:"f", parents:[],    children:[3]   },
  { id:3, name:"Carlos García Vega",   birth:"1870", death:"1935", place:"Ciudad de México",      x:53, y:46, claims:1, verified:true,  gender:"m", parents:[1,2], children:[5]   },
  { id:4, name:"Ana Ruiz Pérez",       birth:"1872", death:"1940", place:"Jalisco, México",       x:53, y:30, claims:2, verified:false, gender:"f", parents:[],    children:[5]   },
  { id:5, name:"Luis García Ruiz",     birth:"1895", death:"1960", place:"Ciudad de México",      x:74, y:38, claims:0, verified:true,  gender:"m", parents:[3,4], children:[]    },
  { id:6, name:"Pedro García Morales", birth:"1868", death:"1930", place:"Veracruz, México",      x:53, y:62, claims:4, verified:false, gender:"m", parents:[1],   children:[]    },
];
const CONNECTIONS = [[1,3],[2,3],[3,5],[4,5],[1,6]];
const TABS = ["Resumen","Eventos","Vínculos","Fuentes","Notas","Auditoría"];
const EVENTS = [
  { type:"nacimiento", date:"12 Mar 1870", place:"Ciudad de México", status:"verificado", claims:1 },
  { type:"matrimonio", date:"15 Jun 1893", place:"Ciudad de México", status:"verificado", claims:0 },
  { type:"defunción",  date:"04 Nov 1935", place:"Ciudad de México", status:"importado",  claims:0 },
];

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    name:"Azul Medianoche",
    icon:"🌙",
    // surfaces
    bg:       "#07070f",
    bgDeep:   "#06060d",
    bgCard:   "#0e0e1a",
    bgCardHov:"#12122a",
    // borders
    border:   "#111120",
    borderMid:"#1a1a2e",
    borderHi: "#2a2a50",
    // text
    textHi:   "#dcdcf8",
    textMid:  "#8080b0",
    textLow:  "#40406a",
    textMute: "#252540",
    // accent (indigo)
    accent:   "#6366f1",
    accentSub:"#8b5cf6",
    accentMF: "#6366f118",
    accentBorder:"#6366f130",
    // gender
    male:     "#6366f1",
    female:   "#ec4899",
    // status
    verified: "#4ade80",
    warning:  "#fb923c",
    info:     "#60a5fa",
    claims:   "#c084fc",
    // grid dot
    dot:      "#15152a",
    // glow
    glow:     "#6366f10a",
    // node unverified border
    unverBorder:"#7c3a1a",
    // toolbar active
    toolActive:"#111120",
    toolActiveTxt:"#9090c0",
  },
  light: {
    name:"Blanco Puro",
    icon:"☀️",
    bg:       "#f8f8fc",
    bgDeep:   "#f0f0f8",
    bgCard:   "#ffffff",
    bgCardHov:"#f4f4fc",
    border:   "#e4e4f0",
    borderMid:"#d0d0e8",
    borderHi: "#b0b0d0",
    textHi:   "#1a1a3a",
    textMid:  "#5050a0",
    textLow:  "#8080c0",
    textMute: "#b0b0d0",
    accent:   "#5b5ef0",
    accentSub:"#7c5cf0",
    accentMF: "#5b5ef010",
    accentBorder:"#5b5ef028",
    male:     "#5b5ef0",
    female:   "#db2777",
    verified: "#16a34a",
    warning:  "#ea580c",
    info:     "#2563eb",
    claims:   "#9333ea",
    dot:      "#e0e0f0",
    glow:     "#5b5ef008",
    unverBorder:"#f97316",
    toolActive:"#eeeef8",
    toolActiveTxt:"#4040a0",
  },
  warm: {
    name:"Pergamino",
    icon:"📜",
    bg:       "#faf7f0",
    bgDeep:   "#f4f0e4",
    bgCard:   "#fffdf5",
    bgCardHov:"#f8f4e8",
    border:   "#e8e0c8",
    borderMid:"#d8ccaa",
    borderHi: "#c0a870",
    textHi:   "#2a1f0a",
    textMid:  "#7a5c28",
    textLow:  "#a07840",
    textMute: "#c8a870",
    accent:   "#b07030",
    accentSub:"#8b5a20",
    accentMF: "#b0703010",
    accentBorder:"#b0703028",
    male:     "#6060c0",
    female:   "#c04080",
    verified: "#2d7a3a",
    warning:  "#c05010",
    info:     "#2060a0",
    claims:   "#8040a0",
    dot:      "#e8e0c8",
    glow:     "#b0703008",
    unverBorder:"#c05010",
    toolActive:"#ede8d8",
    toolActiveTxt:"#5a3a10",
  },
};

// ── Components ────────────────────────────────────────────────────────────────
const Badge = ({ children, color }) => (
  <span style={{
    fontSize:"0.59rem", padding:"0.16rem 0.55rem", borderRadius:20,
    background:`${color}18`, color, border:`1px solid ${color}35`,
    fontWeight:600, letterSpacing:"0.03em", whiteSpace:"nowrap",
  }}>{children}</span>
);

const Divider = ({ t }) => <div style={{ height:1, background:t.border, margin:"0.7rem 0" }} />;

const SectionLabel = ({ children, t }) => (
  <div style={{ fontSize:"0.55rem", color:t.textMute, textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:600, marginBottom:8 }}>{children}</div>
);

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [themeName, setThemeName] = useState("dark");
  const [selected, setSelected]   = useState(null);
  const [expediente, setExpediente] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab]   = useState("Resumen");
  const [expPos, setExpPos]         = useState({ x:52, y:42 });
  const [dragging, setDragging]     = useState(null);

  const t  = THEMES[themeName];
  const person = PEOPLE.find(p => p.id === selected);

  const openExp  = () => { setExpediente(true); setFullscreen(false); };
  const closeExp = () => { setExpediente(false); setFullscreen(false); };
  const onMD = (e) => setDragging({ ox: e.clientX - expPos.x, oy: e.clientY - expPos.y });
  const onMM = (e) => { if (dragging) setExpPos({ x: e.clientX - dragging.ox, y: e.clientY - dragging.oy }); };
  const onMU = () => setDragging(null);

  const Field = ({ label, value, wide }) => (
    <div style={{ background:t.bgDeep, border:`1px solid ${t.border}`, borderRadius:8, padding:"0.65rem 0.85rem", gridColumn:wide?"span 2":"span 1" }}>
      <div style={{ fontSize:"0.55rem", color:t.textMute, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:600, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:"0.82rem", color:t.textMid, fontWeight:500 }}>{value}</div>
    </div>
  );

  const statusColor = { verificado:t.verified, disputado:t.warning, importado:t.info, revisado:t.claims };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div onMouseMove={onMM} onMouseUp={onMU} style={{
      height:"100vh", background:t.bg, color:t.textMid,
      fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",
      display:"flex", flexDirection:"column", overflow:"hidden", userSelect:"none",
      transition:"background 0.3s, color 0.3s",
    }}>

      {/* ── Titlebar ─────────────────────────────────────────────────────────── */}
      <div style={{ height:40, background:t.bgDeep, borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.25rem", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", gap:6 }}>
            {["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{ width:11,height:11,borderRadius:"50%",background:c,opacity:0.9 }} />)}
          </div>
          <div style={{ width:1, height:14, background:t.border }} />
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:22, height:22, borderRadius:6, background:`linear-gradient(135deg,${t.accent},${t.accentSub})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.68rem", color:"#fff", flexShrink:0 }}>✦</div>
            <span style={{ fontSize:"0.78rem", color:t.accent, fontWeight:700, letterSpacing:"0.01em" }}>GeneaSketch</span>
            <span style={{ fontSize:"0.7rem", color:t.textMute }}>·</span>
            <span style={{ fontSize:"0.72rem", color:t.textLow }}>Familia García.gsk</span>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Engine pills */}
          {[["Kindra","3.1",t.accent],["Genraph","core",t.verified],["AncestrAI","β",t.warning]].map(([n,v,c])=>(
            <div key={n} style={{ display:"flex", alignItems:"center", gap:5, padding:"0.18rem 0.6rem", borderRadius:6, border:`1px solid ${t.border}`, background:t.bgCard }}>
              <div style={{ width:5,height:5,borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}70` }} />
              <span style={{ fontSize:"0.62rem", color:t.textLow, fontWeight:500 }}>{n}</span>
              <span style={{ fontSize:"0.58rem", color:t.textMute }}>{v}</span>
            </div>
          ))}

          {/* Theme switcher */}
          <div style={{ display:"flex", gap:3, padding:"0.18rem 0.3rem", borderRadius:8, border:`1px solid ${t.border}`, background:t.bgCard, marginLeft:4 }}>
            {Object.entries(THEMES).map(([key, th])=>(
              <button key={key} onClick={()=>setThemeName(key)} title={th.name} style={{
                width:24, height:24, borderRadius:6, border:`1px solid ${themeName===key?t.accent:t.border}`,
                background:themeName===key?t.accentMF:t.bgCard,
                cursor:"pointer", fontSize:"0.75rem", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.15s",
              }}>{th.icon}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div style={{ height:36, background:t.bg, borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", padding:"0 1.25rem", gap:2, flexShrink:0 }}>
        {["Árbol","Búsqueda","Informes","Configuración"].map((item,i)=>(
          <button key={item} style={{
            padding:"0.24rem 0.8rem", borderRadius:6, border:"none",
            background:i===0?t.toolActive:"transparent",
            color:i===0?t.toolActiveTxt:t.textMute,
            cursor:"pointer", fontSize:"0.74rem", fontWeight:i===0?600:400,
          }}>{item}</button>
        ))}
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0.2rem 0.75rem", borderRadius:7, border:`1px solid ${t.accentBorder}`, background:t.accentMF }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:t.accent,boxShadow:`0 0 6px ${t.accent}` }} />
          <span style={{ fontSize:"0.63rem", color:t.accent, fontWeight:500 }}>3 colaboradores activos</span>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

        {/* Canvas */}
        <div style={{ flex:1, position:"relative", overflow:"hidden" }} onClick={()=>{ if(!expediente) setSelected(null); }}>

          {/* Grid */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
            <defs>
              <pattern id="grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="0.5" cy="0.5" r="0.7" fill={t.dot} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Ambient glow */}
          <div style={{ position:"absolute", top:"10%", left:"30%", width:600, height:500, borderRadius:"50%", background:`radial-gradient(circle,${t.glow} 0%,transparent 65%)`, pointerEvents:"none" }} />

          {/* Connections */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
            {CONNECTIONS.map(([a,b],i)=>{
              const pa=PEOPLE.find(p=>p.id===a), pb=PEOPLE.find(p=>p.id===b);
              const sel=selected===a||selected===b;
              const mx=(pa.x+pb.x)/2;
              return <path key={i}
                d={`M ${pa.x}% ${pa.y}% C ${mx}% ${pa.y}%, ${mx}% ${pb.y}%, ${pb.x}% ${pb.y}%`}
                fill="none"
                stroke={sel?t.accent:t.borderMid}
                strokeWidth={sel?1.5:1}
                strokeOpacity={sel?0.5:1}
                strokeDasharray={sel?"none":"3 5"}
              />;
            })}
          </svg>

          {/* Nodes */}
          {PEOPLE.map(p=>(
            <div key={p.id}
              onClick={e=>{ e.stopPropagation(); setSelected(p.id); }}
              style={{ position:"absolute", left:`${p.x}%`, top:`${p.y}%`, transform:"translate(-50%,-50%)", cursor:"pointer", zIndex:10 }}
            >
              <div style={{
                background: selected===p.id ? t.bgCard : t.bg,
                border:`1.5px solid ${selected===p.id ? t.accent : p.verified ? t.border : t.unverBorder}`,
                borderRadius:11, padding:"0.6rem 0.9rem", minWidth:168,
                boxShadow: selected===p.id
                  ? `0 0 0 3px ${t.accentBorder}, 0 12px 40px ${themeName==="dark"?"#00000090":"#0000001a"}`
                  : `0 2px 10px ${themeName==="dark"?"#00000060":"#0000000e"}`,
                transition:"all 0.18s cubic-bezier(.4,0,.2,1)",
              }}>
                {/* Name row */}
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:p.gender==="m"?t.male:t.female, boxShadow:`0 0 7px ${p.gender==="m"?t.male:t.female}80`, flexShrink:0 }} />
                  <span style={{ fontSize:"0.77rem", fontWeight:700, color: selected===p.id?t.textHi:t.textMid, whiteSpace:"nowrap" }}>{p.name}</span>
                </div>
                {/* Dates */}
                <div style={{ fontSize:"0.6rem", color:t.textMute, paddingLeft:14 }}>{p.birth} – {p.death}</div>
                {/* Tags */}
                {(p.claims>0||!p.verified)&&(
                  <div style={{ display:"flex", gap:4, marginTop:6, paddingLeft:14, flexWrap:"wrap" }}>
                    {p.claims>0&&<Badge color={t.claims}>{p.claims} claims</Badge>}
                    {!p.verified&&<Badge color={t.warning}>sin verificar</Badge>}
                  </div>
                )}
              </div>
            </div>
          ))}

          {!selected&&(
            <div style={{ position:"absolute", bottom:22, left:"50%", transform:"translateX(-50%)", fontSize:"0.64rem", color:t.textMute, letterSpacing:"0.08em" }}>
              Selecciona una persona para ver su ficha
            </div>
          )}
        </div>

        {/* ── Inspector ────────────────────────────────────────────────────────── */}
        <div style={{
          width: selected&&!fullscreen ? 286 : 0,
          borderLeft:`1px solid ${t.border}`,
          background:t.bgDeep, overflow:"hidden",
          transition:"width 0.22s cubic-bezier(.4,0,.2,1)",
          flexShrink:0, display:"flex", flexDirection:"column",
        }}>
          {person&&(
            <>
              {/* Inspector header */}
              <div style={{ padding:"1.1rem 1.1rem 0.9rem", borderBottom:`1px solid ${t.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <SectionLabel t={t}>Inspector</SectionLabel>
                  <button onClick={()=>setSelected(null)} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:5, color:t.textLow, cursor:"pointer", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.68rem" }}>✕</button>
                </div>
                <div style={{ fontSize:"1.05rem", fontWeight:700, color:t.textHi, lineHeight:1.25, marginBottom:4, letterSpacing:"-0.01em" }}>{person.name}</div>
                <div style={{ fontSize:"0.66rem", color:t.textLow, marginBottom:10 }}>{person.birth} – {person.death} · {person.place}</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  <Badge color={person.gender==="m"?t.male:t.female}>{person.gender==="m"?"Hombre":"Mujer"}</Badge>
                  {person.verified ? <Badge color={t.verified}>Verificado</Badge> : <Badge color={t.warning}>Sin verificar</Badge>}
                </div>
              </div>

              {/* Vínculos */}
              <div style={{ padding:"0.85rem 1.1rem", borderBottom:`1px solid ${t.border}` }}>
                <SectionLabel t={t}>Vínculos cercanos</SectionLabel>
                {person.parents.length===0&&person.children.length===0
                  ? <div style={{ fontSize:"0.7rem", color:t.textMute }}>Sin vínculos registrados</div>
                  : <>
                    {person.parents.length>0&&<>
                      <div style={{ fontSize:"0.54rem", color:t.textMute, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.1em" }}>Padres</div>
                      {person.parents.map(pid=>{ const par=PEOPLE.find(p=>p.id===pid); return(
                        <div key={pid} onClick={()=>setSelected(pid)} style={{ display:"flex", alignItems:"center", gap:7, padding:"0.3rem 0.5rem", borderRadius:6, cursor:"pointer", marginBottom:2 }}>
                          <div style={{ width:6,height:6,borderRadius:"50%",background:par.gender==="m"?t.male:t.female,flexShrink:0 }} />
                          <span style={{ fontSize:"0.72rem", color:t.textMid }}>{par.name}</span>
                        </div>
                      );})}
                    </>}
                    {person.children.length>0&&<>
                      <div style={{ fontSize:"0.54rem", color:t.textMute, marginTop:8, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.1em" }}>Hijos</div>
                      {person.children.map(cid=>{ const ch=PEOPLE.find(p=>p.id===cid); return(
                        <div key={cid} onClick={()=>setSelected(cid)} style={{ display:"flex", alignItems:"center", gap:7, padding:"0.3rem 0.5rem", borderRadius:6, cursor:"pointer", marginBottom:2 }}>
                          <div style={{ width:6,height:6,borderRadius:"50%",background:ch.gender==="m"?t.male:t.female,flexShrink:0 }} />
                          <span style={{ fontSize:"0.72rem", color:t.textMid }}>{ch.name}</span>
                        </div>
                      );})}
                    </>}
                  </>
                }
              </div>

              {/* Claims preview */}
              {person.claims>0&&(
                <div style={{ padding:"0.85rem 1.1rem", borderBottom:`1px solid ${t.border}` }}>
                  <SectionLabel t={t}>Claims activos</SectionLabel>
                  <div style={{ background:t.bgCard, border:`1px solid ${t.claims}25`, borderRadius:9, padding:"0.6rem 0.75rem", display:"flex", alignItems:"center", gap:9 }}>
                    <div style={{ width:28,height:28,borderRadius:7,background:`${t.claims}12`,border:`1px solid ${t.claims}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",flexShrink:0 }}>🧠</div>
                    <div>
                      <div style={{ fontSize:"0.72rem", color:t.claims, fontWeight:600 }}>{person.claims} afirmaciones</div>
                      <div style={{ fontSize:"0.6rem", color:t.textMute }}>EpiGen · sin conflictos</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div style={{ padding:"0.85rem 1.1rem", marginTop:"auto" }}>
                <button onClick={openExp} style={{
                  width:"100%", padding:"0.6rem", borderRadius:8,
                  border:`1px solid ${t.accentBorder}`,
                  background:`linear-gradient(135deg,${t.accentMF},${t.accentMF})`,
                  color:t.accent, cursor:"pointer", fontSize:"0.76rem", fontWeight:600,
                  marginBottom:6, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  letterSpacing:"0.01em",
                }}>Abrir expediente <span style={{ opacity:0.5, fontSize:"0.85rem" }}>→</span></button>
                <button style={{ width:"100%", padding:"0.46rem", borderRadius:8, border:`1px solid ${t.border}`, background:"transparent", color:t.textMute, cursor:"pointer", fontSize:"0.7rem" }}>
                  + Añadir vínculo
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Expediente flotante ────────────────────────────────────────────── */}
        {expediente&&person&&!fullscreen&&(
          <div style={{
            position:"absolute", left:expPos.x, top:expPos.y,
            width:560, height:440,
            background:t.bg,
            border:`1px solid ${t.borderMid}`,
            borderRadius:14,
            boxShadow: themeName==="dark"
              ? "0 40px 120px #000000c0, 0 0 0 1px #ffffff04"
              : "0 20px 60px #0000001a, 0 0 0 1px #ffffff80",
            display:"flex", flexDirection:"column",
            zIndex:100, overflow:"hidden",
          }}>
            {/* Window titlebar */}
            <div onMouseDown={onMD} style={{ height:38, background:t.bgDeep, borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 0.9rem", cursor:"grab", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <span style={{ fontSize:"0.56rem", color:t.textMute, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600 }}>Expediente</span>
                <div style={{ width:1, height:10, background:t.border }} />
                <span style={{ fontSize:"0.78rem", color:t.textMid, fontWeight:600 }}>{person.name}</span>
              </div>
              <div style={{ display:"flex", gap:5 }}>
                <button onClick={()=>setFullscreen(true)} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:6, color:t.textLow, cursor:"pointer", fontSize:"0.62rem", padding:"0.2rem 0.6rem", display:"flex", alignItems:"center", gap:4, fontWeight:500 }}>⤢ Workbench</button>
                <button onClick={closeExp} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:6, color:t.textLow, cursor:"pointer", width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.7rem" }}>✕</button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", background:t.bgDeep, borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
              {TABS.map(tab=>(
                <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                  padding:"0.45rem 0.9rem", border:"none",
                  borderBottom:`2px solid ${activeTab===tab?t.accent:"transparent"}`,
                  background:"transparent",
                  color:activeTab===tab?t.textHi:t.textMute,
                  cursor:"pointer", fontSize:"0.7rem", fontWeight:activeTab===tab?600:400,
                  transition:"color 0.12s",
                }}>{tab}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex:1, overflowY:"auto", padding:"1.1rem" }}>
              {activeTab==="Resumen"&&(
                <div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                    <Field label="Nombre completo" value={person.name} wide />
                    <Field label="Nacimiento" value={person.birth} />
                    <Field label="Defunción" value={person.death} />
                    <Field label="Lugar de origen" value={person.place} wide />
                    <Field label="Sexo" value={person.gender==="m"?"Masculino":"Femenino"} />
                    <Field label="Estado" value={person.verified?"Verificado":"Sin verificar"} />
                  </div>
                  {person.claims>0&&(
                    <div style={{ background:`${t.claims}08`, border:`1px solid ${t.claims}20`, borderRadius:8, padding:"0.65rem 0.85rem", display:"flex", gap:9, alignItems:"center" }}>
                      <span style={{ fontSize:"1.1rem" }}>🧠</span>
                      <div>
                        <div style={{ fontSize:"0.7rem", color:t.claims, fontWeight:600 }}>{person.claims} claims activos</div>
                        <div style={{ fontSize:"0.62rem", color:t.textMute }}>EpiGen detectó afirmaciones con datos contradictorios</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab==="Eventos"&&(
                <div>
                  {EVENTS.map((ev,i)=>(
                    <div key={i} style={{ display:"flex", gap:12, marginBottom:10, background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:10, padding:"0.75rem 0.9rem" }}>
                      <div style={{ width:34,height:34,borderRadius:8,background:t.bgDeep,border:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.05rem",flexShrink:0 }}>
                        {ev.type==="nacimiento"?"🌱":ev.type==="matrimonio"?"💍":"🕯"}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                          <span style={{ fontSize:"0.8rem", color:t.textHi, fontWeight:600, textTransform:"capitalize" }}>{ev.type}</span>
                          <Badge color={statusColor[ev.status]||t.info}>{ev.status}</Badge>
                        </div>
                        <div style={{ fontSize:"0.67rem", color:t.textLow }}>{ev.date} · {ev.place}</div>
                        {ev.claims>0&&<div style={{ marginTop:6, fontSize:"0.62rem", color:t.claims, display:"flex", alignItems:"center", gap:4 }}>⚠ 1 claim alternativo — ver en EpiGen</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab==="Vínculos"&&(
                <div>
                  {[...person.parents.map(id=>({rel:"Padre / Madre",id})),...person.children.map(id=>({rel:"Hijo / a",id}))].map(v=>{
                    const vp=PEOPLE.find(p=>p.id===v.id);
                    return(
                      <div key={v.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:8, padding:"0.55rem 0.8rem", marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:7,height:7,borderRadius:"50%",background:vp.gender==="m"?t.male:t.female }} />
                          <span style={{ fontSize:"0.78rem", color:t.textMid, fontWeight:500 }}>{vp.name}</span>
                        </div>
                        <span style={{ fontSize:"0.62rem", color:t.textMute }}>{v.rel}</span>
                      </div>
                    );
                  })}
                  {person.parents.length+person.children.length===0&&<div style={{ color:t.textMute, textAlign:"center", marginTop:24, fontSize:"0.78rem" }}>Sin vínculos registrados</div>}
                </div>
              )}
              {["Fuentes","Notas","Auditoría"].includes(activeTab)&&(
                <div style={{ textAlign:"center", marginTop:36, color:t.textMute }}>
                  <div style={{ fontSize:"1.8rem", marginBottom:9, opacity:0.3 }}>{activeTab==="Fuentes"?"📎":activeTab==="Notas"?"📝":"📋"}</div>
                  <div style={{ fontSize:"0.74rem" }}>{activeTab} · próximamente</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Workbench fullscreen ───────────────────────────────────────────── */}
        {expediente&&person&&fullscreen&&(
          <div style={{ position:"absolute", inset:0, background:t.bg, zIndex:200, display:"flex", flexDirection:"column" }}>

            {/* WB Titlebar */}
            <div style={{ height:42, background:t.bgDeep, borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.25rem", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ padding:"0.18rem 0.6rem", borderRadius:6, background:t.accentMF, border:`1px solid ${t.accentBorder}`, fontSize:"0.6rem", color:t.accent, letterSpacing:"0.12em", fontWeight:700 }}>WORKBENCH</div>
                <span style={{ fontSize:"0.95rem", fontWeight:700, color:t.textHi, letterSpacing:"-0.01em" }}>{person.name}</span>
                <span style={{ fontSize:"0.64rem", color:t.textMute }}>{person.birth} – {person.death}</span>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>setFullscreen(false)} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:6, color:t.textLow, cursor:"pointer", fontSize:"0.62rem", padding:"0.2rem 0.65rem", fontWeight:500 }}>⤡ Ventana</button>
                <button onClick={closeExp} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:6, color:t.textLow, cursor:"pointer", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.7rem" }}>✕</button>
              </div>
            </div>

            <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

              {/* Left nav */}
              <div style={{ width:168, borderRight:`1px solid ${t.border}`, background:t.bgDeep, padding:"0.8rem 0", flexShrink:0 }}>
                <div style={{ fontSize:"0.54rem", color:t.textMute, letterSpacing:"0.14em", textTransform:"uppercase", padding:"0 1rem", marginBottom:8, fontWeight:600 }}>Secciones</div>
                {TABS.map(tab=>(
                  <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                    width:"100%", padding:"0.46rem 1.1rem", border:"none",
                    borderLeft:`2px solid ${activeTab===tab?t.accent:"transparent"}`,
                    background:activeTab===tab?t.accentMF:"transparent",
                    color:activeTab===tab?t.textHi:t.textLow,
                    cursor:"pointer", fontSize:"0.73rem", fontWeight:activeTab===tab?600:400, textAlign:"left",
                    transition:"all 0.12s",
                  }}>{tab}</button>
                ))}
                <Divider t={t} />
                <div style={{ fontSize:"0.54rem", color:t.textMute, letterSpacing:"0.14em", textTransform:"uppercase", padding:"0 1rem", marginBottom:6, fontWeight:600 }}>Próximamente</div>
                {["Claims · EpiGen","Journal","AncestrAI"].map(item=>(
                  <div key={item} style={{ padding:"0.36rem 1.1rem", fontSize:"0.67rem", color:t.textMute, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span>{item}</span><span style={{ fontSize:"0.54rem", opacity:0.5 }}>→</span>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div style={{ flex:1, padding:"1.4rem 1.8rem", overflowY:"auto" }}>
                <div style={{ fontSize:"0.6rem", color:t.textMute, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontWeight:600 }}>{activeTab}</div>

                {activeTab==="Resumen"&&(
                  <div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
                      <div style={{ gridColumn:"span 3" }}><Field label="Nombre completo" value={person.name} /></div>
                      <Field label="Nacimiento" value={person.birth} />
                      <Field label="Defunción" value={person.death} />
                      <Field label="Lugar de origen" value={person.place} />
                      <Field label="Sexo" value={person.gender==="m"?"Masculino":"Femenino"} />
                      <Field label="Estado" value={person.verified?"Verificado":"Sin verificar"} />
                    </div>
                    <div style={{ background:t.accentMF, border:`1px solid ${t.accentBorder}`, borderRadius:10, padding:"0.9rem 1.1rem" }}>
                      <div style={{ fontSize:"0.62rem", color:t.accent, marginBottom:7, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>✦ Contexto histórico · AncestrAI</div>
                      <div style={{ fontSize:"0.8rem", color:t.textLow, lineHeight:1.8 }}>
                        {person.name} nació en {person.birth} durante la República Restaurada en México. Su vida abarcó el Porfiriato (1876–1911) y la Revolución Mexicana (1910–1920) — eventos que probablemente marcaron su trayectoria en {person.place}.
                      </div>
                    </div>
                  </div>
                )}

                {activeTab==="Eventos"&&(
                  <div>
                    {EVENTS.map((ev,i)=>(
                      <div key={i} style={{ display:"flex", gap:14, marginBottom:12, background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:10, padding:"0.9rem 1.1rem" }}>
                        <div style={{ width:36,height:36,borderRadius:9,background:t.bgDeep,border:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0 }}>
                          {ev.type==="nacimiento"?"🌱":ev.type==="matrimonio"?"💍":"🕯"}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontSize:"0.85rem", color:t.textHi, fontWeight:600, textTransform:"capitalize" }}>{ev.type}</span>
                            <Badge color={statusColor[ev.status]||t.info}>{ev.status}</Badge>
                          </div>
                          <div style={{ fontSize:"0.72rem", color:t.textLow }}>{ev.date} · {ev.place}</div>
                          {ev.claims>0&&(
                            <div style={{ marginTop:7, background:`${t.claims}08`, border:`1px solid ${t.claims}22`, borderRadius:6, padding:"0.3rem 0.55rem", fontSize:"0.64rem", color:t.claims, fontWeight:500 }}>
                              ⚠ 1 claim alternativo registrado — ver en EpiGen
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab==="Vínculos"&&(
                  <div>
                    {[...person.parents.map(id=>({rel:"Padre / Madre",id})),...person.children.map(id=>({rel:"Hijo / a",id}))].map(v=>{
                      const vp=PEOPLE.find(p=>p.id===v.id);
                      return(
                        <div key={v.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:8, padding:"0.6rem 0.85rem", marginBottom:6 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:7,height:7,borderRadius:"50%",background:vp.gender==="m"?t.male:t.female }} />
                            <span style={{ fontSize:"0.8rem", color:t.textMid, fontWeight:500 }}>{vp.name}</span>
                          </div>
                          <span style={{ fontSize:"0.62rem", color:t.textMute }}>{v.rel}</span>
                        </div>
                      );
                    })}
                    {person.parents.length+person.children.length===0&&<div style={{ color:t.textMute, textAlign:"center", marginTop:24, fontSize:"0.78rem" }}>Sin vínculos registrados</div>}
                  </div>
                )}

                {!["Resumen","Eventos","Vínculos"].includes(activeTab)&&(
                  <div style={{ textAlign:"center", marginTop:50, color:t.textMute }}>
                    <div style={{ fontSize:"2rem", marginBottom:10, opacity:0.3 }}>🔧</div>
                    <div style={{ fontSize:"0.76rem" }}>{activeTab} · en desarrollo</div>
                  </div>
                )}
              </div>

              {/* Right tools panel */}
              <div style={{ width:220, borderLeft:`1px solid ${t.border}`, background:t.bgDeep, padding:"0.9rem", overflowY:"auto", flexShrink:0 }}>
                <SectionLabel t={t}>Herramientas</SectionLabel>
                {[
                  {icon:"✨",label:"Generar hipótesis",sub:"AncestrAI",color:t.warning},
                  {icon:"📖",label:"Crear historia",sub:"AncestrAI",color:t.verified},
                  {icon:"🔍",label:"Buscar fuentes",sub:"GenSense",color:t.info},
                  {icon:"🔗",label:"Compartir ficha",sub:"GenLink",color:t.female},
                ].map(tool=>(
                  <button key={tool.label} style={{ width:"100%", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:8, padding:"0.55rem 0.7rem", cursor:"pointer", textAlign:"left", marginBottom:6, transition:"all 0.12s" }}>
                    <div style={{ fontSize:"0.75rem", color:t.textMid, display:"flex", alignItems:"center", gap:7, marginBottom:2, fontWeight:500 }}><span>{tool.icon}</span>{tool.label}</div>
                    <div style={{ fontSize:"0.6rem", color:tool.color, paddingLeft:22, fontWeight:600 }}>{tool.sub}</div>
                  </button>
                ))}

                <Divider t={t} />
                <SectionLabel t={t}>Journal reciente</SectionLabel>
                {[
                  ["Campo editado","Lugar de nacimiento","2h"],
                  ["Claim añadido","Fecha de nacimiento","1d"],
                  ["Importado GEDCOM","Datos básicos","5d"],
                ].map(([a,d,time])=>(
                  <div key={time} style={{ display:"flex", gap:8, marginBottom:8, padding:"0.42rem 0.55rem", borderRadius:7, background:t.bgCard, border:`1px solid ${t.border}` }}>
                    <div style={{ width:2, borderRadius:2, background:t.accent, alignSelf:"stretch", flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:"0.67rem", color:t.textMid, fontWeight:500 }}>{a}</div>
                      <div style={{ fontSize:"0.6rem", color:t.textMute }}>{d} · hace {time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────────── */}
      <div style={{ height:22, background:t.bgDeep, borderTop:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.25rem", flexShrink:0 }}>
        <div style={{ display:"flex", gap:16 }}>
          {[`${PEOPLE.length} personas`,`${PEOPLE.reduce((a,p)=>a+p.claims,0)} claims totales`,"Kindra 3.1 · Genraph"].map(label=>(
            <span key={label} style={{ fontSize:"0.58rem", color:t.textMute }}>{label}</span>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:"0.58rem", color:t.textMute }}>Tema: {THEMES[themeName].name}</span>
          <span style={{ fontSize:"0.58rem", color:t.textMute }}>·</span>
          <span style={{ fontSize:"0.58rem", color:t.textMute }}>Familia García.gsk · guardado hace 3 min</span>
        </div>
      </div>
    </div>
  );
}
