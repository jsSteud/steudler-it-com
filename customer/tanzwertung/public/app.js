const API_BASE = window.TANZWERTUNG_API_BASE || '';
const POLL_INTERVAL_MS = 2000;

let state = { ratings: {}, numCompetitors: 100 };
let currentRole = null;
let saveTimers = {};
let pendingSaves = new Set();   // Zeilen mit ungesicherter/laufender Aenderung (Poll ueberspringt diese)
let saving = new Set();         // Zeilen mit gerade laufender /rate-Anfrage
let resendNeeded = new Set();   // Zeilen, die waehrend einer laufenden Anfrage erneut geaendert wurden
let sortByTotal = false;
let pollTimer = null;

// ─── Networking (Polling gegen REST-API auf API Gateway/Lambda) ───────────────

async function fetchState() {
  try {
    const res = await fetch(`${API_BASE}/state`, { cache: 'no-store' });
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    applyState(data);
    setConnStatus('connected');
  } catch (err) {
    setConnStatus('disconnected');
  }
}

function applyState(data) {
  state = data;
  if      (currentRole === 'committee') { renderCommittee(); updateProgressChips(); }
  else if (currentRole)                 { reconcileReferee(); updateRefereeProgress(); }
}

function startPolling() {
  if (pollTimer) return;
  setConnStatus('connecting');
  fetchState();
  pollTimer = setInterval(fetchState, POLL_INTERVAL_MS);
}

async function sendRating(competitorId, refereeId, score) {
  try {
    const res = await fetch(`${API_BASE}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitorId, refereeId, score }),
    });
    if (!res.ok) throw new Error('bad response');
    setConnStatus('connected');
    return true;
  } catch (err) {
    setConnStatus('disconnected');
    return false;
  }
}

async function sendReset() {
  try {
    const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('bad response');
  } catch (err) {
    setConnStatus('disconnected');
  } finally {
    fetchState();
  }
}

startPolling();

// ─── Connection Status ────────────────────────────────────────────────────────

function setConnStatus(status) {
  const loginEl = document.getElementById('connection-status');
  if (loginEl) {
    loginEl.className = 'connection-status ' + status;
    loginEl.querySelector('.status-text').textContent =
      status === 'connected' ? 'Verbunden' :
      status === 'connecting' ? 'Verbinde...' : 'Verbindung unterbrochen';
  }
  ['ref-conn-dot', 'kom-conn-dot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'conn-dot ' + status;
  });
}

// ─── Role / Screen ────────────────────────────────────────────────────────────

function selectRole(role) {
  currentRole = role;
  if (role === 'committee') {
    showScreen('committee-screen');
    renderCommittee();
    updateProgressChips();
  } else {
    setupRefereeHeader(role);
    showScreen('referee-screen');
    renderReferee();
    updateRefereeProgress();
  }
}

function switchRole() {
  currentRole = null;
  sortByTotal = false;
  document.getElementById('sort-by-total').checked = false;
  showScreen('login-screen');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── Referee View ─────────────────────────────────────────────────────────────

const ROLE_META = {
  referee1: { badge: 'WR 1', title: 'Wertungsrichter 1', cls: 'wr1' },
  referee2: { badge: 'WR 2', title: 'Wertungsrichter 2', cls: 'wr2' },
  referee3: { badge: 'WR 3', title: 'Wertungsrichter 3', cls: 'wr3' },
};

function setupRefereeHeader(role) {
  const m = ROLE_META[role];
  document.getElementById('ref-badge').textContent  = m.badge;
  document.getElementById('ref-badge').className    = 'badge ' + m.cls;
  document.getElementById('ref-title').textContent  = m.title;
  // Color the focus ring via a class on the referee screen
  const screen = document.getElementById('referee-screen');
  screen.className = 'screen ref-' + m.cls;
}

function renderReferee() {
  const tbody = document.getElementById('referee-tbody');
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= state.numCompetitors; i++) {
    frag.appendChild(buildRefereeRow(i));
  }
  tbody.appendChild(frag);
}

// Wird bei jedem Poll-Update aufgerufen: patcht nur die Werte, statt die Tabelle
// (und damit auch gerade fokussierte/getippte Inputs) komplett neu aufzubauen.
function reconcileReferee() {
  for (let i = 1; i <= state.numCompetitors; i++) {
    updateRefereeRowFromState(i);
  }
}

function updateRefereeRowFromState(id) {
  const input = document.getElementById(`si-${id}`);
  if (!input) return;
  if (document.activeElement === input || pendingSaves.has(id)) return;

  const score    = state.ratings[id]?.[currentRole];
  const hasScore = score !== null && score !== undefined;
  input.value = hasScore ? score : '';
  input.classList.remove('error');
  input.classList.toggle('saved', hasScore);

  const dot = document.getElementById(`sd-${id}`);
  if (dot) dot.className = 'status-dot-row ' + (hasScore ? 'saved' : 'empty');
}

function buildRefereeRow(id) {
  const score    = state.ratings[id]?.[currentRole];
  const hasScore = score !== null && score !== undefined;

  const tr = document.createElement('tr');
  tr.id = `ref-row-${id}`;

  tr.innerHTML = `
    <td><span class="comp-nr">${String(id).padStart(3, '0')}</span></td>
    <td>Starter ${id}</td>
    <td>
      <input type="number" class="score-input${hasScore ? ' saved' : ''}"
             id="si-${id}"
             min="0" max="100" step="0.5"
             value="${hasScore ? score : ''}"
             placeholder="–"
             data-id="${id}">
    </td>
    <td>
      <span class="status-dot-row ${hasScore ? 'saved' : 'empty'}" id="sd-${id}"></span>
    </td>
  `;

  // Attach events once, using closure on id
  const input = tr.querySelector(`#si-${id}`);
  input.addEventListener('input',  () => onScoreInput(id));
  input.addEventListener('change', () => onScoreChange(id));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = document.getElementById(`si-${id + 1}`);
      if (next) next.focus();
    }
  });

  return tr;
}

