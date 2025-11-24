const Database = require('better-sqlite3');
const path = require('path');

// Initialize SQLite database
const dbPath = path.join(__dirname, 'data', 'finance_advisor.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
function initializeDatabase() {
  console.log('💰 Initializing Finance Database...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      age INTEGER,
      occupation TEXT,
      monthly_income REAL DEFAULT 0,
      risk_tolerance TEXT DEFAULT 'moderate',
      investment_experience TEXT DEFAULT 'beginner',
      financial_goals TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Financial Accounts
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL, -- savings, checking, investment, retirement
      institution TEXT,
      current_balance REAL DEFAULT 0,
      interest_rate REAL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Transactions
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      account_id INTEGER,
      transaction_type TEXT NOT NULL, -- income, expense, transfer, investment
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_recurring INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
    )
  `);

  // Budgets
  db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      monthly_limit REAL NOT NULL,
      current_spent REAL DEFAULT 0,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, category, month, year)
    )
  `);

  // Investment Portfolios
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      portfolio_name TEXT NOT NULL,
      portfolio_type TEXT DEFAULT 'diversified', -- conservative, moderate, aggressive, custom
      total_value REAL DEFAULT 0,
      total_invested REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Investment Assets
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL,
      asset_symbol TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      asset_type TEXT NOT NULL, -- stock, bond, etf, mutual_fund, crypto
      quantity REAL NOT NULL,
      purchase_price REAL NOT NULL,
      current_price REAL,
      purchase_date DATETIME,
      sector TEXT,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
    )
  `);

  // Financial Goals
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      goal_name TEXT NOT NULL,
      goal_type TEXT NOT NULL, -- retirement, house, education, emergency, vacation
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      target_date DATE,
      priority TEXT DEFAULT 'medium',
      monthly_contribution REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // AI Predictions
  db.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      prediction_type TEXT NOT NULL, -- expense, savings, investment_return
      predicted_value REAL NOT NULL,
      confidence_score REAL,
      prediction_date DATE NOT NULL,
      actual_value REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Investment Recommendations
  db.exec(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recommendation_type TEXT NOT NULL, -- buy, sell, hold, rebalance
      asset_symbol TEXT,
      asset_name TEXT,
      recommendation_text TEXT,
      confidence_score REAL,
      risk_level TEXT,
      potential_return REAL,
      time_horizon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Risk Assessments
  db.exec(`
    CREATE TABLE IF NOT EXISTS risk_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      risk_score REAL NOT NULL,
      risk_category TEXT NOT NULL, -- conservative, moderate, aggressive
      assessment_details TEXT,
      recommended_allocation TEXT,
      assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
    CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);
    CREATE INDEX IF NOT EXISTS idx_assets_portfolio ON assets(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
    CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
  `);

  console.log('✅ Finance Database initialized');
}

// Seed sample data
function seedDatabase() {
  console.log('🌱 Seeding Finance Database...');

  // Check if data already exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) {
    console.log('⚠️  Database already seeded');
    return;
  }

  // Insert sample users
  const insertUser = db.prepare(`
    INSERT INTO users (email, name, phone, age, occupation, monthly_income, risk_tolerance, investment_experience, financial_goals)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    ['john.investor@email.com', 'John Anderson', '+1234567890', 35, 'Software Engineer', 8500, 'moderate', 'intermediate', 'Retirement planning, House purchase'],
    ['sarah.saver@email.com', 'Sarah Chen', '+1234567891', 28, 'Marketing Manager', 6000, 'conservative', 'beginner', 'Emergency fund, Travel savings'],
    ['mike.trader@email.com', 'Mike Johnson', '+1234567892', 42, 'Business Owner', 12000, 'aggressive', 'advanced', 'Business expansion, Early retirement']
  ];

  const insertUsers = db.transaction((users) => {
    for (const user of users) {
      insertUser.run(...user);
    }
  });

  insertUsers(users);

  // Insert accounts
  const insertAccount = db.prepare(`
    INSERT INTO accounts (user_id, account_name, account_type, institution, current_balance, interest_rate)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const accounts = [
    [1, 'Primary Checking', 'checking', 'Chase Bank', 5000, 0.01],
    [1, 'High Yield Savings', 'savings', 'Ally Bank', 25000, 4.5],
    [1, 'Investment Account', 'investment', 'Vanguard', 45000, null],
    [2, 'Checking Account', 'checking', 'Bank of America', 3000, 0.01],
    [2, 'Emergency Savings', 'savings', 'Marcus', 15000, 4.3],
    [3, 'Business Checking', 'checking', 'Wells Fargo', 20000, 0.1],
    [3, 'Trading Account', 'investment', 'E*TRADE', 150000, null],
    [3, 'Retirement 401k', 'retirement', 'Fidelity', 280000, null]
  ];

  const insertAccounts = db.transaction((accounts) => {
    for (const account of accounts) {
      insertAccount.run(...account);
    }
  });

  insertAccounts(accounts);

  // Insert sample transactions
  const insertTransaction = db.prepare(`
    INSERT INTO transactions (user_id, account_id, transaction_type, category, amount, description, transaction_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transactions = [
    [1, 1, 'income', 'Salary', 8500, 'Monthly salary', '2025-01-01'],
    [1, 1, 'expense', 'Rent', 2200, 'Monthly rent payment', '2025-01-02'],
    [1, 1, 'expense', 'Groceries', 450, 'Whole Foods', '2025-01-03'],
    [1, 1, 'expense', 'Utilities', 150, 'Electric bill', '2025-01-05'],
    [1, 2, 'transfer', 'Savings', 2000, 'Monthly savings transfer', '2025-01-10'],
    [2, 4, 'income', 'Salary', 6000, 'Monthly salary', '2025-01-01'],
    [2, 4, 'expense', 'Rent', 1800, 'Apartment rent', '2025-01-02'],
    [2, 4, 'expense', 'Food', 350, 'Dining and groceries', '2025-01-04'],
    [3, 6, 'income', 'Business', 15000, 'Business revenue', '2025-01-01'],
    [3, 6, 'expense', 'Business', 3000, 'Operating expenses', '2025-01-05'],
    [3, 7, 'investment', 'Stock', 5000, 'AAPL purchase', '2025-01-08']
  ];

  const insertTransactions = db.transaction((transactions) => {
    for (const transaction of transactions) {
      insertTransaction.run(...transaction);
    }
  });

  insertTransactions(transactions);

  // Insert portfolios
  const insertPortfolio = db.prepare(`
    INSERT INTO portfolios (user_id, portfolio_name, portfolio_type, total_value, total_invested)
    VALUES (?, ?, ?, ?, ?)
  `);

  const portfolios = [
    [1, 'Growth Portfolio', 'moderate', 45000, 40000],
    [2, 'Conservative Savings', 'conservative', 15000, 14000],
    [3, 'Aggressive Growth', 'aggressive', 150000, 120000]
  ];

  const insertPortfolios = db.transaction((portfolios) => {
    for (const portfolio of portfolios) {
      insertPortfolio.run(...portfolio);
    }
  });

  insertPortfolios(portfolios);

  // Insert assets
  const insertAsset = db.prepare(`
    INSERT INTO assets (portfolio_id, asset_symbol, asset_name, asset_type, quantity, purchase_price, current_price, sector)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const assets = [
    [1, 'VTI', 'Vanguard Total Stock Market ETF', 'etf', 100, 200, 220, 'Total Market'],
    [1, 'VXUS', 'Vanguard International Stock ETF', 'etf', 50, 60, 65, 'International'],
    [1, 'BND', 'Vanguard Total Bond Market ETF', 'etf', 75, 80, 78, 'Bonds'],
    [2, 'AGG', 'iShares Core US Aggregate Bond', 'etf', 100, 100, 98, 'Bonds'],
    [2, 'VIG', 'Vanguard Dividend Appreciation ETF', 'etf', 50, 150, 160, 'Dividends'],
    [3, 'AAPL', 'Apple Inc.', 'stock', 100, 150, 185, 'Technology'],
    [3, 'TSLA', 'Tesla Inc.', 'stock', 50, 700, 250, 'Automotive'],
    [3, 'NVDA', 'NVIDIA Corporation', 'stock', 30, 300, 450, 'Technology']
  ];

  const insertAssets = db.transaction((assets) => {
    for (const asset of assets) {
      insertAsset.run(...asset);
    }
  });

  insertAssets(assets);

  // Insert financial goals
  const insertGoal = db.prepare(`
    INSERT INTO goals (user_id, goal_name, goal_type, target_amount, current_amount, target_date, priority, monthly_contribution)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const goals = [
    [1, 'House Down Payment', 'house', 100000, 25000, '2027-12-31', 'high', 2000],
    [1, 'Retirement Fund', 'retirement', 1000000, 70000, '2055-12-31', 'high', 1500],
    [2, 'Emergency Fund', 'emergency', 18000, 15000, '2025-12-31', 'high', 500],
    [2, 'Europe Vacation', 'vacation', 5000, 1000, '2026-06-30', 'medium', 200],
    [3, 'Early Retirement', 'retirement', 2000000, 430000, '2040-12-31', 'high', 5000],
    [3, 'Business Expansion', 'business', 200000, 50000, '2026-12-31', 'high', 3000]
  ];

  const insertGoals = db.transaction((goals) => {
    for (const goal of goals) {
      insertGoal.run(...goal);
    }
  });

  insertGoals(goals);

  // Insert sample budgets
  const insertBudget = db.prepare(`
    INSERT INTO budgets (user_id, category, monthly_limit, current_spent, month, year)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const budgets = [
    [1, 'Housing', 2200, 2200, 1, 2025],
    [1, 'Food', 600, 450, 1, 2025],
    [1, 'Transportation', 300, 150, 1, 2025],
    [1, 'Entertainment', 200, 75, 1, 2025],
    [1, 'Utilities', 200, 150, 1, 2025],
    [2, 'Housing', 1800, 1800, 1, 2025],
    [2, 'Food', 400, 350, 1, 2025],
    [2, 'Transportation', 200, 100, 1, 2025],
    [3, 'Business', 5000, 3000, 1, 2025],
    [3, 'Personal', 3000, 1500, 1, 2025]
  ];

  const insertBudgets = db.transaction((budgets) => {
    for (const budget of budgets) {
      insertBudget.run(...budget);
    }
  });

  insertBudgets(budgets);

  console.log('✅ Finance Database seeded successfully');
  console.log('');
  console.log('Sample Users:');
  console.log('  - john.investor@email.com (Software Engineer)');
  console.log('  - sarah.saver@email.com (Marketing Manager)');
  console.log('  - mike.trader@email.com (Business Owner)');
}

module.exports = { db, initializeDatabase, seedDatabase };