// Colectie de afirmatii organizate pe categorii
const afirmatii = {
    all: [
        "Sunt capabil să realizez tot ce îmi propun.",
        "Încrederea în mine crește în fiecare zi.",
        "Merit succes, fericire și împlinire.",
        "Am puterea să transform visurile în realitate.",
        "Sunt o persoană de valoare și meriting.",
    ],
    personal: [
        "Dezvolt în mine cea mai bună versiune a mea zilnic.",
        "Sunt responsabil pentru fericirea mea.",
        "Accept și iubesc ceea ce sunt.",
        "Am curajul să ies din zona de confort.",
        "Învăț și cresc din fiecare experiență.",
        "Trăiesc momentul prezent și sunt recunoscător.",
    ],
    career: [
        "Atrag oportunități excelente în cariera mea.",
        "Munca mea este apreciată și recompensată corespunzător.",
        "Fac alegeri profesionale inteligente și eficiente.",
        "Sunt un lider inspirat și respectat.",
        "Creez valoare și impact prin munca mea.",
        "Succesul în carieră vine natural către mine.",
    ],
    health: [
        "Corpul meu este puternic și sănătos.",
        "Tratez corpul meu cu respect și îngrijire.",
        "Energia mea crește în fiecare zi.",
        "Sunt disciplinat în a menține un stil de viață sănătos.",
        "Mă simt viu și vital.",
        "Sănătatea mea este prioritatea mea.",
    ],
    relationships: [
        "Atrag relații pozitive și sănătoase în viața mea.",
        "Comunic cu claritate și empatie.",
        "Sunt recunoscător pentru oamenii din viața mea.",
        "Iubesc și sunt iubit necondiționat.",
        "Construiesc legături autentice și profunde.",
        "Relațiile mele sunt bazate pe respect reciproc.",
    ],
    confidence: [
        "Am încredere totală în abilitățile mele.",
        "Sunt sigur de mine și de valoarea mea.",
        "Emisiile mele pozitive sunt magnetice.",
        "Parada perfectă pentru orice situație.",
        "Încălzător și regăsesc în orice context.",
        "Încălzător și încrezător în prezentarea mea.",
    ]
};

// Statistici
let stats = {
    totalAfirmatii: 0,
    apreciate: 0,
    afirmațiiVazute: new Set(),
    afirmațiiApreciate: new Set(),
    customAffirmation: "Sunt capabil să realizez tot ce îmi propun.",
    challenge: {
        startDate: null,
        currentDay: 0,
        todayRepetitions: 0,
        lastDate: null,
        totalRepetitions: 0,
        todayRecords: [] // Array cu timestamp-uri pentru repetările de astăzi
    },
    autoMode: false
};

let autoInterval = null;
let notificationPermission = false;
let currentUser = null;
// Production API URL
const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ?
    'http://localhost:10000/api' :
    'https://essence-afirmatii-api.onrender.com/api';

