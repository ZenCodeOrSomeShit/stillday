(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StilldayModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MODES = {
    focus: { label: 'Focus', minutes: 25 },
    short: { label: 'Short break', minutes: 5 },
    long: { label: 'Long break', minutes: 15 }
  };

  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const dayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const createTask = (title) => ({
    id: uid(),
    title: String(title || '').trim(),
    done: false,
    sessions: 0,
    createdAt: new Date().toISOString()
  });

  const defaultState = () => ({
    version: 1,
    tasks: [],
    note: '',
    activeTaskId: null,
    mode: 'focus',
    duration: MODES.focus.minutes * 60,
    remaining: MODES.focus.minutes * 60,
    theme: 'dark',
    goal: 4,
    history: {}
  });

  const normalizeState = (input) => {
    const base = defaultState();
    if (!input || typeof input !== 'object') return base;
    const mode = MODES[input.mode] ? input.mode : base.mode;
    const tasks = Array.isArray(input.tasks)
      ? input.tasks
          .filter((task) => task && typeof task.title === 'string' && task.title.trim())
          .map((task) => ({
            id: String(task.id || uid()),
            title: task.title.trim().slice(0, 160),
            done: Boolean(task.done),
            sessions: Math.max(0, Number(task.sessions) || 0),
            createdAt: task.createdAt || new Date().toISOString()
          }))
      : [];

    return {
      ...base,
      ...input,
      version: 1,
      mode,
      tasks,
      note: typeof input.note === 'string' ? input.note.slice(0, 100000) : '',
      activeTaskId: tasks.some((task) => task.id === input.activeTaskId) ? input.activeTaskId : null,
      duration: Math.max(60, Number(input.duration) || MODES[mode].minutes * 60),
      remaining: Math.max(0, Number(input.remaining) || MODES[mode].minutes * 60),
      theme: input.theme === 'light' ? 'light' : 'dark',
      goal: Math.min(12, Math.max(1, Number(input.goal) || 4)),
      history: input.history && typeof input.history === 'object' ? input.history : {}
    };
  };

  const recordSession = (state, when = new Date()) => {
    const key = dayKey(when);
    const current = state.history[key] || { sessions: 0, minutes: 0 };
    const minutes = Math.round(state.duration / 60);
    const tasks = state.tasks.map((task) =>
      task.id === state.activeTaskId ? { ...task, sessions: task.sessions + 1 } : task
    );
    return {
      ...state,
      tasks,
      history: {
        ...state.history,
        [key]: { sessions: current.sessions + 1, minutes: current.minutes + minutes }
      }
    };
  };

  return { MODES, dayKey, createTask, defaultState, normalizeState, recordSession };
});
