import google.generativeai as genai
import os
from dotenv import load_dotenv
import json
import logging
import re
from datetime import datetime, timezone

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Predefined categories for consistent categorization
EXPENSE_CATEGORIES = [
    "Food & Dining", "Transportation", "Shopping", "Entertainment", 
    "Bills & Utilities", "Healthcare", "Education", "Travel", 
    "Groceries", "Fuel", "Personal Care", "Home & Garden", 
    "Gifts & Donations", "Subscriptions", "Other"
]

def categorize_expense_with_gemini(title: str):
    """Categorize expense based on title using Gemini AI"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        categories_str = ", ".join(EXPENSE_CATEGORIES)
        
        prompt = f"""
        Categorize this expense into one of these categories: {categories_str}
        
        Expense: "{title}"
        
        Return ONLY the category name from the list above that best matches this expense.
        If unsure, return "Other".
        
        Examples:
        - "groceries" -> "Groceries"
        - "uber ride" -> "Transportation"
        - "coffee" -> "Food & Dining"
        - "netflix" -> "Subscriptions"
        - "petrol" -> "Fuel"
        - "electricity bill" -> "Bills & Utilities"
        """
        
        response = model.generate_content(prompt)
        category = response.text.strip()
        
        # Ensure the returned category is in our predefined list
        if category in EXPENSE_CATEGORIES:
            return category
        else:
            # Try to find a close match
            title_lower = title.lower()
            if any(word in title_lower for word in ['food', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast']):
                return "Food & Dining"
            elif any(word in title_lower for word in ['uber', 'taxi', 'bus', 'train', 'metro', 'transport']):
                return "Transportation"
            elif any(word in title_lower for word in ['grocery', 'supermarket', 'vegetables', 'fruits']):
                return "Groceries"
            elif any(word in title_lower for word in ['petrol', 'diesel', 'fuel', 'gas']):
                return "Fuel"
            elif any(word in title_lower for word in ['movie', 'cinema', 'game', 'entertainment']):
                return "Entertainment"
            elif any(word in title_lower for word in ['electricity', 'water', 'gas', 'internet', 'phone', 'bill']):
                return "Bills & Utilities"
            elif any(word in title_lower for word in ['medicine', 'doctor', 'hospital', 'health']):
                return "Healthcare"
            elif any(word in title_lower for word in ['book', 'course', 'education', 'school', 'college']):
                return "Education"
            elif any(word in title_lower for word in ['shop', 'shopping', 'clothes', 'dress']):
                return "Shopping"
            elif any(word in title_lower for word in ['netflix', 'spotify', 'subscription', 'prime']):
                return "Subscriptions"
            else:
                return "Other"
        
    except Exception as e:
        logger.error(f"Error categorizing expense: {e}")
        return "Other"

def parse_expense_with_gemini(message: str):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Get current date and time in IST
        current_time = datetime.now(timezone.utc)
        current_time_str = current_time.strftime("%Y-%m-%dT%H:%M:%S")
        
        prompt = f"""
        Parse this expense message and return a valid JSON object with these exact fields:
        - "title": A brief description of the expense
        - "amount": The amount as a number (not string)
        - "date": ISO format datetime string (YYYY-MM-DDTHH:MM:SS)
        
        Message: "{message}"
        
        If no date/time is mentioned, use the current time: {current_time_str}
        If only date is mentioned (no time), assume evening time like 19:00:00
        
        Return ONLY the JSON object, no extra text or formatting:
        """
        
        response = model.generate_content(prompt)
        logger.debug(f"Raw Gemini response: {response.text}")
        
        # Clean the response to extract JSON content
        cleaned_response = response.text.strip()
        
        # Remove markdown code blocks if present
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:].rstrip("```").strip()
        elif cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:].rstrip("```").strip()
        
        # Remove any extra text before/after JSON
        json_match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
        if json_match:
            cleaned_response = json_match.group(0)
        
        if not cleaned_response or cleaned_response == "":
            logger.error("Empty response from Gemini after cleaning")
            return None
        
        logger.debug(f"Cleaned JSON string: {cleaned_response}")
        
        parsed_data = json.loads(cleaned_response)
        
        # Validate required fields
        if not all(key in parsed_data for key in ["title", "amount", "date"]):
            logger.warning("Parsed data missing required fields")
            return None
        
        # Convert amount to float if it's a string
        if isinstance(parsed_data["amount"], str):
            parsed_data["amount"] = float(parsed_data["amount"])
        
        # Ensure date is in proper format
        if isinstance(parsed_data["date"], str):
            try:
                # Try to parse and reformat the date
                parsed_date = datetime.fromisoformat(parsed_data["date"].replace('Z', ''))
                parsed_data["date"] = parsed_date.isoformat()
            except ValueError:
                # If parsing fails, use current time
                parsed_data["date"] = current_time.isoformat()
        
        logger.debug(f"Final parsed data: {parsed_data}")
        return parsed_data
        
    except (json.JSONDecodeError, AttributeError, ValueError) as e:
        logger.error(f"Error parsing Gemini response: {e}")
        logger.error(f"Response text: {response.text if 'response' in locals() else 'No response'}")
        return None