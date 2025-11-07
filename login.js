import { initDashboard, proxyurl } from "./main.js";

async function loginUser(event) {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const credentials = btoa(`${email}:${password}`);

    try {
        const response = await fetch(`${proxyurl}${encodeURIComponent('https://platform.zone01.gr/api/auth/signin')}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
            },
        });

        const text = (await response.text()).trim();
        console.log('🔐 Raw login response:', text);

        if (response.ok && text && text.length > 20) {
            // 🟢 FIX: Remove potential wrapping quotes from the token
            const cleanToken = text.replace(/^"|"$/g, '');

            // 🟢 FIX: Save cleaned token
            localStorage.setItem('token', cleanToken);

            console.log('✅ Stored clean token:', cleanToken);
            alert('✅ Login successful!');
            await initDashboard();
            window.location.href = 'profile.html';
        } else {
            alert('❌ Login failed: ' + (text || response.statusText));
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('Network or server error');
    }
}
// attach listener here (loginUser is available)
const form = document.getElementById("login-form");
if (form) form.addEventListener("submit", loginUser);
