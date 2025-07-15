import React, { useState, useEffect } from 'react';
import { PlusCircle, DollarSign, Calendar, TrendingUp, Send, Sparkles, Receipt, AlertCircle, BarChart3, PieChart, Tag } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import './App.css';
const App = () => {
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [manualExpense, setManualExpense] = useState({
    title: '',
    amount: '',
    date: '',
    category: ''
  });
  
  // Chart data states
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [topCategories, setTopCategories] = useState([]);

  const API_BASE = 'http://localhost:8000';

  // Predefined categories for manual entry
  const EXPENSE_CATEGORIES = [
    "Food & Dining", "Transportation", "Shopping", "Entertainment", 
    "Bills & Utilities", "Healthcare", "Education", "Travel", 
    "Groceries", "Fuel", "Personal Care", "Home & Garden", 
    "Gifts & Donations", "Subscriptions", "Other"
  ];

  // Colors for charts
  const COLORS = [
    '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#6366f1', '#ec4899', '#84cc16', '#f97316', '#8b5cf6',
    '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'
  ];

  useEffect(() => {
    fetchTodayExpenses();
    fetchSummary();
    fetchChartData();
  }, []);

  const fetchTodayExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE}/today_expenses`);
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/summary`);
      const data = await response.json();
      setTotalExpenses(data.total_expenses);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const [categoryRes, monthlyRes, weeklyRes, topRes] = await Promise.all([
        fetch(`${API_BASE}/category_summary`),
        fetch(`${API_BASE}/monthly_trends`),
        fetch(`${API_BASE}/weekly_trends`),
        fetch(`${API_BASE}/top_categories`)
      ]);

      const categoryData = await categoryRes.json();
      const monthlyData = await monthlyRes.json();
      const weeklyData = await weeklyRes.json();
      const topData = await topRes.json();

      setCategoryData(categoryData);
      setMonthlyData(monthlyData);
      setWeeklyData(weeklyData);
      setTopCategories(topData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAIExpense = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      // Parse with AI
      const parseResponse = await fetch(`${API_BASE}/parse_expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!parseResponse.ok) {
        throw new Error('Failed to parse expense');
      }
      
      const parsedData = await parseResponse.json();
      
      // Add expense
      const addResponse = await fetch(`${API_BASE}/add_expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });
      
      if (!addResponse.ok) {
        throw new Error('Failed to add expense');
      }
      
      setMessage('');
      fetchTodayExpenses();
      fetchSummary();
      fetchChartData();
      showNotification(`Expense added successfully! Categorized as: ${parsedData.category} 🎉`);
    } catch (error) {
      console.error('Error:', error);
      showNotification('Failed to process expense. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualExpense = async () => {
    if (!manualExpense.title || !manualExpense.amount) {
      showNotification('Please fill in title and amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const expenseData = {
        title: manualExpense.title,
        amount: parseFloat(manualExpense.amount),
        date: manualExpense.date || new Date().toISOString(),
        category: manualExpense.category || 'Other'
      };

      const response = await fetch(`${API_BASE}/add_expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      if (!response.ok) {
        throw new Error('Failed to add expense');
      }

      setManualExpense({ title: '', amount: '', date: '', category: '' });
      setShowAddForm(false);
      fetchTodayExpenses();
      fetchSummary();
      fetchChartData();
      showNotification('Expense added successfully! 🎉');
    } catch (error) {
      console.error('Error:', error);
      showNotification('Failed to add expense. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      'Food & Dining': '🍽️',
      'Transportation': '🚗',
      'Shopping': '🛍️',
      'Entertainment': '🎬',
      'Bills & Utilities': '💡',
      'Healthcare': '⚕️',
      'Education': '📚',
      'Travel': '✈️',
      'Groceries': '🛒',
      'Fuel': '⛽',
      'Personal Care': '💅',
      'Home & Garden': '🏠',
      'Gifts & Donations': '🎁',
      'Subscriptions': '📱',
      'Other': '📦'
    };
    return iconMap[category] || '📦';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-purple-600">
            Amount: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-container">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
      <div className="bg-element bg-element-1"></div>
      <div className="bg-element bg-element-2"></div>
      <div className="bg-element bg-element-3"></div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <Sparkles size={20} />}
          {notification.text}
        </div>
      )}

      <div className="content-wrapper">
        {/* Header */}
        <div className="header">
          <h1 className="main-title">AI Expense Tracker</h1>
          <p className="subtitle">Smart expense tracking with AI categorization and Insights</p>
        </div>


        {/* Summary Card */}
        <div className="glass-card">
          <div className="summary-card">
            <div className="summary-left">
              <div className="icon-wrapper">
                <TrendingUp color="white" size={32} />
              </div>
              <div className="summary-info">
                <h3>Total Expenses</h3>
                <p className="summary-amount">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
            <div className="summary-right">
              <h3>Today's Entries</h3>
              <p className="summary-count">{expenses.length}</p>
            </div>
          </div>
        </div>

        {/* Charts Toggle Button */}
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="charts-toggle"
        >
          <BarChart3 size={20} />
          {showCharts ? 'Hide Analytics' : 'Show Analytics & Charts'}
        </button>

        {/* Charts Section */}
        {showCharts && (
          <div className="charts-section">
            {/* Category Distribution Pie Chart */}
            <div className="chart-card">
              <h3 className="chart-title">
                <PieChart size={20} />
                Category Distribution
              </h3>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="total"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <PieChart size={48} />
                  <p>No data available</p>
                </div>
              )}
            </div>


             {/* Top Categories Bar Chart */}
            <div className="chart-card">
              <h3 className="chart-title">
                <BarChart3 size={20} />
                Top Categories
              </h3>
              {topCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topCategories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="category" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <BarChart3 size={48} />
                  <p>No data available</p>
                </div>
              )}
            </div>


           {/* Monthly Trends Line Chart */}
            <div className="chart-card">
              <h3 className="chart-title">
                <TrendingUp size={20} />
                Monthly Trends
              </h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="month" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <TrendingUp size={48} />
                  <p>No data available</p>
                </div>
              )}
            </div>

            {/* Weekly Trends Bar Chart */}
            <div className="chart-card">
              <h3 className="chart-title">
                <Calendar size={20} />
                Weekly Trends
              </h3>
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="week" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <Calendar size={48} />
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Input Section */}
        <div className="glass-card">
          <div className="ai-section">
            <Sparkles color="#c084fc" size={24} />
            <h2 className="ai-title">AI-Powered Expense Entry</h2>
          </div>
          
          <div className="ai-form">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell me about your expense... e.g., 'I spent 250 rupees on groceries at 7 PM today'"
              className="ai-textarea"
              rows="3"
            />
            <button
              onClick={handleAIExpense}
              disabled={loading || !message.trim()}
              className="btn btn-primary"
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <Send size={20} />
              )}
              {loading ? 'Processing...' : 'Add Expense'}
            </button>
          </div>
        </div>

        {/* Manual Entry Toggle */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-toggle"
        >
          <PlusCircle size={20} />
          {showAddForm ? 'Hide Manual Entry' : 'Add Manual Entry'}
        </button>

        {/* Manual Entry Form */}
        {showAddForm && (
          <div className="glass-card">
            <div className="manual-form-title">
              <Receipt size={24} color="#60a5fa" />
              <h3>Manual Entry</h3>
            </div>
            
            <div className="form-grid">
              <input
                type="text"
                placeholder="Expense title"
                value={manualExpense.title}
                onChange={(e) => setManualExpense({...manualExpense, title: e.target.value})}
                className="form-input"
              />
              <input
                type="number"
                placeholder="Amount"
                value={manualExpense.amount}
                onChange={(e) => setManualExpense({...manualExpense, amount: e.target.value})}
                className="form-input"
              />
              <input
                type="datetime-local"
                value={manualExpense.date}
                onChange={(e) => setManualExpense({...manualExpense, date: e.target.value})}
                className="form-input"
              />
              <select
                value={manualExpense.category}
                onChange={(e) => setManualExpense({...manualExpense, category: e.target.value})}
                className="form-select"
              >
                <option value="">Select Category</option>
                {EXPENSE_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleManualExpense}
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        )}

        {/* Today's Expenses */}
        <div className="expenses-section">
          <div className="expenses-title">
            <Calendar color="#60a5fa" size={24} />
            <h2>Today's Expenses</h2>
          </div>
          
          {expenses.length === 0 ? (
            <div className="empty-state">
              <DollarSign size={64} />
              <p className="empty-state-text">No expenses recorded today</p>
              <p className="empty-state-subtext">Start by adding your first expense above!</p>
            </div>
          ) : (
            <div className="expense-list">
              {expenses.map((expense, index) => (
                <div key={index} className="expense-item">
                  <div className="expense-content">
                    <div className="expense-left">
                      <div className="expense-icon">
                        <span>{getCategoryIcon(expense.category)}</span>
                      </div>
                      <div className="expense-info">
                        <h3>{expense.title}</h3>
                        <div className="expense-meta">
                          <span className="expense-date">
                            <Calendar size={14} />
                            {formatDate(expense.date)}
                          </span>
                          <span className="expense-category">
                            <Tag size={14} />
                            {expense.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="expense-right">
                      <p className="expense-amount">{formatCurrency(expense.amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;