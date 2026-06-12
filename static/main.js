// ════════════════════════════════════════════════════════════
//  KERDUS DEFECT DETECTION  main.js
//  Classes: deffect (DEFECT) | normal (NORMAL/GOOD)
// ════════════════════════════════════════════════════════════

// Class color + label map (Kerdus model)
const DC = {
  deffect:        '#FF5C5C',
  deffect_circle: '#FF5C5C',
  deffect_x:      '#FB923C',
  normal:         '#00FFC8',
  normal_circle:  '#00FFC8',
  normal_x:       '#34D399',
  ok:             '#00FFC8',
};
const DL = {
  deffect:        'Deffect',
  deffect_circle: 'Deffect (Circle)',
  deffect_x:      'Deffect (X)',
  normal:         'Normal',
  normal_circle:  'Normal (Circle)',
  normal_x:       'Normal (X)',
  ok:             'No Defect',
};

// ── Chart.js dark theme ───────────────────────────────────
Chart.defaults.color       = 'rgba(200,225,255,.45)';
Chart.defaults.borderColor = 'rgba(100,160,255,.08)';
Chart.defaults.font.family = 'Share Tech Mono';
Chart.defaults.font.size   = 10;

// ── Lottie BG ──────────────────────────────────────────────
lottie.loadAnimation({
  container: document.getElementById('lottie-bg'),
  renderer:  'svg',
  loop:      true,
  autoplay:  true,
  path:      '/static/bg_animation.json',
  rendererSettings: { preserveAspectRatio:'xMidYMid slice', progressiveLoad:true }
});

// ── Gear breathing animation ───────────────────────────────
(function initGear() {
  const el = document.getElementById('gear-wrap');
  if (!el) return;
  lottie.loadAnimation({
    container: el, renderer:'svg', loop:true, autoplay:true,
    path:'/static/gear_animation.json',
    rendererSettings:{ preserveAspectRatio:'xMidYMid meet' }
  });
})();

// ── Clock ──────────────────────────────────────────────────
function updateClock() {
  const n = new Date();
  document.getElementById('clock').textContent = n.toTimeString().slice(0,8);
  document.getElementById('clock-date').textContent =
    n.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
}
updateClock();
setInterval(updateClock, 1000);

// ── Navigation ──────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.section;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + t).classList.add('active');
    if (t === 'history')   loadHistory();
    if (t === 'analytics') loadAnalytics();
  });
});

// ── Toast ──────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Activity log ──────────────────────────────────────────
const actLog = [];
function logActivity(action, extra = '') {
  const time = new Date().toLocaleTimeString('en-US',{hour12:false});
  actLog.unshift({action, extra, time});
  if (actLog.length > 30) actLog.pop();
  renderLog();
}
function renderLog() {
  const el = document.getElementById('ctrl-log');
  const ce = document.getElementById('log-count');
  if (ce) ce.textContent = actLog.length + ' EVENTS';
  if (!actLog.length) { el.innerHTML='<div class="log-empty">NO ACTIVITY YET</div>'; return; }
  const clsMap = {start:'start',stop:'stop',emergency:'emergency',detect:'detect',camera:'cam'};
  const lblMap = {start:'Conveyor Start',stop:'Conveyor Stop',emergency:'E-Stop Activated',detect:'Detection Run',camera:'Camera'};
  el.innerHTML = actLog.map(l=>`
    <div class="log-item">
      <div class="log-dot ${clsMap[l.action]||'stop'}"></div>
      <span class="log-action">${lblMap[l.action]||l.action}${l.extra?' — '+l.extra:''}</span>
      <span class="log-time">${l.time}</span>
    </div>`).join('');
}

// ── Conveyor ───────────────────────────────────────────────
async function conveyorControl(action) {
  try {
    const res  = await fetch('/api/conveyor/control',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action}),
    });
    const data = await res.json();
    updateConveyorUI(data.state);
    logActivity(action);
    const m={start:'CONVEYOR STARTED',stop:'CONVEYOR STOPPED',emergency:'EMERGENCY STOP'};
    toast(m[action]||action);
  } catch { toast('ERROR: BACKEND UNREACHABLE'); }
}

