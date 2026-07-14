const { MODES, dayKey, createTask, defaultState, normalizeState, recordSession } = window.StilldayModel;
const STORAGE_KEY = 'stillday-state-v1';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let state = loadState();
let running = false;
let tickHandle = null;
let targetTime = null;
let noteSaveHandle = null;

function loadState() {
  try { return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return defaultState(); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateState(patch, render = true) {
  state = normalizeState({ ...state, ...patch });
  saveState();
  if (render) renderAll();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function setMode(mode) {
  stopTimer();
  const duration = MODES[mode].minutes * 60;
  updateState({ mode, duration, remaining: duration });
}

function startPause() {
  if (running) {
    const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
    stopTimer();
    updateState({ remaining });
    return;
  }
  running = true;
  targetTime = Date.now() + state.remaining * 1000;
  tickHandle = setInterval(tick, 250);
  tick();
}

function stopTimer() {
  running = false;
  clearInterval(tickHandle);
  tickHandle = null;
  targetTime = null;
}

function tick() {
  const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
  state.remaining = remaining;
  renderTimer();
  if (remaining <= 0) completeTimer();
}

function completeTimer() {
  stopTimer();
  if (state.mode === 'focus') {
    state = recordSession(state);
    showToast('Focus complete. Let that count.');
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Stillday', { body: 'Focus complete. Time to breathe.' });
  } else {
    showToast('Break complete. Ready for another small step?');
  }
  const nextMode = state.mode === 'focus' ? 'short' : 'focus';
  const duration = MODES[nextMode].minutes * 60;
  updateState({ mode: nextMode, duration, remaining: duration });
}

function resetTimer() {
  stopTimer();
  updateState({ remaining: state.duration });
}

function skipTimer() {
  stopTimer();
  const nextMode = state.mode === 'focus' ? 'short' : 'focus';
  setMode(nextMode);
}

function renderAll() {
  document.documentElement.dataset.theme = state.theme;
  $('#theme-button').textContent = state.theme === 'dark' ? '☼' : '☾';
  renderTimer();
  renderTasks();
  renderGoal();
  renderInsights();
  if ($('#note').value !== state.note) $('#note').value = state.note;
  renderNoteCount();
}

function renderTimer() {
  $('#timer').textContent = formatTime(state.remaining);
  document.title = running ? `${formatTime(state.remaining)} · Stillday` : 'Stillday';
  $('#start-button').textContent = running ? 'Pause' : state.mode === 'focus' ? 'Begin focus' : 'Begin break';
  $('#timer-label').textContent = running ? (state.mode === 'focus' ? 'Quietly in progress' : 'Take the space') : 'Ready when you are';
  const activeTask = state.tasks.find((task) => task.id === state.activeTaskId);
  $('#active-task-label').textContent = activeTask ? activeTask.title : 'No task selected';
  const circumference = 2 * Math.PI * 112;
  const progress = state.duration ? state.remaining / state.duration : 1;
  $('#ring-progress').style.strokeDashoffset = String(circumference * (1 - progress));
  $$('.mode').forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode));
}

function renderTasks() {
  const list = $('#task-list');
  list.replaceChildren();
  for (const task of state.tasks) {
    const item = document.createElement('div');
    item.className = `task-item${task.done ? ' done' : ''}${task.id === state.activeTaskId ? ' active-task' : ''}`;
    item.dataset.id = task.id;

    const check = document.createElement('button');
    check.className = 'task-check';
    check.setAttribute('aria-label', task.done ? 'Mark task open' : 'Complete task');
    check.textContent = task.done ? '✓' : '';
    check.addEventListener('click', () => toggleTask(task.id));

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    title.title = task.title;
    title.addEventListener('dblclick', () => editTask(task.id));

    const sessions = document.createElement('span');
    sessions.className = 'session-count';
    sessions.textContent = task.sessions ? `${task.sessions}×` : '';

    const focus = document.createElement('button');
    focus.className = 'focus-task';
    focus.title = 'Set as current focus';
    focus.setAttribute('aria-label', 'Set as current focus');
    focus.textContent = task.id === state.activeTaskId ? '●' : '○';
    focus.addEventListener('click', () => updateState({ activeTaskId: task.id === state.activeTaskId ? null : task.id }));

    const remove = document.createElement('button');
    remove.className = 'delete-task';
    remove.title = 'Delete task';
    remove.setAttribute('aria-label', 'Delete task');
    remove.textContent = '×';
    remove.addEventListener('click', () => deleteTask(task.id));

    item.append(check, title, sessions, focus, remove);
    list.append(item);
  }
  const open = state.tasks.filter((task) => !task.done).length;
  $('#task-count').textContent = `${open} open`;
  $('#empty-tasks').hidden = state.tasks.length > 0;
  $('#clear-completed').disabled = !state.tasks.some((task) => task.done);
}

function addTask(title) {
  const task = createTask(title);
  if (!task.title) return;
  updateState({ tasks: [...state.tasks, task], activeTaskId: state.activeTaskId || task.id });
}

function toggleTask(id) {
  const tasks = state.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task);
  const active = tasks.find((task) => task.id === id);
  updateState({ tasks, activeTaskId: active?.done && state.activeTaskId === id ? null : state.activeTaskId });
}

