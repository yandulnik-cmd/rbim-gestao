/** @jsxRuntime classic */
/** @jsx React.createElement */
import React, { useState, useMemo, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[RBIM] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_KEY não configuradas. Verifique o arquivo .env");
}

async function sbFetch(table, options = {}) {
  const { method = "GET", body, params = "", id } = options;
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (id) url += `?id=eq.${id}`;
  else if (params) url += `?${params}`;

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": method === "POST" ? "return=representation" : "return=representation",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Supabase ${method} ${table}:`, err);
    return null;
  }
  if (method === "DELETE" || res.status === 204) return true;
  const text = await res.text();
  return text ? JSON.parse(text) : true;
}

// helper: converte snake_case do banco → camelCase do app
const mapObra       = r => ({ id:r.id, nome:r.nome, inicio:r.inicio, fim:r.fim, contrato:Number(r.contrato), status:r.status });
const mapBanco      = r => ({ id:r.id, nome:r.nome, tipo:r.tipo, agencia:r.agencia, conta:r.conta, saldoInicial:Number(r.saldo_inicial) });
const mapCat        = r => ({ id:r.id, nome:r.nome, subs: Array.isArray(r.subs) ? r.subs : JSON.parse(r.subs||"[]") });
const mapCusto      = r => ({ id:r.id, data:r.data, obra:r.obra, banco:r.banco, fornecedor:r.fornecedor, categoria:r.categoria, subcategoria:r.subcategoria, tipo:r.tipo, natureza:r.natureza, valor:Number(r.valor), obs:r.obs, pagador:r.pagador });
const mapReceita    = r => ({ id:r.id, data:r.data, obra:r.obra, banco:r.banco, medicao:r.medicao, valor:Number(r.valor), obs:r.obs });
const mapOrcamento  = r => ({ id:r.id, obra:r.obra, categoria:r.categoria, subcategoria:r.subcategoria, tipo:r.tipo, natureza:r.natureza, valorOrcado:Number(r.valor_orcado) });
const mapApagar     = r => ({ id:r.id, obra:r.obra, descricao:r.descricao, categoria:r.categoria, subcategoria:r.subcategoria, tipo:r.tipo, natureza:r.natureza, valor:Number(r.valor), vencimento:r.vencimento, fornecedor:r.fornecedor, pagador:r.pagador, banco:r.banco, pago:r.pago, dataPago:r.data_pago });

// ─── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

// ─── THEME ────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);

// Google Fonts import injected once
if (typeof document !== "undefined" && !document.getElementById("rbim-fonts")) {
  const link = document.createElement("link");
  link.id = "rbim-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap";
  document.head.appendChild(link);

  // viewport meta for mobile
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
    document.head.appendChild(meta);
  }
}

// ── SVG Background Pattern ───────────────────────────────────────────────────
function BgPattern({ dark }) {
  const c1 = dark ? "rgba(91,155,255," : "rgba(45,110,231,";
  const c2 = dark ? "rgba(180,156,255," : "rgba(109,76,224,";
  // opacities — slightly more visible so it actually shows
  const g = dark ? 0.06 : 0.055;   // grid fine
  const gL = dark ? 0.09 : 0.08;  // grid large
  const s = dark ? 0.06 : 0.06;   // structures
  const s2 = dark ? 0.05 : 0.05;  // structures secondary

  return (
    <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
        <defs>
          <pattern id="rbim-grid-sm" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={c1+g+")"} strokeWidth="0.6"/>
          </pattern>
          <pattern id="rbim-grid-lg" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke={c1+gL+")"} strokeWidth="1"/>
          </pattern>
        </defs>
        {/* Blueprint grid */}
        <rect width="100%" height="100%" fill="url(#rbim-grid-sm)"/>
        <rect width="100%" height="100%" fill="url(#rbim-grid-lg)"/>

        {/* Diagonal truss lines */}
        <line x1="0" y1="35%" x2="25%" y2="0" stroke={c1+s+")"} strokeWidth="1.2"/>
        <line x1="60%" y1="100%" x2="100%" y2="55%" stroke={c2+s2+")"} strokeWidth="1"/>
        <line x1="15%" y1="100%" x2="75%" y2="10%" stroke={c1+(s*0.6)+")"} strokeWidth="0.7"/>
        <line x1="80%" y1="0" x2="100%" y2="30%" stroke={c2+(s*0.5)+")"} strokeWidth="0.6"/>

        {/* Isometric beam (top-right area) */}
        <polygon points="78%,8% 82%,5.5% 86%,8% 86%,11% 82%,13.5% 78%,11%" fill="none" stroke={c1+s+")"} strokeWidth="1"/>
        <line x1="78%" y1="8%" x2="78%" y2="11%" stroke={c1+(s*0.7)+")"} strokeWidth="0.6"/>
        <line x1="82%" y1="5.5%" x2="82%" y2="13.5%" stroke={c1+(s*0.7)+")"} strokeWidth="0.6"/>
        <line x1="86%" y1="8%" x2="86%" y2="11%" stroke={c1+(s*0.7)+")"} strokeWidth="0.6"/>

        {/* Building silhouettes (bottom-left) */}
        <rect x="5%" y="72%" width="5%" height="18%" rx="2" fill="none" stroke={c2+s+")"} strokeWidth="1"/>
        <rect x="11%" y="65%" width="4%" height="25%" rx="2" fill="none" stroke={c1+s+")"} strokeWidth="1"/>
        <rect x="16%" y="68%" width="6%" height="22%" rx="2" fill="none" stroke={c2+s2+")"} strokeWidth="0.8"/>
        <rect x="23%" y="75%" width="3.5%" height="15%" rx="2" fill="none" stroke={c1+(s*0.7)+")"} strokeWidth="0.7"/>

        {/* Crane */}
        <line x1="13%" y1="65%" x2="13%" y2="48%" stroke={c1+s+")"} strokeWidth="1.2"/>
        <line x1="13%" y1="48%" x2="30%" y2="48%" stroke={c1+s+")"} strokeWidth="1"/>
        <line x1="30%" y1="48%" x2="30%" y2="54%" stroke={c1+s2+")"} strokeWidth="0.6" strokeDasharray="4,3"/>
        <line x1="13%" y1="48%" x2="8%" y2="52%" stroke={c1+(s*0.7)+")"} strokeWidth="0.7"/>
        <circle cx="13%" cy="48%" r="2.5" fill={c1+s+")"}/>
        <circle cx="30%" cy="54%" r="1.5" fill={c1+s2+")"}/>

        {/* Bridge/arch (bottom-center) */}
        <path d="M 45%,88% Q 55%,76% 65%,88%" fill="none" stroke={c1+s+")"} strokeWidth="1.2"/>
        <line x1="49%" y1="88%" x2="49%" y2="82%" stroke={c1+s2+")"} strokeWidth="0.6"/>
        <line x1="55%" y1="88%" x2="55%" y2="78%" stroke={c1+s2+")"} strokeWidth="0.6"/>
        <line x1="61%" y1="88%" x2="61%" y2="82%" stroke={c1+s2+")"} strokeWidth="0.6"/>

        {/* Dimension line (top-center) */}
        <line x1="38%" y1="16%" x2="58%" y2="16%" stroke={c1+s+")"} strokeWidth="0.7"/>
        <line x1="38%" y1="14.5%" x2="38%" y2="17.5%" stroke={c1+s+")"} strokeWidth="0.7"/>
        <line x1="58%" y1="14.5%" x2="58%" y2="17.5%" stroke={c1+s+")"} strokeWidth="0.7"/>
        <circle cx="38%" cy="16%" r="2" fill={c1+s+")"}/>
        <circle cx="58%" cy="16%" r="2" fill={c1+s+")"}/>

        {/* Triangle truss (right area) */}
        <polygon points="72%,30% 78%,20% 84%,30%" fill="none" stroke={c2+s+")"} strokeWidth="1"/>
        <line x1="75%" y1="25%" x2="81%" y2="25%" stroke={c2+s2+")"} strokeWidth="0.6"/>

        {/* Cross brace (mid-left) */}
        <line x1="3%" y1="35%" x2="12%" y2="48%" stroke={c1+(s*0.5)+")"} strokeWidth="0.5"/>
        <line x1="12%" y1="35%" x2="3%" y2="48%" stroke={c1+(s*0.5)+")"} strokeWidth="0.5"/>
        <rect x="3%" y="35%" width="9%" height="13%" fill="none" stroke={c1+(s*0.4)+")"} strokeWidth="0.5"/>

        {/* Scattered structural dots */}
        <circle cx="50%" cy="50%" r="1.5" fill={c1+(s*0.6)+")"}/>
        <circle cx="90%" cy="40%" r="1.5" fill={c2+(s*0.5)+")"}/>
        <circle cx="70%" cy="70%" r="1.5" fill={c1+(s*0.5)+")"}/>
        <circle cx="25%" cy="25%" r="1.5" fill={c2+(s*0.5)+")"}/>

        {/* Retaining wall profile (bottom-right) */}
        <path d="M 85%,92% L 85%,78% L 88%,75% L 88%,92% Z" fill="none" stroke={c2+s+")"} strokeWidth="0.8"/>
        <line x1="85%" y1="82%" x2="88%" y2="82%" stroke={c2+s2+")"} strokeWidth="0.5"/>
        <line x1="85%" y1="86%" x2="88%" y2="86%" stroke={c2+s2+")"} strokeWidth="0.5"/>

        {/* Foundation hatching */}
        <line x1="85%" y1="92%" x2="92%" y2="92%" stroke={c2+(s*0.7)+")"} strokeWidth="0.6"/>
        <line x1="85.5%" y1="93.5%" x2="91.5%" y2="93.5%" stroke={c2+(s*0.5)+")"} strokeWidth="0.4"/>
        <line x1="86%" y1="95%" x2="91%" y2="95%" stroke={c2+(s*0.3)+")"} strokeWidth="0.3"/>
      </svg>

      {/* Gradient overlays for depth */}
      <div style={{
        position:"absolute",inset:0,
        background: dark
          ? "radial-gradient(ellipse 90% 60% at 15% -15%, rgba(91,155,255,0.14) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 85% 105%, rgba(180,156,255,0.09) 0%, transparent 55%), radial-gradient(ellipse 40% 30% at 50% 50%, rgba(6,11,22,0.3) 0%, transparent 100%)"
          : "radial-gradient(ellipse 90% 55% at 15% -10%, rgba(45,110,231,0.08) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 90% 105%, rgba(109,76,224,0.06) 0%, transparent 55%)"
      }}/>
    </div>
  );
}

