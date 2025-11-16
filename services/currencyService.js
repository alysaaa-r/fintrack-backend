const axios = require('axios');
const NodeCache = require('node-cache');

// Cache exchange rates for 1 hour (3600 seconds)
const ratesCache = new NodeCache({ stdTTL: 3600 });

/**
 * Currency Service
 * Handles real-time currency conversion using exchange rates
 * Base currency: PHP (all amounts stored in database as PHP)
 */

class CurrencyService {
  constructor() {
    // Using exchangerate-api.com (free tier: 1500 requests/month)
    // Alternative: fixer.io, openexchangerates.org, currencyapi.com
    this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/PHP';
    this.baseCurrency = 'PHP';
  }

  /**
   * Fetch latest exchange rates from API
   * Rates are relative to PHP (base currency)
   */
  async fetchRates() {
    try {
      const response = await axios.get(this.apiUrl, { timeout: 5000 });
      
      if (response.data && response.data.rates) {
        const rates = {
          rates: response.data.rates,
          timestamp: Date.now(),
          date: response.data.date
        };
        
        // Cache the rates
        ratesCache.set('exchange_rates', rates);
        console.log(`✅ Currency rates updated: ${response.data.date}`);
        
        return rates;
      }
      
      throw new Error('Invalid response from exchange rate API');
    } catch (error) {
      console.error('❌ Error fetching exchange rates:', error.message);
      
      // Return cached rates if API fails
      const cached = ratesCache.get('exchange_rates');
      if (cached) {
        console.log('⚠️  Using cached exchange rates');
        return cached;
      }
      
      // Fallback to default rates if no cache
      return this.getFallbackRates();
    }
  }

  /**
   * Get current exchange rates (from cache or fetch new)
   */
  async getRates() {
    const cached = ratesCache.get('exchange_rates');
    
    if (cached) {
      return cached;
    }
    
    return await this.fetchRates();
  }

  /**
   * Convert amount from one currency to another
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code (e.g., 'USD')
   * @param {string} toCurrency - Target currency code (e.g., 'PHP')
   * @returns {number} Converted amount
   */
  async convert(amount, fromCurrency, toCurrency) {
    if (!amount || amount === 0) return 0;
    
    // No conversion needed if same currency
    if (fromCurrency === toCurrency) return amount;
    
    const ratesData = await this.getRates();
    const rates = ratesData.rates;
    
    // Convert to base currency (PHP) first, then to target currency
    let amountInPHP = amount;
    
    if (fromCurrency !== this.baseCurrency) {
      // Convert from source currency to PHP
      if (!rates[fromCurrency]) {
        throw new Error(`Currency ${fromCurrency} not supported`);
      }
      amountInPHP = amount / rates[fromCurrency];
    }
    
    // Convert from PHP to target currency
    if (toCurrency !== this.baseCurrency) {
      if (!rates[toCurrency]) {
        throw new Error(`Currency ${toCurrency} not supported`);
      }
      return amountInPHP * rates[toCurrency];
    }
    
    return amountInPHP;
  }

  /**
   * Convert any currency amount to base currency (PHP) for database storage
   * @param {number} amount - Amount in user's currency
   * @param {string} currency - User's currency code
   * @returns {number} Amount in PHP
   */
  async convertToBase(amount, currency) {
    return await this.convert(amount, currency, this.baseCurrency);
  }

  /**
   * Convert PHP amount from database to user's preferred currency
   * @param {number} amountInPHP - Amount stored in database (PHP)
   * @param {string} currency - User's preferred currency
   * @returns {number} Amount in user's currency
   */
  async convertFromBase(amountInPHP, currency) {
    return await this.convert(amountInPHP, this.baseCurrency, currency);
  }

  /**
   * Get current rate for a specific currency pair
   * @param {string} fromCurrency 
   * @param {string} toCurrency 
   * @returns {number} Exchange rate
   */
  async getRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;
    
    const ratesData = await this.getRates();
    const rates = ratesData.rates;
    
    if (fromCurrency === this.baseCurrency) {
      return rates[toCurrency] || 1;
    }
    
    if (toCurrency === this.baseCurrency) {
      return 1 / (rates[fromCurrency] || 1);
    }
    
    // Convert through base currency
    const toBase = 1 / rates[fromCurrency];
    return toBase * rates[toCurrency];
  }

  /**
   * Fallback rates if API is unavailable (approximate rates)
   */
  getFallbackRates() {
    console.log('⚠️  Using fallback exchange rates');
    return {
      rates: {
        PHP: 1,
        USD: 0.018,
        EUR: 0.016,
        GBP: 0.014,
        JPY: 2.65,
        AUD: 0.027,
        CAD: 0.024,
        CNY: 0.13
      },
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Get list of supported currencies
   */
  async getSupportedCurrencies() {
    const ratesData = await this.getRates();
    return Object.keys(ratesData.rates);
  }
}

module.exports = new CurrencyService();