// API Functions
async function apiCall(endpoint, method = 'GET', data = null) {
    const url = `${API_URL}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function getAllUsers() {
    return await apiCall('/users');
}

async function getCurrentUserData() {
    if (!currentUser) return null;
    return await apiCall(`/users/${currentUser}`);
}

async function saveCurrentUserData() {
    if (!currentUser) return;
    
    try {
        // Obține toate datele curente
        const userData = await getCurrentUserData();
        
        const data = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            pin: userData.pin,
            birthDate: userData.birthDate,
            phone: userData.phone,
            affirmation: stats.customAffirmation || userData.affirmation,
            avatar: userData.avatar,
            totalRepetitions: stats.challenge.totalRepetitions !== undefined ? stats.challenge.totalRepetitions : (userData.totalRepetitions || 0),
            currentDay: stats.challenge.currentDay !== undefined ? stats.challenge.currentDay : (userData.currentDay || 0),
            todayRepetitions: stats.challenge.todayRepetitions !== undefined ? stats.challenge.todayRepetitions : (userData.todayRepetitions || 0),
            lastDate: stats.challenge.lastDate || userData.lastDate || new Date().toDateString(),
            repetitionHistory: JSON.stringify(stats.challenge.todayRecords || [])
        };
        
        console.log('Saving to server - totalRepetitions:', data.totalRepetitions, 'todayRepetitions:', data.todayRepetitions, 'currentDay:', data.currentDay);
        
        await apiCall(`/users/${currentUser}`, 'PUT', data);
        console.log('User data saved to server:', data);
    } catch (error) {
        console.error('Error saving user data to server:', error);
    }
}

async function addRepetitionToServer(repetitionNum) {
    await apiCall('/repetition', 'POST', {
        username: currentUser,
        repetition: repetitionNum
    });
}

async function getActivities() {
    return await apiCall('/activities?limit=20');
}

async function getCommunityStats() {
    return await apiCall('/stats');
}

// Grupuri API
async function getAllGroups() {
    return await apiCall('/groups');
}

async function createGroup(name, description, startDate, endDate) {
    const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            name, 
            description,
            startDate,
            endDate,
            adminEmail: currentUserEmail,
            username: currentUser
        })
    });
    
    if (!response.ok) throw new Error(response.statusText);
    return await response.json();
}

async function joinGroup(groupId, code) {
    return await apiCall(`/groups/${groupId}/join`, 'POST', {
        username: currentUser,
        code: code
    });
}

async function getUserGroups() {
    return await apiCall(`/users/${currentUser}/groups`);
}

let currentUserEmail = null;

async function getMessages() {
    try {
        return await apiCall(`/users/${currentUser}/direct`);
    } catch (error) {
        console.error('Error getting messages:', error);
        return [];
    }
}

async function sendMessage(message) {
    // Send to "community" for now
    try {
        return await apiCall('/messages', 'POST', {
            sender: currentUser,
            recipient: 'community',
            group_id: null,
            message: message,
            type: 'direct'
        });
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

// Salvează în localStorage
function saveStats() {
    if (currentUser) {
        saveCurrentUserData();
    } else {
        const toSave = {
            ...stats,
            afirmațiiVazute: stats.afirmatiiVazute ? Array.from(stats.afirmatiiVazute) : [],
            afirmațiiApreciate: stats.afirmatiiApreciate ? Array.from(stats.afirmatiiApreciate) : [],
            challenge: stats.challenge || {}
        };
        localStorage.setItem('stats', JSON.stringify(toSave));
    }
}

// NU ÎNCĂRCA DIN LOCALSTORAGE - DOAR DACĂ NU EXISTĂ USER LOGAT
function loadStats() {
    if (!currentUser) {
        const saved = localStorage.getItem('stats');
        if (saved) {
            const parsed = JSON.parse(saved);
            stats.afirmatiiVazute = new Set(parsed.afirmatiiVazute || []);
            stats.afirmatiiApreciate = new Set(parsed.afirmatiiApreciate || []);
            stats.totalAfirmatii = parsed.totalAfirmatii || 0;
            stats.apreciate = parsed.apreciate || 0;
            stats.customAffirmation = parsed.customAffirmation || "Sunt capabil să realizez tot ce îmi propun.";
            
            if (parsed.challenge) {
                stats.challenge = {
                    ...parsed.challenge,
                    todayRecords: parsed.challenge.todayRecords || []
                };
                checkDayProgress();
            }
            
            updateStats();
            updateChallengeDisplay();
            loadCustomAffirmation();
        } else {
            // Initializează provocarea dacă nu există
            startChallenge();
        }
    }
    // Dacă există user logat, datele se încarcă din loadUserData()
}

// Inițializează provocarea de 30 de zile
function startChallenge() {
    if (!stats.challenge.startDate) {
        stats.challenge.startDate = new Date().toISOString();
        stats.challenge.currentDay = 0;
        stats.challenge.todayRepetitions = 0;
        stats.challenge.lastDate = new Date().toDateString();
        saveStats();
    }
}

// Verifică progresul zilnic
function checkDayProgress() {
    const today = new Date().toDateString();
    const lastDate = stats.challenge.lastDate;
    
    // NU reseta repetările în funcție de zi, păstrează-le așa cum sunt salvate
    // Doar dacă lastDate lipsește, setează-l
    if (!lastDate) {
        // Prima dată când rulează
        stats.challenge.lastDate = today;
        saveStats();
    }
}

// Actualizează statisticile vizuale
function updateStats() {
    const totalCountEl = document.getElementById('total-count');
    const likedCountEl = document.getElementById('liked-count');
    
    if (totalCountEl) totalCountEl.textContent = stats.totalAfirmatii || 0;
    if (likedCountEl) likedCountEl.textContent = stats.apreciate || 0;
}

// Actualizează afișarea provocării
function updateChallengeDisplay() {
    // Always update, don't check if screen is visible
    console.log('updateChallengeDisplay called with:', stats.challenge);
    
    // Asigură-te că challenge există și are toate proprietățile necesare
    if (!stats.challenge) {
        stats.challenge = {
            startDate: new Date().toISOString(),
            currentDay: 0,
            todayRepetitions: 0,
            lastDate: new Date().toDateString(),
            totalRepetitions: 0,
            todayRecords: []
        };
    }
    
    const daysLeft = Math.max(0, 30 - (stats.challenge.currentDay || 0));
    const currentReps = stats.challenge.todayRepetitions || 0;
    const targetReps = 100;
    
    console.log('Current reps:', currentReps, 'Target:', targetReps);
    
    // Progres zile
    const daysProgress = (stats.challenge.currentDay / 30) * 100;
    const dayProgressEl = document.getElementById('day-progress');
    if (dayProgressEl) {
        dayProgressEl.textContent = `${stats.challenge.currentDay}/30`;
        console.log('Updated day progress:', dayProgressEl.textContent);
    }
    
    const daysProgressBarEl = document.getElementById('days-progress-bar');
    if (daysProgressBarEl) daysProgressBarEl.style.width = daysProgress + '%';
    
    const daysRemainingEl = document.getElementById('days-remaining');
    if (daysRemainingEl) {
        if (stats.challenge.currentDay >= 30) {
            daysRemainingEl.textContent = '✅ Provocare completă!';
            daysRemainingEl.style.color = '#28a745';
        } else {
            daysRemainingEl.textContent = `${daysLeft} zile rămase`;
        }
    }
    
    // Afișează timp până la expirare
    const timeRemainingEl = document.getElementById('time-remaining-display');
    if (timeRemainingEl && stats.challenge.startDate) {
        const startDate = new Date(stats.challenge.startDate);
        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 30);
        const now = new Date();
        const diffTime = expiryDate - now;
        
        if (diffTime > 0) {
            const daysRemain = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const hoursRemain = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            timeRemainingEl.textContent = `${daysRemain} zile rămase`;
            
            // Calcul: cât ar trebui să faci pe oră pentru a ajunge la 100/zi
            const totalRepsNeeded = 100 * (30 - stats.challenge.currentDay);
            const hoursRemaining = (daysRemain * 24) + hoursRemain;
            const repsPerHourNeeded = hoursRemaining > 0 ? Math.ceil(totalRepsNeeded / hoursRemaining) : 0;
            
            console.log('Total reps needed:', totalRepsNeeded, 'Hours remaining:', hoursRemaining, 'Reps/hour needed:', repsPerHourNeeded);
            
            // Salvează pentru afișare mai jos
            window.currentRepsPerHourNeeded = repsPerHourNeeded;
        } else {
            timeRemainingEl.textContent = 'Provocarea a expirat';
        }
    } else if (timeRemainingEl && !stats.challenge.startDate) {
        timeRemainingEl.textContent = 'Începe provocarea pentru a vedea timpul rămas';
    }
    
    // Progres repetări
    const repsProgress = (currentReps / targetReps) * 100;
    const repsTodayEl = document.getElementById('repetitions-today');
    if (repsTodayEl) {
        repsTodayEl.textContent = `${currentReps}/${targetReps}`;
        console.log('Updated repetitions today:', repsTodayEl.textContent);
        console.log('DEBUG: currentReps =', currentReps, 'stats.challenge.todayRepetitions =', stats.challenge.todayRepetitions);
        
        // Calcul: ore rămase astăzi (până la sfârșitul zilei)
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const hoursLeftToday = Math.max(0, Math.floor((endOfDay - now) / (1000 * 60 * 60)));
        
        // Afișează repetările necesare pe oră și orele rămase astăzi
        const repsPerHourEl = document.getElementById('reps-per-hour-needed');
        if (repsPerHourEl) {
            const repsLeft = targetReps - currentReps;
            const repsPerHourNeeded = hoursLeftToday > 0 && repsLeft > 0 ? Math.ceil(repsLeft / hoursLeftToday) : 0;
            repsPerHourEl.textContent = `${hoursLeftToday}h rămase (${repsPerHourNeeded} repetări/oră)`;
        }
    } else {
        console.error('repetitions-today element not found!');
    }
    
    const repsProgressBarEl = document.getElementById('repetitions-progress-bar');
    if (repsProgressBarEl) {
        repsProgressBarEl.style.width = repsProgress + '%';
        console.log('Updated progress bar width:', repsProgress + '%');
        
        // Schimbă culoarea progresului repetărilor
        if (currentReps >= targetReps) {
            repsProgressBarEl.style.background = '#34a853';
        } else {
            repsProgressBarEl.style.background = '#34a853';
        }
    } else {
        console.error('repetitions-progress-bar element not found!');
    }
    
    // Afișează ultimele repetări
    displayRecentRepetitions();
}

// Afișează ultimele repetări
function displayRecentRepetitions() {
    const list = document.getElementById('repetitions-list');
    if (!list) {
        console.log('repetitions-list not found');
        return;
    }
    
    const records = stats.challenge.todayRecords || [];
    
    if (records.length === 0) {
        list.innerHTML = '<p style="color: #888; font-style: italic;">Nicio repetare înregistrată astăzi</p>';
        return;
    }
    
    // Afișează ultimele 10 repetări
    const recentRecords = records.slice(-10).reverse();
    
    list.innerHTML = recentRecords.map((record, index) => {
        const date = new Date(record.timestamp);
        const time = date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' });
        
        return `
            <div class="repetition-item">
                <span class="repetition-count">#${records.length - recentRecords.length + index + 1}</span>
                <span class="repetition-time">${time} - ${dateStr}</span>
            </div>
        `;
    }).join('');
}

// Auto-resize textarea function
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = 'auto';
    const computed = window.getComputedStyle(textarea);
    const height = parseInt(computed.getPropertyValue('border-top-width'), 10)
                 + parseInt(computed.getPropertyValue('padding-top'), 10)
                 + textarea.scrollHeight
                 + parseInt(computed.getPropertyValue('padding-bottom'), 10)
                 + parseInt(computed.getPropertyValue('border-bottom-width'), 10);
    textarea.style.height = Math.max(150, height + 10) + 'px';
    textarea.style.overflow = 'visible';
}

// Salvează afirmația custom
async function saveCustomAffirmation() {
    const affirmationEl = document.getElementById('affirmation-text');
    if (affirmationEl) {
        stats.customAffirmation = affirmationEl.value;
        saveStats();
        
    // Salvează și pe server
    await saveCurrentUserData();
        
        // Feedback vizual
        const btn = document.getElementById('save-affirmation-btn');
        if (btn) {
            btn.textContent = 'Salvat!';
            setTimeout(() => {
                btn.textContent = 'Salvează Afirmația';
            }, 2000);
        }
    }
}

// Încarcă afirmația custom
function loadCustomAffirmation() {
    const affirmationEl = document.getElementById('affirmation-text');
    if (stats.customAffirmation && affirmationEl) {
        affirmationEl.value = stats.customAffirmation;
    }
}

// Event listeners
document.getElementById('save-affirmation-btn').addEventListener('click', () => {
    saveCustomAffirmation();
});

// Adaugă repetare - attach when ready
function attachRepeatButton() {
    const repeatBtn = document.getElementById('repeat-btn');
    if (repeatBtn && !repeatBtn.hasAttribute('data-listener-attached')) {
        repeatBtn.setAttribute('data-listener-attached', 'true');
        repeatBtn.addEventListener('click', async () => {
            console.log('Am repetat button clicked!');
            await addRepetition();
        });
        console.log('Repeat button listener attached successfully');
    } else if (!repeatBtn) {
        console.error('repeat-btn element not found!');
    }
}

// Toggle history button
document.getElementById('toggle-history-btn').addEventListener('click', function() {
    const historyDiv = document.getElementById('recent-repetitions-history');
    const isVisible = historyDiv.style.display !== 'none';
    
    if (isVisible) {
        historyDiv.style.display = 'none';
        this.textContent = '📜 Istoric';
        this.style.transform = 'rotate(0deg)';
    } else {
        historyDiv.style.display = 'block';
        this.textContent = '📜 Ascunde';
        this.style.transform = 'rotate(180deg)';
        displayRepetitionsHistory();
        updateChallengeCalendar();
    }
});

function displayRepetitionsHistory() {
    const records = stats.challenge?.todayRecords || [];
    const historyList = document.getElementById('repetitions-list');
    
    if (!historyList) return;
    
    if (records.length === 0) {
        historyList.innerHTML = '<p style="color: #888; font-style: italic; padding: 10px;">Nicio repetare înregistrată astăzi.</p>';
        return;
    }
    
    const sortedRecords = records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    historyList.innerHTML = sortedRecords.map(record => {
        const date = new Date(record.timestamp);
        return `
            <div class="repetition-item">
                <span>Repetare #${record.repetition}</span>
                <span style="color: #888; font-size: 0.9em;">
                    ${date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
            </div>
        `;
    }).join('');
    
    // Update calendar after displaying history
    updateChallengeCalendar();
}

function updateChallengeCalendar() {
    const calendarEl = document.getElementById('challenge-calendar');
    if (!calendarEl) return;
    
    // Get start date or use today
    const startDate = stats.challenge?.startDate ? new Date(stats.challenge.startDate) : new Date();
    const currentDay = stats.challenge?.currentDay || 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let calendarHTML = '';
    
    // Generate 30 day cells
    for (let i = 0; i < 30; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + i);
        dayDate.setHours(0, 0, 0, 0);
        
        const isCompleted = i < currentDay && stats.challenge?.todayRepetitions >= 100;
        const isToday = dayDate.getTime() === today.getTime();
        const isPast = dayDate < today && !isCompleted;
        const isFuture = dayDate > today;
        
        let classes = 'day-cell';
        if (isCompleted) classes += ' completed';
        if (isToday) classes += ' today';
        if (isFuture) classes += ' future';
        
        calendarHTML += `
            <div class="${classes}" title="Ziua ${i + 1}">
                <div class="day-number">${i + 1}</div>
                <div class="day-status">${isCompleted ? '✓' : isToday ? 'azi' : ''}</div>
            </div>
        `;
    }
    
    calendarEl.innerHTML = calendarHTML;
}

async function addRepetition() {
    console.log('addRepetition called, stats:', stats);
    console.log('todayRepetitions before:', stats.challenge.todayRepetitions);
    
    if (stats.challenge.todayRepetitions < 100) {
        stats.challenge.todayRepetitions++;
        stats.challenge.totalRepetitions++;
        console.log('todayRepetitions after:', stats.challenge.todayRepetitions);
        
        // Adaugă înregistrare cu timestamp
        if (!stats.challenge.todayRecords) {
            stats.challenge.todayRecords = [];
        }
        stats.challenge.todayRecords.push({
            timestamp: new Date().toISOString(),
            repetition: stats.challenge.todayRepetitions
        });
        
        try {
            await saveCurrentUserData();
            await addRepetitionToServer(stats.challenge.todayRepetitions);
            await updateCommunityStats();
        } catch (error) {
            console.error('Error saving repetition:', error);
        }
        
        console.log('Calling updateChallengeDisplay...');
        updateChallengeDisplay();
        
        // Animație buton
        const btn = document.getElementById('repeat-btn');
        if (btn) {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = 'scale(1)';
            }, 100);
        }
        
        // Confirmare vizuală
        const confirmation = document.createElement('div');
        confirmation.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 15px 25px; border-radius: 10px; z-index: 1000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
        confirmation.textContent = `✅ Repetarea #${stats.challenge.todayRepetitions} înregistrată!`;
        document.body.appendChild(confirmation);
        
        setTimeout(() => {
            confirmation.style.opacity = '0';
            confirmation.style.transition = 'opacity 0.5s';
            setTimeout(() => document.body.removeChild(confirmation), 500);
        }, 2000);
        
        // Dacă s-a atins 100, afișează mesaj
        if (stats.challenge.todayRepetitions === 100) {
            setTimeout(() => {
                updateCommunityStats();
                console.log('🎉 Felicitări! Ai completat 100 de repetări astăzi!');
            }, 300);
        }
    } else {
        showStatusMessage('Ai atins deja targetul zilnic de 100 repetări!', 'error');
    }
}