const DARK = {
  bg:"#060B16",
  surface:"rgba(255,255,255,0.04)",
  surface2:"rgba(255,255,255,0.065)",
  surfaceSolid:"#0D1321",
  border:"rgba(255,255,255,0.08)",
  border2:"rgba(255,255,255,0.13)",
  text:"#EDF2FF",
  text2:"#8D99B4",
  text3:"#525E78",
  accent:"#5B9BFF",
  accent2:"#B49CFF",
  danger:"#FF7090",
  success:"#3DE8A0",
  info:"#42CAFE",
  inputBg:"rgba(255,255,255,0.045)",
  rowAlt:"rgba(255,255,255,0.02)",
  shadow:"0 4px 28px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
  shadowHover:"0 8px 40px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
  glassBg:"rgba(255,255,255,0.035)",
  glassBlur:"blur(20px)",
  glassBorder:"rgba(255,255,255,0.08)",
  glassHighlight:"inset 0 1px 0 rgba(255,255,255,0.06)",
  tagBg:"22",
  fontFamily:"'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
  fontDisplay:"'Syne', 'SF Pro Display', -apple-system, sans-serif",
};
const LIGHT = {
  bg:"#EEF2F9",
  surface:"rgba(255,255,255,0.65)",
  surface2:"rgba(255,255,255,0.80)",
  surfaceSolid:"#FFFFFF",
  border:"rgba(55,75,120,0.10)",
  border2:"rgba(55,75,120,0.18)",
  text:"#0C1629",
  text2:"#3D4F6F",
  text3:"#7A879E",
  accent:"#2D6EE7",
  accent2:"#6D4CE0",
  danger:"#E8364F",
  success:"#0DA66C",
  info:"#0880C7",
  inputBg:"rgba(255,255,255,0.80)",
  rowAlt:"rgba(55,75,120,0.028)",
  shadow:"0 4px 24px rgba(15,25,50,0.07), 0 1px 3px rgba(15,25,50,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
  shadowHover:"0 8px 36px rgba(15,25,50,0.10), 0 2px 6px rgba(15,25,50,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
  glassBg:"rgba(255,255,255,0.55)",
  glassBlur:"blur(24px)",
  glassBorder:"rgba(55,75,120,0.10)",
  glassHighlight:"inset 0 1px 0 rgba(255,255,255,0.95)",
  tagBg:"18",
  fontFamily:"'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
  fontDisplay:"'Syne', 'SF Pro Display', -apple-system, sans-serif",
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_OBRAS = [
  {id:1,nome:"Barracao Vere",inicio:"2025-12-01",fim:"2026-08-01",contrato:735000,status:"Em andamento"},
  {id:2,nome:"Camelodromo",inicio:"2026-02-01",fim:"2026-04-01",contrato:63119.43,status:"Em andamento"},
  {id:3,nome:"Gisele",inicio:"2026-02-01",fim:"2026-07-01",contrato:155000,status:"Em andamento"},
  {id:4,nome:"Prefeitura",inicio:"2026-02-01",fim:"2026-09-01",contrato:545000,status:"Em andamento"},
  {id:5,nome:"Gilvana",inicio:"2026-03-01",fim:"2026-12-01",contrato:370000,status:"Planejada"},
  {id:6,nome:"Muro",inicio:"2026-04-01",fim:"2026-06-01",contrato:150000,status:"Planejada"},
];
const SEED_BANCOS = [
  {id:1,nome:"Sicredi",tipo:"Conta Corrente",agencia:"0001",conta:"12345-6",saldoInicial:15000},
  {id:2,nome:"Nubank",tipo:"Conta Digital",agencia:"-",conta:"98765-4",saldoInicial:5000},
  {id:3,nome:"Bradesco",tipo:"Conta Corrente",agencia:"1234",conta:"00001-0",saldoInicial:2000},
];
const SEED_CATS = [
  {id:1,nome:"SERVIÇOS PRELIMINARES",subs:["BARRACO","PLACA DE OBRA","TAPUME","FERRAMENTAS"]},
  {id:2,nome:"ESTRUTURA",subs:["MATERIAL BRUTO","FERRAGEM","MADEIRA","CONCRETAGEM"]},
  {id:3,nome:"COBERTURA",subs:["TELHAS","CALHA","RUFO","ACM","ESTRUTURA"]},
  {id:4,nome:"ALVENARIA",subs:["TIJOLO","REBOCO","ARGAMASSA","CAL","MATERIAL BRUTO"]},
  {id:5,nome:"MÃO DE OBRA",subs:["SALARIO","AJUDANTE","EMPREITA","PEDREIRO"]},
  {id:6,nome:"PISO",subs:["CONCRETAGEM","CERÂMICA","PORCELANATO","REJUNTE"]},
  {id:7,nome:"INSTALAÇÃO HIDRO",subs:["ESGOTO","ÁGUA FRIA","ÁGUA QUENTE","CONEXÕES"]},
  {id:8,nome:"INSTALAÇÃO ELÉTRICA",subs:["FIAÇÃO","QUADRO","TOMADAS","ILUMINAÇÃO"]},
  {id:9,nome:"PINTURA",subs:["TINTA","MASSA CORRIDA","FUNDO","TEXTURA"]},
  {id:10,nome:"ACABAMENTOS",subs:["ACM","FORRO","ESQUADRIA","VIDRO"]},
  {id:11,nome:"CUSTOS INDIRETOS",subs:["HOSPEDAGEM","ALIMENTAÇÃO","COMBUSTÍVEL","FERRAMENTAS","ANDAIME","OUTROS"]},
  {id:12,nome:"CUSTOS ADMINISTRATIVOS",subs:["DOCUMENTAÇÃO","ART","IMPRESSÕES","CARTÓRIO","BANCO"]},
  {id:13,nome:"REVESTIMENTO",subs:["CERÂMICA","PORCELANATO","AZULEJO","OUTROS"]},
  {id:14,nome:"LOGISTICA",subs:["FRETE","COMBUSTÍVEL","HOSPEDAGEM","ALIMENTAÇÃO"]},
];
// ─── ÍCONES POR CATEGORIA ────────────────────────────────────────────────────
const CAT_ICONS = {
  "SERVIÇOS PRELIMINARES": "🔧",
  "ESTRUTURA":             "🏗️",
  "COBERTURA":             "🏠",
  "ALVENARIA":             "🧱",
  "MÃO DE OBRA":           "👷",
  "PISO":                  "🪵",
  "INSTALAÇÃO HIDRO":      "🚿",
  "INSTALAÇÃO ELÉTRICA":   "⚡",
  "PINTURA":               "🎨",
  "ACABAMENTOS":           "✨",
  "CUSTOS INDIRETOS":      "📦",
  "CUSTOS ADMINISTRATIVOS":"📋",
  "REVESTIMENTO":          "🪟",
  "LOGISTICA":             "🚚",
};
const CAT_COLORS = {
  "SERVIÇOS PRELIMINARES": "#06B6D4",
  "ESTRUTURA":             "#F97316",
  "COBERTURA":             "#8B5CF6",
  "ALVENARIA":             "#EF4444",
  "MÃO DE OBRA":           "#F59E0B",
  "PISO":                  "#D97706",
  "INSTALAÇÃO HIDRO":      "#10B981",
  "INSTALAÇÃO ELÉTRICA":   "#FBBF24",
  "PINTURA":               "#EC4899",
  "ACABAMENTOS":           "#14B8A6",
  "CUSTOS INDIRETOS":      "#6366F1",
  "CUSTOS ADMINISTRATIVOS":"#0EA5E9",
  "REVESTIMENTO":          "#84CC16",
  "LOGISTICA":             "#E11D48",
};
// auto-fill tipo+natureza por subcategoria (baseado no template padrão)
const SUB_AUTOFILL = {
  "SALARIO":       {tipo:"Direto",        natureza:"Mão de Obra"},
  "EMPREITA":      {tipo:"Direto",        natureza:"Mão de Obra"},
  "AJUDANTE":      {tipo:"Direto",        natureza:"Mão de Obra"},
  "PEDREIRO":      {tipo:"Direto",        natureza:"Mão de Obra"},
  "TELHAS":        {tipo:"Direto",        natureza:"Material"},
  "FERRAGEM":      {tipo:"Direto",        natureza:"Material"},
  "MADEIRA":       {tipo:"Direto",        natureza:"Material"},
  "TINTA":         {tipo:"Direto",        natureza:"Material"},
  "MASSA CORRIDA": {tipo:"Direto",        natureza:"Material"},
  "CERÂMICA":      {tipo:"Direto",        natureza:"Material"},
  "PORCELANATO":   {tipo:"Direto",        natureza:"Material"},
  "TIJOLO":        {tipo:"Direto",        natureza:"Material"},
  "ARGAMASSA":     {tipo:"Direto",        natureza:"Material"},
  "FIAÇÃO":        {tipo:"Direto",        natureza:"Material"},
  "ART":           {tipo:"Administrativo",natureza:"Material"},
  "DOCUMENTAÇÃO":  {tipo:"Administrativo",natureza:"Material"},
  "CARTÓRIO":      {tipo:"Administrativo",natureza:"Material"},
  "HOSPEDAGEM":    {tipo:"Indireto (BDI)",natureza:"Material"},
  "ALIMENTAÇÃO":   {tipo:"Indireto (BDI)",natureza:"Material"},
  "COMBUSTÍVEL":   {tipo:"Indireto (BDI)",natureza:"Material"},
  "ANDAIME":       {tipo:"Indireto (BDI)",natureza:"Equipamento"},
  "FERRAMENTAS":   {tipo:"Indireto (BDI)",natureza:"Equipamento"},
  "BETONEIRA":     {tipo:"Indireto (BDI)",natureza:"Equipamento"},
  "CONCRETAGEM":   {tipo:"Direto",        natureza:"Mão de Obra"},
  "ESGOTO":        {tipo:"Direto",        natureza:"Material"},
  "ÁGUA FRIA":     {tipo:"Direto",        natureza:"Material"},
  "FRETE":         {tipo:"Indireto (BDI)",natureza:"Material"},
};

const TIPOS_CUSTO = ["Direto","Indireto (BDI)","Administrativo","Investimento"];
const NATUREZAS = ["Mão de Obra","Material","Equipamento"];
const STATUS_OBRA = ["Planejada","Em andamento","Pausada","Concluída"];
const FORMA_PAG = ["PIX","Transferência","Cheque","Dinheiro","Boleto"];

const SEED_CUSTOS = [
  {id:1,data:"2025-12-17",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"BENDER",categoria:"SERVIÇOS PRELIMINARES",subcategoria:"BARRACO",tipo:"Direto",natureza:"Material",valor:630,obs:"ESCORAS PARA TAPUME",pagador:"JF"},
  {id:2,data:"2025-12-22",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"GRAFICA",categoria:"SERVIÇOS PRELIMINARES",subcategoria:"PLACA DE OBRA",tipo:"Direto",natureza:"Material",valor:1080,obs:"PLACA DE OBRA",pagador:"RBIM"},
  {id:3,data:"2025-12-22",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"MADEIRA",categoria:"SERVIÇOS PRELIMINARES",subcategoria:"BARRACO",tipo:"Direto",natureza:"Material",valor:2012.5,obs:"MADEIRAS PARA BARRACO",pagador:"JF"},
  {id:4,data:"2025-12-22",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"CREA",categoria:"CUSTOS ADMINISTRATIVOS",subcategoria:"ART",tipo:"Administrativo",natureza:"Material",valor:271.47,obs:"ART",pagador:"RBIM"},
  {id:5,data:"2026-01-05",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"BORTOLOTTO",categoria:"COBERTURA",subcategoria:"TELHAS",tipo:"Direto",natureza:"Material",valor:20241.47,obs:"TELHAS COMPRA",pagador:"JF"},
  {id:6,data:"2026-01-06",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"",categoria:"CUSTOS INDIRETOS",subcategoria:"FERRAMENTAS",tipo:"Indireto (BDI)",natureza:"Equipamento",valor:5340,obs:"BETONEIRA",pagador:"JF"},
  {id:7,data:"2026-01-12",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"",categoria:"ESTRUTURA",subcategoria:"MATERIAL BRUTO",tipo:"Direto",natureza:"Material",valor:627,obs:"AREIA MEDIA",pagador:"RBIM"},
  {id:8,data:"2026-01-27",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"",categoria:"INSTALAÇÃO HIDRO",subcategoria:"ESGOTO",tipo:"Direto",natureza:"Material",valor:1380,obs:"PEÇAS E CONEXÕES",pagador:"RBIM"},
  {id:9,data:"2026-02-10",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"",categoria:"PISO",subcategoria:"CONCRETAGEM",tipo:"Direto",natureza:"Mão de Obra",valor:4500,obs:"MAO DE OBRA CONCRETAGEM PISO",pagador:"RBIM"},
  {id:10,data:"2026-02-10",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"",categoria:"MÃO DE OBRA",subcategoria:"SALARIO",tipo:"Direto",natureza:"Mão de Obra",valor:2400,obs:"SALARIO NEY",pagador:"RBIM"},
  {id:11,data:"2026-02-10",obra:"Barracao Vere",banco:"Sicredi",fornecedor:"",categoria:"MÃO DE OBRA",subcategoria:"SALARIO",tipo:"Direto",natureza:"Mão de Obra",valor:4800,obs:"SALARIO ALEXANDRE",pagador:"RBIM"},
  {id:12,data:"2026-02-13",obra:"Camelodromo",banco:"Sicredi",fornecedor:"",categoria:"MÃO DE OBRA",subcategoria:"SALARIO",tipo:"Direto",natureza:"Mão de Obra",valor:2000,obs:"Mao de obra",pagador:"RBIM"},
  {id:13,data:"2026-02-13",obra:"Camelodromo",banco:"Sicredi",fornecedor:"",categoria:"PINTURA",subcategoria:"TINTA",tipo:"Direto",natureza:"Material",valor:868.9,obs:"Materiais pintura",pagador:"RBIM"},
  {id:14,data:"2026-02-13",obra:"Camelodromo",banco:"Sicredi",fornecedor:"",categoria:"COBERTURA",subcategoria:"ESTRUTURA",tipo:"Direto",natureza:"Material",valor:6183.84,obs:"Perfil e telhas",pagador:"JF"},
  {id:15,data:"2026-02-20",obra:"Prefeitura",banco:"Sicredi",fornecedor:"MIQUIM",categoria:"MÃO DE OBRA",subcategoria:"EMPREITA",tipo:"Direto",natureza:"Mão de Obra",valor:10000,obs:"MAO DE OBRA",pagador:"RBIM"},
  {id:16,data:"2026-02-20",obra:"Gisele",banco:"Sicredi",fornecedor:"VALDECI",categoria:"MÃO DE OBRA",subcategoria:"EMPREITA",tipo:"Direto",natureza:"Mão de Obra",valor:7000,obs:"MAO DE OBRA",pagador:"RBIM"},
  {id:17,data:"2026-02-25",obra:"Prefeitura",banco:"Sicredi",fornecedor:"MIQUIM",categoria:"MÃO DE OBRA",subcategoria:"EMPREITA",tipo:"Direto",natureza:"Mão de Obra",valor:5000,obs:"MÃO DE OBRA PREFEITURA",pagador:"RBIM"},
  {id:18,data:"2026-03-02",obra:"Camelodromo",banco:"Sicredi",fornecedor:"CREA",categoria:"CUSTOS ADMINISTRATIVOS",subcategoria:"ART",tipo:"Administrativo",natureza:"Material",valor:108.39,obs:"ART",pagador:"RBIM"},
  {id:19,data:"2026-03-04",obra:"Camelodromo",banco:"Nubank",fornecedor:"MASSA",categoria:"REVESTIMENTO",subcategoria:"OUTROS",tipo:"Direto",natureza:"Material",valor:2638,obs:"MASSA CORRIDA",pagador:"RBIM"},
];
const SEED_RECEITAS = [
  {id:1,data:"2026-01-15",obra:"Barracao Vere",banco:"Sicredi",medicao:"01",valor:50000,obs:"Medição inicial"},
  {id:2,data:"2026-02-15",obra:"Barracao Vere",banco:"Sicredi",medicao:"02",valor:40000,obs:"Medição fevereiro"},
  {id:3,data:"2026-02-20",obra:"Prefeitura",banco:"Sicredi",medicao:"01",valor:80000,obs:"Adiantamento"},
];
const SEED_ORCAMENTO = [
  {id:1,obra:"Barracao Vere",categoria:"SERVIÇOS PRELIMINARES",subcategoria:"BARRACO",tipo:"Direto",natureza:"Material",valorOrcado:8000},
  {id:2,obra:"Barracao Vere",categoria:"COBERTURA",subcategoria:"TELHAS",tipo:"Direto",natureza:"Material",valorOrcado:30000},
  {id:3,obra:"Barracao Vere",categoria:"MÃO DE OBRA",subcategoria:"SALARIO",tipo:"Direto",natureza:"Mão de Obra",valorOrcado:60000},
  {id:4,obra:"Barracao Vere",categoria:"ESTRUTURA",subcategoria:"MATERIAL BRUTO",tipo:"Direto",natureza:"Material",valorOrcado:25000},
  {id:5,obra:"Barracao Vere",categoria:"PISO",subcategoria:"CONCRETAGEM",tipo:"Direto",natureza:"Mão de Obra",valorOrcado:15000},
  {id:6,obra:"Camelodromo",categoria:"MÃO DE OBRA",subcategoria:"SALARIO",tipo:"Direto",natureza:"Mão de Obra",valorOrcado:12000},
  {id:7,obra:"Camelodromo",categoria:"PINTURA",subcategoria:"TINTA",tipo:"Direto",natureza:"Material",valorOrcado:5000},
  {id:8,obra:"Prefeitura",categoria:"MÃO DE OBRA",subcategoria:"EMPREITA",tipo:"Direto",natureza:"Mão de Obra",valorOrcado:80000},
];
const SEED_APAGAR = [
  {id:90,obra:"Barracao Vere",descricao:"PARCELA ANDAIME",categoria:"CUSTOS INDIRETOS",subcategoria:"ANDAIME",tipo:"Indireto (BDI)",natureza:"Equipamento",valor:1200,vencimento:"2026-03-10",fornecedor:"LOCADORA",pagador:"RBIM",banco:"Sicredi",pago:false},
  {id:91,obra:"Camelodromo",descricao:"SALDO TELHAS",categoria:"COBERTURA",subcategoria:"TELHAS",tipo:"Direto",natureza:"Material",valor:3500,vencimento:"2026-03-05",fornecedor:"BORTOLOTTO",pagador:"JF",banco:"Sicredi",pago:false},
  {id:92,obra:"Prefeitura",descricao:"MIQUIM 3ª PARCELA",categoria:"MÃO DE OBRA",subcategoria:"EMPREITA",tipo:"Direto",natureza:"Mão de Obra",valor:5000,vencimento:"2026-03-13",fornecedor:"MIQUIM",pagador:"RBIM",banco:"Sicredi",pago:false},
];

// ─── DEFAULT BUDGET TEMPLATE CONFIG ─────────────────────────────────────────
// Adicione novas macroetapas aqui — o UI renderiza automaticamente
const DEFAULT_BUDGET_TEMPLATE = [
  {
    etapa: "SERVIÇOS PRELIMINARES",
    icone: "🔧",
    cor: "#06B6D4",
    itens: [
      { subcategoria: "BARRACO",       tipo: "Indireto (BDI)", natureza: "Material"    },
      { subcategoria: "PLACA DE OBRA", tipo: "Administrativo", natureza: "Material"    },
      { subcategoria: "TAPUME",        tipo: "Indireto (BDI)", natureza: "Material"    },
      { subcategoria: "FERRAMENTAS",   tipo: "Indireto (BDI)", natureza: "Equipamento" },
    ],
  },
  {
    etapa: "ESTRUTURA",
    icone: "🏗️",
    cor: "#F97316",
    itens: [
      { subcategoria: "MATERIAL BRUTO", tipo: "Direto",         natureza: "Material"    },
      { subcategoria: "FERRAGEM",       tipo: "Direto",         natureza: "Material"    },
      { subcategoria: "MADEIRA",        tipo: "Direto",         natureza: "Material"    },
      { subcategoria: "CONCRETAGEM",    tipo: "Direto",         natureza: "Mão de Obra" },
    ],
  },
  {
    etapa: "ALVENARIA",
    icone: "🧱",
    cor: "#EF4444",
    itens: [
      { subcategoria: "TIJOLO",        tipo: "Direto", natureza: "Material"    },
      { subcategoria: "REBOCO",        tipo: "Direto", natureza: "Material"    },
      { subcategoria: "ARGAMASSA",     tipo: "Direto", natureza: "Material"    },
      { subcategoria: "CAL",           tipo: "Direto", natureza: "Material"    },
    ],
  },
  {
    etapa: "COBERTURA",
    icone: "🏠",
    cor: "#8B5CF6",
    itens: [
      { subcategoria: "TELHAS",    tipo: "Direto", natureza: "Material" },
      { subcategoria: "CALHA",     tipo: "Direto", natureza: "Material" },
      { subcategoria: "ESTRUTURA", tipo: "Direto", natureza: "Material" },
      { subcategoria: "RUFO",      tipo: "Direto", natureza: "Material" },
    ],
  },
  {
    etapa: "INSTALAÇÃO HIDRO",
    icone: "🚿",
    cor: "#10B981",
    itens: [
      { subcategoria: "ESGOTO",       tipo: "Direto", natureza: "Material" },
      { subcategoria: "ÁGUA FRIA",    tipo: "Direto", natureza: "Material" },
      { subcategoria: "ÁGUA QUENTE",  tipo: "Direto", natureza: "Material" },
      { subcategoria: "CONEXÕES",     tipo: "Direto", natureza: "Material" },
    ],
  },
  {
    etapa: "INSTALAÇÃO ELÉTRICA",
    icone: "⚡",
    cor: "#FBBF24",
    itens: [
      { subcategoria: "FIAÇÃO",     tipo: "Direto", natureza: "Material" },
      { subcategoria: "QUADRO",     tipo: "Direto", natureza: "Material" },
      { subcategoria: "TOMADAS",    tipo: "Direto", natureza: "Material" },
      { subcategoria: "ILUMINAÇÃO", tipo: "Direto", natureza: "Material" },
    ],
  },
  {
    etapa: "PISO",
    icone: "🪵",
    cor: "#D97706",
    itens: [
      { subcategoria: "CONCRETAGEM",  tipo: "Direto", natureza: "Mão de Obra" },
      { subcategoria: "CERÂMICA",     tipo: "Direto", natureza: "Material"    },
      { subcategoria: "PORCELANATO",  tipo: "Direto", natureza: "Material"    },
      { subcategoria: "REJUNTE",      tipo: "Direto", natureza: "Material"    },
    ],
  },
  {
    etapa: "PINTURA",
    icone: "🎨",
    cor: "#EC4899",
    itens: [
      { subcategoria: "TINTA",         tipo: "Direto", natureza: "Material"    },
      { subcategoria: "MASSA CORRIDA", tipo: "Direto", natureza: "Material"    },
      { subcategoria: "FUNDO",         tipo: "Direto", natureza: "Material"    },
      { subcategoria: "MÃO DE OBRA",   tipo: "Direto", natureza: "Mão de Obra" },
    ],
  },
  {
    etapa: "MÃO DE OBRA",
    icone: "👷",
    cor: "#F59E0B",
    itens: [
      { subcategoria: "SALARIO",  tipo: "Direto", natureza: "Mão de Obra" },
      { subcategoria: "EMPREITA", tipo: "Direto", natureza: "Mão de Obra" },
      { subcategoria: "AJUDANTE", tipo: "Direto", natureza: "Mão de Obra" },
    ],
  },
  {
    etapa: "CUSTOS INDIRETOS",
    icone: "📦",
    cor: "#6366F1",
    itens: [
      { subcategoria: "HOSPEDAGEM",  tipo: "Indireto (BDI)", natureza: "Material"    },
      { subcategoria: "ALIMENTAÇÃO", tipo: "Indireto (BDI)", natureza: "Material"    },
      { subcategoria: "COMBUSTÍVEL", tipo: "Indireto (BDI)", natureza: "Material"    },
      { subcategoria: "FERRAMENTAS", tipo: "Indireto (BDI)", natureza: "Equipamento" },
      { subcategoria: "ANDAIME",     tipo: "Indireto (BDI)", natureza: "Equipamento" },
    ],
  },
  {
    etapa: "CUSTOS ADMINISTRATIVOS",
    icone: "📋",
    cor: "#14B8A6",
    itens: [
      { subcategoria: "ART",        tipo: "Administrativo", natureza: "Material" },
      { subcategoria: "DOCUMENTAÇÃO",tipo: "Administrativo", natureza: "Material" },
      { subcategoria: "IMPRESSÕES", tipo: "Administrativo", natureza: "Material" },
      { subcategoria: "CARTÓRIO",   tipo: "Administrativo", natureza: "Material" },
    ],
  },
];

const PALETTE = ["#F97316","#EF4444","#8B5CF6","#06B6D4","#10B981","#F59E0B","#3B82F6","#EC4899","#14B8A6","#84CC16","#6366F1","#E11D48","#D97706","#0EA5E9"];
const fmt = v => (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDec = fmt; // alias mantido por compatibilidade
const todayStr = () => new Date().toISOString().split("T")[0];
const getMes = d => { if(!d) return ""; const [y,m]=d.split("-"); return `${m}/${y.slice(2)}`; };
/** Ordena strings "MM/AA" cronologicamente */
const sortMes = (a,b) => {
  const [ma,ya] = a.split("/"); const [mb,yb] = b.split("/");
  const na = (parseInt(ya)||0)*100 + (parseInt(ma)||0);
  const nb = (parseInt(yb)||0)*100 + (parseInt(mb)||0);
  return na - nb;
};
let _nextId = 200;
const nid = () => ++_nextId;

// ─── CURRENCY INPUT — utilitários e componente ───────────────────────────────

/** Remove tudo que não for dígito */
const parseCurrency = (str) => {
  if (str === null || str === undefined || str === "") return 0;
  // aceita tanto "150.000,00" quanto "150000" quanto "150000.00"
  const cleaned = String(str)
    .replace(/[R$\s]/g, "")   // remove símbolo e espaços
    .replace(/\./g, "")        // remove separadores de milhar (ponto BR)
    .replace(",", ".");        // troca vírgula decimal por ponto
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

/** number → "150.000,00" (sem R$, para usar dentro do input) */
const formatCurrencyDisplay = (num) => {
  const n = typeof num === "number" ? num : parseCurrency(num);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * CurrencyInput — input monetário BRL com máscara em tempo real.
 *
 * Props:
 *   value     {number}   valor numérico limpo (estado pai)
 *   onChange  {fn}       recebe number limpo
 *   label     {string}
 *   required  {bool}
 *   inputStyle {object}  herda do tema atual
 *   labelStyle {object}
 *   T          {object}  tema (para cores dos botões)
 */
function CurrencyInput({ value, onChange, label, required, inputStyle, labelStyle, T }) {
  // display string separado do valor numérico limpo
  const [display, setDisplay] = useState(() =>
    value ? formatCurrencyDisplay(value) : ""
  );

  // sincroniza display quando o valor externo muda (ex: reset de form)
  const prevValue = useState(value)[0];
  if (prevValue !== value && value === 0 && display !== "") {
    // reset externo: limpa display
  }

  const handleChange = (e) => {
    const raw = e.target.value;

    // permite campo vazio (apagar tudo)
    if (raw === "") {
      setDisplay("");
      onChange(0);
      return;
    }

    // extrai apenas dígitos
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      setDisplay("");
      onChange(0);
      return;
    }

    // interpreta como centavos: "15000" → 150,00
    const cents = parseInt(digits, 10);
    const numeric = cents / 100;
    setDisplay(formatCurrencyDisplay(numeric));
    onChange(numeric);
  };

  // ao colar: re-parseia o texto colado
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const numeric = parseCurrency(pasted);
    if (numeric >= 0) {
      setDisplay(formatCurrencyDisplay(numeric));
      onChange(numeric);
    }
  };

  const handleFocus = (e) => e.target.select();

  const step = (delta) => {
    const current = parseCurrency(display);
    const next = Math.max(0, current + delta);
    setDisplay(formatCurrencyDisplay(next));
    onChange(next);
  };

  const btnStep = {
    background: "transparent",
    border: `1px solid ${T.border2}`,
    color: T.text2,
    borderRadius: 6,
    padding: "0 10px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: T.fontFamily || "inherit",
    height: "100%",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "background 0.15s, color 0.15s",
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>
        {label || "Valor (R$)"}
        {required && <span style={{ color: T.danger, marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ display: "flex", gap: 0, height: 40, borderRadius: 10, overflow: "hidden", boxShadow: `0 0 0 1px ${T.border2}` }}>
        {/* prefixo R$ */}
        <span style={{
          display: "flex", alignItems: "center", padding: "0 12px",
          background: T.surface2, fontSize: 12, color: T.text3, fontWeight: 500,
          flexShrink: 0, borderRight: `1px solid ${T.border2}`,
        }}>R$</span>

        {/* input principal */}
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onPaste={handlePaste}
          onFocus={handleFocus}
          placeholder="0,00"
          style={{
            ...inputStyle,
            borderRadius: 0,
            textAlign: "right",
            fontWeight: 700,
            fontSize: 14,
            flex: 1,
            height: "100%",
            boxSizing: "border-box",
            // highlight verde leve quando tem valor
            borderColor: parseCurrency(display) > 0 ? T.success + "88" : undefined,
          }}
        />

        {/* botão -1000 */}
        <button
          type="button"
          onClick={() => step(-1000)}
          style={{ ...btnStep, borderRadius: 0, borderLeft: "none", borderRight: "none" }}
          onMouseEnter={e => { e.currentTarget.style.background = T.danger + "22"; e.currentTarget.style.color = T.danger; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.text2; }}
          title="Subtrair R$ 1.000"
        >−1k</button>

        {/* botão +1000 */}
        <button
          type="button"
          onClick={() => step(1000)}
          style={{ ...btnStep, borderRadius: "0 7px 7px 0", borderLeft: "none" }}
          onMouseEnter={e => { e.currentTarget.style.background = T.success + "22"; e.currentTarget.style.color = T.success; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.text2; }}
          title="Adicionar R$ 1.000"
        >+1k</button>
      </div>
      {/* valor numérico limpo exibido como hint */}
      {parseCurrency(display) > 0 && (
        <div style={{ fontSize: 9, color: T.text3, marginTop: 3, textAlign: "right" }}>
          valor: {parseCurrency(display).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}


// ─── TOAST NOTIFICATION ───────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss, T }) {
  if (!toasts.length) return null;
  const colors = { success: T.success, error: T.danger, warning: T.accent2 || "#F59E0B" };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end", pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: T.glassBg || T.surface,
          backdropFilter: T.glassBlur,
          WebkitBackdropFilter: T.glassBlur,
          border: `1px solid ${colors[t.type] || T.border}55`,
          borderLeft: `3px solid ${colors[t.type] || T.accent}`,
          borderRadius: 10,
          padding: "10px 16px",
          color: T.text,
          fontSize: 13,
          fontWeight: 500,
          boxShadow: T.shadow,
          maxWidth: 320,
          pointerEvents: "auto",
          animation: "fadeUp 0.2s ease-out",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ color: colors[t.type], fontSize:16 }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "⚠"}
          </span>
          <span style={{ flex:1 }}>{t.msg}</span>
          <button onClick={() => onDismiss(t.id)} style={{
            background:"none", border:"none", cursor:"pointer", color:T.text3, fontSize:14, padding:"0 2px", lineHeight:1
          }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── CSV EXPORT UTILITY ────────────────────────────────────────────────────────
function exportCSV(rows, filename, columns) {
  const bom = "\uFEFF";
  const header = columns.map(c => c.label).join(";");
  const body = rows.map(row =>
    columns.map(c => {
      let val = row[c.key] ?? "";
      if (c.key === "valor") val = String(Number(val).toFixed(2)).replace(".", ",");
      else if (c.type === "date" && val) val = val.split("-").reverse().join("/");
      const str = String(val).replace(/"/g, '""');
      return str.includes(";") || str.includes("\n") ? `"${str}"` : str;
    }).join(";")
  ).join("\n");
  const blob = new Blob([bom + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false);
  const T = dark ? DARK : LIGHT;
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickCostOpen, setQuickCostOpen] = useState(false);

  // ── Toast notifications ───────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // ── Estado — começa vazio, carregado do Supabase ──────────────────────────
  const [obras,    setObras]    = useState([]);
  const [bancos,   setBancos]   = useState([]);
  const [cats,     setCats]     = useState(SEED_CATS); // categorias ficam locais (raramente mudam)
  const [custos,   setCustos]   = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [orcamento,setOrcamento]= useState([]);
  const [apagar,   setApagar]   = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError,   setDbError]   = useState(null);

  // ── Carrega todos os dados do Supabase na inicialização ────────────────────
  useEffect(() => {
    async function loadAll() {
      setDbLoading(true);
      setDbError(null);
      try {
        // testa conexão com uma tabela simples primeiro
        const testUrl = `${SUPABASE_URL}/rest/v1/obras?select=id&limit=1`;
        const testRes = await fetch(testUrl, {
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          }
        });
        if (!testRes.ok) {
          const errText = await testRes.text();
          throw new Error(`HTTP ${testRes.status}: ${errText}`);
        }

        const [rObras, rBancos, rCats, rCustos, rReceitas, rOrc, rApagar] = await Promise.all([
          sbFetch("obras",      { params: "order=id.asc" }),
          sbFetch("bancos",     { params: "order=id.asc" }),
          sbFetch("categorias", { params: "order=id.asc" }),
          sbFetch("custos",     { params: "order=id.asc" }),
          sbFetch("receitas",   { params: "order=id.asc" }),
          sbFetch("orcamento",  { params: "order=id.asc" }),
          sbFetch("apagar",     { params: "order=id.asc" }),
        ]);
        if (rObras)    setObras(rObras.map(mapObra));
        if (rBancos)   setBancos(rBancos.map(mapBanco));
        if (rCats)     setCats(rCats.length ? rCats.map(mapCat) : SEED_CATS);
        if (rCustos)   setCustos(rCustos.map(mapCusto));
        if (rReceitas) setReceitas(rReceitas.map(mapReceita));
        if (rOrc)      setOrcamento(rOrc.map(mapOrcamento));
        if (rApagar)   setApagar(rApagar.map(mapApagar));
      } catch(e) {
        const msg = e?.message || String(e);
        console.error("Supabase loadAll error:", msg);
        setDbError(msg);
      } finally {
        setDbLoading(false);
      }
    }
    loadAll();
  }, []);

  const [tab, setTab] = useState("visao");
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);

  // filtros visão geral
  const [fObra,setFObra] = useState("TODAS");
  const [fMes,setFMes] = useState("TODOS");
  const [fCat,setFCat] = useState("TODAS");
  const [fSearch,setFSearch] = useState("");

  // filtro custos
  const [fcObra,setFcObra] = useState("TODAS");
  const [fcCat,setFcCat] = useState("TODAS");
  const [fcSearch,setFcSearch] = useState("");
  const [fcTipo,setFcTipo] = useState("TODOS");
  const [fcNatureza,setFcNatureza] = useState("TODAS");
  const [fcPagador,setFcPagador] = useState("TODOS");
  const [fcBanco,setFcBanco] = useState("TODOS");
  const [fcDateFrom,setFcDateFrom] = useState("");
  const [fcDateTo,setFcDateTo] = useState("");
  // ordenação custos: {col: string, dir: "asc"|"desc"}
  const [fcSort,setFcSort] = useState({col:"data",dir:"desc"});
  const toggleSort = (col) => setFcSort(prev => prev.col===col ? {col,dir:prev.dir==="asc"?"desc":"asc"} : {col,dir:"asc"});
  // seleção em massa + agrupamento
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [fcGroupBy, setFcGroupBy] = useState("none"); // "none"|"obra"|"categoria"|"mes"|"tipo"|"natureza"|"pagador"|"fornecedor"
  const [bulkField, setBulkField] = useState(""); // campo a editar em massa
  const [bulkValue, setBulkValue] = useState(""); // novo valor
  const [bulkSub, setBulkSub] = useState(""); // subcategoria when changing categoria
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const selectAll = (ids) => setSelectedIds(new Set(ids));
  const clearSelection = () => setSelectedIds(new Set());
  const clearCustosFilters = () => { setFcObra("TODAS"); setFcCat("TODAS"); setFcSearch(""); setFcTipo("TODOS"); setFcNatureza("TODAS"); setFcPagador("TODOS"); setFcBanco("TODOS"); setFcDateFrom(""); setFcDateTo(""); };

  // bulk edit handler
  const applyBulkEdit = async () => {
    if (selectedIds.size === 0 || !bulkField || bulkValue === "") return;
    const updates = {};
    if (bulkField === "categoria") {
      updates.categoria = bulkValue;
      if (bulkSub) updates.subcategoria = bulkSub;
      // auto-fill tipo/natureza from template if possible
      const tpl = DEFAULT_BUDGET_TEMPLATE.find(e => e.etapa === bulkValue);
      if (tpl && bulkSub) {
        const item = tpl.itens.find(i => i.subcategoria === bulkSub);
        if (item) { updates.tipo = item.tipo; updates.natureza = item.natureza; }
      }
    } else {
      updates[bulkField] = bulkValue;
    }
    // apply to supabase and local state
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => sbFetch("custos", { method: "PATCH", id, body: updates })));
    setCustos(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, ...updates } : c));
    showToast(`${ids.length} lançamento(s) atualizado(s).`, "success");
    clearSelection();
    setBulkField("");
    setBulkValue("");
    setBulkSub("");
  };

  // bulk delete handler
  const applyBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Excluir ${selectedIds.size} lançamento(s) selecionados?`)) return;
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => sbFetch("custos", { method: "DELETE", id })));
    setCustos(prev => prev.filter(c => !selectedIds.has(c.id)));
    showToast(`${ids.length} lançamento(s) excluído(s).`, "success");
    clearSelection();
  };

  const obrasNames = ["TODAS",...obras.map(o=>o.nome)];
  const mesesList = ["TODOS",...Array.from(new Set(custos.map(d=>getMes(d.data)).filter(Boolean))).sort(sortMes)];
  const catsNames = ["TODAS",...cats.map(c=>c.nome)];

  // ── smart features state ──────────────────────────────────────────────────
  const { fornecedores, addFornecedor } = useFornecedores(SEED_CUSTOS);
  // edição de custo: null = criar novo | objeto = editar existente
  const [custoEditando, setCustoEditando] = useState(null);

  const openModal = (type, data=null) => {
    if (type === "custo_edit") { setCustoEditando(data); setModal("custo"); return; }
    setCustoEditando(null);
    setModal(type);
    setModalData(data);
  };
  const closeModal = () => { setModal(null); setModalData(null); setCustoEditando(null); };

  const marcarPago = async (item) => {
    const hoje = todayStr();
    // 1. insere como custo pago
    const novoCusto = {data:hoje,obra:item.obra,banco:item.banco||"Sicredi",fornecedor:item.fornecedor,categoria:item.categoria,subcategoria:item.subcategoria,tipo:item.tipo,natureza:item.natureza,valor:item.valor,obs:item.descricao,pagador:item.pagador};
    const res = await sbFetch("custos", { method:"POST", body:{...novoCusto} });
    if (res?.[0]) { setCustos(prev=>[...prev, mapCusto(res[0])]); showToast(`"${item.descricao}" marcada como paga e lançada em custos.`, "success"); }
    else { showToast("Erro ao lançar custo. Verifique a conexão.", "error"); return; }
    // 2. marca como pago no a_pagar
    await sbFetch("apagar", { method:"PATCH", id:item.id, body:{pago:true, data_pago:hoje} });
    setApagar(prev=>prev.map(a=>a.id===item.id?{...a,pago:true,dataPago:hoje}:a));
  };

  // métricas obras
  const obrasMetrica = useMemo(()=> obras.map(o=>{
    const gasto = custos.filter(c=>c.obra===o.nome).reduce((s,c)=>s+(c.valor||0),0);
    const rec = receitas.filter(r=>r.obra===o.nome).reduce((s,r)=>s+(r.valor||0),0);
    const orc = orcamento.filter(x=>x.obra===o.nome).reduce((s,x)=>s+(x.valorOrcado||0),0);
    return {...o, gasto, rec, orc, lucro:(o.contrato||0)-gasto, saldo:rec-gasto, pct:o.contrato?Math.min((gasto/o.contrato)*100,100):0};
  }),[obras,custos,receitas,orcamento]);

  // filtros visão
  const filtCustos = useMemo(()=> custos.filter(d=>
    (fObra==="TODAS"||d.obra===fObra)&&
    (fMes==="TODOS"||getMes(d.data)===fMes)&&
    (fCat==="TODAS"||d.categoria===fCat)&&
    (fSearch===""||d.obs?.toLowerCase().includes(fSearch.toLowerCase())||d.fornecedor?.toLowerCase().includes(fSearch.toLowerCase()))
  ),[custos,fObra,fMes,fCat,fSearch]);



  const apagarPend = apagar.filter(a=>!a.pago);
  const hoje = new Date();
  const vencidas = apagarPend.filter(a=>new Date(a.vencimento)<hoje);
  const vencendo = apagarPend.filter(a=>{const d=new Date(a.vencimento);const diff=(d-hoje)/(86400000);return diff>=0&&diff<=7;});
  const totalApagar = apagarPend.reduce((s,a)=>s+(a.valor||0),0);
  const totalReceitas = receitas.reduce((s,r)=>s+(r.valor||0),0);
  const totalCustos = custos.reduce((s,c)=>s+(c.valor||0),0);

  // filtros aba custos
  const filtCustosAba = useMemo(()=>custos.filter(d=>
    (fcObra==="TODAS"||d.obra===fcObra)&&
    (fcCat==="TODAS"||d.categoria===fcCat)&&
    (fcTipo==="TODOS"||d.tipo===fcTipo)&&
    (fcNatureza==="TODAS"||d.natureza===fcNatureza)&&
    (fcPagador==="TODOS"||d.pagador===fcPagador)&&
    (fcBanco==="TODOS"||d.banco===fcBanco)&&
    (!fcDateFrom||d.data>=fcDateFrom)&&
    (!fcDateTo||d.data<=fcDateTo)&&
    (fcSearch===""||d.obs?.toLowerCase().includes(fcSearch.toLowerCase())||d.fornecedor?.toLowerCase().includes(fcSearch.toLowerCase())||d.subcategoria?.toLowerCase().includes(fcSearch.toLowerCase()))
  ),[custos,fcObra,fcCat,fcTipo,fcNatureza,fcPagador,fcBanco,fcDateFrom,fcDateTo,fcSearch]);
  const activeFiltersCount = [fcObra!=="TODAS",fcCat!=="TODAS",fcTipo!=="TODOS",fcNatureza!=="TODAS",fcPagador!=="TODOS",fcBanco!=="TODOS",!!fcDateFrom,!!fcDateTo,!!fcSearch].filter(Boolean).length;

  // saldo bancos
  const saldoBancos = useMemo(()=> bancos.map(b=>{
    const saidas = custos.filter(c=>c.banco===b.nome).reduce((s,c)=>s+(c.valor||0),0);
    const entradas = receitas.filter(r=>r.banco===b.nome).reduce((s,r)=>s+(r.valor||0),0);
    return {...b, saidas, entradas, saldoAtual:(b.saldoInicial||0)+entradas-saidas};
  }),[bancos,custos,receitas]);

  const s = (styles={}) => ({...styles});

  // ── styles helpers ──
  const surface = (extra={}) => ({
    background: T.glassBg,
    backdropFilter: T.glassBlur,
    WebkitBackdropFilter: T.glassBlur,
    border: `1px solid ${T.glassBorder || T.border}`,
    borderRadius: 16,
    padding: "20px 24px",
    boxShadow: `${T.shadow}, ${T.glassHighlight || 'none'}`,
    transition: "box-shadow 0.25s, border-color 0.25s, transform 0.2s",
    ...extra
  });
  const inputStyle = {
    background: T.inputBg,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: `1px solid ${T.border2}`,
    color: T.text,
    borderRadius: 10,
    padding: "9px 13px",
    fontSize: 13,
    outline: "none",
    fontFamily: T.fontFamily,
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxShadow: `inset 0 1px 2px ${dark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.04)'}`,
  };
  const labelStyle = {
    fontSize: 10,
    fontWeight: 600,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    display: "block",
    marginBottom: 5,
    fontFamily: T.fontFamily,
    opacity: 0.85,
  };
  const btnPrimary = {
    padding: "9px 20px",
    background: `linear-gradient(135deg, ${T.accent}, ${T.accent2}cc)`,
    border: "none",
    color: "#fff",
    borderRadius: 10,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: T.fontFamily,
    boxShadow: `0 3px 16px ${T.accent}33, inset 0 1px 0 rgba(255,255,255,0.15)`,
    transition: "opacity 0.15s, transform 0.1s, box-shadow 0.25s",
    letterSpacing: "0.01em",
  };
  const btnGhost = {
    padding: "8px 16px",
    background: T.surface2,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: `1px solid ${T.border2}`,
    color: T.text2,
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: T.fontFamily,
    transition: "background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.2s",
    letterSpacing: "0.01em",
    boxShadow: T.glassHighlight || "none",
  };
  const tooltipStyle = {
    background: dark ? "rgba(10,16,28,0.96)" : "rgba(255,255,255,0.97)",
    backdropFilter: "blur(16px)",
    border: `1px solid ${T.border2}`,
    borderRadius: 10,
    color: T.text,
    fontSize: 12,
    boxShadow: T.shadowHover,
    fontFamily: T.fontFamily,
  };

  const TABS = [
    {id:"visao",        label:"Visão Geral",  icon:"◈"},
    {id:"receitas_aba", label:"Receitas",      icon:"↑"},
    {id:"obras",        label:"Obras",         icon:"⬡"},
    {id:"custos_aba",   label:"Custos",        icon:"↓"},
    {id:"orcamento_aba",label:"Orçamento",     icon:"≡"},
    {id:"apagar_aba",   label:"A Pagar",       icon:"◷", badge:vencidas.length+vencendo.length},
    {id:"cadastros",    label:"Cadastros",     icon:"⚙"},
  ];

  return (
    <ThemeCtx.Provider value={{T,dark}}>
    <div style={{
      minHeight:"100vh",
      backgroundColor: T.bg,
      color: T.text,
      fontFamily: T.fontFamily,
      padding: "0",
      fontSize: 13,
      transition: "background-color 0.3s, color 0.3s",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      position: "relative",
    }}>
      {/* Abstract construction background pattern */}
      <BgPattern dark={dark} />
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,140,165,0.18); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(128,140,165,0.32); }
        button { letter-spacing: 0.01em; }
        button:active { transform: scale(0.97); }
        select { cursor: pointer; }
        input:focus, select:focus { outline: none; border-color: ${T.accent}88 !important; box-shadow: 0 0 0 3px ${T.accent}18 !important; }
        input::placeholder { color: ${T.text3}; opacity: 0.7; }
        table { border-spacing: 0; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

        .rbim-glass {
          background: ${T.glassBg};
          backdrop-filter: ${T.glassBlur};
          -webkit-backdrop-filter: ${T.glassBlur};
          border: 1px solid ${T.glassBorder || T.border};
          box-shadow: ${T.shadow}, ${T.glassHighlight || 'none'};
        }

        .rbim-card-hover { transition: box-shadow 0.25s, border-color 0.25s, transform 0.2s; }
        .rbim-card-hover:hover { box-shadow: ${T.shadowHover}, ${T.glassHighlight || 'none'}; border-color: ${T.border2}; transform: translateY(-1px); }

        .rbim-tag { padding: 3px 9px; border-radius: 6px; font-size: 9px; font-weight: 600; letter-spacing: 0.04em; display: inline-block; }

        @media (max-width: 767px) {
          .rbim-header-tabs { display: none !important; }
          .rbim-header-actions { display: none !important; }
          .rbim-mobile-tabs { display: flex !important; }
          .rbim-mobile-fab { display: flex !important; }
          .rbim-g2-responsive { grid-template-columns: 1fr !important; }
          .rbim-grid5 { grid-template-columns: repeat(2, 1fr) !important; }
          .rbim-grid2-charts { grid-template-columns: 1fr !important; }
          .rbim-kpi-row { flex-direction: column !important; }
          .rbim-kpi-row > div { min-width: 100% !important; }
          .rbim-filter-row { flex-direction: column !important; }
          .rbim-filter-row > div { width: 100% !important; min-width: 100% !important; }
          .rbim-filter-row select { width: 100% !important; }
          .rbim-filter-row input { width: 100% !important; }
          .rbim-cadastro-grid { grid-template-columns: 1fr !important; }
          .rbim-obra-card-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .rbim-obra-card-header { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .rbim-apagar-card { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .rbim-apagar-card > div:nth-child(2) { text-align: left !important; }
          .rbim-apagar-card > div:nth-child(3) { text-align: left !important; }
          .rbim-apagar-card > button { width: 100% !important; }
          .rbim-bancos-row { flex-direction: column !important; }
          .rbim-bancos-row > div { min-width: 100% !important; }
          .rbim-modal-inner { max-width: 100% !important; border-radius: 16px 16px 0 0 !important; max-height: 100vh !important; height: auto !important; max-height: 95vh !important; padding: 20px 16px !important; margin-top: auto !important; }
          .rbim-modal-overlay { padding: 0 !important; align-items: flex-end !important; }
          .rbim-content-wrapper { padding: 16px 12px 100px 12px !important; }
          .rbim-header-inner { padding: 0 12px !important; }
          .rbim-budget-toolbar { flex-direction: column !important; gap: 8px !important; }
          .rbim-budget-toolbar > div { width: 100% !important; }
          .rbim-orc-kpis { flex-direction: column !important; }
          .rbim-orc-kpis > div { min-width: 100% !important; }
          .rbim-dash-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .rbim-dash-filters { flex-direction: column !important; width: 100% !important; }
          .rbim-dash-filters > div { width: 100% !important; }
          .rbim-dash-filters select { width: 100% !important; }
          .rbim-sub-tabs { overflow-x: auto !important; flex-wrap: nowrap !important; -webkit-overflow-scrolling: touch; }
          .rbim-sub-tabs > button { flex-shrink: 0 !important; }
        }

        @media (min-width: 768px) {
          .rbim-mobile-tabs { display: none !important; }
          .rbim-mobile-fab { display: none !important; }
        }
      `}</style>

      {/* ── DB STATUS BANNER ──────────────────────────────────────────────── */}
      {dbLoading && (
        <div style={{background:T.accent+"12",borderBottom:`1px solid ${T.accent}22`,padding:"10px 32px",fontSize:12,color:T.accent,fontWeight:500,display:"flex",alignItems:"center",gap:8,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",position:"relative",zIndex:2}}>
          <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>
          Carregando dados do banco de dados...
        </div>
      )}
      {dbError && (
        <div style={{background:T.danger+"12",borderBottom:`1px solid ${T.danger}22`,padding:"12px 32px",fontSize:12,color:T.danger,fontWeight:500,display:"flex",flexDirection:"column",gap:4,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",position:"relative",zIndex:2}}>          <div style={{fontWeight:700}}>⚠ Erro ao conectar com o Supabase:</div>
          <div style={{fontFamily:"monospace",fontSize:11,opacity:0.9}}>{dbError}</div>
          <div style={{fontSize:11,opacity:0.7}}>Abra o Console do navegador (F12) para mais detalhes.</div>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: dark ? "rgba(6,11,22,0.82)" : "rgba(238,242,249,0.80)",
        backdropFilter: "blur(24px) saturate(1.3)",
        WebkitBackdropFilter: "blur(24px) saturate(1.3)",
        borderBottom: `1px solid ${T.glassBorder || T.border}`,
        boxShadow: `0 1px 20px ${dark ? 'rgba(0,0,0,0.3)' : 'rgba(15,25,50,0.06)'}`,
      }}>
        <div className="rbim-header-inner" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          maxWidth: 1600,
          margin: "0 auto",
          padding: "0 32px",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width: 38, height: 38,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              fontFamily: T.fontDisplay,
              fontWeight: 800,
              color: "#fff",
              boxShadow: `0 4px 20px ${T.accent}44, inset 0 1px 0 rgba(255,255,255,0.2)`,
              flexShrink: 0,
            }}>R</div>
            <div>
              <div style={{fontSize: 16, fontWeight: 700, fontFamily: T.fontDisplay, letterSpacing: "-0.02em", lineHeight: 1, color: T.text}}>
                RBIM <span style={{color: T.accent}}>Gestão</span>
              </div>
              <div style={{fontSize: 10, color: T.text3, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1}}>Construtora</div>
            </div>
          </div>

          {/* Desktop tabs */}
          <div className="rbim-header-tabs" style={{display:"flex",gap:1,alignItems:"center"}}>
            {TABS.map(({id,label,icon,badge})=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                padding: "6px 15px",
                border: "none",
                cursor: "pointer",
                fontWeight: tab===id ? 600 : 400,
                fontSize: 12,
                fontFamily: T.fontFamily,
                position: "relative",
                transition: "all 0.2s",
                background: tab===id ? T.accent + (dark?"18":"12") : "transparent",
                color: tab===id ? T.accent : T.text3,
                borderBottom: tab===id ? `2px solid ${T.accent}` : "2px solid transparent",
                borderRadius: "8px 8px 0 0",
                height: 64,
                display: "flex",
                alignItems: "center",
                gap: 5,
                letterSpacing: "0.01em",
              }}>
                <span style={{fontSize: 11, opacity: tab===id ? 0.9 : 0.5}}>{icon}</span>
                {label}
                {badge>0 && (
                  <span style={{
                    background: T.danger,
                    color: "#fff",
                    borderRadius: 999,
                    fontSize: 9,
                    padding: "1px 5px",
                    fontWeight: 700,
                    lineHeight: 1.4,
                    marginLeft: 2,
                  }}>{badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="rbim-header-actions" style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>openModal("custo")} style={{...btnPrimary, padding:"7px 16px", fontSize:12}}>+ Custo</button>
            <button onClick={()=>openModal("receita")} style={{...btnPrimary, background:`linear-gradient(135deg,${T.success},${T.success}cc)`, boxShadow:`0 2px 12px ${T.success}44`, padding:"7px 16px", fontSize:12}}>+ Receita</button>
            <button onClick={()=>openModal("apagar_new")} style={{...btnPrimary, background:`linear-gradient(135deg,${T.danger},${T.danger}cc)`, boxShadow:`0 2px 12px ${T.danger}44`, padding:"7px 16px", fontSize:12}}>+ A Pagar</button>
            <button onClick={()=>setDark(d=>!d)} style={{...btnGhost,fontSize:15,padding:"7px 10px",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}} title="Alternar tema">{dark?"☀️":"🌙"}</button>
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="rbim-mobile-tabs" style={{display:"none",gap:8,alignItems:"center"}}>
            <button onClick={()=>setDark(d=>!d)} style={{...btnGhost,fontSize:15,padding:"7px 10px",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}} title="Alternar tema">{dark?"☀️":"🌙"}</button>
            <button onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} style={{
              background:"transparent",border:`1px solid ${T.border2}`,
              color:T.text,borderRadius:8,width:40,height:40,
              display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"pointer",fontSize:18,fontFamily:"inherit",
            }}>
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div style={{
            background: dark ? "rgba(6,11,22,0.96)" : "rgba(238,242,249,0.96)",
            backdropFilter:"blur(24px) saturate(1.2)",WebkitBackdropFilter:"blur(24px) saturate(1.2)",
            borderTop: `1px solid ${T.border}`,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            animation: "slideDown 0.2s ease-out",
          }}>
            {TABS.map(({id,label,icon,badge})=>(
              <button key={id} onClick={()=>{setTab(id);setMobileMenuOpen(false);}} style={{
                padding: "12px 16px",
                border: "none",
                cursor: "pointer",
                fontWeight: tab===id ? 700 : 400,
                fontSize: 14,
                fontFamily: T.fontFamily,
                transition: "all 0.15s",
                background: tab===id ? T.accent + "18" : "transparent",
                color: tab===id ? T.accent : T.text2,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                position:"relative",
              }}>
                <span style={{fontSize: 14, opacity: 0.7, width:20, textAlign:"center"}}>{icon}</span>
                {label}
                {badge>0 && (
                  <span style={{
                    background: T.danger, color: "#fff", borderRadius: 999,
                    fontSize: 9, padding: "2px 6px", fontWeight: 700,
                    marginLeft: "auto",
                  }}>{badge}</span>
                )}
              </button>
            ))}
            <div style={{borderTop:`1px solid ${T.border}`,marginTop:4,paddingTop:8,display:"flex",gap:8}}>
              <button onClick={()=>{openModal("custo");setMobileMenuOpen(false);}} style={{...btnPrimary,flex:1,fontSize:12,textAlign:"center",padding:"10px 12px"}}>+ Custo</button>
              <button onClick={()=>{openModal("receita");setMobileMenuOpen(false);}} style={{...btnPrimary,flex:1,background:`linear-gradient(135deg,${T.success},${T.success}cc)`,boxShadow:`0 2px 12px ${T.success}44`,fontSize:12,textAlign:"center",padding:"10px 12px"}}>+ Receita</button>
              <button onClick={()=>{openModal("apagar_new");setMobileMenuOpen(false);}} style={{...btnPrimary,flex:1,background:`linear-gradient(135deg,${T.danger},${T.danger}cc)`,boxShadow:`0 2px 12px ${T.danger}44`,fontSize:12,textAlign:"center",padding:"10px 12px"}}>+ A Pagar</button>
            </div>
          </div>
        )}
      </div>

      {/* ── PAGE CONTENT WRAPPER ──────────────────────────────────────────── */}
      <div className="rbim-content-wrapper" style={{maxWidth: 1600, margin: "0 auto", padding: "28px 32px", position:"relative", zIndex:1}}>

      {/* ════ VISÃO GERAL ════════════════════════════════════════════════════ */}
      {tab==="visao" && (
        <VisaoGeral
          T={T} dark={dark}
          obras={obrasMetrica}
          custos={custos}
          receitas={receitas}
          saldoBancos={saldoBancos}
          totalReceitas={totalReceitas}
          totalCustos={totalCustos}
          totalApagar={totalApagar}
          apagarPend={apagarPend}
          vencidas={vencidas}
          vencendo={vencendo}
          surface={surface}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          btnGhost={btnGhost}
          btnPrimary={btnPrimary}
          openModal={openModal}
          setTab={setTab}
        />
      )}

      {/* ════ OBRAS ══════════════════════════════════════════════════════════ */}
      {tab==="obras" && (
        <ObrasAba
          T={T} dark={dark}
          obras={obrasMetrica}
          custos={custos}
          receitas={receitas}
          orcamento={orcamento}
          cats={cats}
          openModal={openModal}
          surface={surface}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          btnPrimary={btnPrimary}
          btnGhost={btnGhost}
        />
      )}

      {/* ════ CUSTOS ABA ═════════════════════════════════════════════════════ */}
      {tab==="custos_aba" && (
        <CustosAba
          T={T} dark={dark}
          custos={filtCustosAba}
          allCustos={custos}
          setCustos={setCustos}
          obras={obras} bancos={bancos} cats={cats}
          fcObra={fcObra} setFcObra={setFcObra}
          fcCat={fcCat} setFcCat={setFcCat}
          fcSearch={fcSearch} setFcSearch={setFcSearch}
          fcTipo={fcTipo} setFcTipo={setFcTipo}
          fcNatureza={fcNatureza} setFcNatureza={setFcNatureza}
          fcPagador={fcPagador} setFcPagador={setFcPagador}
          fcBanco={fcBanco} setFcBanco={setFcBanco}
          fcDateFrom={fcDateFrom} setFcDateFrom={setFcDateFrom}
          fcDateTo={fcDateTo} setFcDateTo={setFcDateTo}
          activeFiltersCount={activeFiltersCount}
          clearCustosFilters={clearCustosFilters}
          fcSort={fcSort} toggleSort={toggleSort}
          fcGroupBy={fcGroupBy} setFcGroupBy={setFcGroupBy}
          selectedIds={selectedIds} toggleSelect={toggleSelect}
          selectAll={selectAll} clearSelection={clearSelection}
          setSelectedIds={setSelectedIds}
          bulkField={bulkField} setBulkField={setBulkField}
          bulkValue={bulkValue} setBulkValue={setBulkValue}
          bulkSub={bulkSub} setBulkSub={setBulkSub}
          applyBulkEdit={applyBulkEdit}
          applyBulkDelete={applyBulkDelete}
          obrasNames={obrasNames} catsNames={catsNames}
          openModal={openModal}
          showToast={showToast}
          surface={surface} inputStyle={inputStyle}
          labelStyle={labelStyle} btnPrimary={btnPrimary} btnGhost={btnGhost}
        />
      )}

      {/* ════ RECEITAS — DASHBOARD FINANCEIRO ══════════════════════════════════ */}
      {tab==="receitas_aba" && (
        <DashboardFinanceiro
          T={T}
          receitas={receitas}
          setReceitas={setReceitas}
          custos={custos}
          saldoBancos={saldoBancos}
          totalReceitas={totalReceitas}
          totalCustos={totalCustos}
          btnPrimary={btnPrimary}
          btnGhost={btnGhost}
          surface={surface}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          onNovaReceita={()=>openModal("receita")}
        />
      )}

      {/* ════ ORÇAMENTO ══════════════════════════════════════════════════════ */}
      {tab==="orcamento_aba" && (
        <AbaOrcamento
          T={T}
          obras={obras}
          custos={custos}
          orcamento={orcamento}
          setOrcamento={setOrcamento}
          saldoBancos={saldoBancos}
          btnPrimary={btnPrimary}
          btnGhost={btnGhost}
          surface={surface}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
          onNovaLinha={()=>openModal("orcamento_new")}
        />
      )}

      {/* ════ A PAGAR ════════════════════════════════════════════════════════ */}
      {tab==="apagar_aba" && (
        <div>
          <div className="rbim-kpi-row" style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            {[["A Pagar",fmt(totalApagar),`${apagarPend.length} pendentes`,T.danger],["Vencidas",fmt(vencidas.reduce((s,a)=>s+a.valor,0)),`${vencidas.length} contas`,T.danger],["Venc. 7d",fmt(vencendo.reduce((s,a)=>s+a.valor,0)),`${vencendo.length} contas`,T.accent2],["Pagas",fmt(apagar.filter(a=>a.pago).reduce((s,a)=>s+a.valor,0)),"movidas p/ custos",T.success]].map(([l,v,s,c])=>(
              <div key={l} style={{...surface({padding:"20px 22px"}),flex:1,minWidth:140}}>
                <div style={{fontSize:10,color:T.text3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>{l}</div>
                <div style={{fontSize:20,fontWeight:700,color:c,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.02em"}}>{v}</div>
                <div style={{fontSize:10,color:T.text3,marginTop:5,fontWeight:500}}>{s}</div>
              </div>
            ))}
          </div>
          {vencidas.length>0 && <div style={{background:T.danger+"12",border:`1px solid ${T.danger}33`,borderRadius:10,padding:"10px 16px",marginBottom:14,fontSize:12,color:T.danger,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
            <span>⚠</span> {vencidas.length} conta(s) vencida(s) — atenção necessária
          </div>}
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:10}}>
            <button onClick={()=>exportCSV(apagarPend, `apagar_${new Date().toISOString().slice(0,10)}.csv`, [
              {key:"vencimento",label:"Vencimento",type:"date"},{key:"descricao",label:"Descrição"},
              {key:"obra",label:"Obra"},{key:"fornecedor",label:"Fornecedor"},{key:"categoria",label:"Categoria"},
              {key:"subcategoria",label:"Subcategoria"},{key:"natureza",label:"Natureza"},
              {key:"pagador",label:"Pagador"},{key:"banco",label:"Banco"},{key:"valor",label:"Valor"},
            ])} style={{...btnPrimary,background:"transparent",color:T.text2,border:`1px solid ${T.border2}`,fontSize:12}} title="Exportar CSV">⬇ CSV</button>
            <button onClick={()=>openModal("apagar_new")} style={{...btnPrimary,background:T.danger}}>+ Nova Conta a Pagar</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {apagarPend.sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento)).map(item=>{
              const diff=Math.ceil((new Date(item.vencimento)-hoje)/86400000);
              const isV=diff<0,isU=diff>=0&&diff<=7;
              return (
                <div key={item.id} className="rbim-apagar-card" style={{...surface({border:`1px solid ${isV?T.danger:isU?T.accent2:T.border}`}),display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontWeight:800,fontSize:13}}>{item.descricao}</div>
                    <div style={{fontSize:11,color:T.text2,marginTop:3}}>{item.obra} · {item.categoria} · {item.subcategoria}</div>
                    <div style={{fontSize:11,color:T.text3}}>{item.fornecedor} · {item.banco} · {item.natureza} · {item.tipo}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:10,color:T.text3}}>Vencimento</div>
                    <div style={{fontWeight:700,color:isV?T.danger:isU?T.accent2:T.text,fontSize:13}}>{item.vencimento}</div>
                    {isV&&<div style={{fontSize:10,color:T.danger}}>VENCIDA</div>}
                    {isU&&!isV&&<div style={{fontSize:10,color:T.accent2}}>em {diff}d</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:18,fontWeight:700,color:T.danger}}>{fmt(item.valor)}</div>
                    <div style={{fontSize:10,color:T.text3}}>{item.pagador}</div>
                  </div>
                  <button onClick={()=>marcarPago(item)} style={{...btnPrimary,background:T.success,whiteSpace:"nowrap"}}>✓ Marcar Pago</button>
                </div>
              );
            })}
            {apagar.filter(a=>a.pago).length>0 && (
              <div style={{marginTop:8}}>
                <div style={{fontWeight:800,fontSize:12,color:T.success,marginBottom:8}}>✅ Pagas</div>
                {apagar.filter(a=>a.pago).map(item=>(
                  <div key={item.id} style={{...surface({padding:"10px 16px",marginBottom:8,opacity:0.65}),display:"flex",justifyContent:"space-between"}}>
                    <div><div style={{fontWeight:700}}>{item.descricao}</div><div style={{fontSize:11,color:T.text3}}>{item.obra} · pago em {item.dataPago}</div></div>
                    <div style={{fontWeight:800,color:T.success}}>{fmt(item.valor)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ CADASTROS ══════════════════════════════════════════════════════ */}
      {tab==="cadastros" && <CadastrosTab T={T} obras={obras} setObras={setObras} bancos={bancos} setBancos={setBancos} cats={cats} setCats={setCats} inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary} btnGhost={btnGhost} surface={surface}/>}

      {/* ════ MODAIS ═════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="rbim-modal-overlay" onClick={closeModal} style={{position:"fixed",inset:0,background:dark?"rgba(0,0,0,0.65)":"rgba(15,25,50,0.25)",backdropFilter:"blur(12px) saturate(1.2)",WebkitBackdropFilter:"blur(12px) saturate(1.2)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeIn 0.15s ease-out"}}>
          <div className="rbim-modal-inner" onClick={e=>e.stopPropagation()} style={{background:dark?"rgba(10,16,28,0.96)":"rgba(255,255,255,0.96)",backdropFilter:"blur(32px) saturate(1.2)",WebkitBackdropFilter:"blur(32px) saturate(1.2)",border:`1px solid ${T.border2}`,borderRadius:20,padding:28,width:"100%",maxWidth:580,maxHeight:"92vh",overflowY:"auto",color:T.text,fontFamily:T.fontFamily,boxShadow:`${T.shadowHover}, ${T.glassHighlight || 'none'}`,animation:"fadeUp 0.2s ease-out"}}>
            {modal==="custo" && <ModalCusto T={T} obras={obras} bancos={bancos} cats={cats} custos={custos}
              inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary}
              onClose={closeModal} initial={custoEditando} fornecedores={fornecedores}
              onSave={async d=>{
                addFornecedor(d.fornecedor);
                if (custoEditando) {
                  const res = await sbFetch("custos", { method:"PATCH", id:custoEditando.id, body:{data:d.data,obra:d.obra,banco:d.banco,fornecedor:d.fornecedor,categoria:d.categoria,subcategoria:d.subcategoria,tipo:d.tipo,natureza:d.natureza,valor:d.valor,obs:d.obs,pagador:d.pagador} });
                  if (res !== null) { setCustos(prev=>prev.map(c=>c.id===custoEditando.id?{...c,...d}:c)); showToast("Lançamento atualizado com sucesso.", "success"); }
                  else showToast("Erro ao atualizar lançamento.", "error");
                } else {
                  const res = await sbFetch("custos", { method:"POST", body:{data:d.data,obra:d.obra,banco:d.banco,fornecedor:d.fornecedor,categoria:d.categoria,subcategoria:d.subcategoria,tipo:d.tipo,natureza:d.natureza,valor:d.valor,obs:d.obs,pagador:d.pagador} });
                  if(res?.[0]) { setCustos(prev=>[...prev, mapCusto(res[0])]); showToast("Custo lançado com sucesso.", "success"); }
                  else showToast("Erro ao salvar custo. Tente novamente.", "error");
                }
                closeModal();
              }}/>}
            {modal==="receita" && <ModalReceita T={T} obras={obras} bancos={bancos} inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary} onClose={closeModal}
              onSave={async d=>{
                const res = await sbFetch("receitas", { method:"POST", body:{data:d.data,obra:d.obra,banco:d.banco,medicao:d.medicao,valor:d.valor,obs:d.obs} });
                if(res?.[0]) { setReceitas(prev=>[...prev, mapReceita(res[0])]); showToast("Receita registrada com sucesso.", "success"); }
                else showToast("Erro ao registrar receita.", "error");
                closeModal();
              }}/>}
            {modal==="apagar_new" && <ModalAPagar T={T} obras={obras} bancos={bancos} cats={cats}
              inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary}
              onClose={closeModal} fornecedores={fornecedores}
              onSave={async d=>{
                addFornecedor(d.fornecedor);
                const res = await sbFetch("apagar", { method:"POST", body:{obra:d.obra,descricao:d.descricao,categoria:d.categoria,subcategoria:d.subcategoria,tipo:d.tipo,natureza:d.natureza,valor:d.valor,vencimento:d.vencimento,fornecedor:d.fornecedor,pagador:d.pagador,banco:d.banco,pago:false} });
                if(res?.[0]) { setApagar(prev=>[...prev, mapApagar(res[0])]); showToast("Conta a pagar cadastrada.", "success"); }
                else showToast("Erro ao salvar conta a pagar.", "error");
                closeModal();
              }}/>}
            {(modal==="obra_new"||modal==="obra_edit") && <ModalObra T={T} initial={modalData} inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary} onClose={closeModal}
              onSave={async d=>{
                if(modal==="obra_new"){
                  const res = await sbFetch("obras", { method:"POST", body:{nome:d.nome,inicio:d.inicio,fim:d.fim,contrato:d.contrato,status:d.status} });
                  if(res?.[0]) { setObras(prev=>[...prev, mapObra(res[0])]); showToast(`Obra "${d.nome}" cadastrada.`, "success"); }
                  else showToast("Erro ao cadastrar obra.", "error");
                } else {
                  const res = await sbFetch("obras", { method:"PATCH", id:modalData.id, body:{nome:d.nome,inicio:d.inicio,fim:d.fim,contrato:d.contrato,status:d.status} });
                  if (res !== null) { setObras(prev=>prev.map(o=>o.id===modalData.id?{...o,...d}:o)); showToast("Obra atualizada.", "success"); }
                  else showToast("Erro ao atualizar obra.", "error");
                }
                closeModal();
              }}/>}
            {modal==="orcamento_new" && <ModalOrcamento T={T} obras={obras} cats={cats} inputStyle={inputStyle} labelStyle={labelStyle} btnPrimary={btnPrimary} onClose={closeModal}
              onSave={async d=>{
                const res = await sbFetch("orcamento", { method:"POST", body:{obra:d.obra,categoria:d.categoria,subcategoria:d.subcategoria,tipo:d.tipo,natureza:d.natureza,valor_orcado:d.valorOrcado} });
                if(res?.[0]) { setOrcamento(prev=>[...prev, mapOrcamento(res[0])]); showToast("Linha de orçamento adicionada.", "success"); }
                else showToast("Erro ao salvar orçamento.", "error");
                closeModal();
              }}/>}
          </div>
        </div>
      )}
      </div>

      {/* ════ MOBILE FAB — Atalho rápido para lançamento ════════════════════ */}
      <div className="rbim-mobile-fab" style={{
        display: "none",
        position: "fixed",
        bottom: 20,
        right: 16,
        left: 16,
        zIndex: 90,
        gap: 8,
      }}>
        {/* Mini actions */}
        {quickCostOpen && (
          <div style={{
            position: "fixed", bottom: 76, right: 16, left: 16,
            display: "flex", flexDirection: "column", gap: 6,
            animation: "fadeUp 0.2s ease-out",
          }}>
            <button onClick={()=>{setQuickCostOpen(false);openModal("custo");}} style={{
              padding: "14px 20px", borderRadius: 14,
              background: dark ? "rgba(10,16,28,0.94)" : "rgba(255,255,255,0.92)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${T.accent}44`,
              color: T.accent, fontWeight: 700, fontSize: 14,
              fontFamily: T.fontFamily, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: T.shadowHover,
            }}>
              <span style={{fontSize:18}}>💸</span> Lançar Custo Completo
            </button>
            <button onClick={()=>{setQuickCostOpen(false);openModal("receita");}} style={{
              padding: "14px 20px", borderRadius: 14,
              background: dark ? "rgba(10,16,28,0.94)" : "rgba(255,255,255,0.92)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${T.success}44`,
              color: T.success, fontWeight: 700, fontSize: 14,
              fontFamily: T.fontFamily, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: T.shadowHover,
            }}>
              <span style={{fontSize:18}}>💚</span> Registrar Receita
            </button>
            <button onClick={()=>{setQuickCostOpen(false);openModal("apagar_new");}} style={{
              padding: "14px 20px", borderRadius: 14,
              background: dark ? "rgba(10,16,28,0.94)" : "rgba(255,255,255,0.92)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${T.danger}44`,
              color: T.danger, fontWeight: 700, fontSize: 14,
              fontFamily: T.fontFamily, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: T.shadowHover,
            }}>
              <span style={{fontSize:18}}>⏰</span> Conta a Pagar
            </button>
          </div>
        )}

        {/* Overlay to close */}
        {quickCostOpen && (
          <div onClick={()=>setQuickCostOpen(false)} style={{
            position: "fixed", inset: 0, background: dark ? "rgba(0,0,0,0.35)" : "rgba(15,25,50,0.15)",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            zIndex: -1,
          }}/>
        )}

        {/* Main FAB button */}
        <button onClick={()=>setQuickCostOpen(!quickCostOpen)} style={{
          width: "100%",
          padding: "16px 24px",
          borderRadius: 16,
          border: "none",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 15,
          fontFamily: T.fontFamily,
          color: "#fff",
          background: quickCostOpen
            ? `linear-gradient(135deg, ${T.text3}, ${T.text3}cc)`
            : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
          boxShadow: quickCostOpen
            ? `0 6px 24px rgba(0,0,0,0.2)`
            : `0 6px 28px ${T.accent}44, 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "all 0.2s",
          letterSpacing: "0.01em",
        }}>
          <span style={{fontSize:18,transition:"transform 0.2s",transform:quickCostOpen?"rotate(45deg)":"rotate(0deg)",display:"inline-block"}}>+</span>
          {quickCostOpen ? "Fechar" : "Novo Lançamento"}
        </button>
      </div>
    </div>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} T={T} />
    </ThemeCtx.Provider>
  );
}

// ─── OBRAS ABA — DASHBOARD POR OBRA ──────────────────────────────────────────
function ObrasAba({ T, dark, obras, custos, receitas, orcamento, cats, openModal,
  surface, inputStyle, labelStyle, btnPrimary, btnGhost }) {

  const [selObra, setSelObra] = useState("");
  const [drillCat, setDrillCat] = useState(null); // categoria selecionada para drill-down

  // obra ativa (primeira se nenhuma selecionada)
  const obraAtiva = useMemo(() => {
    if (selObra) return obras.find(o => o.nome === selObra) || null;
    return obras.length > 0 ? obras[0] : null;
  }, [selObra, obras]);

  // sincroniza seleção
  useEffect(() => {
    if (!selObra && obras.length > 0) setSelObra(obras[0].nome);
  }, [obras, selObra]);

  // dados filtrados pela obra ativa
  const obraCustos = useMemo(() => obraAtiva ? custos.filter(c => c.obra === obraAtiva.nome) : [], [custos, obraAtiva]);
  const obraReceitas = useMemo(() => obraAtiva ? receitas.filter(r => r.obra === obraAtiva.nome) : [], [receitas, obraAtiva]);
  const obraOrcamento = useMemo(() => obraAtiva ? orcamento.filter(x => x.obra === obraAtiva.nome) : [], [orcamento, obraAtiva]);

  // KPIs
  const valorOrcado = obraAtiva?.orc || 0;
  const valorGasto = obraAtiva?.gasto || 0;
  const valorRecebido = obraAtiva?.rec || 0;
  const saldoCaixa = valorRecebido - valorGasto;
  const margemLucro = valorRecebido > 0 ? ((valorRecebido - valorGasto) / valorRecebido * 100) : 0;
  const desvioCusto = valorGasto - valorOrcado;
  const pctOrcConsum = valorOrcado > 0 ? Math.min((valorGasto / valorOrcado) * 100, 150) : 0;
  const contratoVal = obraAtiva?.contrato || 0;

  // Curva S — acumulado mensal
  const curvaS = useMemo(() => {
    if (!obraAtiva) return [];
    const mesesSet = new Set([
      ...obraCustos.map(c => getMes(c.data)),
      ...obraReceitas.map(r => getMes(r.data)),
    ]);
    const meses = [...mesesSet].filter(Boolean).sort(sortMes);
    let accOrc = 0, accGasto = 0, accRec = 0;
    // distribuir orçamento uniformemente nos meses se não houver detalhe
    const orcMensal = meses.length > 0 ? valorOrcado / meses.length : 0;
    return meses.map(mes => {
      accOrc += orcMensal;
      accGasto += obraCustos.filter(c => getMes(c.data) === mes).reduce((s, c) => s + c.valor, 0);
      accRec += obraReceitas.filter(r => getMes(r.data) === mes).reduce((s, r) => s + r.valor, 0);
      return { mes, orcado: Math.round(accOrc), gasto: Math.round(accGasto), recebido: Math.round(accRec) };
    });
  }, [obraAtiva, obraCustos, obraReceitas, valorOrcado]);

  // Medições por mês
  const medicoesMes = useMemo(() => {
    const m = {};
    obraReceitas.forEach(r => { const k = getMes(r.data); m[k] = (m[k] || 0) + r.valor; });
    return Object.keys(m).sort(sortMes).map(k => ({ mes: k, valor: m[k] }));
  }, [obraReceitas]);

  // Custos por natureza (Material, Mão de Obra, Equipamento)
  const porNatureza = useMemo(() => {
    const m = {};
    obraCustos.forEach(d => { m[d.natureza] = (m[d.natureza] || 0) + d.valor; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [obraCustos]);

  // Custos por categoria
  const porCategoria = useMemo(() => {
    const m = {};
    obraCustos.forEach(d => { m[d.categoria] = (m[d.categoria] || 0) + d.valor; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [obraCustos]);

  // Drill-down: subcategorias da categoria selecionada
  const porSubcat = useMemo(() => {
    if (!drillCat) return [];
    const m = {};
    obraCustos.filter(d => d.categoria === drillCat).forEach(d => { m[d.subcategoria] = (m[d.subcategoria] || 0) + d.valor; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [obraCustos, drillCat]);

  // Curva ABC (Pareto) — top itens por valor, com acumulado %
  const curvaABC = useMemo(() => {
    const m = {};
    obraCustos.forEach(d => {
      const key = `${d.categoria} > ${d.subcategoria}`;
      m[key] = (m[key] || 0) + d.valor;
    });
    const sorted = Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const total = sorted.reduce((s, d) => s + d.value, 0);
    let acc = 0;
    return sorted.slice(0, 12).map(d => {
      acc += d.value;
      return { ...d, pctAcc: total > 0 ? (acc / total * 100) : 0, nameShort: d.name.length > 25 ? d.name.slice(0, 22) + "…" : d.name };
    });
  }, [obraCustos]);

  // Tabela auditoria — filtrada por drill
  const tabelaAuditoria = useMemo(() => {
    let data = [...obraCustos];
    if (drillCat) data = data.filter(d => d.categoria === drillCat);
    return data.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 30);
  }, [obraCustos, drillCat]);

  const tt = { background: dark ? "rgba(10,16,28,0.96)" : "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", border: `1px solid ${T.border2}`, borderRadius: 10, color: T.text, fontSize: 11, boxShadow: T.shadow };

  if (!obraAtiva) return (
    <div style={{ ...surface({ textAlign: "center", padding: "60px 20px" }) }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nenhuma obra cadastrada</div>
      <button onClick={() => openModal("obra_new")} style={btnPrimary}>+ Cadastrar Primeira Obra</button>
    </div>
  );

  return (
    <div>
      {/* ═══ 1. FILTROS GLOBAIS ═══ */}
      <div className="rbim-filter-row" style={{ ...surface({ padding: "14px 20px", marginBottom: 16 }), display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>Obra</label>
          <select value={selObra} onChange={e => { setSelObra(e.target.value); setDrillCat(null); }} style={inputStyle}>
            {obras.map(o => <option key={o.id} value={o.nome}>{o.nome}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            background: ({ Em_andamento: T.accent2, Planejada: T.info, Pausada: T.danger, Concluída: T.success }[obraAtiva.status.replace(" ", "_")] || T.accent) + "18",
            color: ({ Em_andamento: T.accent2, Planejada: T.info, Pausada: T.danger, Concluída: T.success }[obraAtiva.status.replace(" ", "_")] || T.accent),
            padding: "4px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600
          }}>{obraAtiva.status}</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{obraAtiva.inicio} → {obraAtiva.fim}</span>
          <button onClick={() => openModal("obra_edit", obraAtiva)} style={{ ...btnGhost, fontSize: 11, padding: "5px 12px" }}>✏ Editar</button>
          <button onClick={() => openModal("obra_new")} style={{ ...btnPrimary, fontSize: 11, padding: "5px 14px" }}>+ Nova</button>
        </div>
      </div>

      {/* ═══ 2. RESUMO EXECUTIVO ═══ */}
      <div className="rbim-kpi-row" style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        {/* Valores brutos */}
        {[
          { l: "Contrato", v: fmt(contratoVal), c: T.text, icon: "📋" },
          { l: "Valor Orçado", v: fmt(valorOrcado), c: T.info, icon: "📐" },
          { l: "Valor Gasto", v: fmt(valorGasto), c: T.danger, icon: "↓" },
          { l: "Valor Recebido", v: fmt(valorRecebido), c: T.success, icon: "↑" },
        ].map(({ l, v, c, icon }) => (
          <div key={l} style={{ ...surface({ padding: "16px 20px" }), flex: 1, minWidth: 130, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 12, right: 14, fontSize: 18, opacity: 0.08, color: c }}>{icon}</div>
            <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: c, fontFamily: T.fontDisplay, letterSpacing: "-0.02em" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* KPIs de saúde */}
      <div className="rbim-kpi-row" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Saldo de Caixa */}
        <div style={{ ...surface({ padding: "16px 20px" }), flex: 1, minWidth: 130, borderLeft: `3px solid ${saldoCaixa >= 0 ? T.success : T.danger}` }}>
          <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 6 }}>Saldo de Caixa</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: saldoCaixa >= 0 ? T.success : T.danger, fontFamily: T.fontDisplay, letterSpacing: "-0.02em" }}>{fmt(saldoCaixa)}</div>
          <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>Recebido − Gasto</div>
        </div>
        {/* Margem */}
        <div style={{ ...surface({ padding: "16px 20px" }), flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 6 }}>Margem Atual</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: margemLucro >= 0 ? T.success : T.danger, fontFamily: T.fontDisplay, letterSpacing: "-0.02em" }}>{margemLucro.toFixed(1)}%</div>
          <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>(Recebido − Gasto) / Recebido</div>
        </div>
        {/* Desvio de Custo */}
        <div style={{ ...surface({ padding: "16px 20px" }), flex: 1, minWidth: 130, borderLeft: `3px solid ${desvioCusto <= 0 ? T.success : T.danger}` }}>
          <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 6 }}>Desvio de Custo</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: desvioCusto <= 0 ? T.success : T.danger, fontFamily: T.fontDisplay, letterSpacing: "-0.02em" }}>{fmt(desvioCusto)}</div>
          <div style={{ fontSize: 10, color: desvioCusto > 0 ? T.danger : T.success, marginTop: 4, fontWeight: 600 }}>{desvioCusto > 0 ? "⚠ Acima do orçado" : "✓ Dentro do orçado"}</div>
        </div>
        {/* Termômetro */}
        <div style={{ ...surface({ padding: "16px 20px" }), flex: 1.5, minWidth: 200 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>Orçamento Consumido</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pctOrcConsum > 100 ? T.danger : pctOrcConsum > 80 ? T.accent2 : T.success }}>{pctOrcConsum.toFixed(1)}%</span>
          </div>
          <div style={{ background: T.surface2, borderRadius: 999, height: 10, overflow: "hidden", border: `1px solid ${T.border}`, position: "relative" }}>
            <div style={{
              height: "100%", borderRadius: 999, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
              width: `${Math.min(pctOrcConsum, 100)}%`,
              background: pctOrcConsum > 100 ? T.danger : pctOrcConsum > 80 ? `linear-gradient(90deg,${T.accent2},${T.danger})` : pctOrcConsum > 50 ? `linear-gradient(90deg,${T.success},${T.accent2})` : T.success,
            }} />
            {/* Marcador 100% */}
            {valorOrcado > 0 && <div style={{ position: "absolute", left: "100%", top: -2, bottom: -2, width: 2, background: T.text3, opacity: 0.4, transform: "translateX(-1px)" }} />}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 9, color: T.text3 }}>
            <span>R$ 0</span>
            <span>{fmt(valorOrcado)}</span>
          </div>
        </div>
      </div>

      {/* ═══ 3. EVOLUÇÃO E FATURAMENTO ═══ */}
      <div className="rbim-grid2-charts" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14, marginBottom: 16 }}>
        {/* Curva S */}
        <div style={surface()}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, fontFamily: T.fontDisplay, letterSpacing: "-0.01em" }}>Curva S — Cronograma Físico-Financeiro</div>
          {curvaS.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={curvaS} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="mes" tick={{ fill: T.text3, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text3, fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} contentStyle={tt} />
                <Line type="monotone" dataKey="orcado" name="Orçado" stroke={T.info} strokeWidth={2} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="gasto" name="Gasto" stroke={T.danger} strokeWidth={2.5} dot={{ fill: T.danger, r: 3 }} />
                <Line type="monotone" dataKey="recebido" name="Recebido" stroke={T.success} strokeWidth={2.5} dot={{ fill: T.success, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <PlaceholderGrafico T={T} label="Sem dados para Curva S" />}
        </div>

        {/* Medições por mês */}
        <div style={surface()}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, fontFamily: T.fontDisplay, letterSpacing: "-0.01em" }}>Medições Recebidas</div>
          {medicoesMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={medicoesMes} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="mes" tick={{ fill: T.text3, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text3, fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} contentStyle={tt} />
                <Bar dataKey="valor" name="Recebido" fill={T.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <PlaceholderGrafico T={T} label="Nenhuma medição registrada" />}
        </div>
      </div>

      {/* ═══ 4. DETALHAMENTO DE CUSTOS ═══ */}
      <div className="rbim-grid2-charts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {/* Categorias (clicável para drill-down) */}
        <div style={{ ...surface(), display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: T.fontDisplay, letterSpacing: "-0.01em" }}>
              {drillCat ? <><span style={{ color: T.text3, cursor: "pointer" }} onClick={() => setDrillCat(null)}>Categorias</span> › <span style={{ color: T.accent }}>{drillCat}</span></> : "Custos por Categoria"}
            </div>
            {drillCat && <button onClick={() => setDrillCat(null)} style={{ ...btnGhost, fontSize: 10, padding: "3px 10px" }}>← Voltar</button>}
          </div>
          {(drillCat ? porSubcat : porCategoria).length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(180, (drillCat ? porSubcat : porCategoria).length * 30)}>
              <BarChart data={drillCat ? porSubcat : porCategoria} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" tick={{ fill: T.text3, fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fill: T.text2, fontSize: 10 }} width={110} />
                <Tooltip formatter={v => fmt(v)} contentStyle={tt} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}
                  onClick={(data) => { if (!drillCat) setDrillCat(data.name); }}
                  style={{ cursor: drillCat ? "default" : "pointer" }}>
                  {(drillCat ? porSubcat : porCategoria).map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <PlaceholderGrafico T={T} label={drillCat ? "Sem subcategorias" : "Sem custos lançados"} />}
          {!drillCat && porCategoria.length > 0 && (
            <div style={{ fontSize: 10, color: T.text3, textAlign: "center", marginTop: 6, opacity: 0.7 }}>Clique em uma barra para detalhar subcategorias</div>
          )}
        </div>

        {/* Curva ABC (Pareto) */}
        <div style={surface()}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, fontFamily: T.fontDisplay, letterSpacing: "-0.01em" }}>Curva ABC — Pareto de Insumos</div>
          {curvaABC.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, curvaABC.length * 28)}>
              <BarChart data={curvaABC} layout="vertical" margin={{ left: 10, right: 50 }}>
                <XAxis type="number" tick={{ fill: T.text3, fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nameShort" tick={{ fill: T.text2, fontSize: 9 }} width={130} />
                <Tooltip formatter={(v, name) => name === "pctAcc" ? `${v.toFixed(1)}%` : fmt(v)} contentStyle={tt} />
                <Bar dataKey="value" name="Valor" radius={[0, 4, 4, 0]}>
                  {curvaABC.map((d, i) => (
                    <Cell key={i} fill={d.pctAcc <= 80 ? T.accent : d.pctAcc <= 95 ? T.accent2 : T.text3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <PlaceholderGrafico T={T} label="Sem dados para Curva ABC" />}
          {curvaABC.length > 0 && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
              {[["A (80%)", T.accent], ["B (80–95%)", T.accent2], ["C (95–100%)", T.text3]].map(([l, c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.text3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 5. AUDITORIA ═══ */}
      <div style={{ ...surface({ padding: 0, overflow: "hidden" }) }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: T.fontDisplay, letterSpacing: "-0.01em" }}>
            Auditoria — {obraAtiva.nome}
            {drillCat && <span style={{ fontSize: 11, color: T.accent, fontWeight: 500, marginLeft: 8 }}>filtro: {drillCat}</span>}
          </div>
          <span style={{ fontSize: 11, color: T.text3 }}>{tabelaAuditoria.length} registros · {fmt(tabelaAuditoria.reduce((s, d) => s + d.valor, 0))}</span>
        </div>
        <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead style={{ position: "sticky", top: 0, background: T.surfaceSolid || T.surface2, zIndex: 1 }}>
              <tr>{["Data", "Categoria", "Subcategoria", "Fornecedor", "Tipo", "Natureza", "Pagador", "Descrição", "Valor"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: h === "Valor" ? "right" : "left", color: T.text3, fontWeight: 600, fontSize: 9.5, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {tabelaAuditoria.map((d, i) => (
                <tr key={d.id || i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? "transparent" : T.rowAlt }}>
                  <td style={{ padding: "7px 12px", color: T.text3, whiteSpace: "nowrap" }}>{d.data}</td>
                  <td style={{ padding: "7px 12px", color: T.accent2, fontSize: 10, fontWeight: 500 }}>{d.categoria}</td>
                  <td style={{ padding: "7px 12px", color: T.text3, fontSize: 10 }}>{d.subcategoria}</td>
                  <td style={{ padding: "7px 12px" }}>{d.fornecedor || "—"}</td>
                  <td style={{ padding: "7px 12px" }}><span style={{ background: T.info + "15", color: T.info, padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 600 }}>{d.tipo}</span></td>
                  <td style={{ padding: "7px 12px" }}><span style={{ background: T.accent + "15", color: T.accent, padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 600 }}>{d.natureza}</span></td>
                  <td style={{ padding: "7px 12px", color: T.text3, fontSize: 10 }}>{d.pagador || "—"}</td>
                  <td style={{ padding: "7px 12px", color: T.text2, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.obs || "—"}</td>
                  <td style={{ padding: "7px 12px", fontWeight: 700, color: T.accent, textAlign: "right", whiteSpace: "nowrap" }}>{fmt(d.valor)}</td>
                </tr>
              ))}
              {tabelaAuditoria.length === 0 && (
                <tr><td colSpan={9} style={{ padding: "32px 12px", textAlign: "center", color: T.text3 }}>Nenhum lançamento para esta obra</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOS ABA — COMPONENT ──────────────────────────────────────────────────
function CustosAba({ T, dark, custos, allCustos, setCustos, obras, bancos, cats,
  fcObra, setFcObra, fcCat, setFcCat, fcSearch, setFcSearch,
  fcTipo, setFcTipo, fcNatureza, setFcNatureza, fcPagador, setFcPagador,
  fcBanco, setFcBanco, fcDateFrom, setFcDateFrom, fcDateTo, setFcDateTo,
  activeFiltersCount, clearCustosFilters,
  fcSort, toggleSort, fcGroupBy, setFcGroupBy,
  selectedIds, toggleSelect, selectAll, clearSelection, setSelectedIds,
  bulkField, setBulkField, bulkValue, setBulkValue,
  bulkSub, setBulkSub, applyBulkEdit, applyBulkDelete,
  obrasNames, catsNames, openModal, showToast,
  surface, inputStyle, labelStyle, btnPrimary, btnGhost }) {

  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const toggleGroup = (key) => setCollapsedGroups(prev => { const n = new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; });

  // ── KPIs derivados ──
  const totalFiltrado = custos.reduce((s,d)=>s+d.valor,0);
  const countFiltrado = custos.length;
  const porNatureza = useMemo(()=>{
    const m={};
    custos.forEach(d=>{m[d.natureza]=(m[d.natureza]||0)+d.valor;});
    return m;
  },[custos]);
  const porTipo = useMemo(()=>{
    const m={};
    custos.forEach(d=>{m[d.tipo]=(m[d.tipo]||0)+d.valor;});
    return m;
  },[custos]);

  // ── Listas únicas para filtros ──
  const bancosUnicos = useMemo(()=>["TODOS",...[...new Set(allCustos.map(c=>c.banco).filter(Boolean))].sort()],[allCustos]);
  const pagadoresUnicos = useMemo(()=>["TODOS",...[...new Set(allCustos.map(c=>c.pagador).filter(Boolean))].sort()],[allCustos]);
  const tiposUnicos = ["TODOS",...TIPOS_CUSTO];
  const naturezasUnicas = ["TODAS",...NATUREZAS];

  const COLS = [
    {key:"_check",label:"",w:36},
    {key:"data",label:"Data"},{key:"obra",label:"Obra"},{key:"banco",label:"Banco"},
    {key:"fornecedor",label:"Fornecedor"},{key:"categoria",label:"Categoria"},
    {key:"subcategoria",label:"Sub"},{key:"tipo",label:"Tipo"},
    {key:"natureza",label:"Natureza"},{key:"pagador",label:"Pagador"},
    {key:"obs",label:"Descrição"},{key:"valor",label:"Valor"},{key:"_actions",label:""},
  ];

  const sortedRows = useMemo(() => [...custos].sort((a,b)=>{
    const {col,dir} = fcSort;
    const m = dir==="asc" ? 1 : -1;
    if(col==="data") return m*(new Date(a.data)-new Date(b.data));
    if(col==="valor") return m*((a.valor||0)-(b.valor||0));
    const va=(a[col]||"").toString().toLowerCase();
    const vb=(b[col]||"").toString().toLowerCase();
    return m*(va<vb?-1:va>vb?1:0);
  }), [custos, fcSort]);

  const GROUP_OPTIONS = [
    {key:"none",label:"Sem agrupamento",icon:"—"},
    {key:"obra",label:"Obra",icon:"⬡"},
    {key:"categoria",label:"Categoria",icon:"🏷"},
    {key:"mes",label:"Mês",icon:"📅"},
    {key:"tipo",label:"Tipo de Custo",icon:"📂"},
    {key:"natureza",label:"Natureza",icon:"⚖"},
    {key:"pagador",label:"Pagador",icon:"👤"},
    {key:"fornecedor",label:"Fornecedor",icon:"🏭"},
  ];

  const grouped = useMemo(() => {
    if (fcGroupBy === "none") return null;
    const m = {};
    sortedRows.forEach(d => {
      const key = fcGroupBy === "obra" ? d.obra
        : fcGroupBy === "categoria" ? d.categoria
        : fcGroupBy === "mes" ? getMes(d.data)
        : fcGroupBy === "tipo" ? d.tipo
        : fcGroupBy === "natureza" ? d.natureza
        : fcGroupBy === "pagador" ? (d.pagador || "—")
        : fcGroupBy === "fornecedor" ? (d.fornecedor || "Sem fornecedor")
        : "—";
      if (!m[key]) m[key] = [];
      m[key].push(d);
    });
    return Object.entries(m).sort((a,b) => {
      const ta = a[1].reduce((s,d)=>s+d.valor,0);
      const tb = b[1].reduce((s,d)=>s+d.valor,0);
      return tb - ta; // maior valor primeiro
    });
  }, [sortedRows, fcGroupBy]);

  const allIds = sortedRows.map(d => d.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const SortIcon = ({col}) => {
    if(fcSort.col!==col) return <span style={{opacity:0.25,marginLeft:3,fontSize:9}}>⇅</span>;
    return <span style={{marginLeft:3,fontSize:9,color:T.accent}}>{fcSort.dir==="asc"?"↑":"↓"}</span>;
  };

  const BULK_FIELDS = [
    {key:"",label:"-- campo --"},
    {key:"data",label:"Data"},{key:"obra",label:"Obra"},{key:"banco",label:"Banco"},
    {key:"categoria",label:"Categoria + Sub"},{key:"tipo",label:"Tipo de Custo"},
    {key:"natureza",label:"Natureza"},{key:"pagador",label:"Pagador"},{key:"fornecedor",label:"Fornecedor"},
  ];
  const bulkSubs = bulkField==="categoria"&&bulkValue ? (cats.find(c=>c.nome===bulkValue)?.subs||[]) : [];

  const renderBulkValueInput = () => {
    if (!bulkField) return null;
    const si = {...inputStyle, width:"auto", minWidth:140, fontSize:12};
    switch(bulkField) {
      case "data": return <input type="date" value={bulkValue} onChange={e=>setBulkValue(e.target.value)} style={si}/>;
      case "obra": return <select value={bulkValue} onChange={e=>setBulkValue(e.target.value)} style={si}><option value="">--</option>{obras.map(o=><option key={o.id||o.nome}>{o.nome}</option>)}</select>;
      case "banco": return <select value={bulkValue} onChange={e=>setBulkValue(e.target.value)} style={si}><option value="">--</option>{bancos.map(b=><option key={b.id||b.nome}>{b.nome}</option>)}</select>;
      case "categoria": return <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        <select value={bulkValue} onChange={e=>{setBulkValue(e.target.value);setBulkSub("");}} style={si}><option value="">--</option>{cats.map(c=><option key={c.id}>{c.nome}</option>)}</select>
        {bulkSubs.length>0 && <select value={bulkSub} onChange={e=>setBulkSub(e.target.value)} style={si}><option value="">-- sub --</option>{bulkSubs.map(s=><option key={s}>{s}</option>)}</select>}
      </div>;
      case "tipo": return <select value={bulkValue} onChange={e=>setBulkValue(e.target.value)} style={si}><option value="">--</option>{TIPOS_CUSTO.map(t=><option key={t}>{t}</option>)}</select>;
      case "natureza": return <select value={bulkValue} onChange={e=>setBulkValue(e.target.value)} style={si}><option value="">--</option>{NATUREZAS.map(n=><option key={n}>{n}</option>)}</select>;
      case "pagador": return <select value={bulkValue} onChange={e=>setBulkValue(e.target.value)} style={si}><option value="">--</option>{["RBIM","JF"].map(p=><option key={p}>{p}</option>)}</select>;
      case "fornecedor": return <input type="text" value={bulkValue} onChange={e=>setBulkValue(e.target.value)} placeholder="Fornecedor..." style={si}/>;
      default: return null;
    }
  };

  const ck = {width:16,height:16,borderRadius:4,cursor:"pointer",accentColor:T.accent,margin:0};

  // hidden cols by grouping
  const hiddenByGroup = {obra:"obra",categoria:"categoria",tipo:"tipo",natureza:"natureza",pagador:"pagador",fornecedor:"fornecedor"};
  const activeCols = COLS.filter(c => !(fcGroupBy in hiddenByGroup && hiddenByGroup[fcGroupBy]===c.key));

  const renderRow = (d,i) => {
    const sel = selectedIds.has(d.id);
    return (
      <tr key={d.id??i} style={{borderBottom:`1px solid ${T.border}`,background:sel?T.accent+"10":i%2===0?"transparent":T.rowAlt,transition:"background 0.12s"}}
        onMouseEnter={e=>{if(!sel) e.currentTarget.style.background=T.accent+"06";}}
        onMouseLeave={e=>{if(!sel) e.currentTarget.style.background=i%2===0?"transparent":T.rowAlt;}}
      >
        <td style={{padding:"8px 8px",textAlign:"center",width:36}}><input type="checkbox" checked={sel} onChange={()=>toggleSelect(d.id)} style={ck}/></td>
        <td style={{padding:"8px 10px",color:T.text3,whiteSpace:"nowrap",fontSize:11}}>{d.data}</td>
        {fcGroupBy!=="obra" && <td style={{padding:"8px 10px",fontWeight:600,whiteSpace:"nowrap",fontSize:11}}>{d.obra}</td>}
        <td style={{padding:"8px 10px",color:T.text3,fontSize:11}}>{d.banco}</td>
        <td style={{padding:"8px 10px",fontSize:11}}>{d.fornecedor||"—"}</td>
        {fcGroupBy!=="categoria" && <td style={{padding:"8px 10px",color:T.accent2,fontSize:10,fontWeight:500}}>{d.categoria}</td>}
        <td style={{padding:"8px 10px",color:T.text3,fontSize:10}}>{d.subcategoria}</td>
        {fcGroupBy!=="tipo" && <td style={{padding:"8px 10px"}}><span style={{background:T.info+"15",color:T.info,padding:"2px 7px",borderRadius:5,fontSize:9,fontWeight:600}}>{d.tipo}</span></td>}
        {fcGroupBy!=="natureza" && <td style={{padding:"8px 10px"}}><span style={{background:T.accent+"15",color:T.accent,padding:"2px 7px",borderRadius:5,fontSize:9,fontWeight:600}}>{d.natureza}</span></td>}
        {fcGroupBy!=="pagador" && <td style={{padding:"8px 10px",color:T.text3,fontSize:10,fontWeight:500}}>{d.pagador||"—"}</td>}
        <td style={{padding:"8px 10px",color:T.text2,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>{d.obs}</td>
        <td style={{padding:"8px 10px",fontWeight:700,color:T.accent,textAlign:"right",whiteSpace:"nowrap",fontSize:11}}>{fmt(d.valor)}</td>
        <td style={{padding:"8px 6px",whiteSpace:"nowrap"}}>
          <div style={{display:"flex",gap:3}}>
            <button onClick={()=>openModal("custo_edit",d)} title="Editar"
              style={{background:"transparent",border:`1px solid ${T.border2}`,color:T.text3,borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:10,fontFamily:T.fontFamily||"inherit",transition:"all 0.12s",lineHeight:1}}
              onMouseEnter={e=>{e.currentTarget.style.background=T.accent+"15";e.currentTarget.style.color=T.accent;}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.text3;}}
            >✏</button>
            <button onClick={async()=>{if(window.confirm(`Excluir "${d.obs||d.categoria}" (${fmt(d.valor)})?`)){const ok=await sbFetch("custos",{method:"DELETE",id:d.id});if(ok!==null){setCustos(prev=>prev.filter(c=>c.id!==d.id));showToast?.("Lançamento excluído.","success");}else showToast?.("Erro ao excluir. Tente novamente.","error");}}} title="Excluir"
              style={{background:"transparent",border:`1px solid ${T.border2}`,color:T.text3,borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:10,fontFamily:T.fontFamily||"inherit",transition:"all 0.12s",lineHeight:1}}
              onMouseEnter={e=>{e.currentTarget.style.background=T.danger+"15";e.currentTarget.style.color=T.danger;}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.text3;}}
            >✕</button>
          </div>
        </td>
      </tr>
    );
  };

  const selTotal = [...selectedIds].reduce((s,id)=>{const c=custos.find(x=>x.id===id);return s+(c?.valor||0);},0);
  const si = {...inputStyle,fontSize:12};

  return (
    <div>
      {/* ── KPI Cards ── */}
      <div className="rbim-kpi-row" style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{...surface({padding:"16px 20px"}),flex:1,minWidth:140,borderTop:`2px solid ${T.accent}`}}>
          <div style={{fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600,marginBottom:6}}>Total Filtrado</div>
          <div style={{fontSize:20,fontWeight:700,color:T.accent,fontFamily:T.fontDisplay,letterSpacing:"-0.02em"}}>{fmt(totalFiltrado)}</div>
          <div style={{fontSize:10,color:T.text3,marginTop:4}}>{countFiltrado} lançamento{countFiltrado!==1?"s":""}</div>
        </div>
        {NATUREZAS.map(n=>(
          <div key={n} style={{...surface({padding:"16px 20px"}),flex:1,minWidth:120}}>
            <div style={{fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600,marginBottom:6}}>{n}</div>
            <div style={{fontSize:17,fontWeight:700,color:n==="Material"?T.info:n==="Mão de Obra"?T.accent2:T.success,fontFamily:T.fontDisplay,letterSpacing:"-0.02em"}}>{fmt(porNatureza[n]||0)}</div>
            <div style={{fontSize:10,color:T.text3,marginTop:4}}>{totalFiltrado>0?((porNatureza[n]||0)/totalFiltrado*100).toFixed(0):0}%</div>
          </div>
        ))}
      </div>

      {/* ── Header toolbar ── */}
      <div className="rbim-filter-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{fontWeight:700,fontSize:16,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em"}}>Lançamentos</div>
          {/* Active filters badge */}
          {activeFiltersCount > 0 && (
            <span style={{background:T.accent+"18",color:T.accent,padding:"3px 10px",borderRadius:999,fontSize:10,fontWeight:700}}>
              {activeFiltersCount} filtro{activeFiltersCount>1?"s":""} ativo{activeFiltersCount>1?"s":""}
            </span>
          )}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setShowFilters(!showFilters)} style={{...btnGhost,fontSize:11,padding:"7px 14px",display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:13}}>⚙</span> Filtros {showFilters?"▲":"▼"}
            {activeFiltersCount>0 && <span style={{background:T.accent,color:"#fff",borderRadius:999,fontSize:9,padding:"1px 5px",fontWeight:700,marginLeft:2}}>{activeFiltersCount}</span>}
          </button>
          <button onClick={()=>exportCSV(sortedRows, `custos_${new Date().toISOString().slice(0,10)}.csv`, [
            {key:"data",label:"Data",type:"date"},{key:"obra",label:"Obra"},{key:"fornecedor",label:"Fornecedor"},
            {key:"categoria",label:"Categoria"},{key:"subcategoria",label:"Subcategoria"},{key:"tipo",label:"Tipo"},
            {key:"natureza",label:"Natureza"},{key:"pagador",label:"Pagador"},{key:"banco",label:"Banco"},
            {key:"valor",label:"Valor"},{key:"obs",label:"Observação"},
          ])} style={{...btnGhost,fontSize:11,padding:"7px 14px",display:"flex",alignItems:"center",gap:5}} title="Exportar dados filtrados como CSV">
            ⬇ CSV
          </button>
          <button onClick={()=>openModal("custo")} style={{...btnPrimary,padding:"7px 18px",fontSize:12}}>+ Novo Custo</button>
        </div>
      </div>

      {/* ── Expanded Filters Panel ── */}
      {showFilters && (
        <div style={{...surface({padding:"16px 20px",marginBottom:14}),animation:"slideDown 0.15s ease-out"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))",gap:10,marginBottom:10}}>
            <div><label style={labelStyle}>Obra</label><select value={fcObra} onChange={e=>setFcObra(e.target.value)} style={si}>{obrasNames.map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label style={labelStyle}>Categoria</label><select value={fcCat} onChange={e=>setFcCat(e.target.value)} style={si}>{catsNames.map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label style={labelStyle}>Tipo de Custo</label><select value={fcTipo} onChange={e=>setFcTipo(e.target.value)} style={si}>{tiposUnicos.map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label style={labelStyle}>Natureza</label><select value={fcNatureza} onChange={e=>setFcNatureza(e.target.value)} style={si}>{naturezasUnicas.map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label style={labelStyle}>Pagador</label><select value={fcPagador} onChange={e=>setFcPagador(e.target.value)} style={si}>{pagadoresUnicos.map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label style={labelStyle}>Banco</label><select value={fcBanco} onChange={e=>setFcBanco(e.target.value)} style={si}>{bancosUnicos.map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label style={labelStyle}>Data de</label><input type="date" value={fcDateFrom} onChange={e=>setFcDateFrom(e.target.value)} style={si}/></div>
            <div><label style={labelStyle}>Data até</label><input type="date" value={fcDateTo} onChange={e=>setFcDateTo(e.target.value)} style={si}/></div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:180}}><label style={labelStyle}>Buscar (descrição / fornecedor / sub)</label><input value={fcSearch} onChange={e=>setFcSearch(e.target.value)} placeholder="Pesquisar..." style={si}/></div>
            {activeFiltersCount>0 && <button onClick={clearCustosFilters} style={{...btnGhost,fontSize:11,color:T.danger,borderColor:T.danger+"33",marginTop:18}}>✕ Limpar filtros</button>}
          </div>
        </div>
      )}

      {/* ── Grouping selector ── */}
      <div style={{...surface({padding:"10px 18px",marginBottom:14}),display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span style={{fontSize:10,color:T.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",flexShrink:0}}>Agrupar:</span>
        {GROUP_OPTIONS.map(g=>(
          <button key={g.key} onClick={()=>{setFcGroupBy(g.key);setCollapsedGroups(new Set());clearSelection();}}
            style={{
              padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:fcGroupBy===g.key?700:400,fontFamily:T.fontFamily,
              background:fcGroupBy===g.key?T.accent+"18":"transparent",
              color:fcGroupBy===g.key?T.accent:T.text3,
              transition:"all 0.15s",
            }}
          >{g.icon} {g.label}</button>
        ))}
      </div>

      {/* ── Bulk Edit Bar ── */}
      {someSelected && (
        <div style={{
          ...surface({padding:"12px 18px",marginBottom:14}),
          borderLeft:`3px solid ${T.accent}`,
          display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",
          animation:"fadeUp 0.15s ease-out",
        }}>
          <div style={{fontWeight:700,fontSize:13,color:T.accent,flexShrink:0}}>
            {selectedIds.size} sel. · <span style={{fontFamily:T.fontDisplay}}>{fmt(selTotal)}</span>
          </div>
          <div style={{height:20,width:1,background:T.border2,flexShrink:0}}/>
          <select value={bulkField} onChange={e=>{setBulkField(e.target.value);setBulkValue("");setBulkSub("");}} style={{...si,width:"auto",minWidth:130}}>
            {BULK_FIELDS.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          {renderBulkValueInput()}
          <div style={{display:"flex",gap:6,marginLeft:"auto",flexShrink:0}}>
            {bulkField && bulkValue && (
              <button onClick={applyBulkEdit} style={{...btnPrimary,padding:"6px 14px",fontSize:11}}>✓ Aplicar</button>
            )}
            <button onClick={applyBulkDelete} style={{...btnGhost,color:T.danger,borderColor:T.danger+"33",padding:"6px 12px",fontSize:11}}>🗑 Excluir</button>
            <button onClick={clearSelection} style={{...btnGhost,padding:"6px 10px",fontSize:11}}>✕</button>
          </div>
        </div>
      )}

      {/* ── Data Table ── */}
      <div style={surface({padding:0,overflow:"hidden"})}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
          <span style={{fontWeight:600,fontSize:12}}>
            {countFiltrado} registros · <span style={{color:T.accent,fontWeight:700}}>{fmt(totalFiltrado)}</span>
          </span>
          <span style={{fontSize:10,color:T.text3}}>
            {fcGroupBy!=="none"
              ? `Agrupado por ${GROUP_OPTIONS.find(g=>g.key===fcGroupBy)?.label||fcGroupBy} · ${grouped?.length||0} grupos`
              : "Clique no cabeçalho para ordenar"}
          </span>
        </div>
        <div style={{overflowX:"auto",maxHeight:600,overflowY:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{position:"sticky",top:0,background:T.surfaceSolid||T.surface2,zIndex:1}}>
              <tr>
                {activeCols.map(({key,label})=>(
                  <th key={key}
                    onClick={key!=="_actions"&&key!=="_check"?()=>toggleSort(key):key==="_check"?()=>allSelected?clearSelection():selectAll(allIds):undefined}
                    style={{
                      padding:key==="_check"?"8px 8px":"8px 10px",
                      textAlign:key==="valor"?"right":key==="_check"?"center":"left",
                      color:key==="_check"?T.accent:fcSort.col===key?T.accent:T.text3,
                      fontWeight:600,fontSize:9.5,borderBottom:`1px solid ${T.border}`,
                      whiteSpace:"nowrap",letterSpacing:"0.07em",textTransform:"uppercase",
                      cursor:key!=="_actions"?"pointer":"default",userSelect:"none",
                      transition:"color 0.15s",
                      background:fcSort.col===key?T.accent+"08":"transparent",
                      width:key==="_check"?36:key==="_actions"?64:undefined,
                    }}
                  >
                    {key==="_check"?<input type="checkbox" checked={allSelected} onChange={()=>allSelected?clearSelection():selectAll(allIds)} style={{width:14,height:14,borderRadius:3,cursor:"pointer",accentColor:T.accent,margin:0}}/>
                    :<>{label}{key!=="_actions"&&<SortIcon col={key}/>}</>}
                  </th>
                ))}
              </tr>
            </thead>

            {!grouped && <tbody>{sortedRows.map((d,i)=>renderRow(d,i))}</tbody>}

            {grouped && grouped.map(([groupKey, rows]) => {
              const isC = collapsedGroups.has(groupKey);
              const gTotal = rows.reduce((s,d)=>s+d.valor,0);
              const gSel = rows.filter(d=>selectedIds.has(d.id)).length;
              const gAllSel = rows.length>0 && rows.every(d=>selectedIds.has(d.id));
              const gIcon = fcGroupBy==="obra"?"⬡":fcGroupBy==="categoria"?(CAT_ICONS[groupKey]||"📁"):fcGroupBy==="mes"?"📅":fcGroupBy==="tipo"?"📂":fcGroupBy==="natureza"?"⚖":fcGroupBy==="pagador"?"👤":"🏭";
              const gPct = totalFiltrado>0 ? (gTotal/totalFiltrado*100).toFixed(0) : 0;
              return (
                <tbody key={groupKey}>
                  <tr style={{background:T.surface2,borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"8px 8px",textAlign:"center"}}>
                      <input type="checkbox" checked={gAllSel}
                        onChange={()=>{const ids=rows.map(d=>d.id);if(gAllSel){setSelectedIds(prev=>{const n=new Set(prev);ids.forEach(id=>n.delete(id));return n;});}else{setSelectedIds(prev=>{const n=new Set(prev);ids.forEach(id=>n.add(id));return n;});}}}
                        style={{width:14,height:14,borderRadius:3,cursor:"pointer",accentColor:T.accent,margin:0}}/>
                    </td>
                    <td colSpan={activeCols.length-2} style={{padding:"8px 10px",cursor:"pointer"}} onClick={()=>toggleGroup(groupKey)}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:13}}>{gIcon}</span>
                        <span style={{fontWeight:700,fontSize:12,color:T.text}}>{groupKey||"—"}</span>
                        <span style={{fontSize:10,color:T.text3}}>{rows.length} itens</span>
                        <span style={{fontSize:9,color:T.text3,background:T.surface,padding:"2px 7px",borderRadius:4}}>{gPct}%</span>
                        {gSel>0 && <span style={{fontSize:9,color:T.accent,background:T.accent+"15",padding:"1px 7px",borderRadius:999,fontWeight:600}}>{gSel} sel.</span>}
                        <span style={{marginLeft:"auto",fontWeight:700,fontSize:12,color:T.accent,fontFamily:T.fontDisplay}}>{fmt(gTotal)}</span>
                        <span style={{fontSize:10,color:T.text3,marginLeft:4,transition:"transform 0.2s",transform:isC?"rotate(-90deg)":"rotate(0deg)",display:"inline-block"}}>▼</span>
                      </div>
                    </td>
                    <td style={{padding:"8px 6px"}}/>
                  </tr>
                  {!isC && rows.map((d,i)=>renderRow(d,i))}
                </tbody>
              );
            })}
          </table>
        </div>
      </div>

      {countFiltrado===0 && (
        <div style={{...surface({textAlign:"center",padding:"48px 20px",marginTop:14})}}>
          <div style={{fontSize:36,marginBottom:12}}>💸</div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>Nenhum lançamento encontrado</div>
          <div style={{fontSize:12,color:T.text3,marginBottom:16}}>Ajuste os filtros ou crie um novo custo</div>
          {activeFiltersCount>0 && <button onClick={clearCustosFilters} style={btnGhost}>✕ Limpar filtros</button>}
        </div>
      )}
    </div>
  );
}

// ─── SMART FEATURE HOOKS ─────────────────────────────────────────────────────

/**
 * useFornecedores
 * Mantém a lista de fornecedores conhecidos derivada dos lançamentos existentes.
 * Ao salvar um custo novo, o App chama `addFornecedor(nome)`.
 * A lista é deduplicada e ordenada alfabeticamente.
 */
function useFornecedores(seedCustos) {
  const [fornecedores, setFornecedores] = useState(() =>
    [...new Set(
      seedCustos.map(c => c.fornecedor).filter(Boolean).map(s => s.toUpperCase())
    )].sort()
  );

  const addFornecedor = (nome) => {
    if (!nome || !nome.trim()) return;
    const up = nome.trim().toUpperCase();
    setFornecedores(prev =>
      prev.includes(up) ? prev : [...prev, up].sort()
    );
  };

  return { fornecedores, addFornecedor };
}

/**
 * FornecedorInput
 * Campo de texto com autocomplete baseado nos fornecedores conhecidos.
 * Exibe lista flutuante com max 6 sugestões filtradas pelo que foi digitado.
 * Aceita navegação por teclado (↑↓ Enter Esc).
 */
function FornecedorInput({ value, onChange, fornecedores, inputStyle, labelStyle, T }) {
  const [open, setOpen]         = useState(false);
  const [cursor, setCursor]     = useState(-1);
  const inputRef                = useRef(null);
  const listRef                 = useRef(null);

  const suggestions = value.trim().length === 0
    ? []
    : fornecedores.filter(f =>
        f.includes(value.trim().toUpperCase())
      ).slice(0, 6);

  const pick = (nome) => {
    onChange(nome);
    setOpen(false);
    setCursor(-1);
    inputRef.current?.blur();
  };

  const handleKey = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && cursor >= 0) {
      e.preventDefault();
      pick(suggestions[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setCursor(-1);
    }
  };

  return (
    <div style={{ marginBottom: 12, position: "relative" }}>
      <label style={labelStyle}>Fornecedor / Recebedor</label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setCursor(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKey}
        placeholder="Nome do fornecedor..."
        autoComplete="off"
        style={inputStyle}
      />
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 9999,
            background: T.surfaceSolid||T.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            border: `1px solid ${T.border2}`,
            borderRadius: 12, margin: 0, padding: 6,
            listStyle: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)",
            maxHeight: 220, overflowY: "auto",
          }}
        >
          {suggestions.map((s, i) => {
            const q = value.trim().toUpperCase();
            const idx = s.indexOf(q);
            return (
              <li
                key={s}
                onMouseDown={() => pick(s)}
                style={{
                  padding: "7px 12px", borderRadius: 6, cursor: "pointer",
                  fontSize: 12, fontWeight: i === cursor ? 800 : 400,
                  background: i === cursor ? T.accent + "22" : "transparent",
                  color: T.text, transition: "background 0.1s",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <span style={{ color: T.text3, fontSize: 10 }}>🏭</span>
                {idx >= 0 ? (
                  <>
                    {s.slice(0, idx)}
                    <strong style={{ color: T.accent }}>{s.slice(idx, idx + q.length)}</strong>
                    {s.slice(idx + q.length)}
                  </>
                ) : s}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── BUDGET STEP ACCORDION ───────────────────────────────────────────────────

/**
 * useBudgetAccordion
 * Gerencia quais etapas estão expandidas.
 * modoCompacto=true  → todos recolhidos
 * modoCompacto=false → estado individual por etapa
 */
function useBudgetAccordion(etapas) {
  const [modoCompacto, setModoCompacto] = useState(false);
  // set de keys expandidas
  const [expandidas, setExpandidas] = useState(() => new Set());

  const toggle = (key) => {
    if (modoCompacto) return; // ignora clique individual no modo compacto
    setExpandidas(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const isOpen = (key) => !modoCompacto && expandidas.has(key);

  const expandAll = () => {
    setModoCompacto(false);
    setExpandidas(new Set(etapas));
  };

  const collapseAll = () => {
    setModoCompacto(true);
    setExpandidas(new Set());
  };

  const toggleModo = () => {
    if (modoCompacto) {
      // ao sair do compacto, expande tudo
      setModoCompacto(false);
      setExpandidas(new Set(etapas));
    } else {
      collapseAll();
    }
  };

  return { modoCompacto, toggleModo, toggle, isOpen, expandAll, collapseAll };
}

/**
 * BudgetStepAccordion
 *
 * Props:
 *   etapa        {string}   nome da macroetapa
 *   icone        {string}   emoji
 *   cor          {string}   hex — usada apenas na borda esquerda
 *   total        {number}   soma dos valores da etapa
 *   totalOrc     {number}   total geral do orçamento (para calcular %)
 *   isOpen       {bool}
 *   onToggle     {fn}
 *   modoCompacto {bool}
 *   T            {object}   tema
 *   children     {ReactNode} conteúdo expandido (tabela de itens)
 */
function BudgetStepAccordion({ etapa, icone, cor, total, totalOrc, isOpen, onToggle, modoCompacto, T, children }) {
  const pct    = totalOrc > 0 ? (total / totalOrc) * 100 : 0;
  const temVal = total > 0;

  // cor da barra de progresso: verde se preenchido, neutro se zerado
  const barColor = temVal ? cor : T.border2;

  return (
    <div style={{
      background: T.glassBg||T.surface,
      backdropFilter: T.glassBlur||"blur(16px)",
      WebkitBackdropFilter: T.glassBlur||"blur(16px)",
      border: `1px solid ${T.border}`,
      borderLeft: `2px solid ${temVal ? cor : T.border2}`,
      borderRadius: 12,
      overflow: "hidden",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: T.shadow,
    }}>
      {/* ── HEADER COMPACTO (sempre visível) ─────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        disabled={modoCompacto}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: modoCompacto ? "default" : "pointer",
          padding: "11px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          textAlign: "left",
          fontFamily: "inherit",
          color: T.text,
        }}
      >
        {/* ícone + nome */}
        <span style={{ fontSize: 15, flexShrink: 0 }}>{icone}</span>
        <span style={{
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: T.text,
          flex: "0 0 160px",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "inherit",
        }}>{etapa}</span>

        {/* barra de representatividade */}
        <div style={{ flex: 1, minWidth: 60 }}>
          <div style={{
            background: T.surface2,
            borderRadius: 999,
            height: 5,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              borderRadius: 999,
              background: barColor,
              width: `${Math.min(pct, 100)}%`,
              transition: "width 0.4s, background 0.2s",
            }} />
          </div>
        </div>

        {/* percentual */}
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: temVal ? cor : T.text3,
          flex: "0 0 38px",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}>
          {pct > 0 ? `${pct.toFixed(1)}%` : "—"}
        </span>

        {/* valor total da etapa */}
        <span style={{
          fontSize: 13,
          fontWeight: 900,
          color: temVal ? T.text : T.text3,
          flex: "0 0 130px",
          textAlign: "right",
          fontFamily: T.fontDisplay||"inherit",
          fontVariantNumeric: "tabular-nums",
        }}>
          {temVal ? fmt(total) : "R$ —"}
        </span>

        {/* chevron */}
        {!modoCompacto && (
          <span style={{
            fontSize: 10,
            color: T.text3,
            marginLeft: 6,
            flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.22s",
            display: "inline-block",
          }}>▼</span>
        )}
      </button>

      {/* ── BODY EXPANDIDO ───────────────────────────────────────────── */}
      {isOpen && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── ABA ORÇAMENTO ───────────────────────────────────────────────────────────

function GaugeCircle({ pct, cor, size = 80, T }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1) * circ;
  const color = pct > 100 ? T.danger : pct > 80 ? T.accent2 : cor;
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border2} strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.5s" }} />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size < 70 ? 10 : 13} fontWeight="700" fontFamily="inherit">
        {pct > 0 ? `${Math.round(pct)}%` : "—"}
      </text>
    </svg>
  );
}

function HealthDot({ pct, T }) {
  const color = pct === 0 ? T.text3 : pct > 100 ? T.danger : pct > 80 ? "#F59E0B" : T.success;
  const label = pct === 0 ? "—" : pct > 100 ? "Estourado" : pct > 80 ? "Atenção" : "OK";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 9, color, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

function AbaOrcamento({ T, obras, custos, orcamento, setOrcamento, saldoBancos,
  btnPrimary, btnGhost, surface, inputStyle, labelStyle, onNovaLinha }) {

  const [filtroObra, setFiltroObra] = useState("TODAS");
  const [modoTemplate, setModoTemplate] = useState(false);
  const [templateObra, setTemplateObra] = useState("");
  const [templateVals, setTemplateVals] = useState({}); // { "CATEGORIA" -> number }
  const [editingCell, setEditingCell] = useState(null); // { id, field } para edição inline
  const [editingVal, setEditingVal] = useState("");

  const obrasList = ["TODAS", ...obras.map(o => o.nome)];
  const caixaTotal = saldoBancos.reduce((s, b) => s + (b.saldoAtual || 0), 0);

  const linhasFilt = useMemo(() =>
    filtroObra === "TODAS" ? orcamento : orcamento.filter(x => x.obra === filtroObra),
  [orcamento, filtroObra]);

  const obrasFilt = useMemo(() => {
    const nomes = filtroObra === "TODAS"
      ? [...new Set(orcamento.map(x => x.obra))]
      : [filtroObra];
    return nomes;
  }, [orcamento, filtroObra]);

  const totalOrcGlobal = linhasFilt.reduce((s, x) => s + (x.valorOrcado || 0), 0);
  const totalRealGlobal = useMemo(() => {
    const obraSet = filtroObra === "TODAS" ? null : filtroObra;
    return custos.filter(c => !obraSet || c.obra === obraSet).reduce((s, c) => s + (c.valor || 0), 0);
  }, [custos, filtroObra]);
  const diffGlobal = totalOrcGlobal - totalRealGlobal;
  const pctGlobal = totalOrcGlobal > 0 ? (totalRealGlobal / totalOrcGlobal) * 100 : 0;

  // ── edição inline ────────────────────────────────────────────────────────
  const startEdit = (id, val) => { setEditingCell(id); setEditingVal(String(val)); };
  const commitEdit = async (id) => {
    const v = parseFloat(editingVal.replace(",", ".")) || 0;
    await sbFetch("orcamento", { method: "PATCH", id, body: { valor_orcado: v } });
    setOrcamento(prev => prev.map(x => x.id === id ? { ...x, valorOrcado: v } : x));
    setEditingCell(null);
  };

  // ── salvar template simplificado (por categoria apenas) ──────────────────
  const salvarTemplate = async () => {
    if (!templateObra) { alert("Selecione uma obra."); return; }
    const novas = [];
    const CATS_TEMPLATE = [
      { cat: "SERVIÇOS PRELIMINARES", tipo: "Indireto (BDI)", natureza: "Material"    },
      { cat: "ESTRUTURA",             tipo: "Direto",         natureza: "Material"    },
      { cat: "ALVENARIA",             tipo: "Direto",         natureza: "Material"    },
      { cat: "COBERTURA",             tipo: "Direto",         natureza: "Material"    },
      { cat: "INSTALAÇÃO HIDRO",      tipo: "Direto",         natureza: "Material"    },
      { cat: "INSTALAÇÃO ELÉTRICA",   tipo: "Direto",         natureza: "Material"    },
      { cat: "PISO",                  tipo: "Direto",         natureza: "Material"    },
      { cat: "PINTURA",               tipo: "Direto",         natureza: "Material"    },
      { cat: "REVESTIMENTO",          tipo: "Direto",         natureza: "Material"    },
      { cat: "ACABAMENTOS",           tipo: "Direto",         natureza: "Material"    },
      { cat: "MÃO DE OBRA",           tipo: "Direto",         natureza: "Mão de Obra" },
      { cat: "CUSTOS INDIRETOS",      tipo: "Indireto (BDI)", natureza: "Material"    },
      { cat: "CUSTOS ADMINISTRATIVOS",tipo: "Administrativo", natureza: "Material"    },
      { cat: "LOGISTICA",             tipo: "Indireto (BDI)", natureza: "Material"    },
    ];
    CATS_TEMPLATE.forEach(({ cat, tipo, natureza }) => {
      const v = templateVals[cat] || 0;
      if (v > 0) {
        novas.push({ obra: templateObra, categoria: cat, subcategoria: "GERAL", tipo, natureza, valorOrcado: v });
      }
    });
    if (novas.length === 0) { alert("Preencha ao menos um valor."); return; }
    const promises = novas.map(n => sbFetch("orcamento", { method: "POST", body: { obra: n.obra, categoria: n.categoria, subcategoria: n.subcategoria, tipo: n.tipo, natureza: n.natureza, valor_orcado: n.valorOrcado } }));
    const results = await Promise.all(promises);
    const salvas = results.filter(r => r?.[0]).map(r => mapOrcamento(r[0]));
    setOrcamento(prev => [...prev, ...salvas]);
    setModoTemplate(false);
    setTemplateVals({});
    setTemplateObra("");
  };

  // ── MODO TEMPLATE ──────────────────────────────────────────────────────────
  if (modoTemplate) {
    const templateTotal = Object.values(templateVals).reduce((s, v) => s + (v || 0), 0);
    const CATS_TEMPLATE = [
      { cat: "SERVIÇOS PRELIMINARES", icone: "🔧", cor: "#06B6D4" },
      { cat: "ESTRUTURA",             icone: "🏗️", cor: "#F97316" },
      { cat: "ALVENARIA",             icone: "🧱", cor: "#EF4444" },
      { cat: "COBERTURA",             icone: "🏠", cor: "#8B5CF6" },
      { cat: "INSTALAÇÃO HIDRO",      icone: "🚿", cor: "#10B981" },
      { cat: "INSTALAÇÃO ELÉTRICA",   icone: "⚡", cor: "#FBBF24" },
      { cat: "PISO",                  icone: "🪵", cor: "#D97706" },
      { cat: "PINTURA",               icone: "🎨", cor: "#EC4899" },
      { cat: "REVESTIMENTO",          icone: "🪟", cor: "#84CC16" },
      { cat: "ACABAMENTOS",           icone: "✨", cor: "#14B8A6" },
      { cat: "MÃO DE OBRA",           icone: "👷", cor: "#F59E0B" },
      { cat: "CUSTOS INDIRETOS",      icone: "📦", cor: "#6366F1" },
      { cat: "CUSTOS ADMINISTRATIVOS",icone: "📋", cor: "#0EA5E9" },
      { cat: "LOGISTICA",             icone: "🚚", cor: "#E11D48" },
    ];
    const preenchidas = CATS_TEMPLATE.filter(c => (templateVals[c.cat] || 0) > 0).length;

    return (
      <div>
        {/* ── HEADER ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, fontFamily: T.fontDisplay }}>📋 Novo Orçamento</div>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>
              Insira o valor estimado por categoria. Deixe em branco o que não se aplica.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ ...surface({ padding: "10px 20px" }), textAlign: "center", borderTop: `2px solid ${T.info}` }}>
              <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: 1 }}>Total Orçado</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.info, fontFamily: T.fontDisplay }}>{fmt(templateTotal)}</div>
              <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>{preenchidas} categorias</div>
            </div>
            <button onClick={() => { setModoTemplate(false); setTemplateVals({}); }} style={btnGhost}>✕ Cancelar</button>
            <button onClick={salvarTemplate} style={{ ...btnPrimary, background: T.success }}>✓ Salvar Orçamento</button>
          </div>
        </div>

        {/* ── SELETOR DE OBRA ── */}
        <div style={{ ...surface({ padding: "14px 20px", marginBottom: 20 }), display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 240px" }}>
            <label style={labelStyle}>Obra *</label>
            <select value={templateObra} onChange={e => setTemplateObra(e.target.value)} style={inputStyle}>
              <option value="">— selecione a obra —</option>
              {obras.map(o => <option key={o.id} value={o.nome}>{o.nome}</option>)}
            </select>
          </div>
          {templateObra && (
            <div style={{ padding: "6px 14px", background: T.success + "18", border: `1px solid ${T.success}44`, borderRadius: 8, fontSize: 12, color: T.success, fontWeight: 600 }}>
              ✓ {templateObra}
            </div>
          )}
        </div>

        {/* ── GRID DE CATEGORIAS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {CATS_TEMPLATE.map(({ cat, icone, cor }) => {
            const val = templateVals[cat] || 0;
            const preenchido = val > 0;
            return (
              <div key={cat} style={{
                ...surface({ padding: 0, overflow: "hidden" }),
                borderLeft: `3px solid ${preenchido ? cor : T.border2}`,
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: preenchido ? `0 2px 12px ${cor}22` : undefined,
              }}>
                {/* card header */}
                <div style={{
                  padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
                  background: preenchido ? cor + "12" : "transparent",
                  borderBottom: `1px solid ${T.border}`,
                  transition: "background 0.2s",
                }}>
                  <span style={{ fontSize: 18 }}>{icone}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: preenchido ? cor : T.text2, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat}</div>
                    {preenchido && <div style={{ fontSize: 9, color: cor, marginTop: 1 }}>{fmt(val)}</div>}
                  </div>
                </div>
                {/* input */}
                <div style={{ padding: "10px 14px" }}>
                  <CurrencyInput
                    value={val}
                    onChange={v => setTemplateVals(prev => ({ ...prev, [cat]: v }))}
                    label=""
                    inputStyle={{
                      ...inputStyle,
                      borderColor: preenchido ? cor + "88" : undefined,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                    labelStyle={labelStyle}
                    T={T}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── MODO TABELA (visão principal) ─────────────────────────────────────────
  return (
    <div>
      {/* KPIs com gauge */}
      <div className="rbim-orc-kpis" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "stretch" }}>

        {/* Gauge geral */}
        <div style={{ ...surface({ padding: "16px 20px" }), display: "flex", alignItems: "center", gap: 16, minWidth: 200, flex: "0 0 auto" }}>
          <GaugeCircle pct={pctGlobal} cor={T.info} size={80} T={T} />
          <div>
            <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Execução Geral</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: pctGlobal > 100 ? T.danger : pctGlobal > 80 ? "#F59E0B" : T.success }}>
              {pctGlobal > 100 ? "Estourado" : pctGlobal > 80 ? "Atenção" : "Dentro do orçamento"}
            </div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{fmt(totalRealGlobal)} de {fmt(totalOrcGlobal)}</div>
          </div>
        </div>

        {/* Caixa */}
        <div style={{ ...surface({ padding: "14px 20px" }), flex: 1, minWidth: 140, borderTop: `2px solid ${caixaTotal >= 0 ? T.success : T.danger}` }}>
          <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🏦 Caixa</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: caixaTotal >= 0 ? T.success : T.danger, fontFamily: T.fontDisplay }}>{fmt(caixaTotal)}</div>
          <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>{saldoBancos.length} conta(s)</div>
        </div>

        {/* Orçado */}
        <div style={{ ...surface({ padding: "14px 20px" }), flex: 1, minWidth: 140, borderTop: `2px solid ${T.info}` }}>
          <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Orçado</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.info, fontFamily: T.fontDisplay }}>{fmt(totalOrcGlobal)}</div>
        </div>

        {/* Realizado */}
        <div style={{ ...surface({ padding: "14px 20px" }), flex: 1, minWidth: 140, borderTop: `2px solid ${T.accent}` }}>
          <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Realizado</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.accent, fontFamily: T.fontDisplay }}>{fmt(totalRealGlobal)}</div>
        </div>

        {/* Saldo */}
        <div style={{ ...surface({ padding: "14px 20px" }), flex: 1, minWidth: 140, borderTop: `2px solid ${diffGlobal >= 0 ? T.success : T.danger}` }}>
          <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Saldo</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: diffGlobal >= 0 ? T.success : T.danger, fontFamily: T.fontDisplay }}>{fmt(diffGlobal)}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rbim-budget-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <label style={labelStyle}>Filtrar por Obra</label>
          <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)} style={{ ...inputStyle, width: 220 }}>
            {obrasList.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onNovaLinha} style={btnGhost}>+ Linha Avulsa</button>
          <button onClick={() => setModoTemplate(true)} style={{ ...btnPrimary, background: T.info }}>
            📋 Novo Orçamento
          </button>
        </div>
      </div>

      {/* Vazio */}
      {obrasFilt.length === 0 && (
        <div style={{ ...surface({ textAlign: "center", padding: "48px 20px" }) }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Nenhum orçamento cadastrado</div>
          <div style={{ fontSize: 12, color: T.text3, marginBottom: 16 }}>Crie o orçamento da obra clicando em "Novo Orçamento"</div>
          <button onClick={() => setModoTemplate(true)} style={{ ...btnPrimary, background: T.info }}>📋 Criar Primeiro Orçamento</button>
        </div>
      )}

      {/* Cards por obra */}
      {obrasFilt.map(nomeObra => {
        const linhas = linhasFilt.filter(x => x.obra === nomeObra);
        if (linhas.length === 0) return null;
        const totalOrc = linhas.reduce((s, x) => s + (x.valorOrcado || 0), 0);
        const totalReal = custos.filter(c => c.obra === nomeObra).reduce((s, c) => s + (c.valor || 0), 0);
        const diff = totalOrc - totalReal;
        const pct = totalOrc > 0 ? (totalReal / totalOrc) * 100 : 0;

        // agrupa por categoria para os cards visuais
        const porCat = {};
        linhas.forEach(x => {
          if (!porCat[x.categoria]) porCat[x.categoria] = { orc: 0, linhas: [] };
          porCat[x.categoria].orc += x.valorOrcado || 0;
          porCat[x.categoria].linhas.push(x);
        });
        Object.keys(porCat).forEach(cat => {
          porCat[cat].real = custos.filter(c => c.obra === nomeObra && c.categoria === cat).reduce((s, c) => s + c.valor, 0);
          porCat[cat].pct = porCat[cat].orc > 0 ? (porCat[cat].real / porCat[cat].orc) * 100 : 0;
        });

        return (
          <div key={nomeObra} style={{ ...surface({ marginBottom: 16, padding: 0, overflow: "hidden" }) }}>
            {/* obra header */}
            <div style={{ padding: "14px 20px", background: T.surface2, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <GaugeCircle pct={pct} cor={T.info} size={56} T={T} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, fontFamily: T.fontDisplay }}>{nomeObra}</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, marginTop: 4, flexWrap: "wrap" }}>
                    <span>Orçado: <strong style={{ color: T.info }}>{fmt(totalOrc)}</strong></span>
                    <span>Realizado: <strong style={{ color: T.accent }}>{fmt(totalReal)}</strong></span>
                    <span>Saldo: <strong style={{ color: diff >= 0 ? T.success : T.danger }}>{fmt(diff)}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* cards visuais por categoria */}
            <div style={{ padding: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {Object.entries(porCat).map(([cat, dados]) => {
                const cor = CAT_COLORS[cat] || T.accent;
                const icon = CAT_ICONS[cat] || "📁";
                const saude = dados.pct;
                return (
                  <div key={cat} style={{
                    background: T.surface2, borderRadius: 10, overflow: "hidden",
                    border: `1px solid ${saude > 100 ? T.danger + "66" : T.border}`,
                    borderTop: `3px solid ${cor}`,
                    transition: "box-shadow 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${cor}22`}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                  >
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{icon}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: cor, textTransform: "uppercase", lineHeight: 1.2 }}>{cat}</span>
                        </div>
                        <HealthDot pct={saude} T={T} />
                      </div>
                      {/* barra de progresso */}
                      <div style={{ background: T.border2, borderRadius: 999, height: 4, overflow: "hidden", marginBottom: 6 }}>
                        <div style={{
                          height: "100%", borderRadius: 999, transition: "width 0.4s",
                          width: `${Math.min(saude, 100)}%`,
                          background: saude > 100 ? T.danger : saude > 80 ? "#F59E0B" : cor,
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                        <span style={{ color: T.text3 }}>Orç: <span style={{ color: T.info, fontWeight: 600 }}>{fmt(dados.orc)}</span></span>
                        <span style={{ color: T.text3 }}>Real: <span style={{ color: dados.real > dados.orc ? T.danger : T.accent, fontWeight: 600 }}>{fmt(dados.real)}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* tabela inline */}
            <div style={{ borderTop: `1px solid ${T.border}`, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: T.surface2 }}>
                    {["Categoria", "Subcategoria", "Tipo", "Natureza", "Orçado", "Realizado", "Saldo", ""].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: h === "Orçado" || h === "Realizado" || h === "Saldo" ? "right" : "left", color: T.text3, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((x, i) => {
                    const real = custos.filter(c => c.obra === nomeObra && c.categoria === x.categoria && c.subcategoria === x.subcategoria).reduce((s, c) => s + (c.valor || 0), 0);
                    const dif = (x.valorOrcado || 0) - real;
                    const isEditing = editingCell === x.id;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? "transparent" : T.rowAlt }}>
                        <td style={{ padding: "8px 12px", color: CAT_COLORS[x.categoria] || T.accent2, fontWeight: 600 }}>
                          <span style={{ marginRight: 5 }}>{CAT_ICONS[x.categoria] || ""}</span>{x.categoria}
                        </td>
                        <td style={{ padding: "8px 12px", color: T.text2 }}>{x.subcategoria}</td>
                        <td style={{ padding: "8px 12px" }}><span style={{ background: T.info + "18", color: T.info, padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 600 }}>{x.tipo}</span></td>
                        <td style={{ padding: "8px 12px" }}><span style={{ background: T.accent + "18", color: T.accent, padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 600 }}>{x.natureza}</span></td>
                        {/* valor orçado — clicável para edição inline */}
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          {isEditing ? (
                            <input
                              autoFocus
                              type="number"
                              value={editingVal}
                              onChange={e => setEditingVal(e.target.value)}
                              onBlur={() => commitEdit(x.id)}
                              onKeyDown={e => { if (e.key === "Enter") commitEdit(x.id); if (e.key === "Escape") setEditingCell(null); }}
                              style={{ width: 110, padding: "3px 8px", background: T.inputBg || T.surface2, border: `1px solid ${T.info}`, borderRadius: 6, color: T.text, fontSize: 11, textAlign: "right", fontFamily: "inherit", outline: "none" }}
                            />
                          ) : (
                            <span
                              onClick={() => startEdit(x.id, x.valorOrcado)}
                              title="Clique para editar"
                              style={{ fontWeight: 700, color: T.info, cursor: "text", borderBottom: `1px dashed ${T.info}44`, paddingBottom: 1 }}
                            >{fmt(x.valorOrcado)}</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: T.accent, textAlign: "right" }}>{fmt(real)}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: dif >= 0 ? T.success : T.danger, textAlign: "right" }}>{fmt(dif)}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <button onClick={async () => { await sbFetch("orcamento", { method: "DELETE", id: x.id }); setOrcamento(prev => prev.filter(r => r.id !== x.id)); }}
                            style={{ background: "transparent", border: `1px solid ${T.border2}`, color: T.text3, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}
                            onMouseEnter={e => { e.currentTarget.style.color = T.danger; e.currentTarget.style.borderColor = T.danger + "66"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = T.text3; e.currentTarget.style.borderColor = T.border2; }}
                          >✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DASHBOARD FINANCEIRO (Receitas) ─────────────────────────────────────────

function DashboardFinanceiro({ T, receitas, setReceitas, custos, saldoBancos,
  totalReceitas, totalCustos, btnPrimary, btnGhost, surface, inputStyle, labelStyle, onNovaReceita }) {

  const [filtroMes,   setFiltroMes]   = useState("TODOS");
  const [filtroBanco, setFiltroBanco] = useState("TODOS");

  // lista de meses disponíveis
  const mesesDisp = useMemo(() => {
    const todos = [
      ...receitas.map(r => getMes(r.data)),
      ...custos.map(c => getMes(c.data)),
    ].filter(Boolean);
    return ["TODOS", ...Array.from(new Set(todos)).sort(sortMes)];
  }, [receitas, custos]);

  // lista de bancos disponíveis (derivada de saldoBancos)
  const bancosDisp = useMemo(() =>
    ["TODOS", ...saldoBancos.map(b => b.nome)],
    [saldoBancos]);

  // dados filtrados por mês E por banco
  const receitasFilt = useMemo(() =>
    receitas
      .filter(r => filtroMes   === "TODOS" || getMes(r.data) === filtroMes)
      .filter(r => filtroBanco === "TODOS" || r.banco === filtroBanco),
    [receitas, filtroMes, filtroBanco]);

  const custosFilt = useMemo(() =>
    custos
      .filter(c => filtroMes   === "TODOS" || getMes(c.data) === filtroMes)
      .filter(c => filtroBanco === "TODOS" || c.banco === filtroBanco),
    [custos, filtroMes, filtroBanco]);

  const totalEntFilt = receitasFilt.reduce((s, r) => s + (r.valor || 0), 0);
  const totalSaiFilt = custosFilt.reduce((s, c) => s + (c.valor || 0), 0);
  const resultado = totalEntFilt - totalSaiFilt;

  // fluxo mensal para gráficos: agrega entradas e saídas por mês
  const fluxoMensal = useMemo(() => {
    const meses = Array.from(new Set([
      ...receitas.map(r => getMes(r.data)),
      ...custos.map(c => getMes(c.data)),
    ].filter(Boolean))).sort(sortMes);

    return meses.map(mes => ({
      mes,
      entradas: receitas.filter(r => getMes(r.data) === mes).reduce((s, r) => s + r.valor, 0),
      saidas:   custos.filter(c => getMes(c.data) === mes).reduce((s, c) => s + c.valor, 0),
    })).map(d => ({ ...d, resultado: d.entradas - d.saidas }));
  }, [receitas, custos]);

  // entradas/saídas por banco (filtradas por mês)
  const bancosFlow = useMemo(() => saldoBancos.map(b => {
    const ent = receitasFilt.filter(r => r.banco === b.nome).reduce((s, r) => s + r.valor, 0);
    const sai = custosFilt.filter(c => c.banco === b.nome).reduce((s, c) => s + c.valor, 0);
    return { ...b, entFilt: ent, saiFilt: sai };
  }), [saldoBancos, receitasFilt, custosFilt]);

  const tooltipStyle = { background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, fontSize: 11 };

  return (
    <div>
      {/* Header + filtro mês */}
      <div className="rbim-dash-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>💚 Dashboard Financeiro</div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>Entradas, saídas e fluxo de caixa</div>
        </div>
        <div className="rbim-dash-filters" style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Filtrar Mês/Ano</label>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ ...inputStyle, width: 140 }}>
              {mesesDisp.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Banco</label>
            <select value={filtroBanco} onChange={e => setFiltroBanco(e.target.value)} style={{ ...inputStyle, width: 150 }}>
              {bancosDisp.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          {(filtroMes !== "TODOS" || filtroBanco !== "TODOS") && (
            <button
              onClick={() => { setFiltroMes("TODOS"); setFiltroBanco("TODOS"); }}
              style={{ ...btnGhost, alignSelf: "flex-end", fontSize: 11 }}
            >✕ Limpar</button>
          )}
          <button onClick={onNovaReceita} style={{ ...btnPrimary, background: T.success, alignSelf: "flex-end" }}>+ Nova Receita</button>
        </div>
      </div>

      {/* KPIs do período */}
      <div className="rbim-kpi-row" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { l: "Entradas" + (filtroMes !== "TODOS" ? ` (${filtroMes})` : "") + (filtroBanco !== "TODOS" ? ` · ${filtroBanco}` : ""), v: fmt(totalEntFilt), c: T.success, sub: `${receitasFilt.length} medições` },
          { l: "Saídas"   + (filtroMes !== "TODOS" ? ` (${filtroMes})` : "") + (filtroBanco !== "TODOS" ? ` · ${filtroBanco}` : ""), v: fmt(totalSaiFilt), c: T.danger,  sub: `${custosFilt.length} lançamentos` },
          { l: "Resultado do Período", v: fmt(resultado), c: resultado >= 0 ? T.success : T.danger, sub: resultado >= 0 ? "positivo" : "negativo" },
          { l: "Caixa Total Atual",    v: fmt(saldoBancos.reduce((s, b) => s + b.saldoAtual, 0)), c: T.info, sub: `${saldoBancos.length} contas` },
        ].map(({ l, v, c, sub }) => (
          <div key={l} style={{ ...surface({ padding: "20px 22px" }), flex: 1, minWidth: 150, borderTop: `2px solid ${c}` }}>
            <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight:600 }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c, fontFamily: T.fontDisplay||"inherit", letterSpacing:"-0.02em", lineHeight:1.1 }}>{v}</div>
            <div style={{ fontSize: 10, color: T.text3, marginTop: 5, fontWeight:500 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Bancos: entradas e saídas por conta */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, fontFamily: T.fontDisplay||"inherit", letterSpacing:"-0.01em" }}>
          Movimentação por Conta Bancária
          {filtroMes !== "TODOS" && <span style={{ fontSize: 11, color: T.text3, fontWeight: 400, marginLeft: 8 }}>({filtroMes})</span>}
        </div>
        <div className="rbim-bancos-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {bancosFlow.map(b => (
            <div key={b.id} style={{ ...surface({ padding: "20px 22px" }), flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, fontFamily: T.fontDisplay||"inherit" }}>{b.nome}</div>
              <div style={{ fontSize: 10, color: T.text3, marginBottom: 14, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:500 }}>{b.tipo}</div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: T.success }}>↑ Entradas</span>
                <span style={{ fontWeight: 700, color: T.success }}>{fmt(b.entFilt)}</span>
              </div>
              <div style={{ background: T.border2, borderRadius: 999, height: 5, marginBottom: 8 }}>
                <div style={{
                  height: "100%", borderRadius: 999, background: T.success,
                  width: `${b.entFilt + b.saiFilt > 0 ? (b.entFilt / (b.entFilt + b.saiFilt)) * 100 : 0}%`
                }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: T.danger }}>↓ Saídas</span>
                <span style={{ fontWeight: 700, color: T.danger }}>{fmt(b.saiFilt)}</span>
              </div>
              <div style={{ background: T.border2, borderRadius: 999, height: 5, marginBottom: 10 }}>
                <div style={{
                  height: "100%", borderRadius: 999, background: T.danger,
                  width: `${b.entFilt + b.saiFilt > 0 ? (b.saiFilt / (b.entFilt + b.saiFilt)) * 100 : 0}%`
                }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                <span style={{ color: T.text3 }}>Saldo Atual</span>
                <span style={{ color: b.saldoAtual >= 0 ? T.success : T.danger }}>{fmt(b.saldoAtual)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráficos de fluxo de caixa */}
      <div className="rbim-grid2-charts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>

        {/* Gráfico 1: Barras agrupadas Entradas vs Saídas por mês */}
        <div style={surface()}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, fontFamily: T.fontDisplay||"inherit", letterSpacing:"-0.01em" }}>
            📊 Entradas vs Saídas por Mês
          </div>
          {fluxoMensal.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fluxoMensal} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="mes" tick={{ fill: T.text3, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text3, fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="entradas" name="Entradas" fill={T.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas"   name="Saídas"   fill={T.danger}  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <PlaceholderGrafico T={T} label="Aguardando dados de receitas e custos" />
          )}
        </div>

        {/* Gráfico 2: Linha de resultado acumulado */}
        <div style={surface()}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, fontFamily: T.fontDisplay||"inherit", letterSpacing:"-0.01em" }}>
            📈 Resultado Mensal (Entradas − Saídas)
          </div>
          {fluxoMensal.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={fluxoMensal} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="mes" tick={{ fill: T.text3, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text3, fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
                <Line
                  type="monotone" dataKey="resultado" name="Resultado"
                  stroke={T.info} strokeWidth={3}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    const color = payload.resultado >= 0 ? T.success : T.danger;
                    return <circle key={cx} cx={cx} cy={cy} r={5} fill={color} stroke={color} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <PlaceholderGrafico T={T} label="Aguardando dados para análise de resultado" />
          )}
        </div>
      </div>

      {/* Tabela de medições */}
      <div style={{ ...surface({ padding: 0, overflow: "hidden" }) }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>
            📋 Medições / Recebimentos
            {filtroMes   !== "TODOS" && <span style={{ fontSize: 11, color: T.text3, fontWeight: 400, marginLeft: 6 }}>— {filtroMes}</span>}
            {filtroBanco !== "TODOS" && <span style={{ fontSize: 11, color: T.info,  fontWeight: 600, marginLeft: 6 }}>· {filtroBanco}</span>}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: T.success, fontWeight: 700 }}>{receitasFilt.length} registros · {fmt(totalEntFilt)}</span>
            <button onClick={() => exportCSV(receitasFilt, `receitas_${new Date().toISOString().slice(0,10)}.csv`, [
              {key:"data",label:"Data",type:"date"},{key:"obra",label:"Obra"},{key:"banco",label:"Banco"},
              {key:"medicao",label:"Nº Medição"},{key:"valor",label:"Valor"},{key:"obs",label:"Observações"},
            ])} style={{ background:"transparent", border:`1px solid ${T.border2}`, color:T.text3, borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:11, fontFamily:T.fontFamily||"inherit" }} title="Exportar CSV">⬇ CSV</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead style={{ background: T.surface2 }}>
              <tr>{["Data", "Obra", "Banco", "Nº Medição", "Valor", "Observações", ""].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", color: T.text3, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", letterSpacing:"0.06em", textTransform:"uppercase" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[...receitasFilt].sort((a, b) => new Date(b.data) - new Date(a.data)).map((d, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? "transparent" : T.rowAlt }}>
                  <td style={{ padding: "7px 12px", color: T.text3 }}>{d.data}</td>
                  <td style={{ padding: "7px 12px", fontWeight: 700 }}>{d.obra}</td>
                  <td style={{ padding: "7px 12px", color: T.text3 }}>{d.banco}</td>
                  <td style={{ padding: "7px 12px" }}>
                    <span style={{ background: T.success + "22", color: T.success, padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{d.medicao}</span>
                  </td>
                  <td style={{ padding: "7px 12px", fontWeight: 800, color: T.success }}>{fmt(d.valor)}</td>
                  <td style={{ padding: "7px 12px", color: T.text2 }}>{d.obs}</td>
                  <td style={{ padding: "7px 12px" }}>
                    <button onClick={async () => { await sbFetch("receitas",{method:"DELETE",id:d.id}); setReceitas(prev => prev.filter(r => r.id !== d.id)); }}
                      style={{ ...btnGhost, fontSize: 10, padding: "3px 8px", color: T.danger }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// placeholder para gráficos sem dados suficientes
function PlaceholderGrafico({ T, label }) {
  return (
    <div style={{
      height: 200, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      border: `1px dashed ${T.border2}`, borderRadius: 12,
      color: T.text3, gap: 8, background: T.surface2,
    }}>
      <div style={{ fontSize: 28 }}>📉</div>
      <div style={{ fontSize: 11, textAlign: "center", maxWidth: 200 }}>{label}</div>
    </div>
  );
}

// ─── VISÃO GERAL — COMPONENTES DE GRÁFICO ────────────────────────────────────

// hook centralizado de seleção de categoria
function useDrillDown() {
  const [selectedCat, setSelectedCat] = useState(null);
  const selectCat = (name) => setSelectedCat(prev => prev === name ? null : name);
  const reset = () => setSelectedCat(null);
  return { selectedCat, selectCat, reset };
}

// agrupa array por chave e soma valor
function groupSum(arr, keyFn, valFn = d => d.valor) {
  const m = {};
  arr.forEach(d => { const k = keyFn(d); m[k] = (m[k] || 0) + (valFn(d) || 0); });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

const NAT_KEYS = ["Material", "Mão de Obra", "Equipamento"];

// ── GraficoGastosPorObra ──────────────────────────────────────────────────────
function GraficoGastosPorObra({ T, data }) {
  const tooltipStyle = { background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, fontSize: 11 };
  return (
    <div style={{ background: T.glassBg||T.surface, backdropFilter:T.glassBlur||"blur(16px)", WebkitBackdropFilter:T.glassBlur||"blur(16px)", border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow }}>
      <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, fontFamily: T.fontDisplay||"inherit", letterSpacing:"-0.01em" }}>Gastos por Obra</div>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16 }}>
          <XAxis type="number" tick={{ fill: T.text3, fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" tick={{ fill: T.text2, fontSize: 10 }} width={100} />
          <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── GraficoCategorias (pizza drill-down) ─────────────────────────────────────
function GraficoCategorias({ T, porCat, porSub, selectedCat, onSelectCat, onReset }) {
  const tooltipStyle = { background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, fontSize: 11 };
  const activeData = selectedCat ? porSub : porCat;
  const total = activeData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ background: T.glassBg||T.surface, backdropFilter:T.glassBlur||"blur(16px)", WebkitBackdropFilter:T.glassBlur||"blur(16px)", border: `1px solid ${selectedCat ? T.accent + "44" : T.border}`, borderRadius: 16, padding: 20, transition: "border-color 0.2s", boxShadow: T.shadow }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>
          {selectedCat ? (
            <span><span style={{ color: T.accent }}>{selectedCat}</span></span>
          ) : "Gastos por Categoria"}
        </div>
        {selectedCat
          ? <button onClick={onReset} style={{ background: T.surface2, border: `1px solid ${T.border2}`, color: T.text2, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: T.fontFamily||"inherit", transition:"all 0.15s", letterSpacing:"0.01em" }}>← Voltar</button>
          : <span style={{ fontSize: 10, color: T.text3 }}>clique para detalhar</span>}
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {/* pizza */}
        <div style={{ flex: "0 0 180px" }}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={activeData} dataKey="value" cx="50%" cy="50%"
                outerRadius={80} innerRadius={34}
                onClick={e => { if (!selectedCat) onSelectCat(e.name); }}
                style={{ cursor: selectedCat ? "default" : "pointer" }}
              >
                {activeData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]}
                    opacity={selectedCat ? 1 : 1} />
                ))}
              </Pie>
              <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* legenda */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", maxHeight: 180 }}>
          {activeData.map((d, i) => {
            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
            return (
              <div key={i}
                onClick={() => { if (!selectedCat) onSelectCat(d.name); }}
                style={{ display: "flex", alignItems: "center", gap: 7, cursor: selectedCat ? "default" : "pointer", padding: "3px 5px", borderRadius: 5,
                  background: "transparent", transition: "background 0.12s" }}
                onMouseEnter={e => { if (!selectedCat) e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                <div style={{ fontSize: 10, color: T.text2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                <div style={{ fontSize: 10, color: T.text3, marginRight: 4 }}>{pct}%</div>
                <div style={{ fontSize: 10, color: T.text, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(d.value)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── GraficoNatureza ───────────────────────────────────────────────────────────
function GraficoNatureza({ T, data }) {
  const tooltipStyle = { background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, fontSize: 11 };
  const NAT_COLORS = { "Material": "#06B6D4", "Mão de Obra": "#F97316", "Equipamento": "#8B5CF6" };
  const grouped = NAT_KEYS.map(k => ({ name: k, value: data.filter(d => d.natureza === k).reduce((s, d) => s + d.valor, 0) }));
  const total = grouped.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ background: T.glassBg||T.surface, backdropFilter:T.glassBlur||"blur(16px)", WebkitBackdropFilter:T.glassBlur||"blur(16px)", border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow }}>
      <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, fontFamily: T.fontDisplay||"inherit", letterSpacing:"-0.01em" }}>Natureza do Gasto</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ flex: "0 0 160px" }}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={grouped} dataKey="value" cx="50%" cy="50%" outerRadius={72} innerRadius={28}>
                {grouped.map((d, i) => <Cell key={i} fill={NAT_COLORS[d.name] || PALETTE[i]} />)}
              </Pie>
              <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {grouped.map((d, i) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.text2 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: NAT_COLORS[d.name] || PALETTE[i], display: "inline-block" }} />
                    {d.name}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: NAT_COLORS[d.name] || PALETTE[i] }}>{fmt(d.value)}</span>
                </div>
                <div style={{ background: T.border2, borderRadius: 999, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, width: `${pct.toFixed(1)}%`, background: NAT_COLORS[d.name] || PALETTE[i], transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>{pct.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── GraficoEvolucaoMensal ─────────────────────────────────────────────────────
function GraficoEvolucaoMensal({ T, data }) {
  const tooltipStyle = { background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, fontSize: 11 };
  const porMes = useMemo(() => {
    const m = {};
    data.forEach(d => { const k = getMes(d.data) || "s/mês"; m[k] = (m[k] || 0) + d.valor; });
    return Object.keys(m).sort(sortMes).map(k => ({ name: k, value: m[k] }));
  }, [data]);

  return (
    <div style={{ background: T.glassBg||T.surface, backdropFilter:T.glassBlur||"blur(16px)", WebkitBackdropFilter:T.glassBlur||"blur(16px)", border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow }}>
      <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, fontFamily: T.fontDisplay||"inherit", letterSpacing:"-0.01em" }}>Evolução Mensal</div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={porMes}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="name" tick={{ fill: T.text3, fontSize: 11 }} />
          <YAxis tick={{ fill: T.text3, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke={T.accent} strokeWidth={3} dot={{ fill: T.accent, r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── TabelaRecentes ────────────────────────────────────────────────────────────
function TabelaRecentes({ T, data }) {
  const rows = useMemo(() => [...data].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 10), [data]);
  return (
    <div style={{ background: T.glassBg||T.surface, backdropFilter:T.glassBlur||"blur(16px)", WebkitBackdropFilter:T.glassBlur||"blur(16px)", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: T.fontDisplay||"inherit", letterSpacing:"-0.01em" }}>Últimos Lançamentos</span>
        <span style={{ fontSize: 11, color: T.text3 }}>ordenados por data</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead style={{ background: T.surface2 }}>
            <tr>{["Data", "Obra", "Categoria", "Descrição", "Fornecedor", "Natureza", "Valor"].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.text3, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", letterSpacing:"0.06em" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? "transparent" : T.rowAlt }}>
                <td style={{ padding: "7px 12px", color: T.text3, whiteSpace: "nowrap" }}>{d.data}</td>
                <td style={{ padding: "7px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>{d.obra}</td>
                <td style={{ padding: "7px 12px", color: T.accent2, fontSize: 10, whiteSpace: "nowrap" }}>{d.categoria}</td>
                <td style={{ padding: "7px 12px", color: T.text2, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.obs || "-"}</td>
                <td style={{ padding: "7px 12px", color: T.text3 }}>{d.fornecedor || "-"}</td>
                <td style={{ padding: "7px 12px" }}>
                  <span style={{ background: T.accent + "18", color: T.accent, padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 600 }}>{d.natureza}</span>
                </td>
                <td style={{ padding: "7px 12px", fontWeight: 800, color: T.accent, textAlign: "right", whiteSpace: "nowrap" }}>{fmt(d.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── VisaoGeral — Dashboard principal redesenhado ─────────────────────────────
function VisaoGeral({ T, dark, obras, custos, receitas, saldoBancos,
  totalReceitas, totalCustos, totalApagar, apagarPend, vencidas, vencendo,
  surface, inputStyle, labelStyle, btnGhost, btnPrimary, openModal, setTab }) {

  const resultado = totalReceitas - totalCustos;
  const caixaTotal = saldoBancos.reduce((s,b)=>s+(b.saldoAtual||0),0);

  // últimos 5 lançamentos
  const ultimos = useMemo(()=>[...custos].sort((a,b)=>new Date(b.data)-new Date(a.data)).slice(0,5),[custos]);

  // gastos por obra (top 5)
  const porObra = useMemo(()=>{
    const m={};
    custos.forEach(d=>{m[d.obra]=(m[d.obra]||0)+d.valor;});
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6);
  },[custos]);

  // evolução mensal
  const fluxoMensal = useMemo(()=>{
    const meses = Array.from(new Set([
      ...receitas.map(r=>getMes(r.data)),
      ...custos.map(c=>getMes(c.data)),
    ].filter(Boolean))).sort(sortMes);
    return meses.map(mes=>({
      mes,
      entradas: receitas.filter(r=>getMes(r.data)===mes).reduce((s,r)=>s+r.valor,0),
      saidas: custos.filter(c=>getMes(c.data)===mes).reduce((s,c)=>s+c.valor,0),
    }));
  },[receitas,custos]);

  const tooltipStyle = { background: dark?"rgba(10,16,28,0.96)":"rgba(255,255,255,0.97)", backdropFilter:"blur(16px)", border:`1px solid ${T.border2}`, borderRadius:10, color:T.text, fontSize:12, boxShadow:T.shadow };

  return (
    <div>
      {/* ── ROW 1: KPIs principais ── */}
      <div className="rbim-kpi-row" style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        {/* Caixa */}
        <div style={{...surface({padding:"20px 24px"}),flex:1.2,minWidth:180,borderLeft:`3px solid ${caixaTotal>=0?T.success:T.danger}`,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:14,right:18,fontSize:28,opacity:0.07,color:T.text,fontWeight:900}}>$</div>
          <div style={{fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:600,marginBottom:8}}>Caixa Disponível</div>
          <div style={{fontSize:26,fontWeight:700,color:caixaTotal>=0?T.success:T.danger,fontFamily:T.fontDisplay,letterSpacing:"-0.03em",lineHeight:1}}>{fmt(caixaTotal)}</div>
          <div style={{fontSize:10,color:T.text3,marginTop:8}}>{saldoBancos.length} conta{saldoBancos.length!==1?"s":""}</div>
        </div>

        {/* Receitas */}
        <div style={{...surface({padding:"20px 24px"}),flex:1,minWidth:140,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:14,right:18,fontSize:22,opacity:0.08,color:T.success}}>↑</div>
          <div style={{fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:600,marginBottom:8}}>Receitas</div>
          <div style={{fontSize:22,fontWeight:700,color:T.success,fontFamily:T.fontDisplay,letterSpacing:"-0.02em",lineHeight:1}}>{fmt(totalReceitas)}</div>
          <div style={{fontSize:10,color:T.text3,marginTop:8}}>{receitas.length} medições</div>
        </div>

        {/* Custos */}
        <div style={{...surface({padding:"20px 24px"}),flex:1,minWidth:140,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:14,right:18,fontSize:22,opacity:0.08,color:T.danger}}>↓</div>
          <div style={{fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:600,marginBottom:8}}>Custos</div>
          <div style={{fontSize:22,fontWeight:700,color:T.danger,fontFamily:T.fontDisplay,letterSpacing:"-0.02em",lineHeight:1}}>{fmt(totalCustos)}</div>
          <div style={{fontSize:10,color:T.text3,marginTop:8}}>{custos.length} lançamentos</div>
        </div>

        {/* Resultado */}
        <div style={{...surface({padding:"20px 24px"}),flex:1,minWidth:140,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:14,right:18,fontSize:22,opacity:0.08,color:resultado>=0?T.success:T.danger}}>=</div>
          <div style={{fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:600,marginBottom:8}}>Resultado</div>
          <div style={{fontSize:22,fontWeight:700,color:resultado>=0?T.success:T.danger,fontFamily:T.fontDisplay,letterSpacing:"-0.02em",lineHeight:1}}>{fmt(resultado)}</div>
          <div style={{fontSize:10,color:resultado>=0?T.success:T.danger,marginTop:8,fontWeight:500}}>{resultado>=0?"Positivo":"Negativo"}</div>
        </div>
      </div>

      {/* ── ROW 2: Alertas A Pagar + Gráfico evolução ── */}
      <div className="rbim-grid2-charts" style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:14,marginBottom:16}}>

        {/* A Pagar / Alertas */}
        <div style={{...surface({padding:0,overflow:"hidden"}),display:"flex",flexDirection:"column"}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:700,fontSize:14,fontFamily:T.fontDisplay,letterSpacing:"-0.01em"}}>A Pagar</div>
            <button onClick={()=>setTab("apagar_aba")} style={{...btnGhost,fontSize:10,padding:"4px 12px"}}>Ver tudo →</button>
          </div>
          <div style={{padding:"16px 20px",flex:1}}>
            {/* Resumo */}
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              <div style={{flex:1,background:T.danger+"10",borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:700,color:T.danger,fontFamily:T.fontDisplay}}>{fmt(totalApagar)}</div>
                <div style={{fontSize:9,color:T.text3,marginTop:3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{apagarPend.length} pendentes</div>
              </div>
            </div>

            {/* Alertas */}
            {vencidas.length > 0 && (
              <div style={{background:T.danger+"10",border:`1px solid ${T.danger}22`,borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:11,color:T.danger,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                <span>⚠</span> {vencidas.length} vencida{vencidas.length>1?"s":""} — {fmt(vencidas.reduce((s,a)=>s+a.valor,0))}
              </div>
            )}
            {vencendo.length > 0 && (
              <div style={{background:T.accent2+"10",border:`1px solid ${T.accent2}22`,borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:11,color:T.accent2,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                <span>◷</span> {vencendo.length} vence{vencendo.length>1?"m":""} em 7 dias — {fmt(vencendo.reduce((s,a)=>s+a.valor,0))}
              </div>
            )}

            {/* Próximas contas */}
            <div style={{fontSize:10,color:T.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,marginTop:4}}>Próximas</div>
            {apagarPend.sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento)).slice(0,4).map(item=>{
              const diff=Math.ceil((new Date(item.vencimento)-new Date())/86400000);
              const isV=diff<0;
              return (
                <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.border}`,gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.descricao}</div>
                    <div style={{fontSize:9,color:T.text3}}>{item.obra} · {item.vencimento}</div>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:isV?T.danger:T.text,whiteSpace:"nowrap"}}>{fmt(item.valor)}</div>
                </div>
              );
            })}
            {apagarPend.length===0 && <div style={{fontSize:11,color:T.text3,textAlign:"center",padding:"20px 0"}}>Nenhuma conta pendente</div>}
          </div>
        </div>

        {/* Gráfico evolução mensal */}
        <div style={surface()}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,fontFamily:T.fontDisplay,letterSpacing:"-0.01em"}}>Fluxo Mensal</div>
          {fluxoMensal.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fluxoMensal} margin={{left:0,right:8}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="mes" tick={{fill:T.text3,fontSize:10}} />
                <YAxis tick={{fill:T.text3,fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v=>fmt(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="entradas" name="Entradas" fill={T.success} radius={[4,4,0,0]} />
                <Bar dataKey="saidas" name="Saídas" fill={T.danger} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <PlaceholderGrafico T={T} label="Aguardando dados" />
          )}
        </div>
      </div>

      {/* ── ROW 3: Obras resumo + Gastos por obra ── */}
      <div className="rbim-grid2-charts" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>

        {/* Mini cards de obras */}
        <div style={{...surface({padding:0,overflow:"hidden"})}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:700,fontSize:14,fontFamily:T.fontDisplay,letterSpacing:"-0.01em"}}>Obras</div>
            <button onClick={()=>setTab("obras")} style={{...btnGhost,fontSize:10,padding:"4px 12px"}}>Ver todas →</button>
          </div>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8,maxHeight:280,overflowY:"auto"}}>
            {obras.map(o=>(
              <div key={o.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.surface2,borderRadius:10,border:`1px solid ${T.border}`}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.nome}</div>
                  <div style={{display:"flex",gap:8,marginTop:4,fontSize:10,color:T.text3}}>
                    <span>Contrato: <strong style={{color:T.text2}}>{fmt(o.contrato)}</strong></span>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:o.pct>80?T.danger:o.pct>50?T.accent2:T.success}}>{o.pct.toFixed(0)}%</div>
                  <div style={{fontSize:9,color:T.text3,marginTop:2}}>{fmt(o.gasto)}</div>
                </div>
                {/* mini progress bar */}
                <div style={{width:50,flexShrink:0}}>
                  <div style={{background:T.surface,borderRadius:999,height:4,overflow:"hidden",border:`1px solid ${T.border}`}}>
                    <div style={{height:"100%",borderRadius:999,width:`${Math.min(o.pct,100)}%`,background:o.pct>80?T.danger:o.pct>50?T.accent2:T.success,transition:"width 0.4s"}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gastos por obra - barras */}
        <div style={surface()}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,fontFamily:T.fontDisplay,letterSpacing:"-0.01em"}}>Gastos por Obra</div>
          {porObra.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(180,porObra.length*34)}>
              <BarChart data={porObra} layout="vertical" margin={{left:10,right:16}}>
                <XAxis type="number" tick={{fill:T.text3,fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{fill:T.text2,fontSize:10}} width={100} />
                <Tooltip formatter={v=>fmt(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0,6,6,0]}>
                  {porObra.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <PlaceholderGrafico T={T} label="Sem dados" />}
        </div>
      </div>

      {/* ── ROW 4: Últimos lançamentos ── */}
      <div style={{...surface({padding:0,overflow:"hidden"})}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:700,fontSize:14,fontFamily:T.fontDisplay,letterSpacing:"-0.01em"}}>Últimos Lançamentos</div>
          <button onClick={()=>setTab("custos_aba")} style={{...btnGhost,fontSize:10,padding:"4px 12px"}}>Ver todos →</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:T.surface2}}>
              <tr>{["Data","Obra","Categoria","Descrição","Valor"].map(h=>(
                <th key={h} style={{padding:"8px 14px",textAlign:h==="Valor"?"right":"left",color:T.text3,fontWeight:600,fontSize:9.5,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",letterSpacing:"0.07em",textTransform:"uppercase"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {ultimos.map((d,i)=>(
                <tr key={d.id||i} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?"transparent":T.rowAlt}}>
                  <td style={{padding:"8px 14px",color:T.text3,whiteSpace:"nowrap"}}>{d.data}</td>
                  <td style={{padding:"8px 14px",fontWeight:600,whiteSpace:"nowrap"}}>{d.obra}</td>
                  <td style={{padding:"8px 14px",color:T.accent2,fontSize:10}}>{d.categoria}</td>
                  <td style={{padding:"8px 14px",color:T.text2,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.obs||"—"}</td>
                  <td style={{padding:"8px 14px",fontWeight:700,color:T.accent,textAlign:"right",whiteSpace:"nowrap"}}>{fmt(d.valor)}</td>
                </tr>
              ))}
              {ultimos.length===0 && <tr><td colSpan={5} style={{padding:"24px 14px",textAlign:"center",color:T.text3}}>Nenhum lançamento</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── CADASTROS TAB ────────────────────────────────────────────────────────────
function CadastrosTab({T,obras,setObras,bancos,setBancos,cats,setCats,inputStyle,labelStyle,btnPrimary,btnGhost,surface}) {
  const [subTab,setSubTab] = useState("obras");
  const [newObra,setNewObra] = useState({nome:"",inicio:"",fim:"",contrato:"",status:"Planejada"});
  const [newBanco,setNewBanco] = useState({nome:"",tipo:"Conta Corrente",agencia:"",conta:"",saldoInicial:""});
  const [newCat,setNewCat] = useState({nome:"",subs:""});
  const [editCat,setEditCat] = useState(null);
  const [newSub,setNewSub] = useState("");

  // ── Tipos de Custo (estado editável, seed vem da constante global) ──────────
  const [tiposCusto, setTiposCusto] = useState(() => TIPOS_CUSTO.map((n,i)=>({id:i+1,nome:n})));
  const [newTipo,    setNewTipo]    = useState("");

  // ── Naturezas do Gasto (estado editável, seed vem da constante global) ──────
  const [naturezas,  setNaturezas]  = useState(() => NATUREZAS.map((n,i)=>({id:i+1,nome:n})));
  const [newNatureza,setNewNatureza] = useState("");

  const addObra = async () => {
    if(!newObra.nome||!newObra.contrato) return alert("Nome e contrato obrigatórios.");
    const res = await sbFetch("obras", { method:"POST", body:{nome:newObra.nome,inicio:newObra.inicio,fim:newObra.fim,contrato:parseFloat(newObra.contrato),status:newObra.status} });
    if(res?.[0]) setObras(prev=>[...prev, mapObra(res[0])]);
    setNewObra({nome:"",inicio:"",fim:"",contrato:"",status:"Planejada"});
  };
  const addBanco = async () => {
    if(!newBanco.nome) return alert("Nome obrigatório.");
    const res = await sbFetch("bancos", { method:"POST", body:{nome:newBanco.nome,tipo:newBanco.tipo,agencia:newBanco.agencia,conta:newBanco.conta,saldo_inicial:parseFloat(newBanco.saldoInicial)||0} });
    if(res?.[0]) setBancos(prev=>[...prev, mapBanco(res[0])]);
    setNewBanco({nome:"",tipo:"Conta Corrente",agencia:"",conta:"",saldoInicial:""});
  };
  const addCat = async () => {
    if(!newCat.nome) return alert("Nome obrigatório.");
    const subs = newCat.subs.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
    const res = await sbFetch("categorias", { method:"POST", body:{nome:newCat.nome.toUpperCase(),subs:JSON.stringify(subs)} });
    if(res?.[0]) setCats(prev=>[...prev, mapCat(res[0])]);
    setNewCat({nome:"",subs:""});
  };
  const addTipo = () => {
    const v = newTipo.trim().toUpperCase();
    if (!v) return;
    if (tiposCusto.find(t=>t.nome===v)) return alert("Tipo já cadastrado.");
    setTiposCusto(prev=>[...prev,{id:Date.now(),nome:v}]);
    setNewTipo("");
  };
  const addNatureza = () => {
    const v = newNatureza.trim();
    if (!v) return;
    const norm = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
    if (naturezas.find(n=>n.nome===norm)) return alert("Natureza já cadastrada.");
    setNaturezas(prev=>[...prev,{id:Date.now(),nome:norm}]);
    setNewNatureza("");
  };

  const ST = [
    {id:"obras",    l:"🏗️ Obras"},
    {id:"bancos",   l:"🏦 Bancos"},
    {id:"cats",     l:"🏷️ Categorias"},
    {id:"tipos",    l:"📂 Tipos de Custo"},
    {id:"naturezas",l:"⚖️ Naturezas"},
  ];
  const fld = (label,val,onChange,type="text",placeholder="") => (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle}/>
    </div>
  );
  const sel = (label,val,onChange,opts) => (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <label style={labelStyle}>{label}</label>
      <select value={val} onChange={e=>onChange(e.target.value)} style={inputStyle}>
        {opts.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <div className="rbim-sub-tabs" style={{display:"flex",gap:6,marginBottom:16}}>
        {ST.map(({id,l})=>(
          <button key={id} onClick={()=>setSubTab(id)} style={{padding:"7px 14px",borderRadius:7,border:"none",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:T.fontFamily||"inherit",
            background:subTab===id?T.accent:T.surface2,color:subTab===id?"#fff":T.text2}}>
            {l}
          </button>
        ))}
      </div>

      {/* OBRAS */}
      {subTab==="obras" && (
        <div className="rbim-cadastro-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em",color:T.accent}}>Nova Obra</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {fld("Nome da Obra *",newObra.nome,v=>setNewObra(p=>({...p,nome:v})),undefined,"Ex: Residência Silva")}
              {fld("Valor do Contrato (R$) *",newObra.contrato,v=>setNewObra(p=>({...p,contrato:v})),"number","0.00")}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {fld("Data de Início",newObra.inicio,v=>setNewObra(p=>({...p,inicio:v})),"date")}
                {fld("Data Final",newObra.fim,v=>setNewObra(p=>({...p,fim:v})),"date")}
              </div>
              {sel("Status",newObra.status,v=>setNewObra(p=>({...p,status:v})),STATUS_OBRA)}
              <button onClick={addObra} style={{...btnPrimary,width:"100%",marginTop:4}}>✓ Cadastrar Obra</button>
            </div>
          </div>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em"}}>📋 Obras Cadastradas ({obras.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:400,overflowY:"auto"}}>
              {obras.map(o=>(
                <div key={o.id} style={{background:T.surface2,borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{o.nome}</div>
                    <div style={{fontSize:10,color:T.text3}}>{o.inicio} → {o.fim} · {o.status}</div>
                    <div style={{fontSize:11,color:T.accent,fontWeight:700,marginTop:2}}>{(o.contrato||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0})}</div>
                  </div>
                  <button onClick={async()=>{await sbFetch("obras",{method:"DELETE",id:o.id});setObras(prev=>prev.filter(x=>x.id!==o.id));}} style={{...btnGhost,color:T.danger,fontSize:11,padding:"3px 8px"}}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BANCOS */}
      {subTab==="bancos" && (
        <div className="rbim-cadastro-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em",color:T.accent}}>Nova Conta Bancária</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {fld("Nome do Banco *",newBanco.nome,v=>setNewBanco(p=>({...p,nome:v})),undefined,"Ex: Sicredi")}
              {sel("Tipo",newBanco.tipo,v=>setNewBanco(p=>({...p,tipo:v})),["Conta Corrente","Conta Digital","Conta Poupança","Caixa"])}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {fld("Agência",newBanco.agencia,v=>setNewBanco(p=>({...p,agencia:v})),undefined,"0001")}
                {fld("Conta",newBanco.conta,v=>setNewBanco(p=>({...p,conta:v})),undefined,"12345-6")}
              </div>
              {fld("Saldo Inicial (R$)",newBanco.saldoInicial,v=>setNewBanco(p=>({...p,saldoInicial:v})),"number","0.00")}
              <button onClick={addBanco} style={{...btnPrimary,width:"100%",marginTop:4}}>✓ Cadastrar Banco</button>
            </div>
          </div>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em"}}>🏦 Contas Cadastradas ({bancos.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {bancos.map(b=>(
                <div key={b.id} style={{background:T.surface2,borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{b.nome}</div>
                    <div style={{fontSize:10,color:T.text3}}>{b.tipo} · Ag: {b.agencia} · CC: {b.conta}</div>
                    <div style={{fontSize:11,color:T.success,fontWeight:700,marginTop:2}}>Saldo inicial: {(b.saldoInicial||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                  </div>
                  <button onClick={async()=>{await sbFetch("bancos",{method:"DELETE",id:b.id});setBancos(prev=>prev.filter(x=>x.id!==b.id));}} style={{...btnGhost,color:T.danger,fontSize:11,padding:"3px 8px"}}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CATEGORIAS */}
      {subTab==="cats" && (
        <div className="rbim-cadastro-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em",color:T.accent}}>Nova Categoria</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {fld("Nome da Categoria *",newCat.nome,v=>setNewCat(p=>({...p,nome:v})),undefined,"Ex: FUNDAÇÃO")}
              {fld("Subcategorias (separadas por vírgula)",newCat.subs,v=>setNewCat(p=>({...p,subs:v})),undefined,"LAJE, BLOCO, ESTACA")}
              <button onClick={addCat} style={{...btnPrimary,width:"100%",marginTop:4}}>✓ Cadastrar Categoria</button>
            </div>
            <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${T.border}`,fontSize:11,color:T.text3}}>
              💡 Para editar <strong>Tipos de Custo</strong> e <strong>Naturezas</strong>, use as abas dedicadas ao lado.
            </div>
          </div>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em"}}>🏷️ Categorias ({cats.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:540,overflowY:"auto"}}>
              {cats.map(c=>(
                <div key={c.id} style={{background:T.surface2,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:12,color:T.accent2}}>{c.nome}</div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setEditCat(editCat===c.id?null:c.id)} style={{...btnGhost,fontSize:10,padding:"2px 7px"}}>
                        {editCat===c.id?"▲":"✏️"}
                      </button>
                      <button onClick={async()=>{await sbFetch("categorias",{method:"DELETE",id:c.id});setCats(prev=>prev.filter(x=>x.id!==c.id));}} style={{...btnGhost,color:T.danger,fontSize:10,padding:"2px 7px"}}>✕</button>
                    </div>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {c.subs.map(s=>(
                      <span key={s} style={{background:T.border,color:T.text2,padding:"2px 8px",borderRadius:999,fontSize:10}}>
                        {s}
                        {editCat===c.id && <span onClick={()=>setCats(prev=>prev.map(x=>x.id===c.id?{...x,subs:x.subs.filter(sb=>sb!==s)}:x))} style={{marginLeft:4,cursor:"pointer",color:T.danger}}>✕</span>}
                      </span>
                    ))}
                  </div>
                  {editCat===c.id && (
                    <div style={{display:"flex",gap:6,marginTop:8}}>
                      <input value={newSub} onChange={e=>setNewSub(e.target.value)} placeholder="Nova subcategoria..." style={{...inputStyle,flex:1}}/>
                      <button onClick={()=>{if(!newSub.trim())return;setCats(prev=>prev.map(x=>x.id===c.id?{...x,subs:[...x.subs,newSub.trim().toUpperCase()]}:x));setNewSub("");}} style={btnPrimary}>+</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TIPOS DE CUSTO */}
      {subTab==="tipos" && (
        <div className="rbim-cadastro-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em",color:T.accent}}>Novo Tipo de Custo</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={labelStyle}>Nome *</label>
                <input value={newTipo} onChange={e=>setNewTipo(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addTipo()}
                  placeholder="Ex: INVESTIMENTO" style={inputStyle}/>
              </div>
              <div style={{fontSize:10,color:T.text3}}>
                Classifica o custo para fins de BDI e relatórios gerenciais.
              </div>
              <button onClick={addTipo} style={{...btnPrimary,width:"100%",marginTop:4}}>
                ✓ Cadastrar Tipo
              </button>
            </div>
          </div>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em"}}>
              📂 Tipos Cadastrados ({tiposCusto.length})
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:400,overflowY:"auto"}}>
              {tiposCusto.map((t,i)=>(
                <div key={t.id} style={{
                  background:T.surface2,borderRadius:8,padding:"10px 14px",
                  display:"flex",justifyContent:"space-between",alignItems:"center"
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{
                      background:T.info+"22",color:T.info,borderRadius:4,
                      padding:"2px 8px",fontSize:10,fontWeight:700
                    }}>{i+1}</span>
                    <span style={{fontWeight:600,fontSize:12}}>{t.nome}</span>
                  </div>
                  <button
                    onClick={()=>setTiposCusto(prev=>prev.filter(x=>x.id!==t.id))}
                    disabled={i < 4}
                    title={i < 4 ? "Tipo padrão — não pode ser removido" : "Remover"}
                    style={{
                      ...btnGhost,color:i<4?T.text3:T.danger,fontSize:10,
                      padding:"3px 8px",cursor:i<4?"not-allowed":"pointer",opacity:i<4?0.4:1
                    }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,padding:"8px 12px",background:T.surface2,borderRadius:8,fontSize:10,color:T.text3}}>
              🔒 Os 4 tipos originais são padrão e não podem ser removidos.
            </div>
          </div>
        </div>
      )}

      {/* NATUREZAS DO GASTO */}
      {subTab==="naturezas" && (
        <div className="rbim-cadastro-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em",color:T.accent}}>Nova Natureza do Gasto</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={labelStyle}>Nome *</label>
                <input value={newNatureza} onChange={e=>setNewNatureza(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addNatureza()}
                  placeholder="Ex: Subcontratado" style={inputStyle}/>
              </div>
              <div style={{fontSize:10,color:T.text3}}>
                Define o insumo do gasto: classifica entre trabalho, matéria-prima e equipamento.
              </div>
              <button onClick={addNatureza} style={{...btnPrimary,width:"100%",marginTop:4}}>
                ✓ Cadastrar Natureza
              </button>
            </div>
          </div>
          <div style={surface()}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:14,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em"}}>
              ⚖️ Naturezas Cadastradas ({naturezas.length})
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:400,overflowY:"auto"}}>
              {naturezas.map((n,i)=>(
                <div key={n.id} style={{
                  background:T.surface2,borderRadius:8,padding:"10px 14px",
                  display:"flex",justifyContent:"space-between",alignItems:"center"
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{
                      background:T.accent+"22",color:T.accent,borderRadius:4,
                      padding:"2px 8px",fontSize:10,fontWeight:700
                    }}>{i+1}</span>
                    <span style={{fontWeight:600,fontSize:12}}>{n.nome}</span>
                  </div>
                  <button
                    onClick={()=>setNaturezas(prev=>prev.filter(x=>x.id!==n.id))}
                    disabled={i < 3}
                    title={i < 3 ? "Natureza padrão — não pode ser removida" : "Remover"}
                    style={{
                      ...btnGhost,color:i<3?T.text3:T.danger,fontSize:10,
                      padding:"3px 8px",cursor:i<3?"not-allowed":"pointer",opacity:i<3?0.4:1
                    }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,padding:"8px 12px",background:T.surface2,borderRadius:8,fontSize:10,color:T.text3}}>
              🔒 As 3 naturezas originais são padrão e não podem ser removidas.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── HELPERS MODAL ────────────────────────────────────────────────────────────

// ─── CASCADE SELECTOR ────────────────────────────────────────────────────────
/**
 * CascadeSelector
 * Seleção visual em 3 etapas: Categoria → Subcategoria → (Tipo+Natureza auto)
 * Props:
 *   cats       {array}   lista de categorias com subs
 *   custos     {array}   histórico de lançamentos (para recentes + autofill)
 *   categoria  {string}  valor atual
 *   subcategoria{string} valor atual
 *   tipo       {string}
 *   natureza   {string}
 *   onChange   {fn}      ({categoria, subcategoria, tipo, natureza}) => void
 *   T          {object}  tema
 */
function CascadeSelector({ cats, custos, categoria, subcategoria, tipo, natureza, onChange, T }) {
  const [busca, setBusca] = useState("");
  const inputRef = useRef(null);

  // ── recentes: últimas 5 combinações únicas do histórico ──────────────────
  const recentes = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const c of [...custos].reverse()) {
      if (!c.categoria || !c.subcategoria) continue;
      const key = `${c.categoria}||${c.subcategoria}`;
      if (!seen.has(key)) {
        seen.add(key);
        const af = SUB_AUTOFILL[c.subcategoria] || {tipo: c.tipo||"Direto", natureza: c.natureza||"Material"};
        result.push({ categoria: c.categoria, subcategoria: c.subcategoria, tipo: af.tipo, natureza: af.natureza });
        if (result.length >= 5) break;
      }
    }
    return result;
  }, [custos]);

  // ── busca filtra cat+sub ─────────────────────────────────────────────────
  const buscaLower = busca.trim().toLowerCase();
  const catsFiltradas = useMemo(() => {
    if (!buscaLower) return cats;
    return cats.map(c => ({
      ...c,
      subs: c.subs.filter(s => s.toLowerCase().includes(buscaLower) || c.nome.toLowerCase().includes(buscaLower))
    })).filter(c => c.subs.length > 0 || c.nome.toLowerCase().includes(buscaLower));
  }, [cats, buscaLower]);

  const pickSub = (cat, sub) => {
    const af = SUB_AUTOFILL[sub] || { tipo: tipo || "Direto", natureza: natureza || "Material" };
    onChange({ categoria: cat, subcategoria: sub, tipo: af.tipo, natureza: af.natureza });
    setBusca("");
  };

  const pickCat = (cat) => {
    onChange({ categoria: cat, subcategoria: "", tipo, natureza });
  };

  const cor = CAT_COLORS[categoria] || T.accent;
  const icon = CAT_ICONS[categoria] || "📁";
  const subsAtivas = categoria ? (cats.find(c => c.nome === categoria)?.subs || []) : [];

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
        Categoria → Subcategoria *
      </label>

      {/* ── RECENTES ─────────────────────────────────────────────────────── */}
      {recentes.length > 0 && !busca && !categoria && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontWeight: 600 }}>⏱ Recentes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {recentes.map((r, i) => (
              <button key={i} type="button" onClick={() => pickSub(r.categoria, r.subcategoria)}
                style={{
                  background: (CAT_COLORS[r.categoria] || T.accent) + "18",
                  border: `1px solid ${(CAT_COLORS[r.categoria] || T.accent)}44`,
                  color: CAT_COLORS[r.categoria] || T.accent,
                  borderRadius: 8, padding: "4px 10px", cursor: "pointer",
                  fontSize: 10, fontWeight: 600, fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 5, transition: "all 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = (CAT_COLORS[r.categoria] || T.accent) + "30"; }}
                onMouseLeave={e => { e.currentTarget.style.background = (CAT_COLORS[r.categoria] || T.accent) + "18"; }}
              >
                <span>{CAT_ICONS[r.categoria] || "📁"}</span>
                <span style={{ color: T.text3, fontSize: 9 }}>{r.categoria.split(" ")[0]}</span>
                <span style={{ color: T.text2 }}>→</span>
                <span>{r.subcategoria}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── BUSCA ────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={busca}
          onChange={e => { setBusca(e.target.value); if (e.target.value) onChange({ categoria: "", subcategoria: "", tipo, natureza }); }}
          placeholder="🔍 Buscar categoria ou subcategoria..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: T.inputBg || T.surface2, border: `1px solid ${T.border2}`,
            color: T.text, borderRadius: 10, padding: "9px 13px",
            fontSize: 12, outline: "none", fontFamily: "inherit",
          }}
        />
        {busca && (
          <button type="button" onClick={() => setBusca("")}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 14 }}>
            ✕
          </button>
        )}
      </div>

      {/* ── RESULTADOS DE BUSCA ───────────────────────────────────────────── */}
      {busca && (
        <div style={{
          border: `1px solid ${T.border2}`, borderRadius: 10, overflow: "hidden",
          maxHeight: 240, overflowY: "auto", marginBottom: 8,
          boxShadow: T.shadow,
        }}>
          {catsFiltradas.length === 0 ? (
            <div style={{ padding: "14px", textAlign: "center", color: T.text3, fontSize: 12 }}>Nenhum resultado</div>
          ) : catsFiltradas.map(c => (
            <div key={c.id}>
              <div style={{ padding: "6px 12px", background: T.surface2, fontSize: 10, fontWeight: 700, color: CAT_COLORS[c.nome] || T.text3, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{CAT_ICONS[c.nome] || "📁"}</span>{c.nome}
              </div>
              {c.subs.map(s => (
                <div key={s} onClick={() => pickSub(c.nome, s)}
                  style={{
                    padding: "8px 12px 8px 28px", cursor: "pointer", fontSize: 12,
                    color: T.text2, borderTop: `1px solid ${T.border}`, transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = (CAT_COLORS[c.nome] || T.accent) + "18"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {s}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── SELEÇÃO EM CASCATA (sem busca) ───────────────────────────────── */}
      {!busca && (
        <>
          {/* ETAPA 1: CATEGORIAS */}
          {!categoria && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 6 }}>
              {cats.map(c => (
                <button key={c.id} type="button" onClick={() => pickCat(c.nome)}
                  style={{
                    background: (CAT_COLORS[c.nome] || T.accent) + "12",
                    border: `1px solid ${(CAT_COLORS[c.nome] || T.accent)}33`,
                    borderRadius: 10, padding: "8px 10px", cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left", transition: "all 0.12s",
                    display: "flex", flexDirection: "column", gap: 3,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = (CAT_COLORS[c.nome] || T.accent) + "25"; e.currentTarget.style.borderColor = (CAT_COLORS[c.nome] || T.accent) + "66"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = (CAT_COLORS[c.nome] || T.accent) + "12"; e.currentTarget.style.borderColor = (CAT_COLORS[c.nome] || T.accent) + "33"; }}
                >
                  <span style={{ fontSize: 18 }}>{CAT_ICONS[c.nome] || "📁"}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: CAT_COLORS[c.nome] || T.accent, lineHeight: 1.2 }}>{c.nome}</span>
                  <span style={{ fontSize: 9, color: T.text3 }}>{c.subs.length} itens</span>
                </button>
              ))}
            </div>
          )}

          {/* ETAPA 2: CATEGORIA SELECIONADA → SUBCATEGORIAS */}
          {categoria && (
            <div>
              {/* breadcrumb */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                padding: "8px 12px", background: cor + "15",
                border: `1px solid ${cor}33`, borderRadius: 8,
              }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: 12, color: cor }}>{categoria}</span>
                <button type="button" onClick={() => onChange({ categoria: "", subcategoria: "", tipo, natureza })}
                  style={{ marginLeft: "auto", background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                  ✕ trocar
                </button>
              </div>

              {/* subcategorias como pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {subsAtivas.map(s => {
                  const ativo = s === subcategoria;
                  return (
                    <button key={s} type="button" onClick={() => pickSub(categoria, s)}
                      style={{
                        background: ativo ? cor : cor + "15",
                        border: `1px solid ${ativo ? cor : cor + "44"}`,
                        color: ativo ? "#fff" : cor,
                        borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                        fontSize: 11, fontWeight: ativo ? 700 : 500,
                        fontFamily: "inherit", transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { if (!ativo) { e.currentTarget.style.background = cor + "30"; } }}
                      onMouseLeave={e => { if (!ativo) { e.currentTarget.style.background = cor + "15"; } }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              {/* ETAPA 3: tipo+natureza autofill */}
              {subcategoria && (
                <div style={{
                  marginTop: 10, padding: "8px 12px",
                  background: T.success + "12", border: `1px solid ${T.success}33`,
                  borderRadius: 8, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: 10, color: T.success, fontWeight: 700 }}>✓ {subcategoria}</span>
                  <span style={{ fontSize: 10, color: T.text3 }}>Tipo: <strong style={{ color: T.info }}>{tipo}</strong></span>
                  <span style={{ fontSize: 10, color: T.text3 }}>Natureza: <strong style={{ color: T.accent }}>{natureza}</strong></span>
                  <span style={{ fontSize: 9, color: T.text3, marginLeft: "auto" }}>preenchido automaticamente</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MH({title,onClose,T}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${T.border}`}}>
      <div style={{fontSize:17,fontWeight:700,color:T.text,fontFamily:T.fontDisplay||"inherit",letterSpacing:"-0.01em"}}>{title}</div>
      <button onClick={onClose} style={{background:T.surface2,border:`1px solid ${T.border2}`,color:T.text2,fontSize:13,cursor:"pointer",fontFamily:"inherit",width:28,height:28,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
    </div>
  );
}
function G2({children}) { return <div className="rbim-g2-responsive" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>{children}</div>; }
function FR({children}) { return <div style={{marginBottom:14}}>{children}</div>; }

// ─── MODAL CUSTO ──────────────────────────────────────────────────────────────
function ModalCusto({T,obras,bancos,cats,custos=[],inputStyle,labelStyle,btnPrimary,onSave,onClose,initial,fornecedores=[]}) {
  const isEdit = !!initial;
  const [f,setF] = useState(()=>initial
    ? {...initial}
    : {obra:"",data:todayStr(),banco:"",fornecedor:"",categoria:"",subcategoria:"",tipo:"Direto",natureza:"Mão de Obra",valor:0,obs:"",pagador:"RBIM"}
  );
  const [erros, setErros] = useState({});
  const u = k => v => { setF(p=>({...p,[k]:v})); setErros(e=>({...e,[k]:""})); };
  const si = k => ({...inputStyle, ...(erros[k] ? {borderColor:T.danger} : {})});
  const ErrMsg = ({campo}) => erros[campo] ? <span style={{color:T.danger,fontSize:10,marginTop:2,display:"block"}}>{erros[campo]}</span> : null;

  const handleSave = () => {
    const e = {};
    if (!f.obra) e.obra = "Selecione uma obra.";
    if (!f.valor || f.valor <= 0) e.valor = "Informe um valor maior que zero.";
    if (!f.data) e.data = "Data obrigatória.";
    if (!f.categoria) e.categoria = "Selecione uma categoria.";
    if (!f.subcategoria) e.subcategoria = "Selecione uma subcategoria.";
    if (Object.keys(e).length > 0) { setErros(e); return; }
    onSave({...f});
  };

  return (<>
    <MH title={isEdit ? "✏️ Editar Lançamento" : "💸 Lançar Custo"} onClose={onClose} T={T}/>
    {isEdit && (
      <div style={{background:T.accent+"18",border:`1px solid ${T.accent}44`,borderRadius:8,padding:"7px 14px",marginBottom:12,fontSize:11,color:T.accent,fontWeight:700}}>
        ✏️ Modo edição — ID #{initial.id}
      </div>
    )}
    <CurrencyInput label="Valor (R$)" required value={f.valor} onChange={v=>u("valor")(v)} inputStyle={{...inputStyle,...(erros.valor?{borderColor:T.danger}:{})}} labelStyle={labelStyle} T={T}/>
    <ErrMsg campo="valor"/>
    <G2>
      <FR><label style={labelStyle}>Obra *</label><select value={f.obra} onChange={e=>u("obra")(e.target.value)} style={si("obra")}><option value="">-- selecione --</option>{obras.map(o=><option key={o.id||o.nome}>{o.nome}</option>)}</select><ErrMsg campo="obra"/></FR>
      <FR><label style={labelStyle}>Data *</label><input type="date" value={f.data} onChange={e=>u("data")(e.target.value)} style={si("data")}/><ErrMsg campo="data"/></FR>
    </G2>
    <FR><label style={labelStyle}>Descrição / Observação</label><input type="text" value={f.obs||""} onChange={e=>u("obs")(e.target.value)} placeholder="Ex: COMPRA DE CIMENTO" style={si("obs")}/></FR>
    <CascadeSelector
      cats={cats} custos={custos}
      categoria={f.categoria} subcategoria={f.subcategoria}
      tipo={f.tipo} natureza={f.natureza}
      onChange={({categoria,subcategoria,tipo,natureza})=>{setF(p=>({...p,categoria,subcategoria,tipo,natureza}));setErros(e=>({...e,categoria:"",subcategoria:""}));}}
      T={T}
    />
    {erros.categoria && <span style={{color:T.danger,fontSize:10,marginTop:-6,marginBottom:6,display:"block"}}>{erros.categoria}</span>}
    {erros.subcategoria && <span style={{color:T.danger,fontSize:10,marginTop:-6,marginBottom:6,display:"block"}}>{erros.subcategoria}</span>}
    <G2>
      <FR><label style={labelStyle}>Pago por</label><select value={f.pagador} onChange={e=>u("pagador")(e.target.value)} style={si("pagador")}>{["RBIM","JF"].map(x=><option key={x}>{x}</option>)}</select></FR>
      <FR><label style={labelStyle}>Banco de Saída</label><select value={f.banco} onChange={e=>u("banco")(e.target.value)} style={si("banco")}><option value="">-- selecione --</option>{bancos.map(b=><option key={b.id||b.nome}>{b.nome}</option>)}</select></FR>
    </G2>
    <FornecedorInput value={f.fornecedor} onChange={v=>u("fornecedor")(v)} fornecedores={fornecedores} inputStyle={si("fornecedor")} labelStyle={labelStyle} T={T}/>
    <button onClick={handleSave} style={{...btnPrimary,width:"100%",background:isEdit?T.info:undefined}}>
      {isEdit ? "✓ Salvar Edição" : "✓ Salvar Lançamento"}
    </button>
  </>);
}

// ─── MODAL RECEITA ────────────────────────────────────────────────────────────
function ModalReceita({T,obras,bancos,inputStyle,labelStyle,btnPrimary,onSave,onClose}) {
  const [f,setF] = useState({obra:"",data:todayStr(),banco:"",medicao:"",valor:0,obs:""});
  const [erros, setErros] = useState({});
  const u = k => v => { setF(p=>({...p,[k]:v})); setErros(e=>({...e,[k]:""})); };
  const si = k => ({...inputStyle,...(erros[k]?{borderColor:T.danger}:{})});
  const ErrMsg = ({campo}) => erros[campo] ? <span style={{color:T.danger,fontSize:10,marginTop:2,display:"block"}}>{erros[campo]}</span> : null;

  const handleSave = () => {
    const e = {};
    if (!f.obra) e.obra = "Selecione uma obra.";
    if (!f.valor || f.valor <= 0) e.valor = "Informe um valor maior que zero.";
    if (!f.data) e.data = "Data obrigatória.";
    if (Object.keys(e).length > 0) { setErros(e); return; }
    onSave({...f, valor:f.valor});
  };

  return (<>
    <MH title="💚 Registrar Receita / Medição" onClose={onClose} T={T}/>
    <CurrencyInput label="Valor Recebido (R$)" required value={f.valor} onChange={v=>u("valor")(v)} inputStyle={{...inputStyle,...(erros.valor?{borderColor:T.danger}:{})}} labelStyle={labelStyle} T={T}/>
    <ErrMsg campo="valor"/>
    <G2>
      <FR><label style={labelStyle}>Obra *</label><select value={f.obra} onChange={e=>u("obra")(e.target.value)} style={si("obra")}><option value="">-- selecione --</option>{obras.map(o=><option key={o.id}>{o.nome}</option>)}</select><ErrMsg campo="obra"/></FR>
      <FR><label style={labelStyle}>Data *</label><input type="date" value={f.data} onChange={e=>u("data")(e.target.value)} style={si("data")}/><ErrMsg campo="data"/></FR>
    </G2>
    <G2>
      <FR><label style={labelStyle}>Banco de Entrada</label><select value={f.banco} onChange={e=>u("banco")(e.target.value)} style={si("banco")}><option value="">-- selecione --</option>{bancos.map(b=><option key={b.id}>{b.nome}</option>)}</select></FR>
      <FR><label style={labelStyle}>Nº da Medição</label><input value={f.medicao} onChange={e=>u("medicao")(e.target.value)} placeholder="Ex: 01" style={si("medicao")}/></FR>
    </G2>
    <FR><label style={labelStyle}>Observações</label><input value={f.obs} onChange={e=>u("obs")(e.target.value)} placeholder="Referência..." style={si("obs")}/></FR>
    <button onClick={handleSave} style={{...btnPrimary,width:"100%",background:T.success}}>✓ Registrar Recebimento</button>
  </>);
}

// ─── MODAL A PAGAR ────────────────────────────────────────────────────────────
function ModalAPagar({T,obras,bancos,cats,inputStyle,labelStyle,btnPrimary,onSave,onClose,fornecedores=[]}) {
  const [f,setF] = useState({
    obra:"",descricao:"",categoria:"",subcategoria:"",tipo:"Direto",natureza:"Material",
    valor:0,vencimento:"",fornecedor:"",pagador:"RBIM",banco:"",
    // ── payload custo fixo ───────────────────────────────────────────────────
    // custoFixo: bool  — se true, lançamento é recorrente
    // diaVencimento: number 1-31 — dia do mês para geração automática
    // totalParcelas: number | null — null = indeterminado
    // parcelaAtual: 1 — incrementado a cada geração
    custoFixo: false, diaVencimento: "", totalParcelas: "",
  });
  const [erros, setErros] = useState({});
  const u = k => v => { setF(p=>({...p,[k]:v})); setErros(e=>({...e,[k]:""})); };
  const subs = f.categoria ? (cats.find(c=>c.nome===f.categoria)?.subs||[]) : [];
  const si = k => ({...inputStyle,...(erros[k]?{borderColor:T.danger}:{})});
  const ErrMsg = ({campo}) => erros[campo] ? <span style={{color:T.danger,fontSize:10,marginTop:2,display:"block"}}>{erros[campo]}</span> : null;
  const SWITCH_STYLE = {
    position:"relative",display:"inline-block",width:40,height:22,flexShrink:0,cursor:"pointer"
  };
  return (<>
    <MH title="⏰ Nova Conta a Pagar" onClose={onClose} T={T}/>
    <CurrencyInput label="Valor (R$)" required value={f.valor} onChange={v=>u("valor")(v)} inputStyle={{...inputStyle,...(erros.valor?{borderColor:T.danger}:{})}} labelStyle={labelStyle} T={T}/>
    <ErrMsg campo="valor"/>
    <G2>
      <FR><label style={labelStyle}>Obra *</label><select value={f.obra} onChange={e=>u("obra")(e.target.value)} style={si("obra")}><option value="">-- selecione --</option>{obras.map(o=><option key={o.id}>{o.nome}</option>)}</select><ErrMsg campo="obra"/></FR>
      <FR><label style={labelStyle}>Vencimento *</label><input type="date" value={f.vencimento} onChange={e=>u("vencimento")(e.target.value)} style={si("vencimento")}/><ErrMsg campo="vencimento"/></FR>
    </G2>
    <FR><label style={labelStyle}>Descrição *</label><input value={f.descricao} onChange={e=>u("descricao")(e.target.value)} placeholder="Ex: PARCELA MATERIAL" style={si("descricao")}/><ErrMsg campo="descricao"/></FR>
    <CascadeSelector
      cats={cats} custos={[]}
      categoria={f.categoria} subcategoria={f.subcategoria}
      tipo={f.tipo} natureza={f.natureza}
      onChange={({categoria,subcategoria,tipo,natureza})=>{setF(p=>({...p,categoria,subcategoria,tipo,natureza}));setErros(e=>({...e,categoria:"",subcategoria:""}));}}
      T={T}
    />
    <G2>
      <FR><label style={labelStyle}>Banco</label><select value={f.banco} onChange={e=>u("banco")(e.target.value)} style={si("banco")}><option value="">-- selecione --</option>{bancos.map(b=><option key={b.id}>{b.nome}</option>)}</select></FR>
      <FR><label style={labelStyle}>Pago por</label><select value={f.pagador} onChange={e=>u("pagador")(e.target.value)} style={si("pagador")}>{["RBIM","JF"].map(x=><option key={x}>{x}</option>)}</select></FR>
    </G2>
    <FornecedorInput value={f.fornecedor} onChange={v=>u("fornecedor")(v)} fornecedores={fornecedores} inputStyle={si("fornecedor")} labelStyle={labelStyle} T={T}/>

    {/* ── Custo Fixo / Recorrente ── */}
    <div style={{background:f.custoFixo?T.info+"18":T.surface2,border:`1px solid ${f.custoFixo?T.info+"55":T.border}`,borderRadius:10,padding:"12px 14px",marginBottom:14,transition:"all 0.2s"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom: f.custoFixo?10:0}}>
        <div>
          <div style={{fontWeight:700,fontSize:12,color:f.custoFixo?T.info:T.text2}}>🔁 Custo Fixo / Recorrente</div>
          <div style={{fontSize:10,color:T.text3,marginTop:2}}>Ex: aluguel, seguro, mensalidade</div>
        </div>
        {/* toggle switch */}
        <button
          type="button"
          onClick={()=>u("custoFixo")(!f.custoFixo)}
          style={{
            width:44,height:24,borderRadius:999,border:"none",cursor:"pointer",
            background:f.custoFixo?T.info:T.border2,
            position:"relative",transition:"background 0.2s",padding:0,flexShrink:0,
          }}
        >
          <span style={{
            position:"absolute",top:2,left:f.custoFixo?22:2,
            width:20,height:20,borderRadius:999,background:"#fff",
            transition:"left 0.2s",display:"block",boxShadow:"0 1px 4px #0004",
          }}/>
        </button>
      </div>
      {f.custoFixo && (
        <G2>
          <FR>
            <label style={{...labelStyle,color:T.info}}>Dia do Vencimento</label>
            <input type="number" min="1" max="31" value={f.diaVencimento}
              onChange={e=>u("diaVencimento")(e.target.value)}
              placeholder="Ex: 5" style={si}/>
          </FR>
          <FR>
            <label style={{...labelStyle,color:T.info}}>Total de Parcelas <span style={{color:T.text3,fontWeight:400}}>(vazio = indeterminado)</span></label>
            <input type="number" min="1" value={f.totalParcelas}
              onChange={e=>u("totalParcelas")(e.target.value)}
              placeholder="Ex: 12 ou vazio" style={si}/>
          </FR>
        </G2>
      )}
      {f.custoFixo && (
        <div style={{fontSize:10,color:T.info,marginTop:4,padding:"5px 10px",background:T.info+"18",borderRadius:6}}>
          📋 Payload: <code style={{fontFamily:"monospace"}}>custoFixo: true · diaVencimento: {f.diaVencimento||"?"} · totalParcelas: {f.totalParcelas||"indeterminado"} · parcelaAtual: 1</code>
        </div>
      )}
    </div>

    <button onClick={()=>{
      const e = {};
      if (!f.obra) e.obra = "Selecione uma obra.";
      if (!f.valor || f.valor <= 0) e.valor = "Informe um valor maior que zero.";
      if (!f.vencimento) e.vencimento = "Vencimento obrigatório.";
      if (!f.descricao) e.descricao = "Descrição obrigatória.";
      if (Object.keys(e).length > 0) { setErros(e); return; }
      onSave({
        ...f, valor:f.valor,
        custoFixo: f.custoFixo,
        diaVencimento: f.custoFixo ? (parseInt(f.diaVencimento)||null) : null,
        totalParcelas: f.custoFixo ? (parseInt(f.totalParcelas)||null) : null,
        parcelaAtual: f.custoFixo ? 1 : null,
      });
    }} style={{...btnPrimary,width:"100%",background:T.danger}}>
      📌 {f.custoFixo ? `Salvar Custo Fixo${f.totalParcelas?` (1/${f.totalParcelas})`:""}` : "Salvar Conta a Pagar"}
    </button>
  </>);
}

// ─── MODAL OBRA ───────────────────────────────────────────────────────────────
function ModalObra({T,initial,inputStyle,labelStyle,btnPrimary,onSave,onClose}) {
  const [f,setF] = useState({nome:initial?.nome||"",contrato:initial?.contrato||0,inicio:initial?.inicio||todayStr(),fim:initial?.fim||"",status:initial?.status||"Planejada"});
  const u = k => v => setF(p=>({...p,[k]:v}));
  const si = {...inputStyle};
  return (<>
    <MH title={initial?"✏️ Editar Obra":"🏗️ Cadastrar Obra"} onClose={onClose} T={T}/>
    <CurrencyInput label="Valor do Contrato (R$)" required value={f.contrato} onChange={v=>u("contrato")(v)} inputStyle={inputStyle} labelStyle={labelStyle} T={T}/>
    <FR><label style={labelStyle}>Nome da Obra *</label><input value={f.nome} onChange={e=>u("nome")(e.target.value)} placeholder="Ex: Residência João" style={si}/></FR>
    <G2>
      <FR><label style={labelStyle}>Data de Início</label><input type="date" value={f.inicio} onChange={e=>u("inicio")(e.target.value)} style={si}/></FR>
      <FR><label style={labelStyle}>Data Final do Contrato</label><input type="date" value={f.fim} onChange={e=>u("fim")(e.target.value)} style={si}/></FR>
    </G2>
    <FR><label style={labelStyle}>Status</label><select value={f.status} onChange={e=>u("status")(e.target.value)} style={si}>{STATUS_OBRA.map(s=><option key={s}>{s}</option>)}</select></FR>
    <button onClick={()=>{if(!f.nome||!f.contrato)return alert("Nome e contrato obrigatórios.");onSave({...f,contrato:f.contrato});}} style={{...btnPrimary,width:"100%"}}>{initial?"✓ Salvar Alterações":"🏗️ Cadastrar"}</button>
  </>);
}

// ─── MODAL ORÇAMENTO ──────────────────────────────────────────────────────────
function ModalOrcamento({T,obras,cats,inputStyle,labelStyle,btnPrimary,onSave,onClose}) {
  const [f,setF] = useState({obra:"",categoria:"",subcategoria:"",tipo:"Direto",natureza:"Material",valorOrcado:0});
  const u = k => v => setF(p=>({...p,[k]:v}));
  const subs = f.categoria ? (cats.find(c=>c.nome===f.categoria)?.subs||[]) : [];
  const si = {...inputStyle};
  return (<>
    <MH title="📐 Nova Linha de Orçamento" onClose={onClose} T={T}/>
    <CurrencyInput label="Valor Orçado (R$)" required value={f.valorOrcado} onChange={v=>u("valorOrcado")(v)} inputStyle={inputStyle} labelStyle={labelStyle} T={T}/>
    <FR><label style={labelStyle}>Obra *</label><select value={f.obra} onChange={e=>u("obra")(e.target.value)} style={si}><option value="">-- selecione --</option>{obras.map(o=><option key={o.id}>{o.nome}</option>)}</select></FR>
    <G2>
      <FR><label style={labelStyle}>Categoria *</label><select value={f.categoria} onChange={e=>{u("categoria")(e.target.value);u("subcategoria")("");}} style={si}><option value="">-- selecione --</option>{cats.map(c=><option key={c.id}>{c.nome}</option>)}</select></FR>
      <FR><label style={labelStyle}>Subcategoria *</label><select value={f.subcategoria} onChange={e=>u("subcategoria")(e.target.value)} style={si}><option value="">-- selecione --</option>{subs.map(s=><option key={s}>{s}</option>)}</select></FR>
    </G2>
    <G2>
      <FR><label style={labelStyle}>Tipo de Custo</label><select value={f.tipo} onChange={e=>u("tipo")(e.target.value)} style={si}>{TIPOS_CUSTO.map(t=><option key={t}>{t}</option>)}</select></FR>
      <FR><label style={labelStyle}>Natureza</label><select value={f.natureza} onChange={e=>u("natureza")(e.target.value)} style={si}>{NATUREZAS.map(n=><option key={n}>{n}</option>)}</select></FR>
    </G2>
    <button onClick={()=>{if(!f.obra||!f.categoria||!f.valorOrcado)return alert("Preencha os campos obrigatórios.");onSave({...f,valorOrcado:f.valorOrcado});}} style={{...btnPrimary,width:"100%"}}>✓ Adicionar ao Orçamento</button>
  </>);
}