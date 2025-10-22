const proxyurl = 'https://my-profile-8ycy23aer-grerrow-7699s-projects.vercel.app/api/proxy?url=';


async function loginUser(event) {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch(`${proxyurl}${encodeURIComponent('https://platform.zone01.gr/api/auth/signin')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } 
        catch { data = { message: text }; }

        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            alert('Login successful!');
            window.location.href = 'profile.html';
        } else {
            alert('Login failed: ' + (data.message || response.statusText));
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('Network or server error');
    }
}

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


const form = document.getElementById("login-form");
if (form) form.addEventListener("submit", loginUser);

const token = localStorage.getItem('token');
if (!isTokenValid(token)) localStorage.removeItem('token');

// ---------------------------
async function fetchUserData() {
    const token = localStorage.getItem('token');
    if (!isTokenValid(token)) return;

    const query = `
    {
      user (where: {id:{_eq: 672}}){
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
            // window.location.href = 'profile.html';
        } else {
            console.error('GraphQL error:', result.errors);
            alert('Error fetching user data.');
        }
    } catch (err) {
        console.error('Fetch user data error:', err);
        alert('Network or server error while fetching profile.');
    }
}

// ---------------------------
// 📝 FETCH XP DATA
// ---------------------------
async function fetchXpData(whereClause, storageKey) {
    const token = localStorage.getItem('token');
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

// 🎯 XP BY CATEGORY
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
            { path: { _like: "/athens/div-01/piscine-js%" } }
        ]
    }`;
    await fetchXpData(where, 'jspiscineXPData');
}

// ---------------------------
// 📊 CALCULATE TOTAL XP
// ---------------------------
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


async function initDashboard() {
    await fetchUserData();
    await fetchUserProjectsXPData();
    await fetchUserCheckpointsXPData();
    await fetchJSPiscineXPData();
    calculateTotalXP();
    window.location.href = 'profile.html';
}