function updateConveyorUI(state) {
  const setCls = (id, cls) => {
    const el=document.getElementById(id); if(!el) return;
    el.className='pill-dot'; if(cls) el.classList.add(cls);
  };
  const cls = state.emergency?'emergency':state.running?'running':'';
  setCls('conv-dot',cls); setCls('ctrl-dot',cls);
  const txt = state.emergency?'E-STOP':state.running?'RUNNING':'IDLE';
  const col = state.emergency?'#FF5C5C':state.running?'#00FFC8':'';
  const v=document.getElementById('conv-val'); if(v){v.textContent=txt;v.style.color=col;}
  const ct=document.getElementById('ctrl-conv-txt'); if(ct) ct.textContent=txt;
}

// ── Camera ─────────────────────────────────────────────────
let cameraActive = false;

async function startCamera() {
  try {
    const res = await fetch('/api/camera/start',{method:'POST'});
    const d   = await res.json();
    if (d.success) {
      cameraActive = true;
      setCamUI(true);
      const img = document.getElementById('cam-img');
      if (img) img.src = '/api/camera/stream?' + Date.now();
      logActivity('camera','started');
      toast('CAMERA STARTED');
    } else { toast('CAM ERROR: ' + d.message); }
  } catch { toast('ERROR: BACKEND UNREACHABLE'); }
}

async function stopCamera() {
  try {
    await fetch('/api/camera/stop',{method:'POST'});
    cameraActive = false;
    setCamUI(false);
    logActivity('camera','stopped');
    toast('CAMERA STOPPED');
  } catch {}
}

function setCamUI(active) {
  const dot=document.getElementById('cam-dot');
  if(dot){dot.className='pill-dot'+(active?' cam-on':'');}
  const val=document.getElementById('cam-val');
  if(val){val.textContent=active?'LIVE':'OFFLINE';val.style.color=active?'#4D9FFF':'';}
  const ld=document.getElementById('cam-live-dot');
  if(ld) ld.className='cam-dot'+(active?' live':'');
  const lt=document.getElementById('cam-live-txt');
  if(lt) lt.textContent=active?'CAM_01 // LIVE':'CAM_01 // OFFLINE';
}

// ── Detection — manual trigger ─────────────────────────────
async function simulateDetection() {
  try {
    const res = await fetch('/api/detection/simulate',{method:'POST'});
    const d   = await res.json();
    renderDetection(d);
    updateSignal(d);
    logActivity('detect', d.status==='good'?'NORMAL':'DEFFECT — '+fmtSub(d.sub_class));
    loadStats();
    const cr=document.getElementById('ctrl-det-result');
    if(cr){cr.innerHTML=miniResult(d);cr.style.display='block';}
    toast(d.status==='good'?'NORMAL DETECTED':'DEFFECT DETECTED: '+fmtSub(d.sub_class));
  } catch { toast('DETECTION ERROR'); }
}

function renderDetection(d) {
  const el=document.getElementById('det-result'); if(!el) return;
  const isGood  = d.status==='good';
  const sub     = DL[d.sub_class]||d.sub_class||'—';
  const dotCol  = DC[d.sub_class]||(isGood?'#00FFC8':'#FF5C5C');
  const conf    = Math.round((d.confidence||0)*100);
  const signal  = d.hardware_signal ? d.hardware_signal.toUpperCase() : (isGood?'ACCEPT':'REJECT');

  // Map to display label
  const dispLabel = isGood ? 'NORMAL' : 'DEFFECT';

  el.innerHTML = `
    <div class="det-wrap">
      <div class="det-badge ${d.status}">
        <div>
          <div class="det-status">${dispLabel}</div>
          <div class="det-subtype">
            <span style="width:8px;height:8px;border-radius:2px;background:${dotCol};display:inline-block;flex-shrink:0;"></span>
            ${sub}
          </div>
        </div>
      </div>
      <div class="det-chips">
        <div class="d-chip">
          <span class="d-chip-l">CONFIDENCE</span>
          <span class="d-chip-v" style="color:${isGood?'var(--go)':'var(--rd)'};">${conf}%</span>
        </div>
        <div class="d-chip">
          <span class="d-chip-l">SIGNAL</span>
          <span class="d-chip-v" style="color:${isGood?'var(--go)':'var(--rd)'};font-size:13px;">${signal}</span>
        </div>
        <div class="d-chip" style="flex:2;">
          <span class="d-chip-l">TIMESTAMP</span>
          <span class="d-chip-v" style="font-size:12px;">${(d.timestamp||'').slice(11,19)||'—'}</span>
        </div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--t3);margin-bottom:5px;">
          <span>CONFIDENCE LEVEL</span><span>${conf}%</span>
        </div>
        <div class="conf-tr"><div class="conf-fl ${d.status}" style="width:${conf}%"></div></div>
      </div>
    </div>`;
}

