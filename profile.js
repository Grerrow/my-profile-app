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
  const auditsContainer = document.getElementById('audits-list');
  auditsContainer.innerHTML = '';

  if (!audits || audits.length === 0) {
    auditsContainer.textContent = 'No audits';
    return;
  }

  // show up to 5 latest audits (matches your query limit)
  audits.slice(0, 5).forEach(audit => {
    const auditElement = document.createElement('div');
    auditElement.classList.add('audit');

    // Extract group name safely
    const groupName = audit.group?.object?.name || 'Unknown';

    // Format the auditedAt date
    const dateStr = audit.auditedAt ? new Date(audit.auditedAt).toLocaleString() : '—';

    // Display grade, marking "Passed" if grade === 1
    const gradeDisplay = audit.grade === 1 ? 'Passed' : (audit.grade ?? '—');
    const gradeClass = audit.grade === 1 ? 'passed' : '';

    auditElement.innerHTML = `
      <div class="audit-card">
        <div class="audit-title">${groupName}</div>
        <div class="audit-meta">
          <span class="audit-date">${dateStr}</span>
          <span class="audit-grade ${gradeClass}">${gradeDisplay}</span>
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
// XP by Project Bar Chart
// -----------------------------
function drawXPByProject() {
  const userXPData = JSON.parse(localStorage.getItem('userXPData') || '[]');

  // Aggregate XP by project
  const agg = {};
  userXPData.forEach(tx => {
    const name = tx.object?.name || tx.path || 'Unknown';
    agg[name] = (agg[name] || 0) + (tx.amount || 0);
  });

  const projects = Object.entries(agg)
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp);

  const svg = document.getElementById('xp-bar');
  svg.innerHTML = '';

  const padding = { t: 40, r: 20, b: 40, l: 160 };
  const gap = 10;
  const minBarH = 24;
  const maxBarH = 48;
  const n = Math.max(1, projects.length);

  // compute bar height
  const barH = Math.max(minBarH, Math.min(maxBarH, Math.floor((400 - padding.t - padding.b - gap * (n-1)) / n)));
  const chartH = padding.t + padding.b + n * (barH + gap);
  const chartW = 1000; // increase width for comfortable horizontal bars / scrolling

  // set viewBox and explicit width so svg can be wider than container and scroll horizontally
  svg.setAttribute('viewBox', `0 0 ${chartW} ${chartH}`);
  svg.setAttribute('width', String(chartW));
  svg.setAttribute('height', String(chartH));
  svg.style.display = 'block';
  svg.setAttribute('preserveAspectRatio', 'xMinYMin');

  if (projects.length === 0) {
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', chartW/2);
    t.setAttribute('y', chartH/2);
    t.setAttribute('text-anchor','middle');
    t.setAttribute('fill','#777');
    t.textContent = 'No project XP';
    svg.appendChild(t);
    return;
  }

  const maxXP = Math.max(...projects.map(d => d.xp), 1);
  const chartWidth = chartW - padding.l - padding.r;

  // Draw bars horizontally
  projects.forEach((d, i) => {
    const y = padding.t + i * (barH + gap);
    const x = padding.l;
    const w = (d.xp / maxXP) * chartWidth;

    // bar rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', barH);
    rect.setAttribute('rx', 6);
    rect.setAttribute('fill', `hsl(${(i * 42) % 360} 70% 50%)`);
    svg.appendChild(rect);

    // XP label at end of bar
    const xpLabel = document.createElementNS('http://www.w3.org/2000/svg','text');
    xpLabel.setAttribute('x', x + w + 8);
    xpLabel.setAttribute('y', y + barH/2 + 4);
    xpLabel.setAttribute('class', 'xp-value');
    xpLabel.textContent = `${Math.round(d.xp/1000)}k`;
    svg.appendChild(xpLabel);

    // Project name on the left
    const nameLabel = document.createElementNS('http://www.w3.org/2000/svg','text');
    nameLabel.setAttribute('x', x - 12);
    nameLabel.setAttribute('y', y + barH/2 + 4);
    nameLabel.setAttribute('text-anchor','end');
    nameLabel.setAttribute('class','project-label');
    let disp = d.name;
    if(disp.length>20) disp = disp.slice(0,17)+'…';
    nameLabel.textContent = disp;
    svg.appendChild(nameLabel);

    // tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent = `${d.name}: ${d.xp} XP`;
    rect.appendChild(title);
  });

  // Draw baseline for X-axis
  const xline = document.createElementNS('http://www.w3.org/2000/svg','line');
  xline.setAttribute('x1', padding.l);
  xline.setAttribute('y1', chartH - padding.b + 4);
  xline.setAttribute('x2', chartW - padding.r);
  xline.setAttribute('y2', chartH - padding.b + 4);
  xline.setAttribute('stroke', '#444');
  xline.setAttribute('stroke-width', '1');
  svg.appendChild(xline);
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
