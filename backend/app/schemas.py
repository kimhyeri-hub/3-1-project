#데이터 송수긴 규격 
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MedicineBase(BaseModel):
    pill_name: str
    dosage_instruction: str

class MedicineCreate(MedicineBase):
    pass

class Medicine(MedicineBase):
    id: int
    user_id: int
    is_safe: bool
    warning_message: Optional[str] = None

    class Config:
        from_attributes = True