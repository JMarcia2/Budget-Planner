const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const dir = '/home/user/kinsenas-budget';
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
const w = dom.window;
w.scrollTo = () => {};                       // jsdom does not implement scrolling
if (!w.localStorage) {
  const store = {};
  w.localStorage = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
}

const errors = [];
w.onerror = m => errors.push('onerror: ' + m);
console.error = (...a) => { const s = a.join(' '); if (!/Not implemented/.test(s)) errors.push('console.error: ' + s); };

let code = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
code += '\n;window.__api={' +
  'renderDash,renderMove,renderBudget,renderDebt,renderEF,renderLedger,renderScripts,' +
  'forecast,moveEffective,cashNow,livingCost,waterfallRows,budgetTotals,debtTotals,' +
  'monthsToTarget,projectEF,defaults,PRESETS,PERIODS,MILESTONES,' +
  'get S(){return S},set S(v){S=v}};';
try { w.eval(code); } catch (e) { console.log('FATAL during eval:', e.message); process.exit(1); }

const A = w.__api, d = w.document;
let pass = 0, fail = 0;
const chk = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? '  (' + detail + ')' : '')); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  (' + detail + ')' : '')); }
};

/* ---------- 1. every tab renders without throwing ---------- */
console.log('=== tab render ===');
for (const t of ['dash', 'move', 'budget', 'debt', 'ef', 'ledger', 'scripts']) {
  errors.length = 0;
  d.querySelector(`#tabs button[data-tab="${t}"]`).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const pane = d.getElementById(t);
  chk('tab ' + t + ' renders', pane.innerHTML.length > 500 && errors.length === 0,
    pane.innerHTML.length + ' chars' + (errors.length ? ' ERR:' + errors[0] : ''));
}

/* ---------- 2. zero-based budget presets ---------- */
console.log('\n=== zero-based presets ===');
for (const k of Object.keys(A.PRESETS)) {
  const sum = A.PRESETS[k].reduce((s, r) => s + r[1], 0);
  chk('preset "' + k + '" sums to exactly 12,500', sum === 12500, 'sum=' + sum);
}
chk('default budget is zero-based on load', A.budgetTotals().un === 0, 'unassigned=' + A.budgetTotals().un);

/* ---------- 3. forecast with recommended switches ---------- */
console.log('\n=== forecast, negotiation switches ON ===');
A.S = A.defaults();
let fc = A.forecast();
fc.forEach(p => console.log('   ' + p.id.padEnd(6) + ' income ' + String(p.income).padStart(6) +
  '  out ' + String(p.out).padStart(6) + '  net ' + String(p.net).padStart(6) + '  running ' + String(p.run).padStart(6)));
let mn = Math.min(...fc.map(p => p.run));
chk('every period stays solvent', mn >= 0, 'min=' + mn);
chk('min running balance is 1,300 as designed', mn === 1300, 'min=' + mn);
chk('ends Dec 15 with 5,053 surplus', fc[fc.length - 1].run === 5053, 'final=' + fc[fc.length - 1].run);
chk('livingCost is 5,750/kinsenas', A.livingCost() === 5750, 'got ' + A.livingCost());

/* ---------- 4. the cash pool only counts the "now" period ---------- */
console.log('\n=== cash pool isolation ===');
const cn = A.cashNow();
chk('only pre-Sep-15 items draw on the 20,000', cn.remaining === 18700, 'remaining=' + cn.remaining);
chk('float after move-in = 1,300', cn.gap === 1300, 'gap=' + cn.gap);
chk('later bills are excluded from cash pool', !A.moveEffective().filter(i => i.src === 'now').some(i => /Installment|Rent —/.test(i.name)));

/* ---------- 5. waterfall reconciles to the debt ledger ---------- */
console.log('\n=== debt reconciliation ===');
A.renderDebt();
const dt = A.debtTotals();
chk('waterfall total matches debt total', A.waterfallRows.total === dt.total, A.waterfallRows.total + ' vs ' + dt.total);
chk('debt total is 20,997 (4500 + 11997 + 4500)', dt.total === 20997, 'total=' + dt.total);
chk('waterfall ends at zero', /Owed after[\s\S]*₱0/.test(d.getElementById('debt').innerHTML));

/* ---------- 6. worst case must be flagged, not hidden ---------- */
console.log('\n=== worst case (all negotiations refused) ===');
A.S = A.defaults();
A.S.scen.halfDeposit = false; A.S.scen.friendPartial = false; A.S.scen.deferPhone = false;
fc = A.forecast();
mn = Math.min(...fc.map(p => p.run));
chk('forecast goes negative', mn < 0, 'min=' + mn);
A.renderMove();
chk('UI shows the failure verdict', /This plan breaks/.test(d.getElementById('move').textContent));

/* ---------- 7. emergency fund math ---------- */
console.log('\n=== emergency fund ===');
A.S = A.defaults();
const m25 = A.monthsToTarget(25000), mF = A.monthsToTarget(A.S.ef.target);
chk('months to 25,000 is finite', isFinite(m25) && m25 > 0, m25 + ' months');
chk('months to full target > months to 25k', mF > m25, mF + ' > ' + m25);
A.S.ef.monthly = 0;
chk('zero savings rate returns Infinity, not NaN', A.monthsToTarget(25000) === Infinity);
A.S = A.defaults();
const pr = A.projectEF(12);
chk('projection is monotonically increasing', pr.out.every((r, i) => i === 0 || r.bal > pr.out[i - 1].bal));
chk('projection has 12 rows', pr.out.length === 12);

