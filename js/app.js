/**
 * Basketball Stats Web App - Main Application Logic
 * 
 * Architecture:
 * - Store: Single source of truth (Players, Game State, Logs)
 * - Timer: High precision game clock
 * - UI: Functions to render views based on Store state
 * - Stats: Logic to process actions
 * - PDF: Export functionality
 */

// --- STATE MANAGEMENT ---
const Store = {
    data: {
        gameId: null,
        date: null,
        teams: {
            home: { id: 'home', name: 'LOCAL', score: 0, fouls: 0, color: '#000000' },
            visitor: { id: 'visitor', name: 'VISITANTE', score: 0, fouls: 0, color: '#000000' }
        },
        players: [],
        log: [],
        quarter: 1,
        gameActive: false
    },

    init() {
        const saved = localStorage.getItem('basketStats_v2'); // New version key
        if (saved) {
            try {
                this.data = JSON.parse(saved);
                console.log('State v2 restored');
            } catch (e) {
                console.error('State restore failed', e);
            }
        } else {
            this.reset();
        }
    },

    save() {
        localStorage.setItem('basketStats_v2', JSON.stringify(this.data));
    },

    reset() {
        this.data = {
            gameId: Date.now(),
            date: new Date().toISOString(),
            teams: {
                home: { id: 'home', name: 'LOCAL', score: 0, fouls: 0 },
                visitor: { id: 'visitor', name: 'VISITANTE', score: 0, fouls: 0 }
            },
            players: [],
            log: [],
            quarter: 1,
            gameActive: false
        };
        this.save();
    },

    addPlayer(number, name, teamId) {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.data.players.push({
            id,
            number,
            name,
            team: teamId,
            active: false,
            stats: this.createEmptyStats()
        });
        this.save();
    },

    createEmptyStats() {
        return {
            pts: 0,
            fg2m: 0, fg2a: 0,
            fg3m: 0, fg3a: 0,
            ftm: 0, fta: 0,
            orb: 0, drb: 0,
            ast: 0, stl: 0, blk: 0, tov: 0,
            pf: 0, ofd: 0,
            time: 0
        };
    },

    togglePlayerActive(id) {
        const p = this.data.players.find(pl => pl.id === id);
        if (p) {
            p.active = !p.active;
            this.save();
        }
    },

    recordAction(playerId, actionType, extraData = {}) {
        const p = this.data.players.find(pl => pl.id === playerId);
        if (!p) return;

        // Add to Log
        const logEntry = {
            id: Date.now(),
            playerId,
            team: p.team,
            action: actionType,
            quarter: this.data.quarter,
            gameTime: Timer.getTimeStr(),
            ...extraData // Store coordinates {x, y}
        };
        this.data.log.push(logEntry);

        // Update Stats
        this.updateStats(p, actionType);
        this.save();
    },

    updateStats(player, action) {
        const s = player.stats;
        const teamKey = player.team; // 'home' or 'visitor'

        switch (action) {
            case 'fg2m': s.fg2m++; s.fg2a++; s.pts += 2; this.data.teams[teamKey].score += 2; break;
            case 'fg2a': s.fg2a++; break; // Missed
            case 'fg3m': s.fg3m++; s.fg3a++; s.pts += 3; this.data.teams[teamKey].score += 3; break;
            case 'fg3a': s.fg3a++; break;
            case 'ftm': s.ftm++; s.fta++; s.pts += 1; this.data.teams[teamKey].score += 1; break;
            case 'fta': s.fta++; break;

            case 'orb': s.orb++; break;
            case 'drb': s.drb++; break;
            case 'ast': s.ast++; break;
            case 'stl': s.stl++; break;
            case 'blk': s.blk++; break;
            case 'tov': s.tov++; break;
            case 'pf': s.pf++; this.data.teams[teamKey].fouls++; break;
            case 'ofd': s.ofd++; break;
        }
    }
};

// --- TIMER LOGIC ---
const Timer = {
    totalSeconds: 600,
    interval: null,
    isRunning: false,

    init() {
        this.render();
    },

    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        document.getElementById('timerBtn').innerHTML = '<i class="fas fa-pause"></i>';

        this.interval = setInterval(() => {
            if (this.totalSeconds > 0) {
                this.totalSeconds--;
                this.render();
            } else {
                this.stop();
            }
        }, 1000);
    },

    stop() {
        this.isRunning = false;
        clearInterval(this.interval);
        document.getElementById('timerBtn').innerHTML = '<i class="fas fa-play"></i>';
    },

    getTimeStr() {
        const m = Math.floor(this.totalSeconds / 60);
        const s = this.totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    render() {
        document.getElementById('gameTimer').textContent = this.getTimeStr();
    }
};