function onScoreInput(id) {
  pendingSaves.add(id);
  const dot = document.getElementById(`sd-${id}`);
  if (dot) dot.className = 'status-dot-row pending';
  clearTimeout(saveTimers[id]);
  saveTimers[id] = setTimeout(() => triggerSave(id), 600);
}

function onScoreChange(id) {
  pendingSaves.add(id);
  clearTimeout(saveTimers[id]);
  triggerSave(id);
}

// Stellt sicher, dass fuer eine Zeile immer nur eine /rate-Anfrage gleichzeitig
// unterwegs ist. Sonst koennte eine spaetere (aktuellere) Anfrage schneller
// beim Server ankommen als eine fruehere (veraltete) - und die veraltete
// wuerde den richtigen Wert dann wieder ueberschreiben.
function triggerSave(id) {
  if (saving.has(id)) {
    resendNeeded.add(id);
    return;
  }
  saveScore(id);
}

async function saveScore(id) {
  const input = document.getElementById(`si-${id}`);
  if (!input) { pendingSaves.delete(id); return; }

  const val   = input.value.trim();
  const score = val === '' ? null : parseFloat(val);

  if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
    input.classList.add('error');
    pendingSaves.delete(id);
    return;
  }
  input.classList.remove('error');

  saving.add(id);
  const ok = await sendRating(id, currentRole, score);
  saving.delete(id);

  const dot = document.getElementById(`sd-${id}`);
  if (ok) {
    state.ratings[id][currentRole] = score;
    input.classList.toggle('saved', score !== null);
    if (dot) dot.className = 'status-dot-row ' + (score !== null ? 'saved' : 'empty');
    updateRefereeProgress();
  } else if (dot) {
    dot.className = 'status-dot-row pending';
  }

  if (resendNeeded.has(id)) {
    // Waehrend die Anfrage lief, gab es eine weitere Aenderung -> jetzt mit
    // dem aktuellen Eingabewert nachsenden, statt sie zu verlieren.
    resendNeeded.delete(id);
    await saveScore(id);
    return;
  }
  pendingSaves.delete(id);
}

function updateRefereeProgress() {
  const filled = Object.values(state.ratings).filter(r => r[currentRole] !== null && r[currentRole] !== undefined).length;
  const total  = state.numCompetitors;
  const pct    = (filled / total) * 100;
  const fill   = document.getElementById('ref-progress-fill');
  const text   = document.getElementById('ref-progress-text');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = `${filled} / ${total} bewertet`;
}

// ─── Committee View ───────────────────────────────────────────────────────────

