// profile.js

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

// --- Logout button ---
document.getElementById('logout').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'index.html';
});

// 🟢 Donut Chart for XP Composition
function drawXPDonut() {
  const data = [
    { label: 'Projects', value: totals.projects || 0, color: '#4CAF50' },
    { label: 'Checkpoints', value: totals.checkpoints || 0, color: '#FF9800' },
    { label: 'Piscine JS', value: totals.piscineJs || 0, color: '#2196F3' },
  ];

  const size = 200;
  const radius = size / 2;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);

  let startAngle = 0;
  data.forEach(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = radius + radius * Math.sin(startAngle);
    const y1 = radius - radius * Math.cos(startAngle);
    const x2 = radius + radius * Math.sin(startAngle + angle);
    const y2 = radius - radius * Math.cos(startAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const dPath = `
      M ${radius} ${radius}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      Z
    `;
    path.setAttribute('d', dPath);
    path.setAttribute('fill', d.color);
    svg.appendChild(path);

    startAngle += angle;
  });

  document.getElementById('xp-donut').appendChild(svg);
}

// 🟢 Audit Ratio Pie
function drawAuditPie() {
  const done = parseFloat(localStorage.getItem('auditDone') || 0);
  const received = parseFloat(localStorage.getItem('auditReceived') || 0);
  const ratio = parseFloat(localStorage.getItem('auditRatio') || 1);

  const total = done + received;
  const doneAngle = (done / total) * 360;
  const receivedAngle = (received / total) * 360;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', 200);
  svg.setAttribute('height', 200);

  const circleBase = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circleBase.setAttribute('r', 80);
  circleBase.setAttribute('cx', 100);
  circleBase.setAttribute('cy', 100);
  circleBase.setAttribute('fill', '#ddd');
  svg.appendChild(circleBase);

  const circleDone = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circleDone.setAttribute('r', 80);
  circleDone.setAttribute('cx', 100);
  circleDone.setAttribute('cy', 100);
  circleDone.setAttribute('fill', 'transparent');
  circleDone.setAttribute('stroke', '#4CAF50');
  circleDone.setAttribute('stroke-width', 40);
  circleDone.setAttribute('stroke-dasharray', `${doneAngle * 2.51} 1000`);
  circleDone.setAttribute('transform', 'rotate(-90 100 100)');
  svg.appendChild(circleDone);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '50%');
  text.setAttribute('y', '50%');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-size', '20');
  text.textContent = `${ratio.toFixed(2)} Ratio`;
  svg.appendChild(text);

  document.getElementById('audit-pie').appendChild(svg);

  document.getElementById('audit-stats').innerHTML = `
    <p>Done: ${(done / 1000000).toFixed(2)} MB</p>
    <p>Received: ${(received / 1000000).toFixed(2)} MB</p>
  `;
}

// 🟢 XP by Project Bar Chart
function drawXPByProject() {
  const userXPData = JSON.parse(localStorage.getItem('userXPData') || '[]');

  // Group XP by project name
  const projectXP = {};
  userXPData.forEach(entry => {
    const name = entry.object?.name || 'Unknown';
    projectXP[name] = (projectXP[name] || 0) + entry.amount;
  });

  const projects = Object.entries(projectXP)
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10); // limit top 10

  const svgWidth = 500;
  const svgHeight = 250;
  const barWidth = 30;
  const gap = 15;
  const maxXP = Math.max(...projects.map(p => p.xp)) || 1;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', svgWidth);
  svg.setAttribute('height', svgHeight);

  projects.forEach((p, i) => {
    const barHeight = (p.xp / maxXP) * (svgHeight - 40);
    const x = 60 + i * (barWidth + gap);
    const y = svgHeight - barHeight - 20;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', `hsl(${i * 36}, 70%, 50%)`);
    svg.appendChild(rect);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x + barWidth / 2);
    label.setAttribute('y', svgHeight - 5);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '10');
    label.textContent = p.name;
    svg.appendChild(label);
  });

  document.getElementById('xp-bar').appendChild(svg);
}

// --- Draw charts ---
drawXPDonut();
drawAuditPie();
drawXPByProject();
