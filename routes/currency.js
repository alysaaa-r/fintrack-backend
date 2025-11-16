const express = require('express');
const router = express.Router();
const currencyService = require('../services/currencyService');
const { protect } = require('../middleware/auth');

// @route   GET /api/currency/rates
// @desc    Get current exchange rates
// @access  Private
router.get('/rates', protect, async (req, res) => {
  try {
    const ratesData = await currencyService.getRates();
    
    res.json({
      success: true,
      baseCurrency: 'PHP',
      rates: ratesData.rates,
      date: ratesData.date,
      timestamp: ratesData.timestamp
    });
  } catch (error) {
    console.error('Error getting rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates'
    });
  }
});

// @route   POST /api/currency/convert
// @desc    Convert amount between currencies
// @access  Private
router.post('/convert', protect, async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Amount, fromCurrency, and toCurrency are required'
      });
    }

    const convertedAmount = await currencyService.convert(
      parseFloat(amount),
      fromCurrency,
      toCurrency
    );

    const rate = await currencyService.getRate(fromCurrency, toCurrency);

    res.json({
      success: true,
      originalAmount: parseFloat(amount),
      fromCurrency,
      toCurrency,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      rate: Math.round(rate * 1000000) / 1000000
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert currency'
    });
  }
});

// @route   GET /api/currency/supported
// @desc    Get list of supported currencies
// @access  Private
router.get('/supported', protect, async (req, res) => {
  try {
    const currencies = await currencyService.getSupportedCurrencies();
    
    res.json({
      success: true,
      currencies: currencies.sort()
    });
  } catch (error) {
    console.error('Error getting supported currencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supported currencies'
    });
  }
});

module.exports = router;
