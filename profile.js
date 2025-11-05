// profile.js
// Reads the data produced by your main.js (localStorage) and draws charts

// Safe getters and helpers
const ls = k => {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); }
  catch { return null; }
};
const lsRaw = k => localStorage.getItem(k);

// Colors palette (distinct & professional)
const COLORS = {
  projects: '#4CAF50',
  checkpoints: '#FFB74D',
  piscine: '#29B6F6',
  bonus: '#8E24AA',
  done: '#4CAF50',
  received: '#EF5350'
};

function formatK(n) {
  if (!isFinite(n)) return '0';
  if (Math.abs(n) >= 1000) return `${(n/1000).toFixed(0)}k`;
  return `${Math.round(n)}`;
}

// ---- Load user info ----
const userData = ls('userData') || [];
if (userData && userData.length > 0) {
  const u = userData[0];
  document.title = `Profile - ${u.login || ''}`;
  document.getElementById('user-name').textContent = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.login || 'Profile';
  document.getElementById('user-login').textContent = `@${u.login || ''}`;
  document.getElementById('user-email').textContent = u.email || 'N/A';
}

// totals
const totals = ls('totalXPStats') || { projects:0, checkpoints:0, piscineJs:0, total:0, bonus:0 };
document.getElementById('total-xp').textContent = (totals.total || 0).toLocaleString();

// Latest audits (render from auditRecords if present)
function renderLatestAudits() {
  const audits = ls('auditRecords') || [];
  const container = document.getElementById('audits-list');
  if (!audits.length) {
    container.innerHTML = '<div class="muted">No audit records available</div>';
    return;
  }
  // show up to 8 latest
  const list = audits.slice(0,8).map(a => {
    const grade = typeof a.grade === 'number' ? a.grade : '—';
    const auditor = a.auditor?.id ? `auditor #${a.auditor.id}` : '';
    return `<div class="audit-row"><div class="audit-grade">${grade}</div><div class="audit-meta">${auditor}</div></div>`;
  }).join('');
  container.innerHTML = list;
}

