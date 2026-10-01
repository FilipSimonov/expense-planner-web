import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) { setError('Enter your email'); return; }
    if (mode !== 'forgot' && !password) { setError('Enter your password'); return; }
    if (mode === 'signup' && !birthday) { setError('Enter your birthday'); return; }

    // Age validation
    if (mode === 'signup' && birthday) {
      const birthDate = new Date(birthday);
      if (isNaN(birthDate.getTime())) {
        setError('Please enter a valid birthday');
        return;
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 14) {
        setError('You must be at least 14 years old to join.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/welcome`,
            data: { birthday }
          },
        });
        if (err) throw err;
        setInfo('Check your email to confirm your account, then log in.');
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        setInfo("Check your email for a reset link.");
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="centered">
      <div className="auth-card">
        <h1 className="auth-title">Expense Planner</h1>
        <p className="auth-sub">
          {mode === 'login' && 'Log in to your budget'}
          {mode === 'signup' && 'Create an account'}
          {mode === 'forgot' && 'Reset your password'}
        </p>

        <form onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="birthday">Birthday</label>
              <input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>
          )}
          {mode !== 'forgot' && (
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
          )}
          {mode === 'login' && (
            <button type="button" className="cancel-edit" style={{ marginTop: 0, marginBottom: 12 }} onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}>
              Forgot password?
            </button>
          )}
          {!!error && <p className="auth-error">{error}</p>}
          {!!info && <p className="hint">{info}</p>}
          <button className="add-btn" type="submit" style={{ width: '100%', padding: '10px 0' }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'forgot' ? (
            <button onClick={() => { setMode('login'); setError(''); setInfo(''); }}>Back to login</button>
          ) : (
            <>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}>
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </>
          )}
        </p>
      </div>
      <div className="auth-footer">made by Filip and his local LLM</div>
    </div>
  );
}

