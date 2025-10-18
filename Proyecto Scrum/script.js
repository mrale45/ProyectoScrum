const LS_KEY = 'liga_escolar_v3';
let state = { teams: [], matches: [], photos: [] };
let editingMatchIndex = null;

// Utiles
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2, 9);

// Inicial
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    bindNav();
    bindUI();
    renderAll();
});

// NAV
function bindNav() {
    $$('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const t = btn.dataset.target;
            showPage(t);
        });
    });

    // Mobile menu buttons
    $$('.mobile-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const t = btn.dataset.target;
            showPage(t);
            closeMobileMenu();
        });
    });

    // Hamburger toggle
    const hamburger = $('#hamburger');
    const mobileMenu = $('#mobileMenu');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            if (!e.target.closest('.header-inner')) {
                closeMobileMenu();
            }
        }
    });
}

function closeMobileMenu() {
    const hamburger = $('#hamburger');
    const mobileMenu = $('#mobileMenu');
    if (hamburger) hamburger.classList.remove('active');
    if (mobileMenu) mobileMenu.classList.remove('active');
}

function showPage(id) {
    $$('.page').forEach(p => p.classList.remove('active'));
    const page = $(`#${id}`);
    if (page) page.classList.add('active');
    renderAll();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// LOCALSTORAGE
function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    updateFooterStats();
}

function loadState() {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) state = JSON.parse(raw);
    else {
        state = { teams: [], matches: [], photos: [] };
    }
    if (!state.photos) state.photos = [];
}

// UI binding
function bindUI() {
    $('#addTeamBtn').addEventListener('click', addTeam);
    $('#sampleTeams').addEventListener('click', loadSample);
    $('#createMatchBtn').addEventListener('click', createMatch);

    // modal
    $('#closeModal').addEventListener('click', closeModal);
    $('#clearResult').addEventListener('click', closeModal);
    $('#saveResult').addEventListener('click', saveResult);

    // Validar solo letras en el campo de nombre
    $('#teamName').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s]/g, '');
    });

    // Enter key support
    $('#teamName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTeam();
    });

    // Gallery
    $('#uploadPhotoBtn').addEventListener('click', () => {
        $('#photoFile').click();
    });

    $('#photoFile').addEventListener('change', handlePhotoUpload);
}

// TEAMS
function addTeam() {
    const name = $('#teamName').value.trim();
    const color = $('#teamColor').value || '#ff6b35';

    if (!name) {
        alert('🚨 Escribe el nombre del equipo');
        return;
    }

    // Validar que solo contenga letras y espacios
    if (!/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/.test(name)) {
        alert('❌ El nombre solo puede contener letras y espacios. No se permiten números ni signos especiales.');
        return;
    }

    state.teams.push({ id: uid(), name, color });
    $('#teamName').value = '';
    renderTeams();
    renderSelects();
    saveState();
}

function loadSample() {
    state.teams = [
        { id: uid(), name: 'San Martín', color: '#ff6b35' },
        { id: uid(), name: 'Santa Cruz', color: '#6b9bff' },
        { id: uid(), name: 'Las Palmas', color: '#00c6a7' },
        { id: uid(), name: 'Academia Norte', color: '#f7b32b' },
    ];
    state.matches = [];
    renderAll();
    saveState();
}

function renderTeams() {
    const ul = $('#teamsList');
    ul.innerHTML = '';
    if (state.teams.length === 0) {
        ul.innerHTML = '<li class="card">No hay equipos todavía.</li>';
        return;
    }
    state.teams.forEach((t, i) => {
        const li = document.createElement('li');
        li.innerHTML = `
      <div class="item-left">
        <div class="badge" style="background:${t.color}">${initials(t.name)}</div>
        <div>
          <div style="font-weight:700">${t.name}</div>
          <small style="color:var(--muted)">${t.id}</small>
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn warn" title="Eliminar" onclick="deleteTeam('${t.id}')">Eliminar</button>
      </div>
    `;
        ul.appendChild(li);
    });
}

