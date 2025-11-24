const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const { db, initializeDatabase, seedDatabase } = require('./database');

// Initialize database
initializeDatabase();
seedDatabase();

// Express setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

app.use(cors());
app.use(express.json());

// ============================================
// OLLAMA AI FINANCIAL ADVISOR SERVICE
// ============================================
class FinanceAI {
  constructor() {
    this.host = OLLAMA_HOST;
    this.model = OLLAMA_MODEL;
  }

  async generate(prompt) {
    try {
      const response = await axios.post(`${this.host}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false
      });
      return response.data.response;
    } catch (error) {
      console.error('Ollama API Error:', error.message);
      // Fallback to rule-based analysis
      return null;
    }
  }

  // Analyze spending patterns
  async analyzeSpending(transactions, budgets) {
    const categoryTotals = {};
    
    transactions.forEach(t => {
      if (t.transaction_type === 'expense') {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      }
    });

    const insights = [];
    const overspending = [];

    // Check budget compliance
    budgets.forEach(budget => {
      const spent = categoryTotals[budget.category] || 0;
      const percentage = (spent / budget.monthly_limit) * 100;
      
      if (percentage > 100) {
        overspending.push({
          category: budget.category,
          overspent: spent - budget.monthly_limit,
          percentage: Math.round(percentage)
        });
      }
    });

    // Use AI for deeper insights
    const prompt = `As a financial advisor, analyze this spending pattern and provide 3 actionable insights:

Categories and spending:
${Object.entries(categoryTotals).map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`).join('\n')}

Overspending areas:
${overspending.map(o => `${o.category}: over by $${o.overspent.toFixed(2)}`).join('\n') || 'None'}

Provide ONLY a JSON array with 3 insights in this exact format:
[
  {
    "type": "warning" or "suggestion" or "success",
    "category": "category name",
    "message": "brief insight",
    "action": "specific recommendation"
  }
]`;

    try {
      const aiResponse = await this.generate(prompt);
      if (aiResponse) {
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    }

    // Fallback insights
    if (overspending.length > 0) {
      insights.push({
        type: 'warning',
        category: overspending[0].category,
        message: `Overspending by ${overspending[0].percentage}%`,
        action: `Reduce ${overspending[0].category} spending by $${overspending[0].overspent.toFixed(2)}`
      });
    }

    const highestCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (highestCategory) {
      insights.push({
        type: 'suggestion',
        category: highestCategory[0],
        message: `Highest spending category`,
        action: `Review ${highestCategory[0]} expenses for savings opportunities`
      });
    }

    return insights;
  }

  // Calculate risk profile
  calculateRiskProfile(user, portfolioData) {
    let riskScore = 50; // Base score

    // Age factor (younger = higher risk tolerance)
    if (user.age) {
      if (user.age < 30) riskScore += 20;
      else if (user.age < 40) riskScore += 10;
      else if (user.age < 50) riskScore += 0;
      else if (user.age < 60) riskScore -= 10;
      else riskScore -= 20;
    }

    // Income stability factor
    if (user.monthly_income > 10000) riskScore += 15;
    else if (user.monthly_income > 5000) riskScore += 5;
    else riskScore -= 10;

    // Experience factor
    switch (user.investment_experience) {
      case 'advanced': riskScore += 20; break;
      case 'intermediate': riskScore += 10; break;
      case 'beginner': riskScore -= 10; break;
    }

    // Stated risk tolerance
    switch (user.risk_tolerance) {
      case 'aggressive': riskScore += 20; break;
      case 'moderate': riskScore += 0; break;
      case 'conservative': riskScore -= 20; break;
    }

    // Normalize score
    riskScore = Math.max(0, Math.min(100, riskScore));

    let category;
    let allocation;

    if (riskScore >= 70) {
      category = 'aggressive';
      allocation = {
        stocks: 80,
        bonds: 15,
        cash: 5
      };
    } else if (riskScore >= 40) {
      category = 'moderate';
      allocation = {
        stocks: 60,
        bonds: 30,
        cash: 10
      };
    } else {
      category = 'conservative';
      allocation = {
        stocks: 40,
        bonds: 45,
        cash: 15
      };
    }

    return {
      score: riskScore,
      category,
      recommended_allocation: allocation
    };
  }

  // Generate investment recommendations
  async generateRecommendations(user, portfolio, riskProfile) {
    const recommendations = [];

    // Use AI for personalized recommendations
    const prompt = `As an investment advisor, provide 3 specific investment recommendations for:

Client Profile:
- Age: ${user.age}
- Risk Tolerance: ${riskProfile.category}
- Monthly Income: $${user.monthly_income}
- Investment Experience: ${user.investment_experience}
- Goals: ${user.financial_goals}

Current Portfolio Value: $${portfolio?.total_value || 0}

Provide ONLY a JSON array with 3 recommendations in this exact format:
[
  {
    "type": "buy" or "sell" or "rebalance",
    "asset_name": "specific asset or category",
    "asset_symbol": "ticker symbol if applicable",
    "recommendation": "brief explanation",
    "risk_level": "low" or "medium" or "high",
    "potential_return": "percentage or range",
    "time_horizon": "short" or "medium" or "long"
  }
]`;

    try {
      const aiResponse = await this.generate(prompt);
      if (aiResponse) {
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('AI recommendation error:', error);
    }

    // Fallback recommendations based on risk profile
    if (riskProfile.category === 'aggressive') {
      recommendations.push({
        type: 'buy',
        asset_name: 'Growth Tech ETF',
        asset_symbol: 'QQQ',
        recommendation: 'High growth potential in technology sector',
        risk_level: 'high',
        potential_return: '15-25%',
        time_horizon: 'long'
      });
    } else if (riskProfile.category === 'moderate') {
      recommendations.push({
        type: 'buy',
        asset_name: 'S&P 500 Index Fund',
        asset_symbol: 'SPY',
        recommendation: 'Balanced exposure to large-cap stocks',
        risk_level: 'medium',
        potential_return: '8-12%',
        time_horizon: 'medium'
      });
    } else {
      recommendations.push({
        type: 'buy',
        asset_name: 'Bond Index Fund',
        asset_symbol: 'AGG',
        recommendation: 'Stable income with capital preservation',
        risk_level: 'low',
        potential_return: '3-5%',
        time_horizon: 'short'
      });
    }

    // Add rebalancing recommendation if needed
    if (portfolio && portfolio.total_value > 10000) {
      recommendations.push({
        type: 'rebalance',
        asset_name: 'Portfolio Rebalancing',
        asset_symbol: '',
        recommendation: `Adjust to ${riskProfile.category} allocation`,
        risk_level: 'low',
        potential_return: 'Risk-adjusted',
        time_horizon: 'medium'
      });
    }

    return recommendations;
  }

  // Predict future financial trends
  async predictFinancialTrends(transactions, income, goals) {
    const monthlyIncome = income;
    const monthlyExpenses = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = (monthlySavings / monthlyIncome) * 100;

    const predictions = {
      monthly_savings: monthlySavings,
      savings_rate: savingsRate,
      yearly_projection: monthlySavings * 12,
      five_year_projection: monthlySavings * 60
    };

    // Goal achievement predictions
    const goalPredictions = goals.map(goal => {
      const remaining = goal.target_amount - goal.current_amount;
      const monthsNeeded = goal.monthly_contribution > 0 
        ? Math.ceil(remaining / goal.monthly_contribution)
        : null;
      
      return {
        goal_name: goal.goal_name,
        target_amount: goal.target_amount,
        current_progress: Math.round((goal.current_amount / goal.target_amount) * 100),
        months_to_achieve: monthsNeeded,
        on_track: monthsNeeded && monthsNeeded <= 36
      };
    });

    predictions.goals = goalPredictions;

    // Use AI for enhanced predictions
    const prompt = `As a financial analyst, predict the 6-month financial outlook based on:

Current monthly income: $${monthlyIncome}
Current monthly expenses: $${monthlyExpenses}
Current savings rate: ${savingsRate.toFixed(1)}%

Provide a JSON response with predictions:
{
  "expense_trend": "increasing" or "decreasing" or "stable",
  "savings_potential": "percentage increase possible",
  "risk_factors": ["list", "of", "risks"],
  "opportunities": ["list", "of", "opportunities"]
}`;

    try {
      const aiResponse = await this.generate(prompt);
      if (aiResponse) {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          predictions.ai_insights = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('AI prediction error:', error);
    }

    return predictions;
  }

  // Budget optimization suggestions
  async optimizeBudget(currentBudget, transactions, income) {
    const categorySpending = {};
    
    transactions
      .filter(t => t.transaction_type === 'expense')
      .forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      });

    const optimizations = [];

    // Analyze each budget category
    currentBudget.forEach(budget => {
      const actualSpent = categorySpending[budget.category] || 0;
      const efficiency = (actualSpent / budget.monthly_limit) * 100;

      if (efficiency > 110) {
        optimizations.push({
          category: budget.category,
          current_budget: budget.monthly_limit,
          actual_spent: actualSpent,
          suggested_budget: Math.ceil(actualSpent * 1.05),
          action: 'increase',
          reason: 'Consistently overspending'
        });
      } else if (efficiency < 50) {
        optimizations.push({
          category: budget.category,
          current_budget: budget.monthly_limit,
          actual_spent: actualSpent,
          suggested_budget: Math.ceil(actualSpent * 1.2),
          action: 'decrease',
          reason: 'Underutilized budget'
        });
      }
    });

    return optimizations;
  }
}

const aiService = new FinanceAI();

// ============================================
// HELPER FUNCTIONS
// ============================================
function getMonthlyTransactions(userId, month, year) {
  const query = `
    SELECT * FROM transactions 
    WHERE user_id = ? 
    AND strftime('%m', transaction_date) = ? 
    AND strftime('%Y', transaction_date) = ?
    ORDER BY transaction_date DESC
  `;
  return db.prepare(query).all(userId, month.toString().padStart(2, '0'), year.toString());
}

function getUserPortfolio(userId) {
  const portfolio = db.prepare('SELECT * FROM portfolios WHERE user_id = ?').get(userId);
  if (portfolio) {
    const assets = db.prepare('SELECT * FROM assets WHERE portfolio_id = ?').all(portfolio.id);
    portfolio.assets = assets;
  }
  return portfolio;
}

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', async (req, res) => {
  let ollamaStatus = 'disconnected';
  try {
    await axios.get(`${OLLAMA_HOST}/api/tags`);
    ollamaStatus = 'connected';
  } catch (error) {
    console.error('Ollama not available:', error.message);
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
    ollama: ollamaStatus,
    ollama_model: OLLAMA_MODEL
  });
});

// Get user profile with financial summary
app.get('/api/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
    const portfolio = getUserPortfolio(userId);
    const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(userId);
    
    // Calculate total net worth
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);
    const portfolioValue = portfolio?.total_value || 0;
    const netWorth = totalBalance + portfolioValue;

