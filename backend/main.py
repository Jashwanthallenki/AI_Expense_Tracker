from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv
from gemini_utils import parse_expense_with_gemini, categorize_expense_with_gemini
from models import Expense
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv("backend/.env")

app = FastAPI()

# CORS setup for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Atlas setup
mongodb_uri = os.getenv("MONGODB_URI")
logger.debug(f"Loaded MONGODB_URI: {mongodb_uri}")
client = AsyncIOMotorClient(mongodb_uri)
db = client.expense_tracker

class ExpenseMessage(BaseModel):
    message: str

@app.post("/parse_expense")
async def parse_expense(data: ExpenseMessage):
    parsed_data = parse_expense_with_gemini(data.message)
    if not parsed_data or "title" not in parsed_data or "amount" not in parsed_data:
        raise HTTPException(status_code=422, detail="Could not parse expense into valid structure")
    
    # Add smart categorization
    category = categorize_expense_with_gemini(parsed_data["title"])
    parsed_data["category"] = category
    
    return parsed_data

@app.post("/add_expense")
async def add_expense(expense_data: dict):
    """Accept expense data as dict to handle both AI and manual entries"""
    try:
        # Extract fields
        title = expense_data.get("title", "")
        amount = float(expense_data.get("amount", 0))
        date_value = expense_data.get("date")
        category = expense_data.get("category", "Other")
        
        # If no category provided, categorize it
        if not category or category == "Other":
            category = categorize_expense_with_gemini(title)
        
        # Handle date conversion
        if date_value:
            if isinstance(date_value, str):
                try:
                    # Try different date formats
                    if 'T' in date_value:
                        # ISO format
                        parsed_date = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                    else:
                        # Assume it's a date string, add time
                        parsed_date = datetime.fromisoformat(date_value + 'T00:00:00+00:00')
                except ValueError:
                    # If all parsing fails, use current time
                    parsed_date = datetime.now(timezone.utc)
            elif isinstance(date_value, datetime):
                parsed_date = date_value
            else:
                parsed_date = datetime.now(timezone.utc)
        else:
            parsed_date = datetime.now(timezone.utc)
        
        # Ensure timezone awareness
        if parsed_date.tzinfo is None:
            parsed_date = parsed_date.replace(tzinfo=timezone.utc)
        
        # Create expense document
        expense_doc = {
            "title": title,
            "amount": amount,
            "date": parsed_date,
            "category": category
        }
        
        logger.debug(f"Saving expense: {expense_doc}")
        
        # Save to database
        result = await db.expenses.insert_one(expense_doc)
        logger.debug(f"Expense saved with ID: {result.inserted_id}")
        
        return {"message": "Expense added successfully"}
        
    except Exception as e:
        logger.error(f"Error adding expense: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add expense: {str(e)}")

@app.get("/summary")
async def get_summary():
    total_expenses = await db.expenses.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    return {"total_expenses": total_expenses[0]["total"] if total_expenses else 0}

@app.get("/today_expenses")
async def get_today_expenses():
    # Get today's date range in UTC
    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = tomorrow_start.replace(day=tomorrow_start.day + 1)
    
    logger.debug(f"Current UTC time: {now_utc}")
    logger.debug(f"Today start: {today_start}")
    logger.debug(f"Tomorrow start: {tomorrow_start}")
    
    # Query expenses for today
    expenses_cursor = db.expenses.find({
        "date": {
            "$gte": today_start,
            "$lt": tomorrow_start
        }
    }).sort("date", -1)  # Sort by date descending (newest first)
    
    expenses = await expenses_cursor.to_list(length=100)
    
    logger.debug(f"Found {len(expenses)} expenses for today")
    
    # Convert ObjectId to string and ensure proper date format for frontend
    for expense in expenses:
        if "_id" in expense:
            expense["_id"] = str(expense["_id"])
        # Ensure date is properly formatted
        if isinstance(expense["date"], datetime):
            expense["date"] = expense["date"].isoformat()
        # Ensure category exists
        if "category" not in expense:
            expense["category"] = "Other"
    
    return expenses