function miniResult(d) {
  const isGood=d.status==='good';
  const c=isGood?'#00FFC8':'#FF5C5C';
  const bg=isGood?'rgba(0,255,200,.07)':'rgba(255,92,92,.07)';
  const bdr=isGood?'rgba(0,255,200,.28)':'rgba(255,92,92,.28)';
  const label=isGood?'NORMAL':'DEFFECT';
  const signal=d.hardware_signal?d.hardware_signal.toUpperCase():(isGood?'ACCEPT':'REJECT');
  return `<div style="padding:10px 14px;background:${bg};border:1px solid ${bdr};border-radius:10px;">
    <div style="font-family:'Orbitron',monospace;font-size:14px;font-weight:700;color:${c};letter-spacing:1px;">${label}</div>
    <div style="font-family:'Share Tech Mono',monospace;font-size:10.5px;color:rgba(200,225,255,.5);margin-top:3px;">
      ${fmtSub(d.sub_class)} · ${Math.round((d.confidence||0)*100)}% · ${signal}
    </div>
  </div>`;
}

function updateSignal(d) {
  const a=document.getElementById('sig-accept');
  const r=document.getElementById('sig-reject');
  if(a) a.className='sig-row'+(d.status==='good'?   ' sg-good':'');
  if(r) r.className='sig-row'+(d.status==='defect'?' sg-reject':'');
}

// ── Stats ──────────────────────────────────────────────────
let tChart=null;

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const d   = await res.json();
    const $   = id => document.getElementById(id);

    if($('stat-total'))  $('stat-total').textContent  = d.total;
    if($('stat-good'))   $('stat-good').textContent   = d.good;
    if($('stat-defect')) $('stat-defect').textContent = d.defect;
    const rate = d.total?Math.round(d.defect/d.total*100):0;
    if($('stat-rate'))   $('stat-rate').textContent   = rate+'%';
    if($('stat-upd'))    $('stat-upd').textContent    = new Date().toLocaleTimeString('en-US',{hour12:false});

    // Trend chart
    const labels  = d.recent.map(r=>r.timestamp.slice(11,16));
    const goods   = d.recent.map(r=>r.status==='good'  ?1:0);
    const defects = d.recent.map(r=>r.status==='defect'?1:0);
    const ctx = $('trend-chart');
    if(ctx) {
      if(tChart) tChart.destroy();
      tChart = new Chart(ctx.getContext('2d'),{
        type:'bar',
        data:{
          labels,
          datasets:[
            {label:'Normal', data:goods,   backgroundColor:'rgba(0,255,200,.18)',borderColor:'#00FFC8',borderWidth:1.5,borderRadius:4},
            {label:'Deffect',data:defects, backgroundColor:'rgba(255,92,92,.18)', borderColor:'#FF5C5C',borderWidth:1.5,borderRadius:4},
          ]
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{labels:{font:{family:'Share Tech Mono',size:10},boxWidth:10,boxHeight:8,color:'rgba(200,225,255,.5)'}}},
          scales:{
            x:{stacked:true,grid:{display:false},ticks:{color:'rgba(200,225,255,.3)',maxRotation:0}},
            y:{stacked:true,grid:{color:'rgba(100,160,255,.06)'},ticks:{stepSize:1,color:'rgba(200,225,255,.3)'}}
          }
        }
      });
    }
  } catch {}
}

async function loadLatestDetection() {
  try {
    const res = await fetch('/api/detection/latest');
    const d   = await res.json();
    if(!d.status) return;
    renderDetection(d); updateSignal(d);
  } catch {}
}

// ── History ────────────────────────────────────────────────
let allRows=[], activeFilter='all';

async function loadHistory() {
  try {
    const res=await fetch('/api/history');
    allRows=await res.json();
    renderHistory();
  } catch {}
}

