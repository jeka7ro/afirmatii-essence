const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://afirmatii-backend.onrender.com/api';

function showRegister() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('register-screen').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
}

async function login() {
    const username = document.getElementById('username').value;
    const pin = document.getElementById('pin').value;
    
    try {
        const res = await fetch(`${API_URL}/users/${username}`);
        const user = await res.json();
        
        if (user.pin === pin) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-screen').style.display = 'block';
            document.getElementById('affirmation-display').textContent = user.affirmation;
        } else {
            alert('PIN incorect');
        }
    } catch (e) {
        alert('Utilizator nu exista');
    }
}

async function register() {
    const data = {
        firstName: document.getElementById('reg-firstName').value,
        lastName: document.getElementById('reg-lastName').value,
        email: document.getElementById('reg-email').value,
        pin: document.getElementById('reg-pin').value,
        affirmation: document.getElementById('reg-affirmation').value
    };
    
    const username = document.getElementById('reg-username').value;
    
    try {
        const res = await fetch(`${API_URL}/users/${username}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        alert('Inregistrat cu succes!');
        showLogin();
    } catch (e) {
        alert('Eroare: ' + e.message);
    }
}

function logout() {
    document.getElementById('main-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
}