@app.get("/category_summary")
async def get_category_summary():
    """Get expense summary by category"""
    try:
        # Get category-wise totals
        category_totals = await db.expenses.aggregate([
            {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]).to_list(length=100)
        
        # Format the data for charts
        formatted_data = []
        for item in category_totals:
            formatted_data.append({
                "category": item["_id"] if item["_id"] else "Other",
                "total": item["total"],
                "count": item["count"]
            })
        
        return formatted_data
        
    except Exception as e:
        logger.error(f"Error getting category summary: {e}")
        return []

@app.get("/monthly_trends")
async def get_monthly_trends():
    """Get monthly expense trends"""
    try:
        # Get data for last 6 months
        six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
        
        monthly_data = await db.expenses.aggregate([
            {"$match": {"date": {"$gte": six_months_ago}}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"}
                },
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]).to_list(length=100)
        
        # Format data for charts
        formatted_data = []
        for item in monthly_data:
            month_name = datetime(item["_id"]["year"], item["_id"]["month"], 1).strftime("%b %Y")
            formatted_data.append({
                "month": month_name,
                "total": item["total"],
                "count": item["count"]
            })
        
        return formatted_data
        
    except Exception as e:
        logger.error(f"Error getting monthly trends: {e}")
        return []

@app.get("/weekly_trends")
async def get_weekly_trends():
    """Get weekly expense trends for last 4 weeks"""
    try:
        four_weeks_ago = datetime.now(timezone.utc) - timedelta(days=28)
        
        weekly_data = await db.expenses.aggregate([
            {"$match": {"date": {"$gte": four_weeks_ago}}},
            {"$group": {
                "_id": {
                    "week": {"$week": "$date"},
                    "year": {"$year": "$date"}
                },
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.week": 1}}
        ]).to_list(length=100)
        
        # Format data for charts
        formatted_data = []
        for i, item in enumerate(weekly_data):
            formatted_data.append({
                "week": f"Week {i+1}",
                "total": item["total"],
                "count": item["count"]
            })
        
        return formatted_data
        
    except Exception as e:
        logger.error(f"Error getting weekly trends: {e}")
        return []

@app.get("/top_categories")
async def get_top_categories():
    """Get top 5 categories by spending"""
    try:
        top_categories = await db.expenses.aggregate([
            {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
            {"$sort": {"total": -1}},
            {"$limit": 5}
        ]).to_list(length=5)
        
        formatted_data = []
        for item in top_categories:
            formatted_data.append({
                "category": item["_id"] if item["_id"] else "Other",
                "total": item["total"]
            })
        
        return formatted_data
        
    except Exception as e:
        logger.error(f"Error getting top categories: {e}")
        return []

@app.get("/all_expenses")
async def get_all_expenses():
    """Debug endpoint to see all expenses"""
    expenses_cursor = db.expenses.find({}).sort("date", -1)
    expenses = await expenses_cursor.to_list(length=100)
    
    logger.debug(f"Total expenses in database: {len(expenses)}")
    
    for expense in expenses:
        if "_id" in expense:
            expense["_id"] = str(expense["_id"])
        # Ensure date is properly formatted
        if isinstance(expense["date"], datetime):
            expense["date"] = expense["date"].isoformat()
        # Ensure category exists
        if "category" not in expense:
            expense["category"] = "Other"
        logger.debug(f"Expense: {expense['title']} - Date: {expense['date']} - Amount: {expense['amount']} - Category: {expense['category']}")
    
    return expenses

@app.delete("/clear_expenses")
async def clear_all_expenses():
    """Debug endpoint to clear all expenses"""
    result = await db.expenses.delete_many({})
    return {"message": f"Deleted {result.deleted_count} expenses"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)