function renderCommittee() {
  const tbody = document.getElementById('committee-tbody');
  tbody.innerHTML = '';

  // Determine row order
  const ids = Array.from({ length: state.numCompetitors }, (_, i) => i + 1);
  if (sortByTotal) {
    ids.sort((a, b) => {
      const ta = totalScore(a), tb = totalScore(b);
      const ca = fullyRated(a), cb = fullyRated(b);
      if (ca && cb) return tb - ta;          // both complete → by score desc
      if (ca) return -1;                     // only a complete → a first
      if (cb) return  1;
      const pa = partialScore(a), pb = partialScore(b);
      if (pa !== null && pb !== null) return pb - pa;
      if (pa !== null) return -1;
      if (pb !== null) return  1;
      return a - b;
    });
  }

  // Update header
  const thead = document.getElementById('committee-thead');
  if (sortByTotal) {
    thead.innerHTML = `<tr>
      <th class="col-rank">Rang</th>
      <th class="col-nr">Nr.</th>
      <th class="col-ref wr1-head">WR 1</th>
      <th class="col-ref wr2-head">WR 2</th>
      <th class="col-ref wr3-head">WR 3</th>
      <th class="col-total total-head">Gesamt</th>
    </tr>`;
  } else {
    thead.innerHTML = `<tr>
      <th class="col-nr">Nr.</th>
      <th class="col-ref wr1-head">WR 1</th>
      <th class="col-ref wr2-head">WR 2</th>
      <th class="col-ref wr3-head">WR 3</th>
      <th class="col-total total-head">Gesamt</th>
    </tr>`;
  }

  const frag = document.createDocumentFragment();
  ids.forEach((id, idx) => {
    frag.appendChild(buildCommitteeRow(id, sortByTotal ? idx + 1 : null));
  });
  tbody.appendChild(frag);
}

function buildCommitteeRow(id, rank) {
  const r = state.ratings[id] || {};
  const r1 = r.referee1 ?? null;
  const r2 = r.referee2 ?? null;
  const r3 = r.referee3 ?? null;
  const total = totalScore(id);
  const complete = fullyRated(id);

  const tr = document.createElement('tr');
  tr.id = `kom-row-${id}`;
  if (complete) tr.classList.add('row-complete');

  const nrHtml = rank !== null
    ? `<td class="col-rank"><span class="rank-num ${rankCls(rank, complete)}">${complete ? rank : '–'}</span></td>
       <td><span class="comp-nr">${String(id).padStart(3, '0')}</span></td>`
    : `<td><span class="comp-nr">${String(id).padStart(3, '0')}</span></td>`;

  const partial = !complete && total !== null;

  tr.innerHTML = `
    ${nrHtml}
    <td class="col-ref"><span class="${r1 !== null ? 'cell-wr1' : 'cell-empty'}">${r1 !== null ? fmtScore(r1) : '–'}</span></td>
    <td class="col-ref"><span class="${r2 !== null ? 'cell-wr2' : 'cell-empty'}">${r2 !== null ? fmtScore(r2) : '–'}</span></td>
    <td class="col-ref"><span class="${r3 !== null ? 'cell-wr3' : 'cell-empty'}">${r3 !== null ? fmtScore(r3) : '–'}</span></td>
    <td class="col-total"><span class="${complete ? 'cell-total-full' : partial ? 'cell-total-partial' : 'cell-empty'}">${total !== null ? fmtScore(total) : '–'}</span></td>
  `;
  return tr;
}

function updateProgressChips() {
  ['referee1', 'referee2', 'referee3'].forEach((ref, i) => {
    const count = Object.values(state.ratings).filter(r => r[ref] !== null && r[ref] !== undefined).length;
    const el = document.getElementById(`prog-wr${i + 1}`);
    if (el) el.textContent = count;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullyRated(id) {
  const r = state.ratings[id];
  return r && r.referee1 !== null && r.referee2 !== null && r.referee3 !== null;
}

function totalScore(id) {
  const r = state.ratings[id];
  if (!r) return null;
  const vals = [r.referee1, r.referee2, r.referee3].filter(v => v !== null && v !== undefined);
  return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0);
}

function partialScore(id) {
  return totalScore(id);
}

function fmtScore(v) {
  if (v === null || v === undefined) return '–';
  // Show integer without decimal, otherwise 1 decimal place
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function rankCls(rank, complete) {
  if (!complete) return 'rank-n';
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-n';
}

// ─── Sort Toggle ──────────────────────────────────────────────────────────────

function toggleSort() {
  sortByTotal = document.getElementById('sort-by-total').checked;
  renderCommittee();
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV() {
  const rows = [['Nr.', 'WR 1', 'WR 2', 'WR 3', 'Gesamt']];
  for (let i = 1; i <= state.numCompetitors; i++) {
    const r = state.ratings[i] || {};
    const total = totalScore(i);
    rows.push([
      i,
      r.referee1 ?? '',
      r.referee2 ?? '',
      r.referee3 ?? '',
      total !== null ? fmtScore(total) : '',
    ]);
  }
  const csv  = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `tanzwertung_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function confirmReset() {
  if (confirm('Alle Wertungen wirklich löschen?\nDiese Aktion kann nicht rückgängig gemacht werden.')) {
    sendReset();
  }
}
