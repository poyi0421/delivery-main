from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas, security
from app.database import get_db

router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="該電子信箱已被註冊",
        )
    
    # Hash password
    hashed_password = security.get_password_hash(user_in.password)
    
    # Create user
    new_user = models.User(
        email=user_in.email,
        password_hash=hashed_password,
        role=user_in.role,
    )
    
    if user_in.role == "driver":
        new_user.driver_status = "idle"
        new_user.last_idle_at = datetime.utcnow()
        
    db.add(new_user)
    db.flush()  # Get user.id
    
    # If merchant, create automatic merchant details profile
    if user_in.role == "merchant":
        default_name = f"{user_in.email.split('@')[0]} 的店"
        new_merchant = models.Merchant(
            user_id=new_user.id,
            name=default_name,
            description="歡迎光臨！這是本系統為您建立的預設店家。",
        )
        db.add(new_merchant)
        
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Authenticate user
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="電子信箱或密碼錯誤",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Generate access token
    access_token = security.create_access_token(data={"sub": user.email, "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
    }
