import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './app.css';

const API_URL = window.location.origin + '/api';
const CURRENT_USER_ID = 1; // Demo user - John Anderson

function App() {
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [riskProfile, setRiskProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard');

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/users/${CURRENT_USER_ID}`);
      setUser(response.data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, []);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/dashboard/${CURRENT_USER_ID}`);
      setDashboard(response.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get AI spending insights
  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/ai/analyze-spending`, {
        userId: CURRENT_USER_ID,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });
      setInsights(response.data.insights || []);
    } catch (err) {
      console.error('Failed to get insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get investment recommendations
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/ai/recommendations`, {
        userId: CURRENT_USER_ID
      });
      setRecommendations(response.data.recommendations || []);
      setRiskProfile(response.data.risk_profile);
    } catch (err) {
      console.error('Failed to get recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get financial predictions
  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/ai/predictions`, {
        userId: CURRENT_USER_ID
      });
      setPredictions(response.data);
    } catch (err) {
      console.error('Failed to get predictions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get portfolio details
  const fetchPortfolio = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/portfolio/${CURRENT_USER_ID}`);
      setPortfolio(response.data);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    }
  }, []);

  // Initialize app
  useEffect(() => {
    fetchUser();
    fetchDashboard();
    fetchInsights();
    fetchPortfolio();

    const socket = io(window.location.origin);
    socket.on('transaction-added', () => {
      fetchDashboard();
      fetchInsights();
    });

    return () => socket.close();
  }, [fetchUser, fetchDashboard, fetchInsights, fetchPortfolio]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get color for percentage
  const getPercentageColor = (percentage) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 75) return '#f59e0b';
    if (percentage >= 50) return '#3b82f6';
    return '#10b981';
  };

  // Add transaction
  const addTransaction = async (transaction) => {
    try {
      await axios.post(`${API_URL}/transactions`, {
        userId: CURRENT_USER_ID,
        ...transaction
      });
      fetchDashboard();
      fetchInsights();
    } catch (err) {
      alert('Failed to add transaction');
    }
  };

  if (!user || !dashboard) {
    return <div className="loading">Loading your financial data...</div>;
  }

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>💰 Personal Finance Advisor</h1>
            <p>AI-Powered Financial Intelligence</p>
          </div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="net-worth">
              Net Worth: {formatCurrency(user.net_worth)}
            </div>
          </div>
        </div>
      </header>

      <div className="nav-tabs">
        <button
          className={view === 'dashboard' ? 'active' : ''}
          onClick={() => setView('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={view === 'insights' ? 'active' : ''}
          onClick={() => { setView('insights'); fetchInsights(); }}
        >
          💡 AI Insights
        </button>
        <button
          className={view === 'investments' ? 'active' : ''}
          onClick={() => { setView('investments'); fetchRecommendations(); }}
        >
          📈 Investments
        </button>
        <button
          className={view === 'predictions' ? 'active' : ''}
          onClick={() => { setView('predictions'); fetchPredictions(); }}
        >
          🔮 Predictions
        </button>
        <button
          className={view === 'goals' ? 'active' : ''}
          onClick={() => setView('goals')}
        >
          🎯 Goals
        </button>
      </div>

      <div className="container">
        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div className="content">
            <div className="dashboard-grid">
              <div className="metric-card">
                <div className="metric-label">Monthly Income</div>
                <div className="metric-value">{formatCurrency(dashboard.monthly_income)}</div>
                <div className="metric-change positive">
                  ↑ Stable income
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Monthly Expenses</div>
                <div className="metric-value">{formatCurrency(dashboard.monthly_expenses)}</div>
                <div className={`metric-change ${dashboard.monthly_expenses > dashboard.monthly_income * 0.7 ? 'negative' : 'positive'}`}>
                  {dashboard.monthly_expenses > dashboard.monthly_income * 0.7 ? '↑ High spending' : '↓ Under control'}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Monthly Savings</div>
                <div className="metric-value">{formatCurrency(dashboard.monthly_savings)}</div>
                <div className={`metric-change ${dashboard.monthly_savings > 0 ? 'positive' : 'negative'}`}>
                  {Math.round((dashboard.monthly_savings / dashboard.monthly_income) * 100)}% savings rate
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Investment Value</div>
                <div className="metric-value">{formatCurrency(portfolio?.total_value || 0)}</div>
                <div className={`metric-change ${portfolio?.return_percentage > 0 ? 'positive' : 'negative'}`}>
                  {portfolio?.return_percentage > 0 ? '↑' : '↓'} {Math.abs(portfolio?.return_percentage || 0).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Budget Status */}
            <div className="budget-section">
              <div className="budget-header">
                <h2>📊 Budget Status</h2>
              </div>
              <div className="budget-list">
                {dashboard.budget_status?.map(budget => {
                  const percentage = (budget.current_spent / budget.monthly_limit) * 100;
                  return (
                    <div key={budget.id} className="budget-item">
                      <div className="budget-category">
                        <span className="category-name">{budget.category}</span>
                        <span className="category-spent" style={{ color: getPercentageColor(percentage) }}>
                          {formatCurrency(budget.current_spent)} / {formatCurrency(budget.monthly_limit)}
                        </span>
                      </div>
                      <div className="budget-progress">
                        <div
                          className="budget-fill"
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            background: getPercentageColor(percentage)
                          }}
                        />
                      </div>
                      <div className="budget-details">
                        <span>{percentage.toFixed(0)}% used</span>
                        <span>{formatCurrency(budget.monthly_limit - budget.current_spent)} remaining</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accounts Summary */}
            <div className="portfolio-section">
              <div className="portfolio-header">
                <h2>💳 Accounts Overview</h2>
              </div>
              <div className="assets-grid">
                {dashboard.accounts_summary?.map(account => (
                  <div key={account.id} className="asset-card">
                    <div className="asset-symbol">{account.account_type.toUpperCase()}</div>
                    <div className="asset-name">{account.account_name}</div>
                    <div className="asset-value">{formatCurrency(account.current_balance)}</div>
                    {account.interest_rate && (
                      <div className="asset-change positive">
                        {account.interest_rate}% APY
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI INSIGHTS VIEW */}
        {view === 'insights' && (
          <div className="content">
            <div className="insights-section">
              <div className="insights-header">
                <h2>💡 AI Financial Insights</h2>
                <button className="btn-refresh" onClick={fetchInsights} disabled={loading}>
                  🔄 Refresh Analysis
                </button>
              </div>

              {loading ? (
                <div className="loading">Analyzing your spending patterns...</div>
              ) : (
                <div className="insights-list">
                  {insights.map((insight, idx) => (
                    <div key={idx} className={`insight-card ${insight.type}`}>
                      <div className="insight-icon">
                        {insight.type === 'warning' ? '⚠️' : 
                         insight.type === 'success' ? '✅' : '💡'}
                      </div>
                      <div className="insight-content">
                        <div className="insight-message">
                          {insight.category}: {insight.message}
                        </div>
                        <div className="insight-action">{insight.action}</div>
                      </div>
                    </div>
                  ))}

                  {insights.length === 0 && (
                    <div className="empty-state">
                      <p>No insights available. Add more transactions to get personalized advice.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INVESTMENTS VIEW */}
        {view === 'investments' && (
          <div className="content">
            {/* Risk Profile */}
            {riskProfile && (
              <div className="insights-section">
                <h2>🎯 Your Risk Profile</h2>
                <div className="dashboard-grid">
                  <div className="metric-card">
                    <div className="metric-label">Risk Score</div>
                    <div className="metric-value">{riskProfile.score}/100</div>
                    <div className="metric-change">{riskProfile.category.toUpperCase()}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Recommended Stocks</div>
                    <div className="metric-value">{riskProfile.recommended_allocation.stocks}%</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Recommended Bonds</div>
                    <div className="metric-value">{riskProfile.recommended_allocation.bonds}%</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Recommended Cash</div>
                    <div className="metric-value">{riskProfile.recommended_allocation.cash}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Investment Recommendations */}
            <div className="insights-section">
              <div className="insights-header">
                <h2>📈 AI Investment Recommendations</h2>
                <button className="btn-refresh" onClick={fetchRecommendations} disabled={loading}>
                  🔄 Update Recommendations
                </button>
              </div>

              {loading ? (
                <div className="loading">Generating personalized recommendations...</div>
              ) : (
                <div className="recommendations-grid">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="recommendation-card">
                      <div className="rec-header">
                        <span className={`rec-type ${rec.type}`}>
                          {rec.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="rec-asset">{rec.asset_name}</div>
                      {rec.asset_symbol && (
                        <div className="rec-symbol">{rec.asset_symbol}</div>
                      )}
                      <div className="rec-details">{rec.recommendation}</div>
                      <div className="rec-metrics">
                        <div className="rec-metric">
                          <div className="rec-metric-label">Risk</div>
                          <div className="rec-metric-value">{rec.risk_level}</div>
                        </div>
                        <div className="rec-metric">
                          <div className="rec-metric-label">Return</div>
                          <div className="rec-metric-value">{rec.potential_return}</div>
                        </div>
                        <div className="rec-metric">
                          <div className="rec-metric-label">Horizon</div>
                          <div className="rec-metric-value">{rec.time_horizon}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Portfolio Overview */}
            {portfolio && portfolio.assets && (
              <div className="portfolio-section">
                <div className="portfolio-header">
                  <h2>💼 Current Portfolio</h2>
                  <div className="portfolio-value">
                    <div className="portfolio-total">{formatCurrency(portfolio.total_value)}</div>
                    <div className={`portfolio-return ${portfolio.return_percentage > 0 ? 'positive' : 'negative'}`}>
                      {portfolio.return_percentage > 0 ? '+' : ''}{portfolio.return_percentage?.toFixed(2)}% return
                    </div>
                  </div>
                </div>
                <div className="assets-grid">
                  {portfolio.assets.map(asset => (
                    <div key={asset.id} className="asset-card">
                      <div className="asset-symbol">{asset.asset_symbol}</div>
                      <div className="asset-name">{asset.asset_name}</div>
                      <div className="asset-value">
                        {formatCurrency(asset.quantity * asset.current_price)}
                      </div>
                      <div className={`asset-change ${asset.current_price > asset.purchase_price ? 'positive' : 'negative'}`}>
                        {((asset.current_price - asset.purchase_price) / asset.purchase_price * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PREDICTIONS VIEW */}
        {view === 'predictions' && (
          <div className="content">
            <div className="insights-section">
              <div className="insights-header">
                <h2>🔮 Financial Predictions</h2>
                <button className="btn-refresh" onClick={fetchPredictions} disabled={loading}>
                  🔄 Update Predictions
                </button>
              </div>

              {loading ? (
                <div className="loading">Calculating predictions...</div>
              ) : predictions ? (
                <>
                  <div className="dashboard-grid">
                    <div className="metric-card">
                      <div className="metric-label">Predicted Monthly Savings</div>
                      <div className="metric-value">{formatCurrency(predictions.monthly_savings)}</div>
                      <div className="metric-change positive">
                        {predictions.savings_rate?.toFixed(1)}% savings rate
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-label">1-Year Projection</div>
                      <div className="metric-value">{formatCurrency(predictions.yearly_projection)}</div>
                      <div className="metric-change">Total savings</div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-label">5-Year Projection</div>
                      <div className="metric-value">{formatCurrency(predictions.five_year_projection)}</div>
                      <div className="metric-change">Without investments</div>
                    </div>
                  </div>

                  {/* AI Insights */}
                  {predictions.ai_insights && (
                    <div className="budget-section">
                      <h3>🤖 AI Prediction Insights</h3>
                      <div className="insight-card suggestion">
                        <div className="insight-content">
                          <div className="insight-message">
                            Expense Trend: {predictions.ai_insights.expense_trend}
                          </div>
                          <div className="insight-action">
                            Savings Potential: {predictions.ai_insights.savings_potential}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <p>Unable to generate predictions. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GOALS VIEW */}
        {view === 'goals' && (
          <div className="content">
            <div className="insights-section">
              <h2>🎯 Financial Goals</h2>
              <div className="goals-grid">
                {user.goals?.map(goal => {
                  const progress = (goal.current_amount / goal.target_amount) * 100;
                  return (
                    <div key={goal.id} className="goal-card">
                      <div className="goal-header">
                        <div className="goal-name">{goal.goal_name}</div>
                        <span className="goal-type">{goal.goal_type}</span>
                      </div>
                      
                      <div className="goal-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="progress-text">
                          <span>{formatCurrency(goal.current_amount)}</span>
                          <span>{formatCurrency(goal.target_amount)}</span>
                        </div>
                      </div>

                      <div className="goal-details">
                        <div className="goal-detail">
                          <div className="detail-label">Progress</div>
                          <div className="detail-value">{progress.toFixed(0)}%</div>
                        </div>
                        <div className="goal-detail">
                          <div className="detail-label">Monthly</div>
                          <div className="detail-value">{formatCurrency(goal.monthly_contribution)}</div>
                        </div>
                        <div className="goal-detail">
                          <div className="detail-label">Target</div>
                          <div className="detail-value">
                            {new Date(goal.target_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;