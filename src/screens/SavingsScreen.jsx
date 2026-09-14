import { useCallback, useEffect, useState, useMemo } from 'react';
import { useCurrency } from '../useCurrency';
import {
  getSavingsAccounts, addSavingsAccount, updateSavingsAccount, deleteSavingsAccount,
  getSavingsAccountsTotal, getSavingsTotal,
} from '../db';

export default function SavingsScreen() {
  const { fmt, currency, convert } = useCurrency();
  const [accounts, setAccounts] = useState([]);
  const [surpluses, setSurpluses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

    const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, monthSurpluses] = await Promise.all([
        getSavingsAccounts(), 
        getSavingsTotal(),
      ]);
      setAccounts(accs);
      setSurpluses(monthSurpluses || []);
    } catch (err) {
      console.error('Failed to reload savings:', err);
      setError('Failed to load savings data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const accountsTotal = useMemo(() => {
    return accounts.reduce((sum, item) => {
      return sum + convert(Number(item.amount), item.currency || 'USD', currency);
    }, 0);
  }, [accounts, convert, currency]);

  const monthlySavings = useMemo(() => {
    return surpluses.reduce((sum, m) => {
      const incomeTotal = Object.entries(m.incomeTotals || {}).reduce((s, [curr, amt]) => s + convert(amt, curr, currency), 0);
      const expenseTotal = Object.entries(m.expenseTotals || {}).reduce((s, [curr, amt]) => s + convert(amt, curr, currency), 0);
      return sum + (incomeTotal - expenseTotal);
    }, 0);
  }, [surpluses, convert, currency]);

  useEffect(() => {
    if (editingId) {
      const item = accounts.find(a => a.id === editingId);
      if (item) {
        setAmount(String(item.amount));
        setSelectedCurrency(item.currency || currency);
      }
    }
  }, [accounts, editingId, currency]);

  const resetForm = () => { 
    setLabel(''); 
    setAmount(''); 
    setSelectedCurrency(currency);
    setEditingId(null); 
  };

  const onStartEdit = (item) => {
    setEditingId(item.id);
    setLabel(item.label);
    setAmount(String(item.amount));
    setSelectedCurrency(item.currency || currency);
  };

  const onSave = async () => {
    const amt = parseFloat(amount);
    if (!label.trim() || isNaN(amt)) { setError('Enter a name and a valid amount'); return; }
    setError('');
    if (editingId) await updateSavingsAccount(editingId, label.trim(), amt, selectedCurrency);
    else await addSavingsAccount(label.trim(), amt, selectedCurrency);
    resetForm();
    reload();
  };

  const onDelete = async (id) => {
    await deleteSavingsAccount(id);
    if (editingId === id) resetForm();
    reload();
  };

  return (
    <div className="screen">
      <h1 style={{ fontSize: 22, marginBottom: 2 }}>Savings & Investments</h1>
      <p className="hint" style={{ marginBottom: 16 }}>Bank savings, investments, or other money held outside the monthly ledger.</p>

      <div className="savings-stats-row">
        <div className="savings-stat">
          <div className="label">Rolled over from months</div>
          <div className="value">{fmt(monthlySavings)}</div>
        </div>
        <div className="savings-stat">
          <div className="label">Other accounts</div>
          <div className="value">{fmt(accountsTotal)}</div>
        </div>
      </div>
      <div className="savings-total-row">
        <span className="label">Combined total</span>
        <span className="value">{fmt(monthlySavings + accountsTotal)}</span>
      </div>

      <div className="section">
        <h2>Accounts</h2>
        <p className="hint">Click an entry to edit it. Add as many as you like.</p>
        {accounts.length === 0 && <p className="empty">Nothing added yet.</p>}
        {Object.entries(accounts.reduce((acc, item) => {
          const curr = item.currency || 'USD';
          if (!acc[curr]) acc[curr] = [];
          acc[curr].push(item);
          return acc;
        }, {})).map(([curr, items]) => (
          <div key={curr} className="currency-group" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: '#888', marginBottom: 8, textTransform: 'uppercase' }}>{curr}</h3>
            {items.map((item) => (
              <button key={item.id} className="row-item" onClick={() => onStartEdit(item)}>
                <span>{item.label}</span>
                <span className="row-right">
                  <span>{fmt(item.amount, item.currency || curr)}</span>
                  <span role="button" tabIndex={0} className="remove-btn" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>×</span>
                </span>
              </button>
            ))}
          </div>
        ))}
        <div className="form-container" style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #eee' }}>
          <div className="form-row">
            <input placeholder="e.g. Emergency fund, Brokerage…" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="form-row" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input placeholder="Amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: 2 }} />
            <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} style={{ flex: 1 }}>
              {['USD', 'EUR', 'MKD', 'GBP', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button className="add-btn" style={{ width: '100%', marginTop: '12px' }} onClick={onSave}>{editingId ? 'Save' : 'Add'}</button>
          {editingId && <button className="cancel-edit" style={{ width: '100%', marginTop: '8px' }} onClick={resetForm}>Cancel edit</button>}
        </div>
        {editingId && <button className="cancel-edit" onClick={resetForm}>Cancel edit</button>}
        {!!error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
