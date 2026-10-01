import React from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { session } = useAuth();

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure? This will delete all your data and you cannot undo this!')) {
      return;
    }

    try {
      const userId = session.user.id;

      // 1. Delete all user's income
      const { error: incomeError } = await supabase.from('income').delete().eq('user_id', userId);
      if (incomeError) throw incomeError;

      // 2. Delete all user's expenses
      const { error: expenseError } = await supabase.from('expenses').delete().eq('user_id', userId);
      if (expenseError) throw expenseError;

      // 3. Delete all user's savings accounts
      const { error: savingsError } = await supabase.from('savings_accounts').delete().eq('user_id', userId);
      if (savingsError) throw savingsError;

      // 4. Delete user settings
      const { error: settingsError } = await supabase.from('user_settings').delete().eq('user_id', userId);
      if (settingsError) throw settingsError;

      // 5. Sign out
      await supabase.auth.signOut();
      window.location.href = '/'; // Redirect to login/welcome
    } catch (err) {
      alert('Error deleting account: ' + err.message);
    }
  };

  return (
    <div className="screen">
      <h1 className="auth-title">Settings</h1>
      <div className="settings-section" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Account Management</h2>
        <p className="hint" style={{ marginBottom: 16 }}>
          Once you delete your account, all your data will be permanently removed.
        </p>
        <button 
          className="cancel-edit" 
          onClick={handleDeleteAccount}
          style={{ width: '100%', padding: '10px', color: '#d32f2f' }}
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
}