document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Ești sigur că vrei să resetezi toată provocarea? Toate datele vor fi șterse.')) {
        stats.afirmatiiVazute.clear();
        stats.afirmatiiApreciate.clear();
        stats.totalAfirmatii = 0;
        stats.apreciate = 0;
        stats.challenge = {
            startDate: null,
            currentDay: 0,
            todayRepetitions: 0,
            lastDate: null,
            totalRepetitions: 0,
            todayRecords: []
        };
        
        if (stats.autoMode) stopAutoMode();
        startChallenge();
        saveStats();
        updateStats();
        updateChallengeDisplay();
    }
});

// Initializează reminder-ul
function initReminder() {
    const saved = localStorage.getItem('reminder');
    if (saved) {
        const reminderData = JSON.parse(saved);
        
        if (reminderData.enabled) {
            document.getElementById('reminder-checkbox').checked = true;
            document.getElementById('reminder-date').value = reminderData.date;
            document.getElementById('reminder-time').value = reminderData.time;
            document.getElementById('reminder-controls').classList.add('active');
            updateReminderStatus();
        }
    }
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            notificationPermission = permission === 'granted';
        });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        notificationPermission = true;
    }
    
    // Verifică la fiecare minut dacă e timpul pentru reminder
    setInterval(checkReminder, 60000);
}

function checkReminder() {
    const saved = localStorage.getItem('reminder');
    if (!saved) return;
    
    const reminderData = JSON.parse(saved);
    if (!reminderData.enabled) return;
    
    const now = new Date();
    const reminderDateTime = new Date(`${reminderData.date}T${reminderData.time}`);
    
    // Verifică dacă e timpul pentru reminder (în interval de 1 minut)
    const diff = Math.abs(now - reminderDateTime);
    if (diff < 60000 && reminderData.lastNotification !== now.toDateString()) {
        showReminderNotification();
        reminderData.lastNotification = now.toDateString();
        localStorage.setItem('reminder', JSON.stringify(reminderData));
    }
}

function showReminderNotification() {
    if (notificationPermission && 'Notification' in window) {
        new Notification('🔔 Reminder Afirmații', {
            body: 'Este timpul să repeți afirmatia ta! Tu o poți face! 💪',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="40">✨</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23667eea"/></svg>'
        });
    }
}

function updateReminderStatus() {
    const checkbox = document.getElementById('reminder-checkbox');
    const date = document.getElementById('reminder-date').value;
    const time = document.getElementById('reminder-time').value;
    const status = document.getElementById('reminder-status');
    
    if (checkbox.checked && date && time) {
        const now = new Date();
        const reminderDateTime = new Date(`${date}T${time}`);
        const diff = reminderDateTime - now;
        
        if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            status.textContent = `⏰ Reminder activ: în ${hours}h ${minutes}m`;
            status.className = 'reminder-status active';
        } else {
            status.textContent = '⚠️ Data/ora selectate sunt în trecut';
            status.className = 'reminder-status inactive';
        }
    } else {
        status.textContent = '⏸️ Reminder inactivat';
        status.className = 'reminder-status inactive';
    }
}

// Event listeners pentru reminder
document.getElementById('reminder-checkbox').addEventListener('change', (e) => {
    const controls = document.getElementById('reminder-controls');
    if (e.target.checked) {
        controls.classList.add('active');
        
        // Setează date default: azi
        if (!document.getElementById('reminder-date').value) {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('reminder-date').value = today;
        }
        
        // Setează ora default: acum + 1 oră
        if (!document.getElementById('reminder-time').value) {
            const now = new Date();
            now.setHours(now.getHours() + 1);
            const timeString = now.toTimeString().slice(0, 5);
            document.getElementById('reminder-time').value = timeString;
        }
    } else {
        controls.classList.remove('active');
        document.getElementById('reminder-status').textContent = '⏸️ Reminder inactivat';
        document.getElementById('reminder-status').className = 'reminder-status inactive';
        
        // Șterge reminder-ul din localStorage
        localStorage.removeItem('reminder');
    }
    
    saveReminder();
});