function filterHistory(f,btn) {
  activeFilter=f;
  document.querySelectorAll('.fbtn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderHistory();
}

function renderHistory() {
  const rows=activeFilter==='all'?allRows:allRows.filter(r=>r.status===activeFilter);
  const hc=document.getElementById('hist-count');
  if(hc) hc.textContent=rows.length+' RECORDS';
  const tb=document.getElementById('hist-tbody'); if(!tb) return;
  if(!rows.length){
    tb.innerHTML='<tr><td colspan="6" class="empty-row">NO RECORDS YET — RUN FIRST INSPECTION</td></tr>';
    return;
  }
  tb.innerHTML=rows.map((r,i)=>{
    const sub=DL[r.sub_class]||r.sub_class;
    const dot=DC[r.sub_class]||(r.status==='good'?'#00FFC8':'#FF5C5C');
    const dispLabel = r.status==='good'?'NORMAL':'DEFFECT';
    return `<tr>
      <td style="color:rgba(200,225,255,.2);">${i+1}</td>
      <td>${r.timestamp}</td>
      <td><span class="sp ${r.status}">${dispLabel}</span></td>
      <td><span style="display:inline-flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:2px;background:${dot};flex-shrink:0;display:inline-block;"></span>
        ${sub}</span></td>
      <td>${Math.round(r.confidence*100)}%</td>
      <td><span class="hwp">${r.status==='good'?'ACCEPT':'REJECT'}</span></td>
    </tr>`;
  }).join('');
}

// ── Analytics ──────────────────────────────────────────────
let dChart=null, sChart=null, rChart=null;

async function loadAnalytics() {
  try {
    const res=await fetch('/api/stats');
    const d  =await res.json();

    // Donut
    const dCtx=document.getElementById('donut-chart');
    if(dCtx){
      if(dChart) dChart.destroy();
      dChart=new Chart(dCtx.getContext('2d'),{
        type:'doughnut',
        data:{
          labels:['Normal','Deffect'],
          datasets:[{
            data:[d.good,d.defect],
            backgroundColor:['rgba(0,255,200,.70)','rgba(255,92,92,.70)'],
            borderColor:['rgba(0,255,200,.3)','rgba(255,92,92,.3)'],
            borderWidth:1,hoverOffset:5,
          }]
        },
        options:{
          cutout:'74%',responsive:false,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw}`}}}
        }
      });
      const gpct=d.total?Math.round(d.good/d.total*100):0;
      const dpct=d.total?Math.round(d.defect/d.total*100):0;
      const pc=document.getElementById('donut-pct'); if(pc) pc.textContent=gpct+'%';
      const leg=document.getElementById('donut-leg');
      if(leg) leg.innerHTML=`
        <div class="leg-item"><div class="leg-dot" style="background:rgba(0,255,200,.7)"></div>Normal — <b>${d.good}</b> (${gpct}%)</div>
        <div class="leg-item"><div class="leg-dot" style="background:rgba(255,92,92,.7)"></div>Deffect — <b>${d.defect}</b> (${dpct}%)</div>`;
    }

    // Horizontal bars
    const ss=document.getElementById('sub-summary');
    if(ss){
      const max=Math.max(...d.sub_classes.map(s=>s.count),1);
      ss.innerHTML=d.sub_classes.length
        ?d.sub_classes.map(s=>`
          <div class="sub-row">
            <span class="sub-dot" style="background:${DC[s.raw]||'#888'};box-shadow:0 0 7px ${DC[s.raw]||'#888'}55;"></span>
            <span class="sub-name">${DL[s.raw]||s.label}</span>
            <div class="sub-track">
              <div class="sub-fill" style="width:${Math.round(s.count/max*100)}%;background:${DC[s.raw]||'#888'};box-shadow:0 0 8px ${DC[s.raw]||'#888'}44;"></div>
            </div>
            <span class="sub-count">${s.count}</span>
          </div>`).join('')
        :`<p style="color:var(--t3);font-family:'Share Tech Mono',monospace;font-size:12px;padding:16px 0;">NO DEFECT DATA YET</p>`;
    }

    // Bar chart with gradients
    const scCtx=document.getElementById('subcls-chart');
    if(scCtx){
      if(sChart) sChart.destroy();
      const ctx2d=scCtx.getContext('2d');
      const grads=d.sub_classes.map(s=>{
        const c=DC[s.raw]||'#888';
        const g=ctx2d.createLinearGradient(0,0,0,280);
        g.addColorStop(0,c+'CC'); g.addColorStop(0.55,c+'66'); g.addColorStop(1,c+'11');
        return g;
      });
      sChart=new Chart(scCtx,{
        type:'bar',
        data:{
          labels:d.sub_classes.map(s=>DL[s.raw]||s.label),
          datasets:[{
            label:'Count',data:d.sub_classes.map(s=>s.count),
            backgroundColor:grads,
            borderColor:d.sub_classes.map(s=>DC[s.raw]||'#888'),
            borderWidth:1.5,borderRadius:{topLeft:8,topRight:8},borderSkipped:false,
          }]
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{
            legend:{display:false},
            tooltip:{backgroundColor:'rgba(8,12,35,.92)',borderColor:'rgba(77,159,255,.3)',borderWidth:1,
              titleFont:{family:'Orbitron',size:11},bodyFont:{family:'Share Tech Mono',size:11},padding:12,
              callbacks:{label:ctx=>` Count: ${ctx.raw}`}}
          },
          scales:{
            x:{grid:{display:false},ticks:{color:'rgba(200,225,255,.45)',font:{family:'Share Tech Mono',size:10}}},
            y:{grid:{color:'rgba(100,160,255,.07)',drawBorder:false},ticks:{stepSize:1,color:'rgba(200,225,255,.35)',font:{family:'Share Tech Mono',size:10}}}
          },
          animation:{duration:900,easing:'easeOutQuart'}
        }
      });
    }

    // Radar
    const rCtx=document.getElementById('radar-chart');
    if(rCtx){
      if(rChart) rChart.destroy();
      const keys=d.sub_classes.map(s=>s.raw);
      const cmap={};
      d.sub_classes.forEach(s=>{cmap[s.raw]=s.count;});
      rChart=new Chart(rCtx.getContext('2d'),{
        type:'radar',
        data:{
          labels:keys.map(k=>DL[k]||k),
          datasets:[{
            label:'Count',data:keys.map(k=>cmap[k]||0),
            backgroundColor:'rgba(77,159,255,.13)',borderColor:'rgba(77,159,255,.65)',
            borderWidth:1.5,pointBackgroundColor:keys.map(k=>DC[k]||'#888'),
            pointBorderColor:'transparent',pointRadius:5,pointHoverRadius:7,
          }]
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{r:{
            grid:{color:'rgba(100,160,255,.10)'},
            angleLines:{color:'rgba(100,160,255,.10)'},
            ticks:{display:false,stepSize:1},
            pointLabels:{color:'rgba(200,225,255,.60)',font:{family:'Share Tech Mono',size:9}},
          }}
        }
      });
    }

    // Session summary
    const sumEl=document.getElementById('session-summary');
    if(sumEl){
      const gpct=d.total?Math.round(d.good/d.total*100):0;
      const dpct=d.total?Math.round(d.defect/d.total*100):0;
      sumEl.innerHTML=`<div class="sum-grid">
        <div class="sum-item"><span class="sum-l">TOTAL INSPECTED</span><span class="sum-v">${d.total}</span></div>
        <div class="sum-item"><span class="sum-l">NORMAL</span><span class="sum-v" style="color:var(--go)">${d.good}</span></div>
        <div class="sum-item"><span class="sum-l">DEFFECT</span><span class="sum-v" style="color:var(--rd)">${d.defect}</span></div>
        <div class="sum-item"><span class="sum-l">NORMAL RATE</span><span class="sum-v" style="color:var(--go)">${gpct}%</span></div>
        <div class="sum-item"><span class="sum-l">DEFECT RATE</span><span class="sum-v" style="color:var(--am)">${dpct}%</span></div>
        <div class="sum-item"><span class="sum-l">CLASS TYPES</span><span class="sum-v">${d.sub_classes.length}</span></div>
      </div>`;
    }
  } catch(e){console.error(e);}
}

// ── Helpers ────────────────────────────────────────────────
function fmtSub(s){ return DL[s]||(s?s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'—'); }

// ── Full poll from /api/stats ─────────────────────────────
async function poll() {
  try {
    const [convRes, camRes, statRes] = await Promise.all([
      fetch('/api/conveyor/status'),
      fetch('/api/camera/status'),
      fetch('/api/stats'),
    ]);
    const convState = await convRes.json();
    const camStatus = await camRes.json();
    const stats     = await statRes.json();

    updateConveyorUI(convState);

    if(camStatus.active !== cameraActive){
      cameraActive = camStatus.active;
      setCamUI(camStatus.active);
    }

    // Update stat strip
    const $=id=>document.getElementById(id);
    if($('stat-total'))  $('stat-total').textContent  = stats.total;
    if($('stat-good'))   $('stat-good').textContent   = stats.good;
    if($('stat-defect')) $('stat-defect').textContent = stats.defect;
    const rate=stats.total?Math.round(stats.defect/stats.total*100):0;
    if($('stat-rate'))   $('stat-rate').textContent   = rate+'%';
    if($('stat-upd'))    $('stat-upd').textContent    = new Date().toLocaleTimeString('en-US',{hour12:false});

    await loadLatestDetection();
    await loadStats();
  } catch {}
}

// ── Init ───────────────────────────────────────────────────
renderLog();
poll();
setInterval(poll, 5000);
