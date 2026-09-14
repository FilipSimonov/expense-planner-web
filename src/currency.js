export const CURRENCY_CODES = { 'USD': '$', 'EUR': '€', 'MKD': 'ден', 'GBP': '£' };
export const HOME_CURRENCY = 'USD';

const CACHE_KEY = 'fx_rates_usd';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchRatesUSD() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < CACHE_TTL_MS) return parsed.rates;
    }
  } catch {
    // ignore corrupt cache, refetch below
  }

  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  const data = await res.json();
  if (data.result !== 'success') throw new Error('Exchange rate lookup failed');

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: data.rates }));
  } catch {
    // storage full/unavailable — fine, we still have the fetched rates in memory
  }
  return data.rates;
}