document.getElementById('reminder-date').addEventListener('change', () => {
    saveReminder();
    updateReminderStatus();
});

document.getElementById('reminder-time').addEventListener('change', () => {
    saveReminder();
    updateReminderStatus();
});

function saveReminder() {
    const checkbox = document.getElementById('reminder-checkbox');
    const date = document.getElementById('reminder-date').value;
    const time = document.getElementById('reminder-time').value;
    
    const reminderData = {
        enabled: checkbox.checked,
        date: date,
        time: time,
        lastNotification: null
    };
    
    localStorage.setItem('reminder', JSON.stringify(reminderData));
}

// Initializează utilizatorul
async function initUserSession() {
    currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            await loadUserData();
            showMainScreen();
        } catch (error) {
            console.error('Error loading user data:', error);
            // Dacă nu poate încărca (user nu există), curăță și afișează login screen
            localStorage.removeItem('currentUser');
            currentUser = null;
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
    await updateUsersList();
}

async function loadUserData() {
    const userData = await getCurrentUserData();
    if (userData) {
        // AFIRMAȚIA RĂMÂNE PERMANENT - ÎNCARCĂ ÎNTOTDEAUNA DIN SERVER
        stats.customAffirmation = userData.affirmation || "Sunt capabil să realizez tot ce îmi propun.";
        currentUserEmail = userData.email || '';
        console.log('Current user email set to:', currentUserEmail);
        console.log('LOADED AFFIRMATION FROM SERVER:', stats.customAffirmation);
        
        // FOLOSEȘTE DOAR DATELE DE PE SERVER - IGNORĂ COMPLET LOCALSTORAGE
        stats.challenge = {
            startDate: userData.challenge_start_date || userData.createdAt || new Date().toISOString(),
            currentDay: userData.current_day || 0,
            todayRepetitions: userData.today_repetitions || 0,
            lastDate: userData.last_date || new Date().toDateString(),
            totalRepetitions: userData.total_repetitions || 0,
            todayRecords: []
        };
        
        console.log('SERVER DATA:', userData.today_repetitions, userData.total_repetitions);
        console.log('STATS CHALLENGE:', stats.challenge);
        
        // Actualizează avatarul în UI (doar dacă elementul există)
        const avatarEl = document.getElementById('current-user-avatar');
        if (userData.avatar && avatarEl) {
            avatarEl.textContent = userData.avatar;
        }
        
        // Verifică dacă e admin sau super admin și arată butonul (doar dacă elementul există)
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            if (userData.role === 'admin' || userData.role === 'super_admin') {
                adminBtn.style.display = 'block';
            } else {
                adminBtn.style.display = 'none';
            }
        }
        
        // AFIRMAȚIA SE ÎNCARCĂ ÎNTOTDEAUNA DIN SERVER
        const affirmationEl = document.getElementById('affirmation-text');
        if (affirmationEl) {
            affirmationEl.value = stats.customAffirmation;
            console.log('AFFIRMATION SET IN UI:', stats.customAffirmation);
            
            // Auto-resize textarea based on content
            autoResizeTextarea(affirmationEl);
            
            // Add event listener for auto-resize while typing
            affirmationEl.addEventListener('input', function() {
                autoResizeTextarea(this);
            });
        }
        
        updateStats();
        updateChallengeDisplay();
    }
}

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('main-screen').style.display = 'none';
}

function showMainScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    
    const currentUserEl = document.getElementById('current-user');
    if (currentUserEl) {
        currentUserEl.textContent = currentUser;
    }
    
    // Attach repeat button listener
    attachRepeatButton();
}

async function loginUser(username) {
    username = username.trim();
    
    if (!username) {
        showStatusMessage('Te rog introdu un username!', 'error');
        return;
    }
    
    try {
        const userData = await apiCall(`/users/${username}`, 'GET');
        
        // Login direct cu PIN-ul din câmp
        const enteredPin = document.getElementById('login-pin').value;
        
        if (enteredPin === userData.pin) {
            // Login success
            currentUser = username;
            localStorage.setItem('currentUser', username);
            await loadUserData();
            showMainScreen();
            await updateCommunityStats();
        } else {
            showStatusMessage('PIN incorect!', 'error');
        }
    } catch (error) {
        if (error.message.includes('404')) {
            showStatusMessage('Utilizatorul nu există! Te rog să te înregistrezi mai întâi.', 'error');
        } else {
            showStatusMessage('Eroare la conectare. Verifică dacă serverul rulează.', 'error');
            console.error(error);
        }
    }
}

// PIN modal removed - using direct login with PIN field

// Helper function to show status messages
function showStatusMessage(message, type) {
    const statusDiv = document.getElementById('login-status-message');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 5000);
    }
}

async function quickLogin(username) {
    // Login rapid fără PIN pentru utilizatori autentificați
    username = username.trim();
    console.log('Quick login initiated for:', username);
    
    if (!username) return;
    
    try {
        const userData = await apiCall(`/users/${username}`, 'GET');
        console.log('User data loaded:', userData);
        
        currentUser = username;
        localStorage.setItem('currentUser', username);
        console.log('Loading user data...');
        await loadUserData();
        console.log('Showing main screen...');
        showMainScreen();
        await updateCommunityStats();
        console.log('Quick login successful!');
    } catch (error) {
        console.error('Error in quick login:', error);
        alert('Eroare la login: ' + error);
        // Dacă eșuează, cere PIN
        loginUser(username);
    }
}

function logout() {
    stopChatPolling();
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLoginScreen();
    updateUsersList(); // Reîncarcă lista fără highlight
}

async function updateUsersList() {
    const users = await getAllUsers();
    const usersList = document.getElementById('users-list');
    const hintParagraph = document.getElementById('login-hint');
    const noteParagraph = document.getElementById('login-note');
    
    // Ascunde dacă nu există utilizatori
    if (users.length === 0) {
        usersList.innerHTML = '';
        if (hintParagraph) hintParagraph.style.display = 'none';
        if (noteParagraph) noteParagraph.style.display = 'none';
        if (usersList) usersList.style.display = 'none';
        return;
    }
    
    // Arată dacă există utilizatori
    if (hintParagraph) hintParagraph.style.display = 'block';
    if (noteParagraph) noteParagraph.style.display = 'block';
    if (usersList) usersList.style.display = 'grid';
    
    usersList.innerHTML = '';
    
    // Obține avatarele pentru toți utilizatorii
    const usersWithAvatars = await Promise.all(
        users.map(async user => {
            try {
                const userData = await apiCall(`/users/${user.username}`, 'GET');
                return { ...user, avatar: userData.avatar || '👤' };
            } catch {
                return { ...user, avatar: '👤' };
            }
        })
    );
    
    usersWithAvatars.sort((a, b) => a.username.localeCompare(b.username));
    
    usersWithAvatars.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        // Highlight user curent
        const isCurrentUser = user.username === localStorage.getItem('currentUser');
        if (isCurrentUser) {
            userItem.style.border = '2px solid #667eea';
            userItem.style.backgroundColor = '#e3f2fd';
        }
        
        userItem.innerHTML = `
            <div style="font-size: 2em; margin-bottom: 5px;">${user.avatar}</div>
            <div style="font-weight: 600;">${user.username} ${isCurrentUser ? '✓' : ''}</div>
            <div style="font-size: 0.8em; color: #888;">${user.total_repetitions || 0} repetări</div>
        `;
        userItem.addEventListener('click', () => {
            if (isCurrentUser) {
                // User curent - login direct
                quickLogin(user.username);
            } else {
                // Alt utilizator - cere PIN
                loginUser(user.username);
            }
        });
        usersList.appendChild(userItem);
    });
}

async function updateCommunityStats() {
    try {
        const stats = await getCommunityStats();
        // Dacă există cel puțin 1 utilizator logat, afișează minim 1 utilizator activ
        const activeUsers = stats.activeUsers > 0 ? stats.activeUsers : (currentUser ? 1 : 0);
        document.getElementById('community-active').textContent = activeUsers;
        document.getElementById('community-total').textContent = stats.totalRepetitions;
    } catch (error) {
        console.error('Error updating community stats:', error);
        // Dacă eșuează, dar utilizatorul este logat, afișează 1
        if (currentUser) {
            document.getElementById('community-active').textContent = 1;
        }
    }
}