// ---- XP Donut ----
function drawXpDonut() {
  const svg = document.getElementById('xp-donut');
  svg.innerHTML = ''; // clear

  // Build parts including detecting bonus in totals (fallback)
  const parts = [
    { key:'projects', label:'Projects', value: totals.projects || 0, color: COLORS.projects },
    { key:'checkpoints', label:'Checkpoints', value: totals.checkpoints || 0, color: COLORS.checkpoints },
    { key:'piscine', label:'Piscine + Bonus', value: totals.piscineJs || 0, color: COLORS.piscine }
  ];

  // If you stored a bonus amount separately (auditUpBonus), include it
  const bonusVal = Number(lsRaw('auditUpBonus') || 0);
  if (bonusVal > 0) {
    parts.push({ key:'bonus', label:'Bonus', value: bonusVal, color: COLORS.bonus });
  }

  const total = parts.reduce((s,p) => s + (p.value || 0), 0) || 1;

  // donut base circle for background ring
  const cx = 150, cy = 150, r = 70;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  parts.forEach(p => {
    if ((p.value || 0) <= 0) return;
    const pct = p.value / total;
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('r', String(r));
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('fill','none');
    circle.setAttribute('stroke', p.color);
    circle.setAttribute('stroke-width', '40');
    circle.setAttribute('stroke-dasharray', `${(pct * circ).toFixed(4)} ${((1-pct)*circ).toFixed(4)}`);
    circle.setAttribute('stroke-dashoffset', String(-offset));
    circle.setAttribute('stroke-linecap','butt');
    circle.style.transition = 'stroke-dasharray .6s ease, stroke-dashoffset .6s ease';
    circle.appendChild(document.createElement('title')).textContent = `${p.label}: ${(p.value).toLocaleString()} XP`;
    svg.appendChild(circle);
    offset += pct * circ;
  });

  // center text
  const center = document.createElementNS('http://www.w3.org/2000/svg','text');
  center.setAttribute('x', String(cx));
  center.setAttribute('y', String(cy+6));
  center.setAttribute('text-anchor','middle');
  center.setAttribute('font-size','18');
  center.setAttribute('fill','#e6e6e6');
  center.setAttribute('font-weight','700');
  center.textContent = `${(total).toLocaleString()} XP`;
  svg.appendChild(center);

  // legend
  const legend = document.getElementById('xp-legend');
  legend.innerHTML = '';
  parts.forEach(p => {
    if ((p.value||0) <= 0) return;
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-swatch" style="background:${p.color}"></span>
                      <span class="legend-label">${p.label}</span>
                      <span class="legend-value">${(p.value).toLocaleString()} XP</span>`;
    legend.appendChild(item);
  });
}

// ---- XP by Project bar chart ----
function drawProjectBarChart() {
  const txs = ls('userXPData') || [];
  const agg = {};
  txs.forEach(t => {
    const name = (t.object && t.object.name) ? t.object.name : (t.path || 'unknown');
    agg[name] = (agg[name] || 0) + (t.amount || 0);
  });

  const arr = Object.entries(agg).map(([name, xp]) => ({ name, xp })).sort((a,b) => b.xp - a.xp);
  const top = arr.slice(0, Math.min(arr.length, 12)); // top 12
  const svg = document.getElementById('xp-bar');
  svg.innerHTML = '';

  // sizing
  const W = 900, H = 340, padding = 60;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  if (!top.length) {
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', W/2); t.setAttribute('y', H/2); t.setAttribute('text-anchor','middle');
    t.setAttribute('fill','#999'); t.textContent = 'No project XP data';
    svg.appendChild(t);
    return;
  }

  const max = Math.max(...top.map(d=>d.xp));
  const chartW = W - padding*2;
  const barGap = 10;
  const barWidth = Math.max(14, (chartW - (top.length-1)*barGap) / top.length);

  // y axis ticks
  const ticks = 4;
  for (let i=0;i<=ticks;i++){
    const val = Math.round(max * (i/ticks));
    const y = H - padding - ( (val / max) * (H - padding*2) );
    // grid line
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', padding); line.setAttribute('x2', W - padding);
    line.setAttribute('y1', String(y)); line.setAttribute('y2', String(y));
    line.setAttribute('stroke','#222'); line.setAttribute('stroke-width','1');
    svg.appendChild(line);
    // label
    const lbl = document.createElementNS('http://www.w3.org/2000/svg','text');
    lbl.setAttribute('x', padding - 10); lbl.setAttribute('y', String(y + 4));
    lbl.setAttribute('text-anchor','end'); lbl.setAttribute('font-size','12'); lbl.setAttribute('fill','#ccc');
    lbl.textContent = `${Math.round(val/1000)}k`;
    svg.appendChild(lbl);
  }

  top.forEach((d,i) => {
    const x = padding + i * (barWidth + barGap);
    const h = (d.xp / max) * (H - padding*2);
    const y = H - padding - h;

    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(barWidth));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx','4');
    rect.setAttribute('fill', `hsl(${(i*45)%360} 75% 55%)`);
    rect.style.transition = 'transform .2s ease, opacity .2s ease';
    svg.appendChild(rect);

    // value label above
    const v = document.createElementNS('http://www.w3.org/2000/svg','text');
    v.setAttribute('x', String(x + barWidth/2));
    v.setAttribute('y', String(y - 8));
    v.setAttribute('text-anchor','middle');
    v.setAttribute('font-size','12');
    v.setAttribute('fill','#fff');
    v.textContent = formatK(d.xp);
    svg.appendChild(v);

    // name label rotated slightly
    const name = document.createElementNS('http://www.w3.org/2000/svg','text');
    name.setAttribute('x', String(x + barWidth/2));
    name.setAttribute('y', String(H - padding + 20));
    name.setAttribute('text-anchor','middle');
    name.setAttribute('font-size','11');
    name.setAttribute('fill','#ddd');
    name.setAttribute('transform', `rotate(-20 ${x + barWidth/2} ${H - padding + 20})`);
    name.textContent = d.name.length > 18 ? d.name.slice(0,17) + '…' : d.name;
    svg.appendChild(name);

    // hover effect
    rect.addEventListener('mouseenter', () => {
      rect.style.transform = 'translateY(-6px)';
    });
    rect.addEventListener('mouseleave', () => {
      rect.style.transform = '';
    });
  });
}

// ---- Audit pie with labels and safety checks ----
function drawAuditPie() {
  const done = Number(lsRaw('auditDone') || 0);
  const received = Number(lsRaw('auditReceived') || 0);
  const ratio = Number(lsRaw('auditRatio') || 0);

  const svg = document.getElementById('audit-pie');
  svg.innerHTML = '';
  if (done === 0 && received === 0) {
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x','150'); t.setAttribute('y','170'); t.setAttribute('text-anchor','middle');
    t.setAttribute('fill','#999'); t.textContent = 'No audit data';
    svg.appendChild(t);
    document.getElementById('audit-stats').innerHTML = `<p>Done: 0 MB</p><p>Received: 0 MB</p>`;
    return;
  }

  const cx = 150, cy = 150, r = 100;
  const total = done + received;
  const doneAngle = (done / total) * 2 * Math.PI;

  // done slice
  const x1 = cx + r * Math.cos(0);
  const y1 = cy + r * Math.sin(0);
  const x2 = cx + r * Math.cos(doneAngle);
  const y2 = cy + r * Math.sin(doneAngle);
  const largeArcFlag = (done / total) > 0.5 ? 1 : 0;

  const pathDone = document.createElementNS('http://www.w3.org/2000/svg','path');
  pathDone.setAttribute('d', `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArcFlag},1 ${x2},${y2} Z`);
  pathDone.setAttribute('fill', COLORS.done);
  svg.appendChild(pathDone);

  const pathRec = document.createElementNS('http://www.w3.org/2000/svg','path');
  pathRec.setAttribute('d', `M${cx},${cy} L${x2},${y2} A${r},${r} 0 ${largeArcFlag?0:1},1 ${x1},${y1} Z`);
  pathRec.setAttribute('fill', COLORS.received);
  svg.appendChild(pathRec);

  // labels inside slices
  const doneMidAngle = doneAngle/2;
  const recMidAngle = doneAngle + (2*Math.PI - doneAngle)/2;

  const doneText = document.createElementNS('http://www.w3.org/2000/svg','text');
  doneText.setAttribute('x', String(cx + (r*0.55)*Math.cos(doneMidAngle)));
  doneText.setAttribute('y', String(cy + (r*0.55)*Math.sin(doneMidAngle)));
  doneText.setAttribute('text-anchor','middle');
  doneText.setAttribute('fill','#fff');
  doneText.setAttribute('font-size','13');
  doneText.setAttribute('font-weight','700');
  doneText.textContent = formatK(done);
  svg.appendChild(doneText);

  const recText = document.createElementNS('http://www.w3.org/2000/svg','text');
  recText.setAttribute('x', String(cx + (r*0.55)*Math.cos(recMidAngle)));
  recText.setAttribute('y', String(cy + (r*0.55)*Math.sin(recMidAngle)));
  recText.setAttribute('text-anchor','middle');
  recText.setAttribute('fill','#fff');
  recText.setAttribute('font-size','13');
  recText.setAttribute('font-weight','700');
  recText.textContent = formatK(received);
  svg.appendChild(recText);

  // center ratio
  const ratioText = document.createElementNS('http://www.w3.org/2000/svg','text');
  ratioText.setAttribute('x', String(cx));
  ratioText.setAttribute('y', String(cy));
  ratioText.setAttribute('text-anchor','middle');
  ratioText.setAttribute('fill','#fff');
  ratioText.setAttribute('font-size','14');
  ratioText.setAttribute('font-weight','700');
  ratioText.textContent = `Ratio ${(isFinite(ratio) ? ratio.toFixed(2) : '—')}`;
  svg.appendChild(ratioText);

  document.getElementById('audit-stats').innerHTML = `<p>Done: ${(done/1000000).toFixed(2)} MB</p><p>Received: ${(received/1000000).toFixed(2)} MB</p>`;
}

// ---- bootstrap draws ----
renderLatestAudits();
drawXpDonut();
drawProjectBarChart();
drawAuditPie();
