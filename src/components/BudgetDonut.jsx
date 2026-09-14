import { useState, useMemo } from 'react';
import DonutRing from './DonutRing';

const GREEN = '#4C9A4A';
const YELLOW = '#D9A62E';
const ORANGE = '#E07B39';
const RED = '#C1442D';
const TRACK = '#E7E4D9';
const EMPTY_TRACK = '#D8D4C7';

const CATEGORY_COLORS = {
  Rent: '#2F6F5E', Groceries: '#7A9D54', Utilities: '#C98A3E', Transport: '#3E7CB1',
  Health: '#B15E82', Entertainment: '#8A5FBF', Debt: '#993C1D', Other: '#8A897F',
};

function usageColor(pct) {
  if (pct < 60) return GREEN;
  if (pct < 85) return YELLOW;
  if (pct < 100) return ORANGE;
  return RED;
}

function computeUsage(incomeTotal, expenseTotal, fmt) {
  if (incomeTotal === 0 && expenseTotal === 0) {
    return { segments: [{ fraction: 1, color: EMPTY_TRACK }], label: '—', sublabel: 'No income yet', labelColor: '#8A897F' };
  }
  if (incomeTotal === 0 && expenseTotal > 0) {
    return { segments: [{ fraction: 1, color: RED }], label: fmt(-expenseTotal), sublabel: 'No income logged', labelColor: RED };
  }
  const pct = (expenseTotal / incomeTotal) * 100;
  const color = usageColor(pct);
  const filled = Math.min(pct / 100, 1);
  return {
    segments: [{ fraction: filled, color }, { fraction: 1 - filled, color: TRACK }],
    label: `${Math.round(pct)}%`,
    sublabel: pct > 100 ? `${Math.round(pct - 100)}% over income` : 'of income used',
    labelColor: pct >= 100 ? RED : '#1F2A24',
  };
}

function computeCategories(incomeTotal, expenses, convert, currency) {
  const byCategory = {};
  expenses.forEach((e) => {
    const amt = convert(Number(e.amount), e.currency || currency, currency);
    byCategory[e.category] = (byCategory[e.category] || 0) + amt;
  });
  const expenseTotal = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const overBudget = incomeTotal > 0 && expenseTotal > incomeTotal;
  const baseline = overBudget ? expenseTotal : (incomeTotal > 0 ? incomeTotal : (expenseTotal || 1));

  const items = Object.entries(byCategory).map(([category, amount]) => ({
    category, amount, fraction: amount / baseline, color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Other,
  }));
  if (!overBudget && incomeTotal > 0) {
    const remaining = incomeTotal - expenseTotal;
    if (remaining > 0) items.push({ category: 'Unspent', amount: remaining, fraction: remaining / baseline, color: TRACK });
  }
  if (items.length === 0) items.push({ category: 'Unspent', amount: 0, fraction: 1, color: EMPTY_TRACK });
  return { segments: items, overBudget, expenseTotal };
}

export default function BudgetDonut({ incomeTotal, expenses, fmt, convert, currency }) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('usage');

  const expenseTotal = useMemo(() => (expenses || []).reduce((s, e) => s + convert(Number(e.amount), e.currency || currency, currency), 0), [expenses, convert, currency]);
  const usage = useMemo(() => computeUsage(incomeTotal, expenseTotal, fmt), [incomeTotal, expenseTotal, fmt]);
  const categories = useMemo(() => computeCategories(incomeTotal, expenses, convert, currency), [incomeTotal, expenses, convert, currency]);

  return (
    <>
      <button className="donut-badge" onClick={() => setVisible(true)} aria-label="Open budget chart">
        <DonutRing segments={usage.segments} size={44} strokeWidth={6}>
          <span className="donut-badge-text" style={{ color: usage.labelColor }}>{usage.label}</span>
        </DonutRing>
      </button>

      {visible && (
        <div className="modal-overlay" onClick={() => setVisible(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="mode-switch">
                <button className={`mode-btn ${mode === 'usage' ? 'active' : ''}`} onClick={() => setMode('usage')}>Usage</button>
                <button className={`mode-btn ${mode === 'categories' ? 'active' : ''}`} onClick={() => setMode('categories')}>Categories</button>
              </div>
              <button className="close-x" onClick={() => setVisible(false)} aria-label="Close">×</button>
            </div>

            <div className="ring-wrap">
              <DonutRing segments={mode === 'usage' ? usage.segments : categories.segments} size={200} strokeWidth={24}>
                {mode === 'usage' ? (
                  <div className="center-label-wrap">
                    <span className="center-label" style={{ color: usage.labelColor }}>{usage.label}</span>
                    <span className="center-sub">{usage.sublabel}</span>
                  </div>
                ) : (
                  <div className="center-label-wrap">
                    <span className="center-label">{fmt(categories.expenseTotal)}</span>
                    <span className="center-sub">{categories.overBudget ? 'over income' : 'spent'}</span>
                  </div>
                )}
              </DonutRing>
            </div>

            {mode === 'categories' && (
              <div className="legend">
                {categories.segments.filter((s) => s.category !== 'Unspent').map((seg, i) => (
                  <div key={i} className="legend-row">
                    <span className="swatch" style={{ backgroundColor: seg.color }} />
                    <span className="legend-label">{seg.category}</span>
                    <span className="legend-amount">{fmt(seg.amount)}</span>
                  </div>
                ))}
                {categories.overBudget && <div className="over-text">Over income by {fmt(categories.expenseTotal - incomeTotal)}</div>}
              </div>
            )}

            {mode === 'usage' && (
              <div className="grade-legend">
                <div className="grade-row">
                   <span className="swatch" style={{ backgroundColor: GREEN }} />
                    <span className="legend-label">Under 60% used</span>
                    </div>

                  <div className="grade-row">
                    <span className="swatch" style={{ backgroundColor: YELLOW }} />
                    <span className="legend-label">60–84% used</span>
                  </div>

                <div className="grade-row">
                  <span className="swatch" style={{ backgroundColor: ORANGE }} />
                  <span className="legend-label">85–99% used</span>
                </div>

                <div className="grade-row">
                  <span className="swatch" style={{ backgroundColor: RED }} />
                  <span className="legend-label">100%+ or no income</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