function showFeed() {
    const feedContainer = document.getElementById('feed-container');
    const isVisible = feedContainer.style.display !== 'none';
    
    feedContainer.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        updateFeed();
    }
}

async function updateFeed() {
    const activities = await getActivities();
    const feedContent = document.getElementById('feed-content');
    
    feedContent.innerHTML = activities.map(activity => {
        const date = new Date(activity.timestamp);
        const time = date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('ro-RO');
        
        return `
            <div class="feed-item">
                <div class="feed-user">${activity.user}</div>
                <div class="feed-message">${activity.message}</div>
                <div class="feed-time">${time} - ${dateStr}</div>
            </div>
        `;
    }).join('');
}

// Cancel register
document.getElementById('cancel-register-btn').addEventListener('click', () => {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
});

// Forgot PIN - check if elements exist
const forgotPinBtn = document.getElementById('forgot-pin-btn');
if (forgotPinBtn) {
    forgotPinBtn.addEventListener('click', () => {
        document.getElementById('forgot-pin-modal').classList.add('active');
    });
}

const closeForgotBtn = document.getElementById('close-forgot-btn');
if (closeForgotBtn) {
    closeForgotBtn.addEventListener('click', () => {
        document.getElementById('forgot-pin-modal').classList.remove('active');
    });
}

// Request reset
const resetPinBtn = document.getElementById('reset-pin-btn');
if (resetPinBtn) {
    resetPinBtn.addEventListener('click', async () => {
        const username = document.getElementById('forgot-username').value;
    const email = document.getElementById('forgot-email').value;
    const statusDiv = document.getElementById('reset-status');
    
    if (!username || !email) {
        statusDiv.textContent = '⚠️ Completează ambele câmpuri!';
        statusDiv.className = 'status-message error';
        return;
    }
    
    try {
        const result = await apiCall(`/users/${username}/reset-request`, 'POST', { email });
        statusDiv.textContent = result.message;
        statusDiv.className = 'status-message success';
        document.getElementById('reset-code-section').style.display = 'block';
    } catch (error) {
        statusDiv.textContent = '❌ ' + error.message;
        statusDiv.className = 'status-message error';
        }
    });
}

// Confirm reset
const confirmResetPinBtn = document.getElementById('confirm-reset-pin-btn');
if (confirmResetPinBtn) {
    confirmResetPinBtn.addEventListener('click', async () => {
        const username = document.getElementById('forgot-username').value;
        const resetCode = document.getElementById('reset-code').value;
        const newPin = document.getElementById('new-reset-pin').value;
        const statusDiv = document.getElementById('reset-status');
        
        if (!resetCode || !newPin) {
            statusDiv.textContent = '⚠️ Completează toate câmpurile!';
            statusDiv.className = 'status-message error';
            return;
        }
        
        if (!/^\d{4}$/.test(newPin)) {
            statusDiv.textContent = '❌ PIN-ul trebuie să fie format din 4 cifre!';
            statusDiv.className = 'status-message error';
            return;
        }
        
        try {
            const result = await apiCall(`/users/${username}/reset-confirm`, 'POST', {
                code: resetCode,
                newPin: newPin
            });
            
            statusDiv.textContent = '✅ ' + result.message;
            statusDiv.className = 'status-message success';
            
            setTimeout(() => {
                document.getElementById('forgot-pin-modal').classList.remove('active');
                showStatusMessage('PIN resetat cu succes! Te poți conecta acum.', 'success');
            }, 2000);
        } catch (error) {
            statusDiv.textContent = '❌ ' + error.message;
            statusDiv.className = 'status-message error';
        }
    });
}

// Check username availability
const regUsernameInput = document.getElementById('reg-username');
const regEmailInput = document.getElementById('reg-email');

if (regUsernameInput) {
    regUsernameInput.addEventListener('blur', async () => {
        const username = regUsernameInput.value;
        const statusDiv = document.getElementById('username-status');
        
        if (!username) {
            statusDiv.textContent = '';
            statusDiv.className = '';
            return;
        }
        
        try {
            const result = await apiCall(`/users/${username}/check`);
            if (result.available) {
                statusDiv.textContent = '✅ Username disponibil';
                statusDiv.className = 'status-message success';
            } else {
                statusDiv.textContent = '❌ Username deja folosit';
                statusDiv.className = 'status-message error';
            }
        } catch (error) {
            console.error('Error checking username:', error);
        }
    });
}

// Check email availability
if (regEmailInput) {
    regEmailInput.addEventListener('blur', async () => {
        const email = regEmailInput.value;
        const statusDiv = document.getElementById('email-status');
        
        if (!email) {
            statusDiv.textContent = '';
            statusDiv.className = '';
            return;
        }
        
        // Validare format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            statusDiv.textContent = '⚠️ Format email invalid';
            statusDiv.className = 'status-message error';
            return;
        }
        
        try {
            const users = await apiCall('/users', 'GET');
            const emailExists = users.some(u => u.email && u.email.toLowerCase() === email.toLowerCase());
            
            if (emailExists) {
                statusDiv.textContent = '❌ Email deja folosit';
                statusDiv.className = 'status-message error';
            } else {
                statusDiv.textContent = '✅ Email disponibil';
                statusDiv.className = 'status-message success';
            }
        } catch (error) {
            console.error('Error checking email:', error);
        }
    });
}

// Avatar selection
document.querySelectorAll('.avatar-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
    });
});

// Register button
// Login submit button
document.getElementById('login-submit-btn').addEventListener('click', async () => {
    const btn = document.getElementById('login-submit-btn');
    const usernameInput = document.getElementById('login-username');
    const pinInput = document.getElementById('login-pin');
    const username = usernameInput.value.trim();
    const pin = pinInput.value;
    
        if (!username || !pin) {
        showStatusMessage('Te rog completează username și PIN!', 'error');
        return;
    }
    
    // Show loading
    btn.textContent = 'Se conectează...';
    btn.disabled = true;
    
    try {
        const userData = await apiCall(`/users/${username}`, 'GET');
        
        if (userData.pin !== pin) {
            showStatusMessage('PIN incorect!', 'error');
            btn.textContent = 'Conectează-te';
            btn.disabled = false;
            return;
        }
        
        currentUser = username;
        localStorage.setItem('currentUser', username);
        await loadUserData();
        showMainScreen();
        await updateCommunityStats();
        
        // Clear inputs
        usernameInput.value = '';
        pinInput.value = '';
    } catch (error) {
        console.error('Login error:', error);
        if (error.message.includes('User not found') || error.message.includes('HTTP 404')) {
            showStatusMessage('Utilizatorul nu există! Înregistrează-te mai întâi.', 'error');
        } else if (error.message.includes('HTTP 500')) {
            showStatusMessage('Eroare server! Te rog încearcă din nou în câteva momente.', 'error');
        } else {
            showStatusMessage('Eroare la conectare: ' + error.message, 'error');
        }
    } finally {
        btn.textContent = 'Conectează-te';
        btn.disabled = false;
    }
});

document.getElementById('register-btn').addEventListener('click', async () => {
    const btn = document.getElementById('register-btn');
    const username = document.getElementById('reg-username').value;
    const firstName = document.getElementById('reg-first-name').value;
    const lastName = document.getElementById('reg-last-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const pin = document.getElementById('reg-pin').value;
    const birthDate = document.getElementById('reg-birth-date').value;
    const affirmation = document.getElementById('reg-affirmation').value;
    const selectedAvatar = window.uploadedAvatar || document.querySelector('.avatar-option.active')?.dataset.avatar || '👤';
    
    if (!username || !firstName || !email || !pin || !birthDate) {
        showStatusMessage('Completează toate câmpurile obligatorii!', 'error');
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showStatusMessage('Introduceți un email valid!', 'error');
        return;
    }
    
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        showStatusMessage('PIN-ul trebuie să fie format din 4 cifre!', 'error');
        return;
    }
    
    // Show loading
    btn.textContent = 'Se înregistrează...';
    btn.disabled = true;
    
    try {
        const userData = await apiCall(`/users/${username}/check`);
        if (!userData.available) {
            showStatusMessage('Username-ul este deja folosit!', 'error');
            btn.textContent = 'Înregistrează-te';
            btn.disabled = false;
            return;
        }
        
        await apiCall(`/users/${username}`, 'POST', {
            firstName,
            lastName,
            email,
            phone,
            pin,
            birthDate: document.getElementById('reg-birth-date').value,
            affirmation,
            avatar: selectedAvatar
        });
        
        // După înregistrare, cere selecția grupului
        currentUser = username;
        localStorage.setItem('currentUser', username);
        await showGroupSelection();
    } catch (error) {
        console.error('Registration error:', error);
        showStatusMessage('Eroare la înregistrare: ' + error.message, 'error');
    } finally {
        btn.textContent = 'Înregistrează-te';
        btn.disabled = false;
    }
});