function deleteTeam(id) {
    if (!confirm('⚠️ ¿Eliminar equipo y todos sus partidos relacionados?')) return;
    state.teams = state.teams.filter(t => t.id !== id);
    state.matches = state.matches.filter(m => m.homeId !== id && m.awayId !== id);
    renderAll();
    saveState();
}

function initials(name) {
    return name.split(' ').slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('');
}

// SELECTS
function renderSelects() {
    const home = $('#selHome');
    const away = $('#selAway');
    [home, away].forEach(s => s.innerHTML = '<option value="">-- Selecciona --</option>');
    state.teams.forEach(t => {
        const opt1 = document.createElement('option');
        opt1.value = t.id;
        opt1.textContent = t.name;
        const opt2 = opt1.cloneNode(true);
        home.appendChild(opt1);
        away.appendChild(opt2);
    });
}

// MATCHES
function createMatch() {
    const homeId = $('#selHome').value;
    const awayId = $('#selAway').value;
    const dt = $('#dateMatch').value;
    if (!homeId || !awayId || !dt) return alert('⚠️ Selecciona equipos y fecha/hora.');
    if (homeId === awayId) return alert('❌ Un equipo no puede jugar contra sí mismo.');
    state.matches.push({ id: uid(), homeId, awayId, date: dt, played: false, scoreHome: null, scoreAway: null });
    renderAll();
    saveState();
}

function renderSchedule() {
    const ul = $('#scheduleList');
    ul.innerHTML = '';
    if (state.matches.length === 0) {
        ul.innerHTML = '<li class="card">No hay partidos programados.</li>';
        return;
    }
    const sorted = [...state.matches].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(m => {
        const home = teamById(m.homeId),
            away = teamById(m.awayId);
        const li = document.createElement('li');
        li.innerHTML = `
      <div class="item-left">
        <div class="badge" style="background:${home.color}">${initials(home.name)}</div>
        <div style="min-width:200px">
          <div style="font-weight:700">${home.name} <span style="color:var(--muted)">vs</span> ${away.name}</div>
          <small style="color:var(--muted)">${new Date(m.date).toLocaleString()}</small>
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" onclick="openResultModal('${m.id}')">${m.played ? '✎ Editar' : '📝 Registrar'}</button>
        <button class="icon-btn warn" onclick="deleteMatch('${m.id}')">Eliminar</button>
      </div>
    `;
        ul.appendChild(li);
    });
}

function deleteMatch(id) {
    if (!confirm('⚠️ ¿Eliminar este partido?')) return;
    state.matches = state.matches.filter(m => m.id !== id);
    renderAll();
    saveState();
}

// RESULTS
function openResultModal(matchId) {
    const m = matchById(matchId);
    if (!m) return;
    editingMatchIndex = state.matches.findIndex(x => x.id === matchId);
    const home = teamById(m.homeId),
        away = teamById(m.awayId);

    $('#mHomeBadge').style.background = home.color;
    $('#mAwayBadge').style.background = away.color;
    $('#mHomeBadge').textContent = initials(home.name);
    $('#mAwayBadge').textContent = initials(away.name);
    $('#mHomeName').textContent = home.name;
    $('#mAwayName').textContent = away.name;
    $('#mHomeGoals').value = m.scoreHome ?? 0;
    $('#mAwayGoals').value = m.scoreAway ?? 0;
    $('#modalTitle').textContent = `${home.name} vs ${away.name}`;
    openModal();
}

function saveResult() {
    const gh = parseInt($('#mHomeGoals').value, 10);
    const ga = parseInt($('#mAwayGoals').value, 10);
    if (isNaN(gh) || isNaN(ga) || gh < 0 || ga < 0) return alert('❌ Goles inválidos');
    if (editingMatchIndex === null) return;
    const m = state.matches[editingMatchIndex];
    m.scoreHome = gh;
    m.scoreAway = ga;
    m.played = true;
    closeModal();
    renderAll();
    saveState();
}