    res.json({ 
      ...user, 
      accounts, 
      portfolio,
      goals,
      net_worth: netWorth
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get dashboard summary
app.get('/api/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
    const transactions = getMonthlyTransactions(userId, currentMonth, currentYear);
    const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?')
      .all(userId, currentMonth, currentYear);
    const portfolio = getUserPortfolio(userId);
    
    // Calculate metrics
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);
    const monthlyIncome = transactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      net_worth: totalBalance + (portfolio?.total_value || 0),
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      monthly_savings: monthlyIncome - monthlyExpenses,
      accounts_summary: accounts,
      recent_transactions: transactions.slice(0, 5),
      budget_status: budgets
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// AI-powered spending analysis
app.post('/api/ai/analyze-spending', async (req, res) => {
  try {
    const { userId, month, year } = req.body;
    
    const transactions = getMonthlyTransactions(userId, month || new Date().getMonth() + 1, year || new Date().getFullYear());
    const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?')
      .all(userId, month || new Date().getMonth() + 1, year || new Date().getFullYear());
    
    const insights = await aiService.analyzeSpending(transactions, budgets);
    
    res.json({
      insights,
      total_spent: transactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
      transaction_count: transactions.length
    });
  } catch (error) {
    console.error('Error in spending analysis:', error);
    res.status(500).json({ error: 'Failed to analyze spending' });
  }
});

// AI-powered risk assessment
app.post('/api/ai/risk-assessment', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const portfolio = getUserPortfolio(userId);
    
    const riskProfile = aiService.calculateRiskProfile(user, portfolio);
    
    // Save assessment
    db.prepare(`
      INSERT INTO risk_assessments (user_id, risk_score, risk_category, recommended_allocation, assessment_details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId, 
      riskProfile.score, 
      riskProfile.category,
      JSON.stringify(riskProfile.recommended_allocation),
      JSON.stringify(riskProfile)
    );
    
    res.json(riskProfile);
  } catch (error) {
    console.error('Error in risk assessment:', error);
    res.status(500).json({ error: 'Failed to assess risk profile' });
  }
});

// AI-powered investment recommendations
app.post('/api/ai/recommendations', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const portfolio = getUserPortfolio(userId);
    const riskProfile = aiService.calculateRiskProfile(user, portfolio);
    
    const recommendations = await aiService.generateRecommendations(user, portfolio, riskProfile);
    
    // Save recommendations
    const stmt = db.prepare(`
      INSERT INTO recommendations (user_id, recommendation_type, asset_symbol, asset_name, recommendation_text, confidence_score, risk_level, potential_return, time_horizon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    recommendations.forEach(rec => {
      stmt.run(
        userId,
        rec.type,
        rec.asset_symbol || null,
        rec.asset_name,
        rec.recommendation,
        0.75,
        rec.risk_level,
        rec.potential_return,
        rec.time_horizon
      );
    });
    
    res.json({
      risk_profile: riskProfile,
      recommendations
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// AI-powered financial predictions
app.post('/api/ai/predictions', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC LIMIT 100').all(userId);
    const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(userId);
    
    const predictions = await aiService.predictFinancialTrends(
      transactions,
      user.monthly_income,
      goals
    );
    
    // Save prediction
    db.prepare(`
      INSERT INTO predictions (user_id, prediction_type, predicted_value, confidence_score, prediction_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      'monthly_savings',
      predictions.monthly_savings,
      0.8,
      new Date().toISOString().split('T')[0]
    );
    
    res.json(predictions);
  } catch (error) {
    console.error('Error in predictions:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

// Budget optimization
app.post('/api/ai/optimize-budget', async (req, res) => {
  try {
    const { userId } = req.body;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?')
      .all(userId, currentMonth, currentYear);
    const transactions = getMonthlyTransactions(userId, currentMonth, currentYear);
    
    const optimizations = await aiService.optimizeBudget(budgets, transactions, user.monthly_income);
    
    res.json({
      current_budgets: budgets,
      optimizations,
      potential_savings: optimizations
        .filter(o => o.action === 'decrease')
        .reduce((sum, o) => sum + (o.current_budget - o.suggested_budget), 0)
    });
  } catch (error) {
    console.error('Error optimizing budget:', error);
    res.status(500).json({ error: 'Failed to optimize budget' });
  }
});

// Get transactions
app.get('/api/transactions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year, category } = req.query;
    
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];
    
    if (month && year) {
      query += ' AND strftime("%m", transaction_date) = ? AND strftime("%Y", transaction_date) = ?';
      params.push(month.padStart(2, '0'), year);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY transaction_date DESC LIMIT 100';
    
    const transactions = db.prepare(query).all(...params);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Add transaction
app.post('/api/transactions', (req, res) => {
  try {
    const { userId, accountId, type, category, amount, description } = req.body;
    
    const result = db.prepare(`
      INSERT INTO transactions (user_id, account_id, transaction_type, category, amount, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, accountId, type, category, amount, description);
    
    // Update account balance
    if (accountId) {
      const balanceChange = type === 'income' ? amount : -amount;
      db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?')
        .run(balanceChange, accountId);
    }
    
    // Update budget spending
    if (type === 'expense') {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      db.prepare(`
        UPDATE budgets 
        SET current_spent = current_spent + ? 
        WHERE user_id = ? AND category = ? AND month = ? AND year = ?
      `).run(amount, userId, category, currentMonth, currentYear);
    }
    
    io.emit('transaction-added', { userId });
    
    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Transaction added successfully'
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Get portfolio details
app.get('/api/portfolio/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const portfolio = getUserPortfolio(userId);
    
    if (!portfolio) {
      return res.json({ message: 'No portfolio found', portfolio: null });
    }
    
    // Calculate performance
    const totalReturn = portfolio.total_value - portfolio.total_invested;
    const returnPercentage = (totalReturn / portfolio.total_invested) * 100;
    
    res.json({
      ...portfolio,
      total_return: totalReturn,
      return_percentage: returnPercentage
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Update goal progress
app.put('/api/goals/:goalId', (req, res) => {
  try {
    const { goalId } = req.params;
    const { current_amount, monthly_contribution } = req.body;
    
    db.prepare(`
      UPDATE goals 
      SET current_amount = ?, monthly_contribution = ?
      WHERE id = ?
    `).run(current_amount, monthly_contribution, goalId);
    
    res.json({ message: 'Goal updated successfully' });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// ============================================
// WEBSOCKET
// ============================================
io.on('connection', (socket) => {
  console.log('💰 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('💰 Client disconnected:', socket.id);
  });
});

// ============================================
// START SERVER
// ============================================
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  💰 Finance Advisor Server Ready       ║
║  🤖 Powered by Ollama AI               ║
╚════════════════════════════════════════╝
  `);
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`✅ Database: SQLite initialized`);
  console.log(`🤖 Ollama: ${OLLAMA_HOST}`);
  console.log(`🔍 Model: ${OLLAMA_MODEL}`);
  console.log(`📡 WebSocket: Ready\n`);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down...');
  db.close();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server, db };