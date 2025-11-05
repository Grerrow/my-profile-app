// --- Load user info ---
const userData = JSON.parse(localStorage.getItem('userData') || '[]');
if (userData.length > 0) {
  const user = userData[0];
  document.title = `Profile - ${user.login}`;
  document.getElementById('user-name').textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById('user-login').textContent = `@${user.login}`;
  document.getElementById('user-email').textContent = user.email || 'N/A';
}

// --- XP Totals ---
const totals = JSON.parse(localStorage.getItem('totalXPStats')) || {};
document.getElementById('total-xp').textContent = (totals.total || 0).toLocaleString();

// --- Logout ---
document.getElementById('logout').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'index.html';
});

//
// === XP Composition Donut ===
//
function drawXPDonut() {
  const data = [
    { label: 'Projects', value: totals.projects || 0, color: '#4CAF50' },
    { label: 'Checkpoints', value: totals.checkpoints || 0, color: '#FF9800' },
    { label: 'Piscine', value: totals.piscineJs || 0, color: '#2196F3' },
    { label: 'Bonuses', value: totals.bonus || 0, color: '#9C27B0' },
  ].filter(d => d.value > 0);

  const svg = document.getElementById('xp-donut');
  svg.innerHTML = '';
  const size = 300;
  const radius = 100;
  const cx = size / 2;
  const cy = size / 2;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  let startAngle = 0;
  data.forEach(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(startAngle + angle);
    const y2 = cy + radius * Math.sin(startAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`);
    path.setAttribute('fill', d.color);
    svg.appendChild(path);

    // Label mid-angle
    const midAngle = startAngle + angle / 2;
    const lx = cx + (radius + 40) * Math.cos(midAngle);
    const ly = cy + (radius + 40) * Math.sin(midAngle);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', lx);
    label.setAttribute('y', ly);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '14');
    label.setAttribute('fill', '#333');
    label.textContent = d.label;
    svg.appendChild(label);

    startAngle += angle;
  });
}

//
// === Audit Ratio Pie (Professional Look) ===
//
function drawAuditPie() {
  const done = parseFloat(localStorage.getItem('auditDone') || 0);
  const received = parseFloat(localStorage.getItem('auditReceived') || 0);
  const ratio = parseFloat(localStorage.getItem('auditRatio') || 0);
  const total = done + received;

  const svg = document.getElementById('audit-pie');
  svg.innerHTML = '';
  if (total === 0) return;

  const cx = 150, cy = 150, r = 100;
  const doneAngle = (done / total) * 2 * Math.PI;

  // Done slice
  const x1 = cx + r * Math.cos(0);
  const y1 = cy + r * Math.sin(0);
  const x2 = cx + r * Math.cos(doneAngle);
  const y2 = cy + r * Math.sin(doneAngle);
  const largeArcFlag = done > received ? 1 : 0;

  const pathDone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathDone.setAttribute('d', `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArcFlag},1 ${x2},${y2} Z`);
  pathDone.setAttribute('fill', '#4CAF50');
  svg.appendChild(pathDone);

  // Received slice
  const pathReceived = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathReceived.setAttribute('d', `M${cx},${cy} L${x2},${y2} A${r},${r} 0 ${largeArcFlag ? 0 : 1},1 ${x1},${y1} Z`);
  pathReceived.setAttribute('fill', '#F44336');
  svg.appendChild(pathReceived);

  // Labels
  const doneMid = doneAngle / 2;
  const recMid = doneAngle + (2 * Math.PI - doneAngle) / 2;

  const makeLabel = (text, angle, color) => {
    const tx = cx + (r * 0.6) * Math.cos(angle);
    const ty = cy + (r * 0.6) * Math.sin(angle);
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', tx);
    t.setAttribute('y', ty);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('font-size', '14');
    t.setAttribute('font-weight', 'bold');
    t.setAttribute('fill', '#fff');
    t.textContent = text;
    svg.appendChild(t);
  };
  makeLabel('Done', doneMid, '#4CAF50');
  makeLabel('Received', recMid, '#F44336');

  // Center text (ratio)
  const ratioText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ratioText.setAttribute('x', cx);
  ratioText.setAttribute('y', cy);
  ratioText.setAttribute('text-anchor', 'middle');
  ratioText.setAttribute('dominant-baseline', 'middle');
  ratioText.setAttribute('font-size', '20');
  ratioText.setAttribute('font-weight', 'bold');
  ratioText.setAttribute('fill', '#333');
  ratioText.textContent = `Ratio ${ratio.toFixed(2)}`;
  svg.appendChild(ratioText);

  document.getElementById('audit-stats').innerHTML = `
    <p>Done: ${(done / 1000000).toFixed(2)} MB</p>
    <p>Received: ${(received / 1000000).toFixed(2)} MB</p>
  `;
}

//
// === XP by Project Bar Chart ===
//
function drawXPByProject() {
  const userXPData = JSON.parse(localStorage.getItem('userXPData') || '[]');

  const projectXP = {};
  userXPData.forEach(entry => {
    const name = entry.object?.name || 'Unknown';
    projectXP[name] = (projectXP[name] || 0) + entry.amount;
  });

  const projects = Object.entries(projectXP)
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 12);

  const svg = document.getElementById('xp-bar');
  svg.innerHTML = '';

  const width = 600, height = 300, padding = 40;
  const barWidth = (width - padding * 2) / projects.length - 10;
  const maxXP = Math.max(...projects.map(p => p.xp));

  projects.forEach((p, i) => {
    const x = padding + i * (barWidth + 10);
    const barHeight = (p.xp / maxXP) * (height - 100);
    const y = height - barHeight - padding;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', `hsl(${(i * 40) % 360}, 70%, 55%)`);
    svg.appendChild(rect);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x + barWidth / 2);
    label.setAttribute('y', height - padding / 2);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '10');
    label.textContent = p.name;
    svg.appendChild(label);

    const value = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    value.setAttribute('x', x + barWidth / 2);
    value.setAttribute('y', y - 5);
    value.setAttribute('text-anchor', 'middle');
    value.setAttribute('font-size', '11');
    value.setAttribute('fill', '#333');
    value.textContent = `${(p.xp / 1000).toFixed(0)} KB`;
    svg.appendChild(value);
  });

  // X-axis line
  const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  axis.setAttribute('x1', padding - 10);
  axis.setAttribute('y1', height - padding);
  axis.setAttribute('x2', width - padding + 10);
  axis.setAttribute('y2', height - padding);
  axis.setAttribute('stroke', '#aaa');
  axis.setAttribute('stroke-width', '2');
  svg.appendChild(axis);
}

// --- Draw charts ---
drawXPDonut();
drawAuditPie();
drawXPByProject();
