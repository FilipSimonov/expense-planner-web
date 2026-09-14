import { useCallback, useEffect, useState, useMemo } from 'react';
import StatCard from '../components/StatCard';
import BudgetDonut from '../components/BudgetDonut';
import { useCurrency } from '../useCurrency';
import { CURRENCY_CODES } from '../currency';
import {
  getCurrentMonth,
  getIncomeForMonth, addIncome, updateIncome, deleteIncome,
  getExpensesForMonth, addExpense, updateExpense, deleteExpense,
  closeMonth,
} from '../db';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Mini job', 'Other'];
const CATEGORIES = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Health', 'Entertainment', 'Debt', 'Other'];

export default function LedgerScreen({ selectedMonth, onMonthClosed }) {
  const { currency, changeCurrency, fmt, convert, rateError } = useCurrency();
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [incCategory, setIncCategory] = useState(INCOME_CATEGORIES[0]);
  const [incSource, setIncSource] = useState('');
  const [incAmount, setIncAmount] = useState('');
  const [incCurrency, setIncCurrency] = useState('USD');
  const [editingIncomeId, setEditingIncomeId] = useState(null);

  const [expCategory, setExpCategory] = useState(CATEGORIES[0]);
  const [expCurrency, setExpCurrency] = useState('USD');
  const [expAmount, setExpAmount] = useState('');
  const [expNote, setExpNote] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [error, setError] = useState('');

  const reload = useCallback(async (showLoading = true) => {
    if (!selectedMonth) return;
    if (showLoading) setLoading(true);
    const [inc, exp] = await Promise.all([
      getIncomeForMonth(selectedMonth.id),
      getExpensesForMonth(selectedMonth.id),
    ]);
    setIncome(inc);
    setExpenses(exp);
    if (showLoading) setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (editingIncomeId) {
      const item = income.find(i => i.id === editingIncomeId);
      if (item) setIncAmount(String(item.amount));
    }
  }, [income, editingIncomeId]);

  useEffect(() => {
    if (editingExpenseId) {
      const item = expenses.find(e => e.id === editingExpenseId);
      if (item) setExpAmount(String(item.amount));
    }
  }, [expenses, editingExpenseId]);

  const incomeTotal = income.reduce((s, r) => s + convert(Number(r.amount), r.currency || 'USD'), 0);
  const expenseTotal = expenses.reduce((s, r) => s + convert(Number(r.amount), r.currency || 'USD'), 0);
  const balance = incomeTotal - expenseTotal;

  const resetIncomeForm = () => { setIncCategory(INCOME_CATEGORIES[0]); setIncSource(''); setIncAmount(''); setIncCurrency('USD'); setEditingIncomeId(null); };
  const resetExpenseForm = () => { setExpAmount(''); setExpNote(''); setExpCategory(CATEGORIES[0]); setExpCurrency('USD'); setEditingExpenseId(null); };

  const onStartEditIncome = (item) => {
    setEditingIncomeId(item.id);
    setIncCategory(item.category);
    setIncSource(item.source || '');
    setIncAmount(String(item.amount));
    setIncCurrency(item.currency || 'USD');
  };
  const onStartEditExpense = (item) => {
    setEditingExpenseId(item.id);
    setExpCategory(item.category);
    setExpAmount(String(item.amount));
    setExpNote(item.note || '');
    setExpCurrency(item.currency || 'USD');
  };

  const onSaveIncome = async () => {
    const amt = parseFloat(incAmount);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return; }
    setError('');
    if (editingIncomeId) await updateIncome(editingIncomeId, incCategory, incSource.trim(), amt, incCurrency);
    else await addIncome(selectedMonth.id, incCategory, incSource.trim(), amt, incCurrency);
    resetIncomeForm();
    reload(false);
  };

  const onSaveExpense = async () => {
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return; }
    setError('');
    if (editingExpenseId) await updateExpense(editingExpenseId, expCategory, amt, expNote.trim(), expCurrency);
    else await addExpense(selectedMonth.id, expCategory, amt, expNote.trim(), expCurrency);
    resetExpenseForm();
    reload(false);
  };

  const onCloseMonth = async () => {
    if (!selectedMonth) return;

    if (selectedMonth.closed) {
      const current = await getCurrentMonth();
      if (onMonthClosed) {
        onMonthClosed(current);
      } else {
        reload(false);
      }
      return;
    }

    const ok = window.confirm(
      `Close ${selectedMonth?.label}? This archives it and rolls the ${balance < 0 ? 'shortfall' : 'leftover'} into savings. You can undo this from History if you haven't added anything to the new month yet.`
    );
    if (!ok) return;
    const newMonth = await closeMonth();
    if (newMonth && onMonthClosed) {
      onMonthClosed(newMonth);
    } else {
      reload(false);
    }
  };

  if (!selectedMonth) return <div className="screen">Please select a month.</div>;
  if (loading) return <div className="screen">Loading…</div>;

  return (
    <div className="screen">
      <div className="top-bar">
        <div>
          <span className="month-label">{selectedMonth?.label}</span>
          <h1>Expense Planner</h1>
        </div>
        <div className="currency-row">
          {Object.keys(CURRENCY_CODES).map((c) => (
            <button key={c} className={`chip ${c === currency ? 'active' : ''}`} onClick={() => changeCurrency(c)}>{CURRENCY_CODES[c]} ({c})</button>
          ))}
        </div>
      </div>

      <div className="stats-row">
        <div className="stats-col">
          <StatCard label="Income" value={fmt(incomeTotal)} color="#3B6D11" />
          <StatCard label="Expenses" value={fmt(expenseTotal)} color="#993C1D" />
          <StatCard label="Balance" value={fmt(balance)} color={balance < 0 ? '#993C1D' : '#1F2A24'} />
        </div>
        <BudgetDonut incomeTotal={incomeTotal} expenses={expenses} fmt={fmt} convert={convert} currency={currency} />
      </div>
      {rateError && <p className="hint" style={{ marginTop: -8, marginBottom: 12 }}>Couldn't fetch live exchange rates — showing {currency !== '$' ? 'home-currency' : 'unconverted'} amounts.</p>}

      <div className="section">
        <h2>Income</h2>
        <p className="hint">Click an entry to edit it</p>
        {income.length === 0 && <p className="empty">No income logged yet.</p>}
        {income.map((item) => (
          <button key={item.id} className="row-item" onClick={() => onStartEditIncome(item)}>
            <span>{item.category}{item.source ? ` — ${item.source}` : ''}</span>
            <span className="row-right">
              <span>{fmt(item.amount, item.currency || 'USD')}</span>
              <span
                role="button" tabIndex={0} className="remove-btn"
                onClick={async (e) => { e.stopPropagation(); await deleteIncome(item.id); if (editingIncomeId === item.id) resetIncomeForm(); reload(false); }}
              >×</span>
            </span>
          </button>
        ))}
        <div className="category-row">
          {INCOME_CATEGORIES.map((c) => (
            <button key={c} className={`chip pill ${c === incCategory ? 'active' : ''}`} onClick={() => setIncCategory(c)}>{c}</button>
          ))}
        </div>
        <div className="form-row">
          <input placeholder="Note (optional)" value={incSource} onChange={(e) => setIncSource(e.target.value)} />
          <input placeholder="Amount" type="number" inputMode="decimal" value={incAmount} onChange={(e) => setIncAmount(e.target.value)} />
          <select value={incCurrency} onChange={(e) => setIncCurrency(e.target.value)} style={{ padding: '4px', borderRadius: '4px' }}>
            {Object.entries(CURRENCY_CODES).map(([code, symbol]) => (
              <option key={code} value={code}>{symbol} ({code})</option>
            ))}
          </select>
          <button className="add-btn" onClick={onSaveIncome}>{editingIncomeId ? 'Save' : 'Add'}</button>
        </div>
        {editingIncomeId && <button className="cancel-edit" onClick={resetIncomeForm}>Cancel edit</button>}
      </div>

      <div className="section">
        <h2>Expenses</h2>
        <p className="hint">Click an entry to edit it</p>
        {expenses.length === 0 && <p className="empty">No expenses logged yet.</p>}
        {expenses.map((item) => (
          <button key={item.id} className="row-item" onClick={() => onStartEditExpense(item)}>
            <span>{item.category}{item.note ? ` — ${item.note}` : ''}</span>
            <span className="row-right">
              <span>{fmt(item.amount, item.currency || 'USD')}</span>
              <span
                role="button" tabIndex={0} className="remove-btn"
                onClick={async (e) => { e.stopPropagation(); await deleteExpense(item.id); if (editingExpenseId === item.id) resetExpenseForm(); reload(false); }}
              >×</span>
            </span>
          </button>
        ))}
        <div className="category-row">
          {CATEGORIES.map((c) => (
            <button key={c} className={`chip pill ${c === expCategory ? 'active' : ''}`} onClick={() => setExpCategory(c)}>{c}</button>
          ))}
        </div>
        <div className="form-row">
          <input placeholder="Note (optional)" value={expNote} onChange={(e) => setExpNote(e.target.value)} />
          <input placeholder="Amount" type="number" inputMode="decimal" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
          <select value={expCurrency} onChange={(e) => setExpCurrency(e.target.value)} style={{ padding: '4px', borderRadius: '4px' }}>
            {Object.entries(CURRENCY_CODES).map(([code, symbol]) => (
              <option key={code} value={code}>{symbol} ({code})</option>
            ))}
          </select>
          <button className="add-btn" onClick={onSaveExpense}>{editingExpenseId ? 'Save' : 'Add'}</button>
        </div>
        {editingExpenseId && <button className="cancel-edit" onClick={resetExpenseForm}>Cancel edit</button>}
        {!!error && <p className="error-text">{error}</p>}
      </div>

      <div className="savings-row">
        <div>
          <span className="label" style={{ display: 'block' }}>This month, so far</span>
          <span className="value" style={{ color: balance < 0 ? '#993C1D' : '#1F2A24' }}>{fmt(balance)}</span>
        </div>
        <button className="close-btn" onClick={onCloseMonth}>
          {selectedMonth?.closed ? 'Return to current month' : 'Close month'}
        </button>
      </div>
    </div>
  );
}


