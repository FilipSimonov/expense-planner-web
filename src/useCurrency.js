import { useCallback, useEffect, useState } from 'react';
import { getCurrency, setCurrency as saveCurrency } from './db';
import { fetchRatesUSD, HOME_CURRENCY } from './currency';

export function useCurrency() {
  const [currency, setCurrencyState] = useState(HOME_CURRENCY);
  const [rates, setRates] = useState(null); // null = not loaded yet
  const [rateError, setRateError] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    getCurrency().then(setCurrencyState);
    fetchRatesUSD().then(setRates).catch(() => setRateError(true));
  }, []);

  const changeCurrency = useCallback(async (c) => {
    if (c === currency || isConverting) return;
    setIsConverting(true);

    try {
    await saveCurrency(c);
      setCurrencyState(c);
    } catch (err) {
      console.error('Currency change failed:', err);
      throw err;
    } finally {
      setIsConverting(false);
    }
  }, [currency, isConverting]);

  const convert = useCallback((amount, fromCurrency) => {
    if (!rates || !fromCurrency || fromCurrency === currency) {
      return amount;
    }
    
    const amountInUSD = amount / rates[fromCurrency];
    return amountInUSD * rates[currency];
  }, [currency, rates]);

  const fmt = useCallback((amount, fromCurrency = currency) => {
    if (fromCurrency !== currency) {
      return `${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${fromCurrency}`;
    }
    const convertedAmount = convert(Number(amount || 0), fromCurrency);
    return `${convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
  }, [currency, convert]);

  return { currency, changeCurrency, fmt, convert, ratesLoaded: !!rates, rateError, isConverting };
}

