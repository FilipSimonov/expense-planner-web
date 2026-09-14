import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }

    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
    } catch (err) {
      setError(err.message || "Couldn't update password — the link may have expired. Request a new one from the login screen.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="centered">
        <div className="auth-card">
          <h1 className="auth-title">Password updated</h1>
          <p className="auth-sub">You're all set — continue into your budget.</p>
          <button className="add-btn" style={{ width: '100%', padding: '10px 0' }} onClick={onDone}>
            Continue to Expense Planner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="centered">
      <div className="auth-card">
        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-sub">Choose a new password for your account.</p>
        <form onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="auth-field">
            <label htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          {!!error && <p className="auth-error">{error}</p>}
          <button className="add-btn" type="submit" style={{ width: '100%', padding: '10px 0' }} disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
