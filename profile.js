// profile.js
// --- Load user info ---
const userData = JSON.parse(localStorage.getItem('userData') || '[]');
if (userData.length > 0) {
  const user = userData[0];
  document.title = `Profile - ${user.login}`;
 document.getElementById('first-name').textContent = user.firstName || 'N/A';
  document.getElementById('last-name').textContent = user.lastName || 'N/A';
  document.getElementById('user-login').textContent = `@${user.login || ''}`;
  document.getElementById('user-email').textContent = user.email || 'N/A';
}

// --- XP Totals ---
const totals = JSON.parse(localStorage.getItem('totalXPStats')) || {};
document.getElementById('total-xp').textContent = ((totals.total) || 0).toLocaleString();

// --- Logout ---
document.getElementById('logout').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'index.html';
});

function formatBytesAsKBorMB(n) {
  if (!isFinite(n) || n === 0) return '0 KB';
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)} MB`;
  return `${Math.round(n / 1000)} KB`;
}

// -----------------------------
// LATEST AUDITS (CHANGED: render like your snippet)
// -----------------------------
function renderLatestAuditsFromStorage() {
  const audits = JSON.parse(localStorage.getItem('auditRecords') || '[]');
  const auditsContainer = document.getElementById('audits-list'); // CHANGED matches new id
  auditsContainer.innerHTML = '';

  if (!audits || audits.length === 0) {
    auditsContainer.textContent = 'No audits';
    return;
  }

  // show up to 10 latest
  audits.slice(0, 10).forEach(audit => {
    const auditElement = document.createElement('div');
    auditElement.classList.add('audit');
    // CHANGED: using group.object.name, createdAt, grade style & passed class
    const groupName = (audit.group && audit.group.object && audit.group.object.name) ? audit.group.object.name : (audit.object?.name || 'Unknown');
    const dateStr = audit.createdAt ? new Date(audit.createdAt).toLocaleString() : '—';
    const grade = (typeof audit.grade === 'number') ? audit.grade : '—';
    auditElement.innerHTML = `
      <div class="audit-card">
        <div class="audit-title">${groupName}</div>
        <div class="audit-meta">
          <span class="audit-date">${dateStr}</span>
          <span class="audit-grade ${audit.grade === 1 ? 'passed' : ''}">
            ${audit.grade === 1 ? 'Passed' : grade}
          </span>
        </div>
      </div>
    `;
    auditsContainer.appendChild(auditElement);
  });
}

// -----------------------------
// XP Donut (unchanged core logic, same as before)
// -----------------------------
function drawXPDonut() {
  const userXPData = JSON.parse(localStorage.getItem('userXPData') || '[]');
  const checkpointsXp = JSON.parse(localStorage.getItem('userCheckpointsXPData') || '[]');
  const piscineXp = JSON.parse(localStorage.getItem('jspiscineXPData') || '[]');

  // detect bonus transactions
  // const bonusCandidates = userXPData.filter(tx => {
  //   const name = (tx.object && tx.object.name) ? String(tx.object.name).toLowerCase() : '';
  //   const path = (tx.path || '').toLowerCase();
  //   return name.includes('bonus') || path.includes('bonus') || path.includes('hackathon');
  // });
  // const bonusTotal = bonusCandidates.reduce((s, t) => s + (t.amount || 0), 0);

  const projectsTotal = userXPData
    .filter(tx => {
      const path = (tx.path || '').toLowerCase();
      const isCheckpoint = path.includes('/checkpoint') || path.includes('checkpoint');
      const isPiscine = path.includes('piscine-js') || (tx.object && tx.object.type === 'piscine');
      // const isBonus = bonusCandidates.includes(tx);
      return !isCheckpoint && !isPiscine;
    })
    .reduce((s, t) => s + (t.amount || 0), 0);

  const checkpointsTotal = checkpointsXp.reduce((s, t) => s + (t.amount || 0), 0);
  const piscineTotal = piscineXp.reduce((s, t) => s + (t.amount || 0), 0);

  const parts = [
    { label: 'Projects', value: projectsTotal, color: '#4CAF50' },
    { label: 'Checkpoints', value: checkpointsTotal, color: '#FFB74D' },
    { label: 'Piscine', value: piscineTotal, color: '#42A5F5' },
  ].filter(p => p.value > 0);

  const total = parts.reduce((s, p) => s + p.value, 0);
  const svg = document.getElementById('xp-donut');
  svg.innerHTML = '';
  const size = 300, cx = size / 2, cy = size / 2, rOuter = 90, rInner = 60;
  if (total === 0) {
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x', cx);
    text.setAttribute('y', cy);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = 'No XP';
    text.setAttribute('fill','#bbb');
    text.setAttribute('font-size','18');
    svg.appendChild(text);
    return;
  }

  let start = 0;
  parts.forEach(p => {
    const slice = p.value / total;
    const end = start + slice;

    const a1x = cx + rOuter * Math.cos(2 * Math.PI * start - Math.PI/2);
    const a1y = cy + rOuter * Math.sin(2 * Math.PI * start - Math.PI/2);
    const a2x = cx + rOuter * Math.cos(2 * Math.PI * end - Math.PI/2);
    const a2y = cy + rOuter * Math.sin(2 * Math.PI * end - Math.PI/2);
    const b1x = cx + rInner * Math.cos(2 * Math.PI * end - Math.PI/2);
    const b1y = cy + rInner * Math.sin(2 * Math.PI * end - Math.PI/2);
    const b2x = cx + rInner * Math.cos(2 * Math.PI * start - Math.PI/2);
    const b2y = cy + rInner * Math.sin(2 * Math.PI * start - Math.PI/2);

    const largeArc = slice > 0.5 ? 1 : 0;
    const d = [
      `M ${a1x} ${a1y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${a2x} ${a2y}`,
      `L ${b1x} ${b1y}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${b2x} ${b2y}`,
      'Z'
    ].join(' ');

    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', d);
    path.setAttribute('fill', p.color);
    svg.appendChild(path);

    const mid = start + slice / 2;
    const lx = cx + (rOuter + 24) * Math.cos(2 * Math.PI * mid - Math.PI/2);
    const ly = cy + (rOuter + 24) * Math.sin(2 * Math.PI * mid - Math.PI/2);
    const label = document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('x', lx);
    label.setAttribute('y', ly);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '12');
    label.setAttribute('fill', '#ddd');
    label.textContent = p.label;
    svg.appendChild(label);

    const title = document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent = `${p.label}: ${(p.value/1000).toFixed(1)}k XP`;
    path.appendChild(title);

    start = end;
  });

  const center = document.createElementNS('http://www.w3.org/2000/svg','text');
  center.setAttribute('x', cx);
  center.setAttribute('y', cy);
  center.setAttribute('text-anchor', 'middle');
  center.setAttribute('dominant-baseline', 'middle');
  center.setAttribute('font-size', '18');
  center.setAttribute('fill', '#fff');
  center.textContent = `${(total/1000).toFixed(1)}k XP`;
  svg.appendChild(center);

  const legend = document.getElementById('xp-legend');
  legend.innerHTML = '';
  parts.forEach(p => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '8px';
    item.innerHTML = `<span style="display:inline-block;width:14px;height:14px;background:${p.color};border-radius:3px"></span>
                      <strong style="color:#fff">${p.label}</strong>
                      <small style="color:#bbb;margin-left:6px">${(p.value/1000).toFixed(1)}k</small>`;
    legend.appendChild(item);
  });
}

// -----------------------------
// Audit pie (unchanged logic)
// -----------------------------
function drawAuditPie() {
  const done = parseFloat(localStorage.getItem('auditDone')) || 0;
  const received = parseFloat(localStorage.getItem('auditReceived')) || 0;
  const ratio = parseFloat(localStorage.getItem('auditRatio')) || 0;
  const total = done + received;

  const svg = document.getElementById('audit-pie');
  svg.innerHTML = '';
  const statsDiv = document.getElementById('audit-stats');
  statsDiv.innerHTML = '';

  if (total === 0) {
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x', 150);
    text.setAttribute('y', 150);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '18');
    text.setAttribute('fill', '#bbb');
    text.textContent = 'No audit data';
    svg.appendChild(text);
    statsDiv.innerHTML = `<p>Done: 0 MB</p><p>Received: 0 MB</p><p>Ratio: -</p>`;
    return;
  }

  const cx = 150, cy = 150, r = 110;
  const doneAngle = (done / total) * 2 * Math.PI;
  const x1 = cx + r * Math.cos(-Math.PI/2);
  const y1 = cy + r * Math.sin(-Math.PI/2);
  const x2 = cx + r * Math.cos(doneAngle - Math.PI/2);
  const y2 = cy + r * Math.sin(doneAngle - Math.PI/2);
  const largeArcFlag = (done / total) > 0.5 ? 1 : 0;

  const pathDone = document.createElementNS('http://www.w3.org/2000/svg','path');
  pathDone.setAttribute('d', `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArcFlag} 1 ${x2},${y2} Z`);
  pathDone.setAttribute('fill', '#4CAF50');
  svg.appendChild(pathDone);

  const pathRec = document.createElementNS('http://www.w3.org/2000/svg','path');
  pathRec.setAttribute('d', `M${cx},${cy} L${x2},${y2} A${r},${r} 0 ${largeArcFlag ? 0 : 1} 1 ${x1},${y1} Z`);
  pathRec.setAttribute('fill', '#42A5F5');
  svg.appendChild(pathRec);

  const doneMid = -Math.PI/2 + doneAngle / 2;
  const recMid = -Math.PI/2 + doneAngle + (2 * Math.PI - doneAngle) / 2;

  const makeLabel = (txt, angle) => {
    const lx = cx + (r * 0.55) * Math.cos(angle);
    const ly = cy + (r * 0.55) * Math.sin(angle);
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', lx);
    t.setAttribute('y', ly);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('font-size', '13');
    t.setAttribute('fill', '#fff');
    t.setAttribute('font-weight', '600');
    t.textContent = txt;
    svg.appendChild(t);
  };
  makeLabel('Done', doneMid);
  makeLabel('Received', recMid);

  const centerText = document.createElementNS('http://www.w3.org/2000/svg','text');
  centerText.setAttribute('x', cx);
  centerText.setAttribute('y', cy);
  centerText.setAttribute('text-anchor', 'middle');
  centerText.setAttribute('dominant-baseline', 'middle');
  centerText.setAttribute('font-size', '16');
  centerText.setAttribute('font-weight', '700');
  centerText.setAttribute('fill', '#fff');
  centerText.textContent = `Ratio ${ratio.toFixed(2)}`;
  svg.appendChild(centerText);

  statsDiv.innerHTML = `<p><strong>Done:</strong> ${formatBytesAsKBorMB(done)}</p>
                        <p><strong>Received:</strong> ${formatBytesAsKBorMB(received)}</p>
                        <p><strong>Bonus up:</strong> ${formatBytesAsKBorMB(parseFloat(localStorage.getItem('auditUpBonus') || 0))}</p>`;
  const legend = document.createElement('div');
  legend.style.marginTop = '8px';
  legend.innerHTML = `<div style="display:flex;gap:8px;"><div style="width:12px;height:12px;background:#4CAF50"></div><small>Done</small>
                      <div style="width:12px;height:12px;background:#42A5F5;margin-left:12px"></div><small>Received</small></div>`;
  statsDiv.appendChild(legend);
}

// -----------------------------
// XP by Project (CHANGED: show ALL projects, dynamic height, scroll wrapper support)
// -----------------------------
function drawXPByProject() {
  const userXPData = JSON.parse(localStorage.getItem('userXPData') || '[]');

  const agg = {};
  userXPData.forEach(tx => {
    const rawName = (tx.object && tx.object.name) ? String(tx.object.name) : (tx.path || 'unknown');
    const name = rawName;
    agg[name] = (agg[name] || 0) + (tx.amount || 0);
  });

  const arr = Object.entries(agg).map(([name, xp]) => ({ name, xp }));
  arr.sort((a,b) => b.xp - a.xp);
  const projects = arr; // CHANGED: no top-N slicing, show all

  const svg = document.getElementById('xp-bar');
  svg.innerHTML = '';

  const width = 700;
  // compute bar size based on number of projects
  const padding = { t: 40, r: 20, b: 40, l: 160 };
  const gap = 10;
  const minBarH = 16;
  const maxBarH = 36;
  const n = Math.max(1, projects.length);
  // try to fit into a reasonable height, but allow growth
  const preferredHeight = Math.max(420, n * (minBarH + gap) + padding.t + padding.b);
  const barH = Math.max(minBarH, Math.min(maxBarH, Math.floor((preferredHeight - padding.t - padding.b - gap*(n-1)) / n)));
  const chartH = padding.t + padding.b + n * (barH + gap);

  svg.setAttribute('viewBox', `0 0 ${width} ${chartH}`);
  svg.setAttribute('height', chartH);

  if (projects.length === 0) {
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', width/2);
    t.setAttribute('y', chartH/2);
    t.setAttribute('text-anchor','middle');
    t.setAttribute('fill','#777');
    t.textContent = 'No project XP';
    svg.appendChild(t);
    return;
  }

  const maxXP = Math.max(...projects.map(d => d.xp), 1);
  const chartW = width - padding.l - padding.r;

  // X-axis ticks
  const ticks = 4;
  for (let i=0;i<=ticks;i++) {
    const vx = padding.l + (chartW / ticks) * i;
    const val = Math.round((maxXP / ticks) * i);
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', vx);
    line.setAttribute('x2', vx);
    line.setAttribute('y1', padding.t);
    line.setAttribute('y2', padding.t + (n*(barH+gap) - gap));
    line.setAttribute('stroke', 'rgba(255,255,255,0.03)');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    const label = document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('x', vx);
    label.setAttribute('y', padding.t - 12);
    label.setAttribute('text-anchor','middle');
    label.setAttribute('font-size','11');
    label.setAttribute('fill','#aaa');
    label.textContent = `${Math.round(val/1000)}k`;
    svg.appendChild(label);
  }

  // draw bars
  projects.forEach((d, i) => {
    const x = padding.l;
    const y = padding.t + i * (barH + gap);
    const w = (d.xp / maxXP) * chartW;

    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', barH);
    rect.setAttribute('rx', 6);
    rect.setAttribute('fill', `hsl(${(i * 42) % 360} 70% 50%)`);
    svg.appendChild(rect);

    const v = document.createElementNS('http://www.w3.org/2000/svg','text');
    v.setAttribute('x', x + w + 10);
    v.setAttribute('y', y + barH / 2 + 4);
    v.setAttribute('font-size','12');
    v.setAttribute('fill','#fff');
    v.textContent = `${Math.round(d.xp/1000)}k`;
    svg.appendChild(v);

    const name = document.createElementNS('http://www.w3.org/2000/svg','text');
    name.setAttribute('x', padding.l - 12);
    name.setAttribute('y', y + barH / 2 + 4);
    name.setAttribute('text-anchor','end');
    name.setAttribute('font-size','12');
    name.setAttribute('fill','#ddd');
    let disp = d.name;
    if (disp.length > 36) disp = disp.slice(0, 33) + '…';
    name.textContent = disp;
    svg.appendChild(name);

    // tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent = `${d.name}: ${d.xp} XP`;
    rect.appendChild(title);
  });

  // baseline
  const xline = document.createElementNS('http://www.w3.org/2000/svg','line');
  xline.setAttribute('x1', padding.l);
  xline.setAttribute('y1', padding.t + (n*(barH+gap) - gap) + 8);
  xline.setAttribute('x2', padding.l + chartW);
  xline.setAttribute('y2', padding.t + (n*(barH+gap) - gap) + 8);
  xline.setAttribute('stroke', '#444');
  xline.setAttribute('stroke-width', '1');
  svg.appendChild(xline);

  // CHANGED: ensure container can scroll vertically when lots of items
  const scrollWrap = document.querySelector('.chart-scroll');
  if (scrollWrap) {
    scrollWrap.style.maxHeight = '520px';
    scrollWrap.style.overflowY = (chartH > 520 ? 'auto' : 'hidden');
  }
}

// -----------------------------
// Initialize all
// -----------------------------
function initProfileView() {
  renderLatestAuditsFromStorage(); // CHANGED order: render audits first
  drawXPDonut();
  drawAuditPie();
  drawXPByProject();
}

initProfileView();
