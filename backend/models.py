from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, Union

class Expense(BaseModel):
    title: str
    amount: float
    date: Optional[Union[datetime, str]] = None
    category: Optional[str] = "Other"
    
    @validator('date', pre=True)
    def parse_date(cls, v):
        if v is None:
            return datetime.utcnow()
        if isinstance(v, str):
            try:
                # Try to parse ISO format
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                # If parsing fails, return current time
                return datetime.utcnow()
        return v
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v
    
    @validator('category', pre=True)
    def validate_category(cls, v):
        if not v:
            return "Other"
        return v