# 💸 AI Expense Tracker

An intelligent and visually stunning expense tracker that uses **AI (Gemini)** to parse natural language inputs like “I spent ₹200 on groceries today” into structured data and provides insightful visualizations.

---

## 🚀 Features

- 🧠 **AI-Powered Parsing**: Automatically extracts amount, category, and date from plain English inputs using Gemini API.
- 📊 **Visual Insights**: Beautiful bar, line, and pie charts for daily, weekly, and category-wise spending.
- ⚡ **Real-time Summary**: Instant stats on total expenses, today's entries, top spending days.
- 📝 **Manual Entry Option**: Supports form-based input with categories, amounts, and dates.
- 🌈 **Modern UI**: Tailwind CSS and Recharts give a clean and responsive design.
- 🔄 **Backend with FastAPI**: High-performance Python backend for expense management and analytics.

---

## 🧱 Tech Stack

### 🖥️ Frontend
- React.js
- Tailwind CSS
- Recharts
- Lucide Icons

### 🔧 Backend
- FastAPI (Python)
- Gemini API (Google Generative AI)
- MongoDB (via `motor` async driver)
- CORS Middleware

---

## 📦 Installation

### 🔧 Backend (FastAPI)
1. Go to the `backend/` folder:
   ```bash
   cd backend
