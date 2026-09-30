const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
function load(path, requireModule) {
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const sandbox = { exports: {}, require: requireModule, localStorage, window: { dispatchEvent() {} }, Event: class {}, Intl, Date };
  vm.runInNewContext(output, sandbox);
  return sandbox.exports;
}
const memory = new Map();
const localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
const execution = load('lib/reading-execution.ts');
const store = load('lib/application-store.ts');
const { executionStatus, shiftDay, londonDay, validateReading, startCommitment, listCommitments } = execution;
for (const total of [1, 2, 100, 350, 351, 999]) {
  const plan = { bookId: 'b', totalPages: total, startDate: '2026-09-30' };
  const book = { id: 'b', currentPage: 0, totalPages: total };
  let sum = 0;
  for (let d = 0; d < 7; d++) {
    const status = executionStatus(plan, book, [], shiftDay(plan.startDate, d));
    sum += status.quota;
    assert.equal(status.pageTarget, Math.ceil(total * (d + 1) / 7));
  }
  assert.equal(sum, total);
  assert.equal(executionStatus(plan, book, [], '2026-10-07').overdue, true);
}
const plan = { bookId: 'b', totalPages: 350, startDate: '2026-09-30' };
const book = { id: 'b', currentPage: 50, totalPages: 350 };
const log = { bookId: 'b', pages: 50, createdAt: '2026-09-30T23:10:00Z' };
assert.equal(londonDay(new Date(log.createdAt)), '2026-10-01');
assert.equal(executionStatus(plan, book, [log], '2026-10-01').remainingToday, 0);
assert.equal(executionStatus(plan, book, [{ ...log, bookId: 'other' }], '2026-10-01').pagesToday, 0);
assert.equal(executionStatus(plan, book, [], '2026-10-02').behind, 50);
assert.ok(validateReading(book, 351));
assert.ok(validateReading(book, 50));
assert.ok(validateReading(book, 51.5));
assert.equal(validateReading(book, 51), null);
startCommitment('b', 350);
assert.equal(listCommitments().length, 1);
assert.throws(() => startCommitment('b', 350));
assert.throws(() => startCommitment('c', 0));
store.saveBooks([{ ...book, completed: false }]);
store.saveBooks([{ ...book, currentPage: 350, completed: false }]);
assert.equal(store.loadBooks()[0].completed, true);
assert.ok(store.loadBooks()[0].readingFinishedAt);
console.log('Passed: seven-day quotas, rounding, London dates, deadlines, book-specific credit, immutable start, input bounds and completion timestamp.');
