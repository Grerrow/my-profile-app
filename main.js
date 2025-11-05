const proxyurl = 'https://my-profile-app-7zjs.onrender.com/proxy?url=';



///jwt
function decodeJWT(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return JSON.parse(atob(padded));
}

function isTokenValid(token) {
    if (!token) return false;
    try {
        const payload = decodeJWT(token);
        return payload.exp && payload.exp > Date.now() / 1000;
    } catch {
        return false;
    }
}

let token = localStorage.getItem('token');
if (!isTokenValid(token)) localStorage.removeItem('token');

// ---------------------------
async function fetchUserData() {
    let token = localStorage.getItem('token');
    if (!token) return;
    if (!isTokenValid(token)) return;

    const payload = decodeJWT(token);
    const userId = Number(payload.sub);

    const query = `
    {
      user {
        login
        firstName
        lastName
        email
      }
    }`;

    try {
        const response = await fetch(`${proxyurl}${encodeURIComponent('https://platform.zone01.gr/api/graphql-engine/v1/graphql')}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();
        if (response.ok && result.data) {
            localStorage.setItem('userData', JSON.stringify(result.data.user));
            console.log('User data fetched:', result.data.user);
        } else {
            console.error('GraphQL error:', result.errors);
            alert('Error fetching user data.');
        }
    } catch (err) {
        console.error('Fetch user data error:', err);
        alert('Network or server error while fetching profile.');
    }
}


async function fetchXpData(whereClause, storageKey) {
    let token = localStorage.getItem('token');
    if (!token) return;
    // token = token.replace(/^"|"$/g, ''); // 🟢 FIX: clean token
    if (!isTokenValid(token)) return;

    const query = `
    query {
        transaction(where: ${whereClause}, order_by: { createdAt: desc }) {
            path
            amount
            createdAt
            object {
                name
                type
            }
        }
    }`;

    try {
        const response = await fetch(`${proxyurl}${encodeURIComponent('https://platform.zone01.gr/api/graphql-engine/v1/graphql')}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();
        if (response.ok && result.data) {
            localStorage.setItem(storageKey, JSON.stringify(result.data.transaction));
            console.log(`${storageKey} saved:`, result.data.transaction);
        } else {
            console.error('GraphQL error:', result.errors);
            alert(`Error fetching ${storageKey}.`);
        }
    } catch (err) {
        console.error(`Fetch ${storageKey} error:`, err);
        alert(`Network or server error while fetching ${storageKey}.`);
    }
}


async function fetchUserProjectsXPData() {
    const where = `{
        _and: [
            { type: { _eq: "xp" } },
            { path: { _like: "/athens/div-01/%" } },
            { path: { _nlike: "/athens/div-01/checkpoint%" } },
            { path: { _nlike: "/athens/div-01/piscine-js%" } }
        ]
    }`;
    await fetchXpData(where, 'userXPData');
}

async function fetchUserCheckpointsXPData() {
    const where = `{
        _and: [
            { type: { _eq: "xp" } },
            { path: { _like: "/athens/div-01/checkpoint%" } }
        ]
    }`;
    await fetchXpData(where, 'userCheckpointsXPData');
}

async function fetchJSPiscineXPData() {
    const where = `{
        _and: [
            { type: { _eq: "xp" } },
            {
          _or: [
            { path: { _like: "/athens/div-01" } }
            { path: { _like: "/athens/div-01/piscine-js" } }
          ]
        }
        ]
    }`;
    await fetchXpData(where, 'jspiscineXPData');
}


function calculateTotalXP() {
    const projectsXp = JSON.parse(localStorage.getItem('userXPData') || '[]');
    const checkpointsXp = JSON.parse(localStorage.getItem('userCheckpointsXPData') || '[]');
    const piscineJsXp = JSON.parse(localStorage.getItem('jspiscineXPData') || '[]');

    const sumXp = (data) => data.reduce((sum, x) => sum + (x.amount || 0), 0);

    const totals = {
        projects: sumXp(projectsXp),
        checkpoints: sumXp(checkpointsXp),
        piscineJs: sumXp(piscineJsXp),
    };

    totals.total = totals.projects + totals.checkpoints + totals.piscineJs;

    console.table(totals);
    localStorage.setItem('totalXPStats', JSON.stringify(totals));

    return totals;
}

async function auditRatio() {
    let token = localStorage.getItem('token');
    if (!token) return;
    // token = token.replace(/^"|"$/g, ''); // 🟢 Clean token again just in case
    if (!isTokenValid(token)) return;


    const payload = decodeJWT(token);
    const userId = Number(payload.sub);

    const query = `
    query 
    {
        user(where: { id: { _eq: ${userId} } }) {
            auditRatio
            totalUp
            totalDown
            totalUpBonus
            audits(where: { grade: { _is_null: false } }) {
              grade
              auditor {
                id
          }
            }
          }
        }
          `;

    try {
        const response = await fetch(`${proxyurl}${encodeURIComponent('https://platform.zone01.gr/api/graphql-engine/v1/graphql')}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();
        if (response.ok && result.data && result.data.user.length > 0) {
            const ratio = result.data.user.auditRatio; 
            localStorage.setItem('auditRatio', result.data.user.auditRatio);
            localStorage.setItem('auditDone', result.data.user.totalUp);
            localStorage.setItem('auditReceived', result.data.user.totalDown);
            localStorage.setItem('auditUpBonus', result.data.user.totalUpBonus);
            localStorage.setItem('auditRecords', JSON.stringify(result.data.user.audits));
            console.log('Audit ratio fetched:', ratio);
        } else {
            console.error('GraphQL error:', result.errors);
        }
    } catch (err) {
        console.error('Fetch audit ratio data error:', err);
    }
}


async function initDashboard() {
    await fetchUserData();
    await fetchUserProjectsXPData();
    await fetchUserCheckpointsXPData();
    await fetchJSPiscineXPData();
    await auditRatio();
    calculateTotalXP();
}