// --- UI CONTROLLER ---
const UI = {
    selectedPlayerId: null,
    activeTeamForPad: 'home',
    activeTeamForStats: 'home',
    pendingShotAction: null, // Store action while waiting for modal

    init() {
        this.renderScoreboard();
        this.renderActivePlayers();
        this.renderRosterList();
        this.renderStatsTable(this.activeTeamForStats);

        // Tab Switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
                if (view === 'stats') {
                    setTimeout(() => this.renderShotChart(), 100);
                }
            });
        });

        // Action Pad Listeners
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;

                // If it's a shot, open modal first
                if (['fg2m', 'fg2a', 'fg3m', 'fg3a'].includes(action)) {
                    this.openShotModal(action);
                } else {
                    // Normal action
                    this.processAction(action);
                }
            });
        });

        // Court Click Listener (Modal)
        const courtArea = document.getElementById('courtClickArea');
        if (courtArea) {
            courtArea.addEventListener('click', (e) => {
                if (!this.pendingShotAction) return;

                const rect = courtArea.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width * 100;
                const y = (e.clientY - rect.top) / rect.height * 100;

                this.processAction(this.pendingShotAction, { x, y });
                closeModal('shotModal');
                this.pendingShotAction = null;
            });
        }

        // Team Name Inputs
        document.getElementById('homeName').addEventListener('input', (e) => {
            Store.data.teams.home.name = e.target.value;
            Store.save();
        });
        document.getElementById('visitorName').addEventListener('input', (e) => {
            Store.data.teams.visitor.name = e.target.value;
            Store.save();
        });

        // Timer
        document.getElementById('timerBtn').addEventListener('click', () => Timer.toggle());

        // Cookie Consent Logic
        const cookieBanner = document.getElementById('cookieBanner');
        const btnAcceptCookies = document.getElementById('btnAcceptCookies');

        if (!localStorage.getItem('cookieConsent')) {
            cookieBanner.classList.remove('hidden');
        }

        btnAcceptCookies.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'accepted');
            cookieBanner.classList.add('hidden');
        });
    },

    switchView(viewName) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

        document.getElementById(`view-${viewName}`).classList.add('active');
        document.querySelector(`.tab-btn[data-view="${viewName}"]`).classList.add('active');
    },

    renderScoreboard() {
        const d = Store.data.teams;
        document.getElementById('homeScore').textContent = d.home.score;
        document.getElementById('visitorScore').textContent = d.visitor.score;
        document.getElementById('homeFouls').textContent = d.home.fouls;
        document.getElementById('visitorFouls').textContent = d.visitor.fouls;

        document.getElementById('homeName').value = d.home.name;
        document.getElementById('visitorName').value = d.visitor.name;
        document.getElementById('currentQuarter').textContent = 'Q' + Store.data.quarter;
    },

    setActiveTeam(teamId) {
        this.activeTeamForPad = teamId;
        // Update Buttons
        document.querySelectorAll('.btn-toggle-team').forEach(b => b.classList.remove('active'));
        if (teamId === 'home') document.getElementById('btnToggleHome').classList.add('active');
        else document.getElementById('btnToggleVisitor').classList.add('active');

        this.selectedPlayerId = null;
        document.getElementById('actionPad').classList.add('disabled');
        document.getElementById('selectedPlayerName').textContent = '--';

        this.renderActivePlayers();
    },

    renderActivePlayers() {
        const container = document.getElementById('activePlayersList');
        const active = Store.data.players.filter(p => p.active && p.team === this.activeTeamForPad);

        container.innerHTML = '';
        if (active.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding:10px; color:#777;">No hay jugadores de ${this.activeTeamForPad === 'home' ? 'LOCAL' : 'VISITANTE'} en pista.</div>`;
            return;
        }

        active.forEach(p => {
            const card = document.createElement('div');
            card.className = `player-card ${this.selectedPlayerId === p.id ? 'selected' : ''}`;
            card.dataset.id = p.id;
            card.innerHTML = `
                <span class="p-num">#${p.number}</span>
                <span class="p-name">${p.name}</span>
            `;
            card.onclick = () => this.selectPlayer(p.id);
            container.appendChild(card);
        });
    },

    selectPlayer(id) {
        this.selectedPlayerId = id;
        this.renderActivePlayers(); // Re-render to highlight
        const p = Store.data.players.find(pl => pl.id === id);
        if (p) {
            document.getElementById('selectedPlayerName').textContent = `#${p.number} ${p.name}`;
            document.getElementById('actionPad').classList.remove('disabled');
        }
    },

    renderRosterList() {
        const homeList = document.getElementById('rosterListHome');
        const visitorList = document.getElementById('rosterListVisitor');
        homeList.innerHTML = '';
        visitorList.innerHTML = '';

        Store.data.players.forEach(p => {
            const li = document.createElement('li');
            li.className = `roster-item ${p.active ? 'on-court' : ''}`;
            li.innerHTML = `
                <span><strong>#${p.number}</strong> ${p.name}</span>
                <button class="btn-toggle-court ${p.active ? 'active' : ''}" onclick="toggleCourt('${p.id}')">
                    ${p.active ? 'En Pista' : 'Banquillo'}
                </button>
            `;
            if (p.team === 'home') homeList.appendChild(li);
            else visitorList.appendChild(li);
        });

        // Update header names
        document.querySelector('#view-roster .team-roster:nth-child(1) h4').textContent = Store.data.teams.home.name;
        document.querySelector('#view-roster .team-roster:nth-child(2) h4').textContent = Store.data.teams.visitor.name;
    },

    renderStatsTable(teamIdFilter) {
        this.activeTeamForStats = teamIdFilter || this.activeTeamForStats;

        // Update Filter Buttons (Manual toggle class)
        const filterContainer = document.querySelector('.stats-filter');
        if (filterContainer) {
            filterContainer.children[0].classList.toggle('active', this.activeTeamForStats === 'home');
            filterContainer.children[1].classList.toggle('active', this.activeTeamForStats === 'visitor');
            filterContainer.children[0].textContent = Store.data.teams.home.name;
            filterContainer.children[1].textContent = Store.data.teams.visitor.name;
        }

        const tbody = document.querySelector('#liveStatsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const players = Store.data.players.filter(p => p.team === this.activeTeamForStats);

        players.forEach(p => {
            const s = p.stats;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.number}</td>
                <td style="text-align:left;">${p.name}</td>
                <td><strong>${s.pts}</strong></td>
                <td>${s.fg2m}-${s.fg2a}</td>
                <td>${s.fg3m}-${s.fg3a}</td>
                <td>${s.ftm}-${s.fta}</td>
                <td>${s.orb + s.drb}</td>
                <td>${s.ast}</td>
                <td>${s.stl}</td>
                <td>${s.blk}</td>
                <td>${s.tov}</td>
                <td>${s.pf}</td>
            `;
            tbody.appendChild(tr);
        });

        // Update Chart too
        this.renderShotChart();
    },

    processAction(action, extraData = {}) {
        if (this.selectedPlayerId) {
            Store.recordAction(this.selectedPlayerId, action, extraData);
            this.renderScoreboard();
            this.renderStatsTable(this.activeTeamForStats);
            this.renderShotChart(); // Update chart if visible

            const pCard = document.querySelector(`.player-card[data-id="${this.selectedPlayerId}"]`);
            if (pCard) {
                pCard.classList.add('flash-success');
                setTimeout(() => pCard.classList.remove('flash-success'), 300);
            }
        }
    },

    openShotModal(action) {
        if (!this.selectedPlayerId) return;
        this.pendingShotAction = action;

        const actionNames = {
            'fg2m': 'Anotado 2 Puntos',
            'fg2a': 'Fallado 2 Puntos',
            'fg3m': 'Anotado 3 Puntos',
            'fg3a': 'Fallado 3 Puntos'
        };

        document.getElementById('shotActionText').textContent = actionNames[action] || action;
        document.getElementById('shotModal').classList.remove('hidden');
    },

    // Chart Instance
    chart: null,

    renderCharts() {
        const ctx = document.getElementById('pointsChart');
        if (!ctx) return;

        const context = ctx.getContext('2d');
        const homeScore = Store.data.teams.home.score;
        const visitorScore = Store.data.teams.visitor.score;

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(context, {
            type: 'doughnut',
            data: {
                labels: [Store.data.teams.home.name, Store.data.teams.visitor.name],
                datasets: [{
                    data: [homeScore, visitorScore],
                    backgroundColor: ['#ff6b00', '#333333'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: 'Distribución de Puntos' }
                }
            }
        });
    },

    renderShotChart() {
        const canvas = document.getElementById('shotChartCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Reset canvas size to match display size for crisp rendering
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.width * 0.94; // Maintain aspect ratio

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Court Background (Simple Lines)
        this.drawCourt(ctx, canvas.width, canvas.height);

        // Draw Shots
        const shots = Store.data.log.filter(l =>
            l.team === this.activeTeamForStats && // FILTER ADDED HERE
            l.x !== undefined && l.y !== undefined &&
            ['fg2m', 'fg2a', 'fg3m', 'fg3a'].includes(l.action)
        );

        shots.forEach(s => {
            const x = (s.x / 100) * canvas.width;
            const y = (s.y / 100) * canvas.height;
            const isMake = s.action.endsWith('m');

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = isMake ? '#28a745' : '#dc3545'; // Green for make, Red for miss
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    },

    drawCourt(ctx, w, h) {
        // Wood Floor Background
        ctx.fillStyle = '#eecfa1';
        ctx.fillRect(0, 0, w, h);

        // Lines
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;

        // 3 Point Arc
        // Start from bottom left (baseline)
        ctx.beginPath();
        const cornerWidth = w * 0.06;
        const cornerHeight = h * 0.25; // standard corner is usually flat

        // Left Corner
        ctx.moveTo(cornerWidth, 0);
        ctx.lineTo(cornerWidth, cornerHeight);

        // Arc (This is a simplified bezier to approximate the arc)
        ctx.bezierCurveTo(cornerWidth, h * 0.85, w - cornerWidth, h * 0.85, w - cornerWidth, cornerHeight);

        // Right Corner
        ctx.lineTo(w - cornerWidth, 0);
        ctx.stroke();

        // Paint Area (Key)
        const paintWidth = w * 0.35;
        const paintX = (w - paintWidth) / 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Faint filled paint
        ctx.fillRect(paintX, 0, paintWidth, h * 0.4);
        ctx.strokeRect(paintX, 0, paintWidth, h * 0.4);

        // Free Throw Circle (Top of key)
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.4, paintWidth / 2, 0, Math.PI, true); // Top half dashed? Professional is usually full circle or half
        ctx.stroke();

        // Hoop
        ctx.beginPath();
        const hoopY = h * 0.075;
        ctx.arc(w / 2, hoopY, w * 0.025, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ff6b00';
        ctx.stroke();

        // Backboard
        ctx.beginPath();
        ctx.moveTo((w / 2) - (w * 0.06), hoopY - (w * 0.02));
        ctx.lineTo((w / 2) + (w * 0.06), hoopY - (w * 0.02));
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Reset stroke
        ctx.strokeStyle = '#fff';

        // Center Circle (Bottom)
        ctx.beginPath();
        ctx.arc(w / 2, h, w * 0.2, 0, Math.PI, true); // Half circle at bottom
        ctx.stroke();
    }
};

// --- HELPER: Advanced Stats ---
const StatsUtils = {
    calcEFG(stats) {
        const fga = stats.fg2a + stats.fg3a;
        if (fga === 0) return '0.0%';
        const efg = (stats.fg2m + stats.fg3m + 0.5 * stats.fg3m) / fga;
        return (efg * 100).toFixed(1) + '%';
    },

    calcTS(stats) {
        const pts = stats.pts;
        const fga = stats.fg2a + stats.fg3a;
        const fta = stats.fta;
        if ((fga + 0.44 * fta) === 0) return '0.0%';
        const ts = pts / (2 * (fga + 0.44 * fta));
        return (ts * 100).toFixed(1) + '%';
    }
};

// --- GLOBAL FUNCTIONS (for HTML events) ---
window.adjustScore = (team, amount) => {
    if (Store.data.teams[team]) {
        Store.data.teams[team].score += amount;
        if (Store.data.teams[team].score < 0) Store.data.teams[team].score = 0;
        Store.save();
        UI.renderScoreboard();
        UI.renderCharts();
    }
};

window.setActiveTeam = (teamId) => {
    UI.setActiveTeam(teamId);
};

window.renderStatsTable = (teamId) => {
    UI.renderStatsTable(teamId);
};

window.showAddPlayerModal = () => {
    document.getElementById('addPlayerModal').classList.remove('hidden');
    document.getElementById('newPlayerNum').focus();
};

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};

window.addPlayer = () => {
    const num = document.getElementById('newPlayerNum').value;
    const name = document.getElementById('newPlayerName').value;
    const teamRadios = document.getElementsByName('newPlayerTeam');
    let teamId = 'home';
    for (const r of teamRadios) {
        if (r.checked) teamId = r.value;
    }

    if (num && name) {
        Store.addPlayer(num, name, teamId);
        UI.renderRosterList();
        UI.renderStatsTable();
        closeModal('addPlayerModal');
        document.getElementById('newPlayerNum').value = '';
        document.getElementById('newPlayerName').value = '';
        // Reset radio button selection to default (home)
        document.getElementById('newPlayerTeamHome').checked = true;
    }
};

window.toggleCourt = (id) => {
    Store.togglePlayerActive(id);
    UI.renderRosterList();
    UI.renderActivePlayers();
};

window.resetGame = () => {
    if (confirm("¿Estás seguro de borrar todo y empezar un partido nuevo?")) {
        Store.reset();
        location.reload();
    }
};

// Add to UI object
UI.getShotChartImage = function (teamId) {
    // Create an off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 470; // 500 * 0.94
    const ctx = canvas.getContext('2d');

    // Draw Court
    this.drawCourt(ctx, canvas.width, canvas.height);

    // Draw Shots
    const shots = Store.data.log.filter(l =>
        l.team === teamId &&
        l.x !== undefined && l.y !== undefined &&
        ['fg2m', 'fg2a', 'fg3m', 'fg3a'].includes(l.action)
    );

    shots.forEach(s => {
        const x = (s.x / 100) * canvas.width;
        const y = (s.y / 100) * canvas.height;
        const isMake = s.action.endsWith('m');

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = isMake ? '#28a745' : '#dc3545';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    return canvas.toDataURL('image/png');
};

window.generatePDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const d = Store.data;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(255, 107, 0);
    doc.text("BlueCore HoopStats - Informe", 105, 20, null, null, "center");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(`${d.teams.home.name} vs ${d.teams.visitor.name}`, 105, 30, null, null, "center");
    doc.setFont("helvetica", "bold");
    doc.text(`${d.teams.home.score} - ${d.teams.visitor.score}`, 105, 40, null, null, "center");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 105, 46, null, null, "center");

    let currentY = 55;

    const printTeamTable = (teamId, teamName) => {
        doc.setFontSize(12);
        doc.setTextColor(255, 107, 0);
        doc.text(teamName, 14, currentY);
        currentY += 5;

        const headers = [["#", "JUGADOR", "PTS", "2P", "3P", "TL", "REB", "AS", "RO", "TP", "PE", "FA"]];
        const teamPlayers = d.players.filter(p => p.team === teamId);

        const data = teamPlayers.map(p => {
            const s = p.stats;
            return [
                p.number,
                p.name,
                s.pts,
                `${s.fg2m}-${s.fg2a}`,
                `${s.fg3m}-${s.fg3a}`,
                `${s.ftm}-${s.fta}`,
                (s.orb + s.drb),
                s.ast,
                s.stl,
                s.blk,
                s.tov,
                s.pf
            ];
        });

        doc.autoTable({
            head: headers,
            body: data,
            startY: currentY,
            theme: 'striped',
            headStyles: { fillColor: [51, 51, 51] },
            styles: { fontSize: 8, cellPadding: 2 }
        });

        currentY = doc.lastAutoTable.finalY + 10;
    };

    // HOME TEAM
    printTeamTable('home', d.teams.home.name);

    // Add Shot Chart
    const homeChartImg = UI.getShotChartImage('home');
    if (currentY + 60 > 280) {
        doc.addPage();
        currentY = 20;
    }
    doc.text(`Mapa de Tiros - ${d.teams.home.name}`, 14, currentY - 2);
    doc.addImage(homeChartImg, 'PNG', 14, currentY, 60, 56.4);
    currentY += 70;

    // VISITOR TEAM
    if (currentY + 50 > 280) {
        doc.addPage();
        currentY = 20;
    }
    printTeamTable('visitor', d.teams.visitor.name);

    // Add Shot Chart
    const visitorChartImg = UI.getShotChartImage('visitor');
    if (currentY + 60 > 280) {
        doc.addPage();
        currentY = 20;
    }
    doc.text(`Mapa de Tiros - ${d.teams.visitor.name}`, 14, currentY - 2);
    doc.addImage(visitorChartImg, 'PNG', 14, currentY, 60, 56.4);

    doc.save(`Partido_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    Store.init();
    Timer.init();
    UI.init();
    if (document.getElementById('pointsChart')) {
        UI.renderCharts();
    }
});