/* ---------- 8. UNDO a "paid" mark ---------- */
console.log('\n=== undo a paid mark ===');
A.S = A.defaults(); A.renderDash(); A.renderMove();
const cash0 = A.cashNow();
// the dashboard now lists paid items too, so find a pay button there
let btn = d.querySelector('#dash [data-pay]');
chk('dashboard exposes a pay button', !!btn);
btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
chk('clicking paid marks it done', A.cashNow().paid === 7000, 'paid=' + A.cashNow().paid);
chk('clicking paid reduces cash left', A.cashNow().left === 13000, 'left=' + A.cashNow().left);
// the same row must now offer an undo
btn = d.querySelector('#dash [data-pay]');
chk('button becomes an undo after paying', !!btn && /undo/i.test(btn.textContent), btn ? btn.textContent.trim() : 'missing');
chk('paid row is still listed (not hidden)', d.querySelectorAll('#dash [data-pay]').length === 6, 'buttons=' + d.querySelectorAll('#dash [data-pay]').length);
btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
chk('undo restores original cash', A.cashNow().left === cash0.left, cash0.left + ' -> ' + A.cashNow().left);
chk('undo restores paid total to 0', A.cashNow().paid === 0, 'paid=' + A.cashNow().paid);
// and it works from the Move-In tab too
A.renderMove();
const mvBtn = d.querySelector('#move [data-pay]');
mvBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const mvUndo = d.querySelector('#move [data-pay]');
chk('move-in tab also offers undo', /undo/i.test(mvUndo.textContent));
mvUndo.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
chk('move-in undo round-trips', A.cashNow().paid === 0);

/* ---------- 9. live totals while typing ---------- */
console.log('\n=== live totals while typing ===');
function type(sel, value) {
  const el = d.querySelector(sel);
  el.focus();
  el.value = value;
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
  return el;
}
A.S = A.defaults(); A.renderDash(); A.renderMove(); A.renderBudget(); A.renderDebt();
const baseCash = A.cashNow();
type('[data-mamt="adv"]', '8000');                       // move-in amount: +1,000
chk('move-in amount edits reach state', A.S.moveItems.find(i => i.id === 'adv').amt === 8000,
  'amt=' + A.S.moveItems.find(i => i.id === 'adv').amt);
chk('cash total updates live', A.cashNow().remaining === baseCash.remaining + 1000,
  baseCash.remaining + ' -> ' + A.cashNow().remaining);
chk('float updates live', A.cashNow().gap === baseCash.gap - 1000, baseCash.gap + ' -> ' + A.cashNow().gap);
chk('focus stays in the edited field', d.activeElement && d.activeElement.dataset.mamt === 'adv',
  d.activeElement ? (d.activeElement.dataset.mamt || d.activeElement.tagName) : 'none');
chk('typed text is preserved verbatim', d.querySelector('[data-mamt="adv"]').value === '8000');
// emptying the field must not fight the user
type('[data-mamt="adv"]', '');
chk('clearing a field is allowed (no forced 0)', d.querySelector('[data-mamt="adv"]').value === '',
  'value="' + d.querySelector('[data-mamt="adv"]').value + '"');
chk('cleared field counts as 0 in totals', A.S.moveItems.find(i => i.id === 'adv').amt === 0);
// budget amounts drive the zero-based balance live
A.S = A.defaults(); A.renderBudget();
type('[data-bamt="' + A.S.budget[2].id + '"]', '1000');
chk('budget edit updates unassigned live', A.budgetTotals().un === 1900, 'un=' + A.budgetTotals().un);
chk('budget shows over/under warning live', /over-committed|has no job/.test(d.getElementById('budget').textContent));
// income field drives everything
A.S = A.defaults(); A.renderBudget();
type('[data-income]', '15000');
chk('income edit updates unassigned live', A.budgetTotals().un === 2500, 'un=' + A.budgetTotals().un);
// emergency fund fields
A.S = A.defaults(); A.renderEF();
type('[data-efm]', '5000');
chk('EF monthly edit reaches state', A.S.ef.monthly === 5000);
chk('EF timeline recalculates live', A.monthsToTarget(25000) < 10, A.monthsToTarget(25000) + ' months');
// debt paid field
A.S = A.defaults(); A.renderDebt();
type('[data-dpaid="' + A.S.debts[0].id + '"]', '2000');
chk('debt paid edit updates total live', A.debtTotals().paid === 2000, 'paid=' + A.debtTotals().paid);

/* ---------- 10. every registry key has a live element ---------- */
console.log('\n=== field registry coverage ===');
A.S = A.defaults(); A.renderDash(); A.renderMove(); A.renderBudget(); A.renderDebt(); A.renderEF();
for (const k of ['mamt','bamt','bname','bnote','dpaid','income','efm','eft','efe','efr','scenamt']) {
  chk('field "' + k + '" is present in the DOM', d.querySelector('[data-' + k + ']') !== null);
}

/* ---------- 11. interactions mutate state correctly ---------- */
console.log('\n=== interactions ===');
A.S = A.defaults(); A.renderDash();
const before = A.cashNow().left;
d.querySelector('[data-pay]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
chk('marking an item paid reduces cash', A.cashNow().left === before - 7000, before + ' -> ' + A.cashNow().left);
A.S.ledger.push({ id: 'x1', date: '2026-09-15', type: 'in', cat: 'Emergency fund', amt: 1250, note: 't' });
A.renderDash();
chk('ledger EF entry reaches the dashboard', /₱1,250/.test(d.getElementById('dash').textContent));
A.S.budget[2].amt = 1000;
chk('budget edit breaks zero-based balance', A.budgetTotals().un === 1900, 'un=' + A.budgetTotals().un);

console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
console.log('runtime errors: ' + (errors.length ? errors.slice(0, 4).join(' | ') : 'none'));
process.exit(fail ? 1 : 0);
