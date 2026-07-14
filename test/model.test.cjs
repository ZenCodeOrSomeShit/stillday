const test = require('node:test');
const assert = require('node:assert/strict');
const { createTask, defaultState, normalizeState, recordSession, dayKey } = require('../src/model.js');

test('createTask trims titles and creates usable records', () => {
  const task = createTask('  Write the first line  ');
  assert.equal(task.title, 'Write the first line');
  assert.equal(task.done, false);
  assert.equal(task.sessions, 0);
  assert.ok(task.id);
});

test('normalizeState safely repairs malformed backups', () => {
  const state = normalizeState({ mode: 'unknown', goal: 99, theme: 'neon', tasks: [{ title: '  Keep me ' }, null, { nope: true }] });
  assert.equal(state.mode, 'focus');
  assert.equal(state.goal, 12);
  assert.equal(state.theme, 'dark');
  assert.deepEqual(state.tasks.map((task) => task.title), ['Keep me']);
});

test('recordSession updates daily history and the selected task', () => {
  const task = createTask('Ship it');
  const state = { ...defaultState(), tasks: [task], activeTaskId: task.id };
  const when = new Date(2026, 6, 14, 12);
  const next = recordSession(state, when);
  assert.deepEqual(next.history[dayKey(when)], { sessions: 1, minutes: 25 });
  assert.equal(next.tasks[0].sessions, 1);
});

test('normalizeState clears an invalid active task', () => {
  const state = normalizeState({ activeTaskId: 'gone', tasks: [{ id: 'here', title: 'Present' }] });
  assert.equal(state.activeTaskId, null);
});