// Show group selection screen
async function showGroupSelection() {
    console.log('Showing group selection...');
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('group-selection-screen').style.display = 'block';
    
    const groups = await getAllGroups();
    console.log('Groups found:', groups.length);
    const list = document.getElementById('registration-groups-list');
    
    if (groups.length === 0) {
        console.log('No groups found, showing single mode');
        list.innerHTML = `
            <div class="group-card" style="cursor: pointer; border: 2px solid #007bff;" onclick="selectSingleMode()">
                <div>
                    <h4>🏠 Single Mode - Fără grup</h4>
                    <p>Folosește doar afirmatiile tale, fără chat și grupuri</p>
                </div>
                <span style="font-size: 2em;">→</span>
            </div>
        `;
        return;
    }
    
    list.innerHTML = groups.map(group => `
        <div class="group-card" style="cursor: pointer;" onclick="selectGroupForRegistration(${group.id})">
            <div>
                <h4>${group.name}</h4>
                <p>${group.description || 'Nicio descriere'}</p>
            </div>
            <span style="font-size: 2em;">→</span>
        </div>
    `).join('') + `
        <div class="group-card" style="cursor: pointer; border: 2px solid #888; background: #f9f9f9;" onclick="selectSingleMode()">
            <div>
                <h4>🏠 Single Mode - Fără grup</h4>
                <p>Folosește doar afirmatiile tale, fără chat și grupuri</p>
            </div>
            <span style="font-size: 2em;">→</span>
        </div>
    `;
}

// Select single mode (no group)
window.selectSingleMode = async function() {
    console.log('Selecting single mode (no group)');
    await loadUserData();
    showMainScreen();
    await updateCommunityStats();
};

// Join group from registration
document.getElementById('join-reg-group-btn').addEventListener('click', async () => {
    const code = document.getElementById('reg-group-code').value;
    const statusDiv = document.getElementById('reg-join-status');
    
    if (!code) {
        statusDiv.textContent = '⚠️ Introdu codul grupului!';
        statusDiv.className = 'status-message error';
        return;
    }
    
    try {
        const groups = await getAllGroups();
        const group = groups.find(g => g.secret_code === code);
        
        if (!group) {
            statusDiv.textContent = '❌ Cod invalid!';
            statusDiv.className = 'status-message error';
            return;
        }
        
        await joinGroup(group.id, code);
        await finalizeRegistration();
    } catch (error) {
        statusDiv.textContent = '❌ ' + (error.message || 'Eroare la alăturarea la grup!');
        statusDiv.className = 'status-message error';
    }
});

// Select group from list
window.selectGroupForRegistration = async function(groupId) {
    const groups = await getAllGroups();
    const group = groups.find(g => g.id === groupId);
    document.getElementById('reg-group-code').value = group.secret_code;
    document.getElementById('join-reg-group-btn').click();
};

// Finalize registration after joining group
async function finalizeRegistration() {
    await loadUserData();
    showMainScreen();
    await updateCommunityStats();
    
    // Alert
    console.log('Bun venit! Te-ai alăturat grupului cu succes!');
}

// Admin functionality
let isAdmin = false;

document.getElementById('admin-btn').addEventListener('click', () => {
    showAdminScreen();
});

document.getElementById('admin-back-btn').addEventListener('click', () => {
    document.getElementById('admin-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
});

// Admin tabs
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update tabs
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update content
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Load data for tab
        loadAdminTab(tabName);
    });
});

function showAdminScreen() {
    document.getElementById('main-screen').style.display = 'none';
    document.getElementById('admin-screen').style.display = 'block';
    document.getElementById('admin-name').textContent = currentUser;
    loadAdminOverview();
}

async function loadAdminOverview() {
    try {
        const overview = await apiCall('/admin/overview');
        document.getElementById('admin-total-users').textContent = overview.totalUsers;
        document.getElementById('admin-total-reps').textContent = overview.totalRepetitions;
        document.getElementById('admin-total-messages').textContent = overview.totalMessages;
        document.getElementById('admin-active-today').textContent = overview.activeToday;
    } catch (error) {
        console.error('Error loading admin overview:', error);
    }
}

async function loadAdminTab(tabName) {
    switch(tabName) {
        case 'groups':
            await loadAdminGroups();
            break;
        case 'users':
            await loadAdminUsers();
            break;
        case 'messages':
            await loadAdminMessages();
            break;
        case 'activities':
            await loadAdminActivities();
            break;
        case 'analytics':
            await loadAdminAnalytics();
            break;
    }
}