function renderResults() {
    const ul = $('#resultsList');
    ul.innerHTML = '';
    const played = state.matches.filter(m => m.played).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (played.length === 0) {
        ul.innerHTML = '<li class="card">No hay resultados registrados.</li>';
        return;
    }
    played.forEach(m => {
        const home = teamById(m.homeId),
            away = teamById(m.awayId);
        const li = document.createElement('li');
        li.innerHTML = `
      <div class="item-left">
        <div class="badge" style="background:${home.color}">${initials(home.name)}</div>
        <div style="min-width:220px">
          <div style="font-weight:700">${home.name} <span style="color:var(--accent2)">${m.scoreHome} - ${m.scoreAway}</span> ${away.name}</div>
          <small style="color:var(--muted)">${new Date(m.date).toLocaleString()}</small>
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn success" onclick="openResultModal('${m.id}')">✎ Editar</button>
      </div>
    `;
        ul.appendChild(li);
    });
}

// LEADERBOARD
function renderLeaderboard() {
    const out = $('#leaderboard');
    if (state.teams.length === 0) {
        out.textContent = 'No hay equipos aún.';
        return;
    }
    const stats = state.teams.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        points: 0,
        gf: 0,
        ga: 0,
        played: 0
    }));

    state.matches.filter(m => m.played).forEach(m => {
        const h = stats.find(s => s.id === m.homeId);
        const a = stats.find(s => s.id === m.awayId);
        h.gf += m.scoreHome;
        h.ga += m.scoreAway;
        h.played++;
        a.gf += m.scoreAway;
        a.ga += m.scoreHome;
        a.played++;
        if (m.scoreHome > m.scoreAway) {
            h.points += 3;
        } else if (m.scoreHome < m.scoreAway) {
            a.points += 3;
        } else {
            h.points += 1;
            a.points += 1;
        }
    });
    stats.sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
    out.innerHTML = '';
    stats.forEach((s, index) => {
        const div = document.createElement('div');
        div.className = 'team-row';
        div.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <div style="font-weight:900;font-size:20px;color:var(--accent1);min-width:30px">#${index + 1}</div>
        <div class="badge" style="background:${s.color}">${initials(s.name)}</div>
        <div class="team-meta">
          <div style="font-weight:700">${s.name}</div>
          <small>${s.played} partidos • GF ${s.gf} • GA ${s.ga}</small>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:900;font-size:22px;color:var(--accent2)">${s.points} pts</div>
      </div>
    `;
        out.appendChild(div);
    });
}

// EQUIPOS JUGADOS
function renderTeamsPlayed() {
    const container = $('#teamsPlayedContainer');
    if (!container) return;

    container.innerHTML = '';

    if (state.teams.length === 0) {
        container.innerHTML = '<div class="card">No hay equipos aún.</div>';
        return;
    }

    const teamStats = state.teams.map(t => {
        const matches = state.matches.filter(m => m.played && (m.homeId === t.id || m.awayId === t.id));
        return {
            id: t.id,
            name: t.name,
            color: t.color,
            totalMatches: matches.length,
            wins: matches.filter(m =>
                (m.homeId === t.id && m.scoreHome > m.scoreAway) ||
                (m.awayId === t.id && m.scoreAway > m.scoreHome)
            ).length,
            draws: matches.filter(m => m.scoreHome === m.scoreAway).length,
            losses: matches.filter(m =>
                (m.homeId === t.id && m.scoreHome < m.scoreAway) ||
                (m.awayId === t.id && m.scoreAway < m.scoreHome)
            ).length
        };
    });

    teamStats.forEach(team => {
        const div = document.createElement('div');
        div.className = 'card played-team';
        const winRate = team.totalMatches > 0 ? ((team.wins / team.totalMatches) * 100).toFixed(1) : 0;
        div.innerHTML = `
      <div style="display:flex;gap:16px;align-items:center">
        <div class="badge" style="background:${team.color};width:60px;height:60px;font-size:18px">${initials(team.name)}</div>
        <div style="flex:1">
          <h3 style="margin:0;font-weight:900;color:white">${team.name}</h3>
          <p style="color:var(--muted);margin:6px 0 0 0">Partidos jugados: <strong>${team.totalMatches}</strong></p>
        </div>
        <div style="text-align:right">
          <div style="display:flex;gap:20px;font-weight:900">
            <div>
              <div style="color:var(--accent3);font-size:24px">${team.wins}</div>
              <small style="color:var(--muted)">Victorias</small>
            </div>
            <div>
              <div style="color:var(--accent2);font-size:24px">${team.draws}</div>
              <small style="color:var(--muted)">Empates</small>
            </div>
            <div>
              <div style="color:#e74c3c;font-size:24px">${team.losses}</div>
              <small style="color:var(--muted)">Derrotas</small>
            </div>
          </div>
          <div style="margin-top:8px;padding:8px;background:rgba(255,107,53,0.1);border-radius:6px;font-size:14px">
            <strong style="color:var(--accent1)">${winRate}%</strong> ganados
          </div>
        </div>
      </div>
    `;
        container.appendChild(div);
    });
}

// GALLERY
function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('❌ Solo puedes subir imágenes');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const caption = $('#photoCaption').value.trim() || 'Sin descripción';
        state.photos.push({
            id: uid(),
            url: event.target.result,
            caption: caption,
            date: new Date().toISOString()
        });
        $('#photoCaption').value = '';
        $('#photoFile').value = '';
        renderGallery();
        saveState();
    };
    reader.readAsDataURL(file);
}

function renderGallery() {
    const grid = $('#galleryGrid');
    grid.innerHTML = '';

    if (state.photos.length === 0) {
        grid.innerHTML = `
            <div class="card gallery-item">
                <div class="gallery-placeholder">📸</div>
                <p style="text-align: center; margin-top: 12px; font-weight: 700;">No hay fotos aún</p>
            </div>
        `;
        return;
    }

    state.photos.slice().reverse().forEach(photo => {
        const div = document.createElement('div');
        div.className = 'card gallery-item';
        div.innerHTML = `
            <img src="${photo.url}" alt="${photo.caption}" style="width:100%;height:200px;object-fit:cover;border-radius:10px;" />
            <p style="text-align:center;margin-top:12px;font-weight:700;color:var(--accent2)">${photo.caption}</p>
            <small style="color:var(--muted);text-align:center;display:block">${new Date(photo.date).toLocaleDateString()}</small>
            <button class="icon-btn warn" style="width:100%;margin-top:10px" onclick="deletePhoto('${photo.id}')">🗑️ Eliminar</button>
        `;
        grid.appendChild(div);
    });
}

function deletePhoto(id) {
    if (!confirm('⚠️ ¿Eliminar esta foto?')) return;
    state.photos = state.photos.filter(p => p.id !== id);
    renderGallery();
    saveState();
}

// HELPERS
function teamById(id) {
    return state.teams.find(t => t.id === id) || { name: '—', color: '#ccc' };
}

function matchById(id) {
    return state.matches.find(m => m.id === id);
}

// MODAL
function openModal() {
    $('#modal').classList.add('open');
    $('#modal').setAttribute('aria-hidden', 'false');
}

function closeModal() {
    $('#modal').classList.remove('open');
    $('#modal').setAttribute('aria-hidden', 'true');
    editingMatchIndex = null;
}

// RENDER ALL
function renderAll() {
    renderTeams();
    renderSelects();
    renderSchedule();
    renderResults();
    renderLeaderboard();
    renderTeamsPlayed();
    renderGallery();
    updateStats();
}

// STATS
function updateStats() {
    $('#totalEquipos').textContent = state.teams.length;
    $('#totalPartidos').textContent = state.matches.length;
    $('#partidosJugados').textContent = state.matches.filter(m => m.played).length;
    const next = state.matches
        .filter(m => !m.played)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    $('#proximaFecha').textContent = next ? new Date(next.date).toLocaleString() : '—';
    $('#footerStats').textContent = `${state.teams.length} equipos • ${state.matches.length} partidos`;
}

function updateFooterStats() {
    const fs = document.getElementById('footerStats');
    if (fs) fs.textContent = `${state.teams.length} equipos • ${state.matches.length} partidos`;
}