# Real-Time Currency Conversion System

## Overview
The FinTrack app now supports **real-time multi-currency transactions** with automatic conversion based on live exchange rates.

## How It Works

### 1. **Base Currency: PHP**
- All amounts are stored in the database in **PHP (Philippine Peso)**
- This ensures consistency and accurate calculations across all transactions
- Users can interact with the app in their preferred currency

### 2. **Real-Time Exchange Rates**
- Exchange rates are fetched from `exchangerate-api.com` (free API)
- Rates are cached for 1 hour to improve performance
- Automatic fallback to cached rates if API is unavailable

### 3. **Automatic Conversion Flow**

#### Example Scenario:
**Budget:** Weekly budget of ₱1,500 PHP
**Expense:** User spends $2 USD

**What happens:**
1. User adds expense: `$2 USD`
2. Backend fetches current USD→PHP rate (e.g., 1 USD = ₱56.50)
3. Converts: `$2 × 56.50 = ₱113.00`
4. Stores in database:
   - `amount`: 2
   - `amountPHP`: 113
   - `currency`: 'USD'
   - `exchangeRate`: 56.50
   - `date`: Current date/time
5. Budget calculation: ₱1,500 - ₱113 = ₱1,387 remaining

## Database Schema Updates

### User Model
```javascript
{
  name: String,
  phone: String,
  username: String,
  profileImage: String,
  preferredCurrency: String,  // NEW: User's display currency (e.g., 'USD', 'EUR')
}
```

### SharedBudget Model
```javascript
{
  name: String,
  totalBudget: Number,        // Original amount in user's currency
  totalBudgetPHP: Number,     // NEW: Converted to PHP for calculations
  currency: String,           // Budget's currency
  expenses: [{
    amount: Number,           // Original expense amount
    amountPHP: Number,        // NEW: Converted to PHP
    currency: String,         // NEW: Expense currency
    exchangeRate: Number,     // NEW: Rate used at time of transaction
    description: String,
    date: Date
  }]
}
```

### SharedGoal Model
```javascript
{
  name: String,
  targetAmount: Number,       // Original target in user's currency
  targetAmountPHP: Number,    // NEW: Converted to PHP for calculations
  currency: String,
  contributions: [{
    amount: Number,           // Original contribution amount
    amountPHP: Number,        // NEW: Converted to PHP
    currency: String,         // NEW: Contribution currency
    exchangeRate: Number,     // NEW: Rate used at time of transaction
    type: String,             // 'add' or 'withdraw'
    description: String,
    date: Date
  }]
}
```

## API Endpoints

### Currency Endpoints

#### GET /api/currency/rates
Get current exchange rates
```json
Response:
{
  "success": true,
  "baseCurrency": "PHP",
  "rates": {
    "USD": 0.0177,
    "EUR": 0.0163,
    "GBP": 0.0140,
    ...
  },
  "date": "2025-11-16",
  "timestamp": 1700150400000
}
```

#### POST /api/currency/convert
Convert amount between currencies
```json
Request:
{
  "amount": 100,
  "fromCurrency": "USD",
  "toCurrency": "PHP"
}

Response:
{
  "success": true,
  "originalAmount": 100,
  "fromCurrency": "USD",
  "toCurrency": "PHP",
  "convertedAmount": 5650.00,
  "rate": 56.50
}
```

#### GET /api/currency/supported
Get list of supported currencies
```json
Response:
{
  "success": true,
  "currencies": ["PHP", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CNY", ...]
}
```

### Updated Budget/Goal Endpoints

#### POST /api/budgets/:id/expenses
Add expense with currency
```json
Request:
{
  "amount": 2,
  "currency": "USD",
  "description": "Coffee"
}

Response:
{
  "success": true,
  "budget": { ... },
  "conversionInfo": {
    "originalAmount": 2,
    "originalCurrency": "USD",
    "convertedAmount": 113.00,
    "baseCurrency": "PHP",
    "exchangeRate": 56.50
  }
}
```

#### POST /api/goals/:id/contributions
Add contribution with currency
```json
Request:
{
  "amount": 50,
  "currency": "EUR",
  "type": "add",
  "description": "Monthly savings"
}

Response:
{
  "success": true,
  "goal": { ... },
  "conversionInfo": {
    "originalAmount": 50,
    "originalCurrency": "EUR",
    "convertedAmount": 3100.00,
    "baseCurrency": "PHP",
    "exchangeRate": 62.00
  }
}
```

## Frontend Integration

### API Service Methods
```javascript
import api from './services/api';

// Get exchange rates
const rates = await api.getExchangeRates();

// Convert currency
const result = await api.convertCurrency(100, 'USD', 'PHP');

// Get supported currencies
const currencies = await api.getSupportedCurrencies();

// Add expense with currency
await api.addExpense(budgetId, {
  amount: 2,
  currency: 'USD',
  description: 'Coffee'
});

// Add contribution with currency
await api.addContribution(goalId, {
  amount: 50,
  currency: 'EUR',
  type: 'add'
});
```

## Benefits

1. **Accurate Tracking**: All calculations use PHP as base currency
2. **Historical Record**: Exchange rates are stored with each transaction
3. **Multi-Currency Support**: Users can transact in any supported currency
4. **Real-Time Rates**: Exchange rates update hourly
5. **Offline Support**: Fallback rates if API is unavailable
6. **Performance**: Rates are cached to reduce API calls

## Supported Currencies

- PHP (Philippine Peso) - Base Currency
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- AUD (Australian Dollar)
- CAD (Canadian Dollar)
- CNY (Chinese Yuan)
- And 150+ more currencies supported by the API

## Implementation Notes

### Currency Service (`services/currencyService.js`)
- Fetches live rates from exchangerate-api.com
- Caches rates for 1 hour (configurable)
- Automatic fallback to hardcoded rates if API fails
- All conversions go through PHP as base currency

### Calculation Logic
```javascript
// Example: Add $2 USD expense to ₱1,500 PHP budget

1. Fetch exchange rate: 1 USD = ₱56.50
2. Convert expense: $2 × 56.50 = ₱113.00
3. Calculate remaining: ₱1,500 - ₱113.00 = ₱1,387.00
4. Store both amounts:
   - Original: $2 USD (rate: 56.50)
   - Converted: ₱113.00 PHP
```

### Display Logic (Frontend)
Users can view amounts in their preferred currency:
- Budget total: Convert PHP → User Currency
- Expenses: Show original currency OR convert to user currency
- Running totals: Always calculated in PHP, displayed in user currency

## Future Enhancements

1. **User Preference**: Store preferred currency per user
2. **Currency Selector**: UI component for selecting currency
3. **Rate History**: Track historical exchange rates
4. **Custom Exchange Rates**: Allow manual rate input
5. **Multiple Base Currencies**: Support different base currencies per organization
6. **Currency Alerts**: Notify users of significant rate changes

## Testing

Test the currency conversion:
```bash
# Get rates
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/currency/rates

# Convert currency
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "fromCurrency": "USD", "toCurrency": "PHP"}' \
  http://localhost:5000/api/currency/convert
```

## Migration Notes

**Existing Data**: If you have existing budgets/goals without currency fields:
- Default currency will be 'PHP'
- `amountPHP` will equal `amount`
- `exchangeRate` will be 1

Consider running a migration script to populate these fields for existing data.