async function loadAdminGroups() {
    try {
        const groups = await getAllGroups();
        const list = document.getElementById('admin-groups-list');
        
        list.innerHTML = groups.map(group => `
            <div class="admin-user-card">
                <div class="admin-user-info">
                    <div class="admin-user-details">
                        <h4>${group.name}</h4>
                        <p>${group.description || 'Nicio descriere'}</p>
                        <p><strong>Cod de acces:</strong> <span style="color: #667eea; font-family: monospace;">${group.secret_code}</span></p>
                        <p>Creație: ${new Date(group.created_at).toLocaleString('ro-RO')}</p>
                    </div>
                </div>
                <button class="admin-btn-view" onclick="copyGroupCode('${group.secret_code}')">📋 Copiază Cod</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading admin groups:', error);
    }
}

window.copyGroupCode = function(code) {
    navigator.clipboard.writeText(code);
    console.log(`Cod copiat: ${code}`);
};

// Create group
document.getElementById('create-group-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-group-name').value;
    const description = document.getElementById('new-group-desc').value;
    const startDate = document.getElementById('new-group-start-date').value;
    const statusDiv = document.getElementById('group-creation-status');
    
    if (!name) {
        statusDiv.textContent = 'Introdu numele grupului!';
        statusDiv.className = 'status-message error';
        return;
    }
    
    if (!startDate) {
        statusDiv.textContent = 'Introdu data de început!';
        statusDiv.className = 'status-message error';
        return;
    }
    
    // Calculate end date: startDate + 30 days
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    const endDate = end.toISOString().split('T')[0];
    
    try {
        const result = await createGroup(name, description, startDate, endDate);
        statusDiv.textContent = `Grup creat! Cod secret: ${result.secret_code}. Perioada: ${startDate} - ${endDate}`;
        statusDiv.className = 'status-message success';
        
        document.getElementById('new-group-name').value = '';
        document.getElementById('new-group-desc').value = '';
        document.getElementById('new-group-start-date').value = '';
        
        await loadAdminGroups();
    } catch (error) {
        statusDiv.textContent = 'Eroare la crearea grupului: ' + error.message;
        statusDiv.className = 'status-message error';
    }
});

async function loadAdminUsers() {
    try {
        const users = await apiCall('/admin/users/all');
        const list = document.getElementById('admin-users-list');
        
        list.innerHTML = users.map(user => `
            <div class="admin-user-card">
                <div class="admin-user-info">
                    <div class="admin-user-avatar">${user.avatar || '👤'}</div>
                    <div class="admin-user-details">
                        <h4>${user.username} ${user.role === 'admin' ? '👑' : ''}</h4>
                        <p>${user.first_name} ${user.last_name}</p>
                        <p>${user.email} | ${user.total_repetitions} repetări</p>
                        <p>Activi pe: ${new Date(user.last_active).toLocaleDateString('ro-RO')}</p>
                    </div>
                </div>
                <div class="admin-user-actions">
                    ${user.role !== 'admin' ? `<button class="admin-btn-danger" onclick="deleteUser('${user.username}')">🗑️ Șterge</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

async function loadAdminMessages() {
    try {
        const messages = await apiCall('/messages?limit=200');
        const list = document.getElementById('admin-messages-list');
        
        list.innerHTML = messages.map(msg => {
            const date = new Date(msg.timestamp);
            return `
                <div class="chat-message">
                    <div class="chat-message-header">
                        <span class="chat-message-user">${msg.from_user}</span>
                        <span class="chat-message-time">${date.toLocaleString('ro-RO')}</span>
                    </div>
                    <div class="chat-message-text">${escapeHtml(msg.message)}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading admin messages:', error);
    }
}

async function loadAdminActivities() {
    try {
        const activities = await apiCall('/activities?limit=100');
        const list = document.getElementById('admin-activities-list');
        
        list.innerHTML = activities.map(activity => {
            const date = new Date(activity.timestamp);
            return `
                <div class="feed-item">
                    <div class="feed-user">${activity.user}</div>
                    <div class="feed-message">${activity.message}</div>
                    <div class="feed-time">${date.toLocaleString('ro-RO')}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading admin activities:', error);
    }
}

async function loadAdminAnalytics() {
    // Placeholder pentru analytics
    document.getElementById('top-users').innerHTML = '<p>Grafice vor fi aici...</p>';
    document.getElementById('reps-distribution').innerHTML = '<p>Distribuție repetări...</p>';
    document.getElementById('daily-activity').innerHTML = '<p>Activitate zilnică...</p>';
}

window.deleteUser = async function(username) {
    if (!confirm(`Ești sigur că vrei să ștergi utilizatorul "${username}"?`)) return;
    
    try {
        await apiCall(`/admin/users/${username}`, 'DELETE');
        await loadAdminUsers();
        await loadAdminOverview();
    } catch (error) {
        console.error('Eroare la ștergerea utilizatorului');
        console.error(error);
    }
};

// Settings button
document.getElementById('settings-btn').addEventListener('click', openSettings);

function openSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
    loadSettingsContent();
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

document.getElementById('close-settings-btn').addEventListener('click', closeSettings);

// Close modal when clicking outside
document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target.id === 'settings-modal') {
        closeSettings();
    }
});

function loadSettingsContent() {
    // Generează avatarele pentru setări
    const avatars = ['👤', '👨', '👩', '👦', '👧', '🧑‍🦰', '👱‍♂️', '👱‍♀️', '🧑‍🦱', '🧑‍🦳', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '🧑‍🦲'];
    const grid = document.getElementById('settings-avatar-grid');
    
    grid.innerHTML = avatars.map((avatar, index) => `
        <div class="avatar-option ${index === 0 ? 'active' : ''}" data-avatar="${avatar}">${avatar}</div>
    `).join('');
    
    // Event listener pentru avatare în modal
    grid.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', () => {
            grid.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

// Change PIN
document.getElementById('change-pin-btn').addEventListener('click', async () => {
    const currentPin = document.getElementById('current-pin').value;
    const newPin = document.getElementById('new-pin').value;
    const confirmPin = document.getElementById('confirm-pin').value;
    
    const statusDiv = document.getElementById('pin-status');
    
    if (!currentPin || !newPin || !confirmPin) {
        statusDiv.textContent = '⚠️ Completează toate câmpurile';
        statusDiv.className = 'status-message error';
        return;
    }
    
    if (!/^\d{4}$/.test(newPin)) {
        statusDiv.textContent = '❌ PIN-ul trebuie să fie format din 4 cifre';
        statusDiv.className = 'status-message error';
        return;
    }
    
    if (newPin !== confirmPin) {
        statusDiv.textContent = '❌ PIN-urile nu se potrivesc';
        statusDiv.className = 'status-message error';
        return;
    }
    
    try {
        // Ar trebui implementat endpoint pentru verificarea PIN-ului
        // Pentru acum, salvăm direct
        await updateUserSettings({ pin: newPin });
        
        statusDiv.textContent = '✅ PIN actualizat cu succes!';
        statusDiv.className = 'status-message success';
        
        // Resetează câmpurile după 2 secunde
        setTimeout(() => {
            document.getElementById('current-pin').value = '';
            document.getElementById('new-pin').value = '';
            document.getElementById('confirm-pin').value = '';
            statusDiv.textContent = '';
        }, 2000);
    } catch (error) {
        statusDiv.textContent = '❌ Eroare la actualizarea PIN-ului';
        statusDiv.className = 'status-message error';
    }
});

// Change Avatar
document.getElementById('change-avatar-btn').addEventListener('click', async () => {
    const selectedAvatar = window.uploadedAvatar || document.querySelector('#settings-avatar-grid .avatar-option.active')?.dataset.avatar;
    const statusDiv = document.getElementById('avatar-status');
    
    if (!selectedAvatar) {
        statusDiv.textContent = '⚠️ Selectează un avatar';
        statusDiv.className = 'status-message error';
        return;
    }
    
    try {
        console.log('Saving avatar:', selectedAvatar.length > 100 ? selectedAvatar.substring(0, 100) + '...' : selectedAvatar);
        
        // Dacă e o poze (base64 foarte mare), truncez-o sau salvez doar pentru prezentare
        let avatarToSave = selectedAvatar;
        if (selectedAvatar.length > 10000) {
            // E prea mare pentru baza de date, salvează doar preview
            avatarToSave = '📷'; // Folosește emoji temporar
            console.log('Avatar too large, using emoji fallback');
        }
        
        await updateUserSettings({ avatar: avatarToSave });
        
        // Actualizează avatarul în UI - dacă e poză, afișează-o ca img
        const avatarEl = document.getElementById('current-user-avatar');
        if (avatarEl) {
            if (selectedAvatar.length > 100 && selectedAvatar.startsWith('data:image')) {
                // E poză - afișează-o
                avatarEl.innerHTML = `<img src="${selectedAvatar}" style="width: 32px; height: 32px; border-radius: 50%;">`;
            } else {
                avatarEl.textContent = selectedAvatar;
            }
        }
        
        statusDiv.textContent = '✅ Avatar actualizat cu succes!';
        statusDiv.className = 'status-message success';
        
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 2000);
    } catch (error) {
        console.error('Error saving avatar:', error);
        statusDiv.textContent = '❌ Eroare la actualizarea avatarului: ' + error;
        statusDiv.className = 'status-message error';
    }
});

async function updateUserSettings(settings) {
    if (!currentUser) return;
    
    const userData = await getCurrentUserData();
    if (!userData) return;
    
    // Actualizează datele locale
    if (settings.pin) {
        userData.pin = settings.pin;
    }
    if (settings.avatar) {
        userData.avatar = settings.avatar;
    }
    
    // Salvează pe server
        const data = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email || '',
            pin: settings.pin || userData.pin,
            birthDate: userData.birthDate,
            affirmation: userData.affirmation,
            avatar: settings.avatar || userData.avatar,
            totalRepetitions: userData.totalRepetitions,
            currentDay: userData.currentDay,
            todayRepetitions: userData.todayRepetitions,
            lastDate: userData.lastDate
        };
    
    await apiCall(`/users/${currentUser}`, 'PUT', data);
}

// Logout button
document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('Ești sigur că vrei să ieși?')) {
        logout();
    }
});

// Toggle feed
document.getElementById('toggle-feed-btn').addEventListener('click', () => {
    showFeed();
});

// Toggle chat
document.getElementById('toggle-chat-btn').addEventListener('click', () => {
    const chatContainer = document.getElementById('chat-container');
    const isVisible = chatContainer.style.display !== 'none';
    
    chatContainer.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        loadChatMessages();
        startChatPolling();
    } else {
        stopChatPolling();
    }
});

document.getElementById('close-chat-btn').addEventListener('click', () => {
    document.getElementById('chat-container').style.display = 'none';
    stopChatPolling();
});

let chatPollInterval = null;

function startChatPolling() {
    stopChatPolling();
    chatPollInterval = setInterval(loadChatMessages, 2000); // Actualizează la fiecare 2 secunde
}

function stopChatPolling() {
    if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }
}

async function loadChatMessages() {
    try {
        const messages = await getMessages();
        const chatMessagesDiv = document.getElementById('chat-messages');
        
        chatMessagesDiv.innerHTML = messages.map(msg => {
            const date = new Date(msg.timestamp);
            const time = date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
            const isOwn = msg.from_user === currentUser;
            
            return `
                <div class="chat-message ${isOwn ? 'own' : ''}">
                    <div class="chat-message-header">
                        <span class="chat-message-user">${msg.from_user}</span>
                        <span class="chat-message-time">${time}</span>
                    </div>
                    <div class="chat-message-text">${escapeHtml(msg.message)}</div>
                </div>
            `;
        }).join('');
        
        // Scroll automat la ultimul mesaj
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send chat message
document.getElementById('send-chat-btn').addEventListener('click', async () => {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    try {
        await sendMessage(message);
        input.value = '';
        loadChatMessages();
    } catch (error) {
        console.error('Eroare la trimiterea mesajului');
        console.error(error);
    }
});

// Enter key în chat
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('send-chat-btn').click();
    }
});

// Toggle groups
document.getElementById('toggle-groups-btn').addEventListener('click', async () => {
    const groupsSection = document.getElementById('groups-section');
    groupsSection.style.display = groupsSection.style.display === 'none' ? 'block' : 'none';
    
    if (groupsSection.style.display === 'block') {
        await loadAvailableGroups();
        await loadUserGroups();
    }
});

// Close group chat
document.getElementById('close-group-chat-btn').addEventListener('click', () => {
    document.getElementById('group-chat-container').style.display = 'none';
});

async function loadAvailableGroups() {
    try {
        // Verifică dacă user este admin
        const userData = await getCurrentUserData();
        const isAdmin = userData && (userData.role === 'admin' || userData.role === 'super_admin');
        
        const groups = await getAllGroups();
        const list = document.getElementById('available-groups-list');
        const joinSection = document.getElementById('join-group-section');
        
        // ASCUNDE section "join group" dacă e admin
        if (isAdmin && joinSection) {
            joinSection.style.display = 'none';
        }
        
        if (groups.length === 0) {
            list.innerHTML = '<p style="color: #888; font-style: italic;">Nu există grupuri disponibile momentan.</p>';
            return;
        }
        
        list.innerHTML = groups.map(group => `
            <div class="group-card">
                <div>
                    <h4>${group.name}</h4>
                    <p>${group.description || 'Nicio descriere'}</p>
                    <p style="color: #888; font-size: 0.85em;">Creație: ${new Date(group.created_at).toLocaleString('ro-RO')}</p>
                </div>
                <button class="admin-btn-view" onclick="openGroupChat(${group.id})">💬 Deschide Chat</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading available groups:', error);
    }
}

window.openGroupChat = async function(groupId) {
    currentGroupId = groupId;
    
    // Get group details
    const groups = await getAllGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group) return;
    
    document.getElementById('group-chat-title').textContent = `💬 Chat: ${group.name}`;
    document.getElementById('group-chat-container').style.display = 'block';
    
    // Load group members and chat
    await loadGroupMembers(groupId);
    await loadGroupChatMessages(groupId);
    
    // Start polling for new messages
    startGroupChatPolling(groupId);
};

async function loadGroupMembers(groupId) {
    try {
        const members = await apiCall(`/groups/${groupId}/members`);
        
        document.getElementById('group-members-count').textContent = `${members.length} membri`;
        
        const membersHTML = members.map(m => `
            <div class="group-member">
                <span style="margin-right: 5px;">${m.avatar || '👤'}</span>
                ${m.name}
            </div>
        `).join('');
        
        document.getElementById('group-members-list').innerHTML = membersHTML || '<p style="color: #888;">Niciun membru momentan</p>';
    } catch (error) {
        console.error('Error loading group members:', error);
        document.getElementById('group-members-count').textContent = '0 membri';
    }
}

async function loadGroupChatMessages(groupId) {
    try {
        const messages = await apiCall(`/groups/${groupId}/messages`);
        const container = document.getElementById('group-chat-messages');
        
        if (messages.length === 0) {
            container.innerHTML = '<p style="color: #888; text-align: center;">Niciun mesaj încă</p>';
            return;
        }
        
        container.innerHTML = messages.map(msg => {
            const date = new Date(msg.timestamp);
            return `
                <div class="group-message">
                    <div class="group-message-header">
                        <span>${msg.from_user}</span>
                        <span>${date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="group-message-text">${escapeHtml(msg.message)}</div>
                </div>
            `;
        }).join('');
        
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Error loading group messages:', error);
    }
}

function startGroupChatPolling(groupId) {
    if (window.groupChatInterval) {
        clearInterval(window.groupChatInterval);
    }
    
    window.groupChatInterval = setInterval(async () => {
        await loadGroupChatMessages(groupId);
    }, 2000);
}

let currentGroupId = null;

// Send group message
document.getElementById('send-group-chat-btn').addEventListener('click', async () => {
    const message = document.getElementById('group-chat-input').value;
    if (!message || !currentGroupId) return;
    
    try {
        await sendMessage(message);
        document.getElementById('group-chat-input').value = '';
        await loadGroupChatMessages(currentGroupId);
    } catch (error) {
        console.error('Error sending group message:', error);
    }
});

// Enter key in group chat
document.getElementById('group-chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('send-group-chat-btn').click();
    }
});

// Join group
document.getElementById('join-group-btn').addEventListener('click', async () => {
    const code = document.getElementById('group-code-input').value;
    const statusDiv = document.getElementById('join-status');
    
    if (!code) {
        statusDiv.textContent = '⚠️ Introdu codul grupului!';
        statusDiv.className = 'status-message error';
        return;
    }
    
    try {
        // Găsește grupul cu codul dat
        const groups = await getAllGroups();
        const group = groups.find(g => g.secret_code === code);
        
        if (!group) {
            statusDiv.textContent = '❌ Cod invalid! Nu există niciun grup cu acest cod.';
            statusDiv.className = 'status-message error';
            return;
        }
        
        await joinGroup(group.id, code);
        statusDiv.textContent = `✅ Te-ai alăturat grupului "${group.name}" cu succes!`;
        statusDiv.className = 'status-message success';
        
        document.getElementById('group-code-input').value = '';
        
        // Reîncarcă grupurile disponibile și grupurile mele
        await loadAvailableGroups();
        await loadUserGroups();
    } catch (error) {
        statusDiv.textContent = '❌ ' + (error.message || 'Eroare la alăturarea la grup!');
        statusDiv.className = 'status-message error';
    }
});

async function loadUserGroups() {
    try {
        const groups = await getUserGroups();
        const list = document.getElementById('user-groups-list');
        const title = document.getElementById('my-groups-title');
        
        if (groups.length === 0) {
            title.style.display = 'none';
            list.innerHTML = '';
            return;
        }
        
        title.style.display = 'block';
        list.innerHTML = groups.map(group => `
            <div class="group-card">
                <div>
                    <h4>${group.name}</h4>
                    <p>${group.description || 'Nicio descriere'}</p>
                </div>
                <button class="admin-btn-view" onclick="openGroupChat(${group.id})">💬 Deschide Chat</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading user groups:', error);
    }
}

// Salvează afirmația
document.getElementById('save-affirmation-btn').addEventListener('click', async () => {
    saveCustomAffirmation();
    await saveCurrentUserData();
});

// Încarcă statisticile la start
initUserSession().catch(err => {
    console.error('Error initializing session:', err);
    showLoginScreen();
});

// Try to attach repeat button on page load as well
setTimeout(() => {
    attachRepeatButton();
}, 500);

// Also try after a short delay
setTimeout(() => {
    attachRepeatButton();
}, 1000);

// Actualizează feed la fiecare 30 secunde
setInterval(async () => {
    if (currentUser) {
        await updateCommunityStats();
    }
}, 30000);

// Initializează reminder-ul
initReminder();

// Verifică progresul la fiecare minut
setInterval(checkDayProgress, 60000);

// Actualizează status reminder la fiecare 30 secunde
setInterval(updateReminderStatus, 30000);

// Handle avatar upload during registration
window.handleAvatarUpload = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarData = e.target.result;
            // Store in a global variable for registration
            window.uploadedAvatar = avatarData;
            // Update active avatar selection
            document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('active'));
            // Could show preview here
            alert('Poza a fost încărcată! Va fi folosită la înregistrare.');
        };
        reader.readAsDataURL(file);
    }
};

// Handle avatar upload in settings
window.handleSettingsAvatarUpload = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarData = e.target.result;
            // Store for settings save
            window.uploadedAvatar = avatarData;
            alert('Poza a fost încărcată! Click pe "Salvează Avatar" pentru a o salva.');
        };
        reader.readAsDataURL(file);
    }
};

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Apply to all textareas
document.addEventListener('DOMContentLoaded', function() {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        autoResizeTextarea(textarea);
        textarea.addEventListener('input', () => autoResizeTextarea(textarea));
    });
});

