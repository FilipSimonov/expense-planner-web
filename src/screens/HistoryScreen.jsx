import { useCallback, useEffect, useState } from 'react';
import { useCurrency } from '../useCurrency';
import {
  getClosedMonths, getMonthData,
  getIncomeForMonth, updateIncome, deleteIncome,
  getExpensesForMonth, updateExpense, deleteExpense,
  reopenMonth,
} from '../db';
import { CURRENCY_CODES } from '../currency';

export default function HistoryScreen({ onReopenMonth }) {
  const { fmt, convert } = useCurrency();
  const [months, setMonths] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [entries, setEntries] = useState({ income: [], expenses: [] });
  const [editing, setEditing] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');

  const reload = useCallback(async () => {
    const closed = await getClosedMonths();
    const withData = await Promise.all(closed.map(async (m) => {
      const { income, expenses } = await getMonthData(m.id);
      return { ...m, income, expenses };
    }));
    setMonths(withData);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const toggleExpand = async (monthId) => {
    if (expandedId === monthId) { setExpandedId(null); return; }
    setEditing(null);
    setExpandedId(monthId);
    const [inc, exp] = await Promise.all([getIncomeForMonth(monthId), getExpensesForMonth(monthId)]);
    setEntries({ income: inc, expenses: exp });
  };

  const refreshExpanded = async (monthId) => {
    const [inc, exp] = await Promise.all([getIncomeForMonth(monthId), getExpensesForMonth(monthId)]);
    setEntries({ income: inc, expenses: exp });
    reload();
  };

  const startEditIncome = (item) => {
    setEditing({ type: 'income', id: item.id });
    setEditCategory(item.category);
    setEditSource(item.source || '');
    setEditAmount(String(item.amount));
    setEditCurrency(item.currency);
  };
  const startEditExpense = (item) => {
    setEditing({ type: 'expense', id: item.id });
    setEditCategory(item.category);
    setEditAmount(String(item.amount));
    setEditNote(item.note || '');
    setEditCurrency(item.currency);
  };
  const cancelEdit = () => setEditing(null);

  const saveEdit = async (monthId) => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (editing.type === 'income') {
      if (!editCategory.trim()) return;
      await updateIncome(editing.id, editCategory.trim(), editSource.trim(), amt, editCurrency);
    } else {
      await updateExpense(editing.id, editCategory, amt, editNote.trim(), editCurrency);
    }
    setEditing(null);
    refreshExpanded(monthId);
  };

  const removeEntry = async (monthId, type, id) => {
    if (type === 'income') await deleteIncome(id);
    else await deleteExpense(id);
    if (editing && editing.id === id) setEditing(null);
    refreshExpanded(monthId);
  };

  const onReopen = async (monthId, label) => {
    const ok = window.confirm(`Reopen ${label}? This makes it the current month again, so you can add or fix entries. Only works if you haven't started the new month yet.`);
    if (!ok) return;
    const reopenedMonth = await reopenMonth(monthId);
    if (!reopenedMonth) {
      window.alert("Can't reopen — you've already added something to the new month.");
    } else {
      if (onReopenMonth) onReopenMonth(reopenedMonth);
      reload();
    }
  };

  return (
    <div className="screen">
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>History</h1>
      {months.length === 0 && <p className="empty">No closed months yet. Close a month from the Ledger tab to see it here.</p>}
      {months.map((item, index) => {
        const incomeTotal = item.income.reduce((sum, r) => sum + convert(Number(r.amount), r.currency), 0);
        const expenseTotal = item.expenses.reduce((sum, r) => sum + convert(Number(r.amount), r.currency), 0);
        const net = incomeTotal - expenseTotal;
        const isExpanded = expandedId === item.id;
        const isMostRecent = index === 0;
        return (
          <div key={item.id} className="month-card">
            <button className="month-header" onClick={() => toggleExpand(item.id)}>
              <div>
                <div className="month-name">{item.label}</div>
                <div className="detail">Income {fmt(incomeTotal)} · Expenses {fmt(expenseTotal)}</div>
              </div>
              <span className="net" style={{ color: net < 0 ? '#993C1D' : '#3B6D11' }}>{fmt(net)}</span>
            </button>

            {isExpanded && (
              <div className="month-expanded">
                <div className="sub-title">Income</div>
                {entries.income.length === 0 && <p className="empty-small">None logged.</p>}
                {entries.income.map((row) => (
                  <div key={row.id}>
                    {editing?.type === 'income' && editing.id === row.id ? (
                      <div className="edit-row">
                        <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category" />
                        <input value={editSource} onChange={(e) => setEditSource(e.target.value)} placeholder="Note" />
                        <select value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)}>
                          {Object.entries(CURRENCY_CODES).map(([code, symbol]) => (
                            <option key={code} value={code}>{symbol} ({code})</option>
                          ))}
                        </select>
                        <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} type="number" inputMode="decimal" />
                        <button className="save-btn" onClick={() => saveEdit(item.id)}>Save</button>
                      </div>
                    ) : (
                      <div className="entry-row">
                        <button className="entry-main" onClick={() => startEditIncome(row)}>{row.category}{row.source ? ` — ${row.source}` : ''}</button>
                        <span className="row-right">
                          <span>{fmt(row.amount, row.currency)}</span>
                          <span role="button" tabIndex={0} className="remove-btn" onClick={() => removeEntry(item.id, 'income', row.id)}>×</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                <div className="sub-title" style={{ marginTop: 10 }}>Expenses</div>
                {entries.expenses.length === 0 && <p className="empty-small">None logged.</p>}
                {entries.expenses.map((row) => (
                  <div key={row.id}>
                    {editing?.type === 'expense' && editing.id === row.id ? (
                      <div className="edit-row">
                        <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category" />
                        <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note" />
                        <select value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)}>
                          {Object.entries(CURRENCY_CODES).map(([code, symbol]) => (
                            <option key={code} value={code}>{symbol} ({code})</option>
                          ))}
                        </select>
                        <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} type="number" inputMode="decimal" />
                        <button className="save-btn" onClick={() => saveEdit(item.id)}>Save</button>
                      </div>
                    ) : (
                      <div className="entry-row">
                        <button className="entry-main" onClick={() => startEditExpense(row)}>{row.category}{row.note ? ` — ${row.note}` : ''}</button>
                        <span className="row-right">
                          <span>{fmt(row.amount, row.currency)}</span>
                          <span role="button" tabIndex={0} className="remove-btn" onClick={() => removeEntry(item.id, 'expense', row.id)}>×</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {editing && <button className="cancel-edit" onClick={cancelEdit}>Cancel edit</button>}

                {isMostRecent && (
                  <button className="reopen-btn" onClick={() => onReopen(item.id, item.label)}>Reopen this month</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

