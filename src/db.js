import { supabase } from './supabaseClient';
import { CURRENCY_CODES } from './currency';

export async function getCurrentMonth() {
  const { data, error } = await supabase
    .from('months')
    .select('id, label, closed, closed_at, created_at')
    .eq('closed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  // First-ever login: create the first month row.
  const label = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const { data: created, error: insertError } = await supabase
    .from('months')
    .insert({ label })
    .select()
    .single();
  if (insertError) throw insertError;
  return created;
}

export async function getClosedMonths() {
  const { data, error } = await supabase
    .from('months')
    .select('id, label, closed, closed_at, created_at')
    .eq('closed', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getLastThreeMonths() {
  const current = await getCurrentMonth();
  const closed = await getClosedMonths();
  
  const months = [current];
  if (closed.length > 0) {
    months.push(...closed.slice(0, 2));
  }
  
  return months;
}

export async function getIncomeForMonth(monthId) {
  const { data, error } = await supabase.from('income').select('*').eq('month_id', monthId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addIncome(monthId, category, source, amount, currency) {
  const { error } = await supabase.from('income').insert({ month_id: monthId, category, source, amount, currency });
  if (error) throw error;
}

export async function updateIncome(id, category, source, amount, currency) {
  const { error } = await supabase.from('income').update({ category, source, amount, currency }).eq('id', id);
  if (error) throw error;
}

export async function deleteIncome(id) {
  const { error } = await supabase.from('income').delete().eq('id', id);
  if (error) throw error;
}

export async function getExpensesForMonth(monthId) {
  const { data, error } = await supabase.from('expenses').select('*').eq('month_id', monthId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addExpense(monthId, category, amount, note, currency) {
  const { error } = await supabase.from('expenses').insert({ month_id: monthId, category, amount, note, currency });
  if (error) throw error;
}

export async function updateExpense(id, category, amount, note, currency) {
  const { error } = await supabase.from('expenses').update({ category, amount, note, currency }).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function getMonthData(monthId) {
  const [income, expenses] = await Promise.all([getIncomeForMonth(monthId), getExpensesForMonth(monthId)]);
  return { income, expenses };
}



export async function getSavingsAccounts() {
  const { data, error } = await supabase.from('savings_accounts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addSavingsAccount(label, amount, currency) {
  const { error } = await supabase.from('savings_accounts').insert({ label, amount, currency });
  if (error) throw error;
}

export async function updateSavingsAccount(id, label, amount, currency) {
  const { error } = await supabase.from('savings_accounts').update({ label, amount, currency }).eq('id', id);
  if (error) throw error;
}

export async function deleteSavingsAccount(id) {
  const { error } = await supabase.from('savings_accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function getSavingsAccountsTotal() {
  return getSavingsAccounts();
}

export async function getSavingsTotal() {
  const closedMonths = await getClosedMonths();
  return await Promise.all(closedMonths.map(async (m) => {
    const [income, expenses] = await Promise.all([
      getIncomeForMonth(m.id),
      getExpensesForMonth(m.id)
    ]);

    const aggregateByCurrency = (items) => {
      return items.reduce((acc, item) => {
        const curr = item.currency || 'USD';
        acc[curr] = (acc[curr] || 0) + Number(item.amount);
        return acc;
      }, {});
    };

    return {
      incomeTotals: aggregateByCurrency(income),
      expenseTotals: aggregateByCurrency(expenses)
    };
  }));
}

function nextMonthLabel(label) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const [name, yearStr] = label.split(' ');
  let idx = monthNames.indexOf(name) + 1;
  let year = parseInt(yearStr, 10);
  if (idx > 11) { idx = 0; year += 1; }
  return `${monthNames[idx]} ${year}`;
}

export async function closeMonth() {
  const current = await getCurrentMonth();
  const { error: closeError } = await supabase
    .from('months')
    .update({ closed: true, closed_at: new Date().toISOString() })
    .eq('id', current.id);
  if (closeError) throw closeError;

  const { data: created, error: insertError } = await supabase.from('months').insert({ label: nextMonthLabel(current.label) }).select().single();
  if (insertError) throw insertError;
  return created;
}

export async function reopenMonth(monthId) {
  const closedMonths = await getClosedMonths();
  if (!closedMonths.length || closedMonths[0].id !== monthId) return false;

  const current = await getCurrentMonth();
  const [currentIncome, currentExpenses] = await Promise.all([getIncomeForMonth(current.id), getExpensesForMonth(current.id)]);
  if (currentIncome.length > 0 || currentExpenses.length > 0) return false;

  const { error: deleteError } = await supabase.from('months').delete().eq('id', current.id);
  if (deleteError) throw deleteError;

  const { data: reopened, error: reopenError } = await supabase.from('months').update({ closed: false, closed_at: null }).eq('id', monthId).select().single();
  if (reopenError) throw reopenError;
  return reopened;
}

export async function getCurrency() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user.id;
  const { data, error } = await supabase.from('user_settings').select('currency').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data) return data.currency;
  await supabase.from('user_settings').insert({ user_id: userId, currency: 'USD' });
  return 'USD';
}

export async function setCurrency(currency) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user.id;
  const { error } = await supabase.from('user_settings').upsert({ user_id: userId, currency });
  if (error) throw error;
}






