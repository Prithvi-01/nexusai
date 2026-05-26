import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

class AuthSchema(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    """Computes a SHA-256 password hash."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(credentials: AuthSchema, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.username == credentials.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
        
    new_user = User(
        username=credentials.username,
        password_hash=hash_password(credentials.password)
    )
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully", "username": credentials.username}

@router.post("/login")
def login(credentials: AuthSchema, db: Session = Depends(get_db)):
    # Verify username and password hash
    user = db.query(User).filter(
        User.username == credentials.username,
        User.password_hash == hash_password(credentials.password)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
        
    # Return mock JWT session payload
    return {
        "access_token": f"mock_session_token_for_{user.username}",
        "token_type": "bearer",
        "username": user.username
    }
