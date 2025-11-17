// currencyService.js

const axios = require('axios');
const NodeCache = require('node-cache');

// 1. FIX: Hardcode the API Key here, or better, keep the ENV variable setup
// I'll keep the ENV variable setup and provide the instructions for setting it on Render.
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY; 

// Cache exchange rates for 1 hour (3600 seconds)
const ratesCache = new NodeCache({ stdTTL: 3600 });

/**
 * Currency Service
 * Handles real-time currency conversion using exchange rates
 * Base currency: PHP (all amounts stored in database as PHP)
 */

class CurrencyService {
  constructor() {
    // 2. FIX: Use V6 API URL structure and the environment variable key
    if (!EXCHANGE_RATE_API_KEY) {
        console.error("FATAL: EXCHANGE_RATE_API_KEY is missing. Using fallback rates only.");
        // This old URL is what causes the original error when run publicly
        this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/PHP';
    } else {
        // Correct V6 URL structure: https://v6.exchangerate-api.com/v6/YOUR_KEY/latest/PHP
        this.apiUrl = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/PHP`;
    }
    
    this.baseCurrency = 'PHP';
  }
    
  /**
   * Fetch latest exchange rates from API
   */
  async fetchRates() {
    try {
      // Use the constructed URL which now includes the key from the environment
      const response = await axios.get(this.apiUrl, { timeout: 5000 });
      
      // CRITICAL LOGIC ADJUSTMENT: Check for V6 API response structure ('conversion_rates')
      if (response.data && (response.data.rates || response.data.conversion_rates)) { 
        const rates = {
          // V6 uses 'conversion_rates', V4 uses 'rates'. Use unified key.
          rates: response.data.rates || response.data.conversion_rates, 
          timestamp: Date.now(),
          date: response.data.date || response.data.time_last_update_utc // Use V6 date field if available
        };
        
        // Cache the rates
        ratesCache.set('exchange_rates', rates);
        console.log(`✅ Currency rates updated: ${rates.date}`);
        
        return rates;
      }
      
      throw new Error('Invalid response from exchange rate API');
    } catch (error) {
      console.error('❌ Error fetching exchange rates:', error.message);
      
      // Return cached rates if API fails
      const cached = ratesCache.get('exchange_rates');
      if (cached) {
        console.log('⚠️  Using cached exchange rates');
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
      if (!rates[fromCurrency]) {
        throw new Error(`Currency ${fromCurrency} not supported`);
      }
      // Assuming 'rates' holds the reciprocal (Foreign to PHP) or direct rate
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
   */
  async convertToBase(amount, currency) {
    return await this.convert(amount, currency, this.baseCurrency);
  }

  /**
   * Convert PHP amount from database to user's preferred currency
   */
  async convertFromBase(amountInPHP, currency) {
    return await this.convert(amountInPHP, this.baseCurrency, currency);
  }

  /**
   * Get current rate for a specific currency pair
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
    console.log('⚠️  Using fallback exchange rates');
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