function deleteTask(id) {
  updateState({ tasks: state.tasks.filter((task) => task.id !== id), activeTaskId: state.activeTaskId === id ? null : state.activeTaskId });
}

function editTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  const next = window.prompt('Rename task', task.title);
  if (next?.trim()) updateState({ tasks: state.tasks.map((item) => item.id === id ? { ...item, title: next.trim().slice(0, 160) } : item) });
}

function renderGoal() {
  const sessions = state.history[dayKey()]?.sessions || 0;
  $('#goal-label').textContent = `${sessions} / ${state.goal}`;
  $('#goal-fill').style.width = `${Math.min(100, sessions / state.goal * 100)}%`;
}

function getLastDays(count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (count - 1 - index));
    return { date, key: dayKey(date), data: state.history[dayKey(date)] || { sessions: 0, minutes: 0 } };
  });
}

function renderInsights() {
  const days = getLastDays();
  $('#today-minutes').textContent = state.history[dayKey()]?.minutes || 0;
  $('#week-sessions').textContent = days.reduce((sum, day) => sum + day.data.sessions, 0);
  let streak = 0;
  for (const day of [...days].reverse()) {
    if (day.data.sessions > 0) streak += 1;
    else if (day.key !== dayKey()) break;
  }
  $('#streak').textContent = streak;

  const max = Math.max(1, ...days.map((day) => day.data.minutes));
  const chart = $('#week-chart');
  chart.replaceChildren();
  for (const day of days) {
    const column = document.createElement('div');
    column.className = 'day-column';
    const value = document.createElement('strong');
    value.textContent = `${day.data.minutes}m`;
    const wrap = document.createElement('div');
    wrap.className = 'bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(2, day.data.minutes / max * 100)}%`;
    wrap.append(bar);
    const label = document.createElement('span');
    label.textContent = day.date.toLocaleDateString(undefined, { weekday: 'short' });
    column.append(value, wrap, label);
    chart.append(column);
  }
}

function renderNoteCount() {
  const words = state.note.trim() ? state.note.trim().split(/\s+/).length : 0;
  $('#note-count').textContent = `${words} word${words === 1 ? '' : 's'}`;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.handle);
  showToast.handle = setTimeout(() => toast.classList.remove('show'), 2500);
}

$('#date-label').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  addTask($('#task-input').value);
  $('#task-input').value = '';
});
$('#start-button').addEventListener('click', startPause);
$('#reset-button').addEventListener('click', resetTimer);
$('#skip-button').addEventListener('click', skipTimer);
$$('.mode').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('#clear-completed').addEventListener('click', () => updateState({ tasks: state.tasks.filter((task) => !task.done) }));
$('#note').addEventListener('input', (event) => {
  state.note = event.target.value;
  $('#save-state').textContent = 'Saving…';
  renderNoteCount();
  clearTimeout(noteSaveHandle);
  noteSaveHandle = setTimeout(() => { saveState(); $('#save-state').textContent = 'Saved'; }, 400);
});
$('#theme-button').addEventListener('click', () => updateState({ theme: state.theme === 'dark' ? 'light' : 'dark' }));
$$('.nav-item').forEach((button) => button.addEventListener('click', () => {
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item === button));
  $$('.view').forEach((view) => view.classList.toggle('active-view', view.id === `${button.dataset.view}-view`));
}));
$('#settings-button').addEventListener('click', () => { $('#goal-input').value = state.goal; $('#settings-dialog').showModal(); });
$('#goal-input').addEventListener('change', (event) => updateState({ goal: Number(event.target.value) }));
$('#export-button').addEventListener('click', async () => {
  const result = await window.stillday.exportBackup(JSON.stringify(state, null, 2));
  if (!result.canceled) showToast('Backup exported.');
});
$('#import-button').addEventListener('click', async () => {
  const result = await window.stillday.importBackup();
  if (result.canceled) return;
  try {
    state = normalizeState(JSON.parse(result.data));
    saveState();
    renderAll();
    $('#settings-dialog').close();
    showToast('Backup restored.');
  } catch { showToast('That file is not a valid Stillday backup.'); }
});

window.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea') || $('#settings-dialog').open) return;
  if (event.code === 'Space') { event.preventDefault(); startPause(); }
  if (event.key.toLowerCase() === 'n') $('#task-input').focus();
});

if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
renderAll();
