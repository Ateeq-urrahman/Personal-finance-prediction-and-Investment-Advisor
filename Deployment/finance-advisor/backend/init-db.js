/* Database Initialization Script for Finance Advisor
 * Run this separately if you want to reset/initialize the database
 * Usage: node init-db.js
 */

const { initializeDatabase, seedDatabase } = require('./database');

console.log('╔════════════════════════════════════════╗');
console.log('║  💰 Finance Database Initialization    ║');
console.log('╚════════════════════════════════════════╝');
console.log('');

try {
  // Initialize database schema
  console.log('📋 Creating database schema...');
  initializeDatabase();
  
  // Seed with sample data
  console.log('🌱 Seeding database...');
  seedDatabase();
  
  console.log('');
  console.log('✅ Finance database initialization complete!');
  console.log('');
  console.log('Database created at: ./data/finance_advisor.db');
  console.log('');
  console.log('Sample Users:');
  console.log('  - john.investor@email.com (Software Engineer, Moderate Risk)');
  console.log('  - sarah.saver@email.com (Marketing Manager, Conservative)');
  console.log('  - mike.trader@email.com (Business Owner, Aggressive)');
  console.log('');
  console.log('Features Available:');
  console.log('  📊 Spending Analysis & Budget Tracking');
  console.log('  🎯 Investment Recommendations');
  console.log('  📈 Financial Predictions');
  console.log('  💼 Portfolio Management');
  console.log('  🎓 Risk Assessment');
  console.log('');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}