import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';
import AuthScreen from './screens/AuthScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import LedgerScreen from './screens/LedgerScreen';
import HistoryScreen from './screens/HistoryScreen';
import SavingsScreen from './screens/SavingsScreen';
import { getLastThreeMonths } from './db';

export default function App() {
  const { session } = useAuth();
  const [tab, setTab] = useState('ledger');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [showWelcome, setShowWelcome] = useState(window.location.pathname === '/welcome');
  const [showReset, setShowReset] = useState(window.location.pathname === '/reset-password');

  useEffect(() => {
    async function loadMonths() {
      if (!session) return;
      try {
        const months = await getLastThreeMonths();
        setAvailableMonths(months);
        if (months.length > 0) {
          setSelectedMonth(months[0]);
        }
      } catch (err) {
        console.error('Error loading months:', err);
      }
    }
    loadMonths();
  }, [session]);

  const handleMonthClosed = async (newMonth) => {
    setSelectedMonth(newMonth);
    // Small delay to allow Supabase to reflect the changes
    await new Promise(r => setTimeout(r, 500));
    try {
      const months = await getLastThreeMonths();
      setAvailableMonths(months);
    } catch (err) {
      console.error('Error updating months after close:', err);
    }
  };

  const handleReopenMonth = async (reopenedMonth) => {
    setSelectedMonth(reopenedMonth);
    // Small delay to allow Supabase to reflect the changes
    await new Promise(r => setTimeout(r, 500));
    try {
      const months = await getLastThreeMonths();
      setAvailableMonths(months);
    } catch (err) {
      console.error('Error updating months after reopen:', err);
    }
  };

  if (session === undefined) {
    return <div className="centered">Loading…</div>;
  }
  if (showReset) {
    return (
      <ResetPasswordScreen
        onDone={() => {
          window.history.replaceState({}, '', '/');
          setShowReset(false);
        }}
      />
    );
  }
  if (session === null) {
    return <AuthScreen />;
  }
  if (showWelcome) {
    return (
      <WelcomeScreen
        onContinue={() => {
          window.history.replaceState({}, '', '/');
          setShowWelcome(false);
        }}
      />
    );
  }

  if (session !== null && !selectedMonth && availableMonths.length === 0) {
    return <div className="centered">Loading month data...</div>;
  }

  return (
    <div className="app-shell">
      <div className="top-actions">
        <div className="month-selector-container">
          <select 
            value={selectedMonth?.id || ''} 
            onChange={(e) => {
              const month = availableMonths.find(m => m.id === e.target.value);
              if (month) setSelectedMonth(month);
            }}
            className="month-select"
          >
            {availableMonths.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div >
        <button className="signout-btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div >

      {tab === 'ledger' && <LedgerScreen selectedMonth={selectedMonth} onMonthClosed={handleMonthClosed} />}
      {tab === 'history' && <HistoryScreen selectedMonth={selectedMonth} onReopenMonth={handleReopenMonth} />}
      {tab === 'savings' && <SavingsScreen selectedMonth={selectedMonth} />}

      <nav className="tab-bar">
        <button className={`tab-btn ${tab === 'ledger' ? 'active' : ''}`} onClick={() => setTab('ledger')}>
          <span className="tab-icon">≡</span>Ledger
        </button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <span className="tab-icon">◷</span>History
        </button>
        <button className={`tab-btn ${tab === 'savings' ? 'active' : ''}`} onClick={() => setTab('savings')}>
          <span className="tab-icon">◈</span>Savings
        </button>
      </nav>
    </div >
  );
}

