from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from .database import engine, Base
from .routes import router as api_router
from .models import TeamRoster
from .auth import get_password_hash, SECRET_KEY, ALGORITHM
from .enums import UserRole
import os
import json
import jwt
from jose import JWTError
from datetime import datetime
import logging
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RT3 Management System API",
    description="API for the RT3 Management System",
    version="1.0.0"
)

# Configure CORS with allowed origins
origins = [
    "http://localhost:3000",  # React development server
    "http://localhost:5000",  # Production frontend
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
    "https://rt3.*",  # Allow all subdomains of rt3
]

# Get allowed origins from environment variable if set
env_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
if env_origins and env_origins[0]:  # Only add if not empty
    origins.extend(env_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to handle trailing slashes
@app.middleware("http")
async def trailing_slash_middleware(request: Request, call_next):
    """
    Middleware to handle trailing slashes in URLs consistently.
    
    This middleware:
    1. Preserves trailing slashes for root path (/) and static files (/uploads/...)
    2. Removes trailing slashes from all other routes
    3. Falls back to original path if modified path results in 404
    
    Args:
        request (Request): The incoming request
        call_next (Callable): The next middleware/route handler
        
    Returns:
        Response: The response from the next middleware/route handler
    """
    try:
        path = request.url.path
        
        # Skip for root path and static files
        if path == "/" or path.startswith("/uploads/"):
            return await call_next(request)
        
        # Remove trailing slash for all other routes
        original_path = path
        if path.endswith("/") and len(path) > 1:
            request.scope["path"] = path.rstrip("/")
        
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            # If we get a 404 and we modified the path, try the original path
            if e.status_code == 404 and original_path != request.scope["path"]:
                request.scope["path"] = original_path
                return await call_next(request)
            raise
            
    except Exception as e:
        # Log any unexpected errors but don't expose them to the client
        logger.error(f"Error in trailing slash middleware: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail="An internal server error occurred"
        )

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Mount static files directory
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include API routes
app.include_router(api_router, prefix="/api")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    try:
        # Get token from query parameters
        query_params = dict(websocket.query_params)
        token = query_params.get("token")
        
        if not token:
            await websocket.close(code=4000, reason="No token provided")
            return
            
        # Verify the token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if not username:
                await websocket.close(code=4001, reason="Invalid token")
                return
                
            # Check if the token has expired
            if "exp" in payload:
                if datetime.utcnow().timestamp() > payload["exp"]:
                    await websocket.close(code=4001, reason="Token expired")
                    return
                    
            # Accept the connection after successful authentication
            await websocket.accept()
            print(f"WebSocket connection accepted for user: {username}")
            
            await websocket.send_json({"type": "auth", "status": "success"})
            
            while True:
                try:
                    data = await websocket.receive_text()
                    print(f"Received WebSocket message from {username}: {data}")
                    await websocket.send_text(f"Message text was: {data}")
                except WebSocketDisconnect:
                    print(f"WebSocket disconnected for user: {username}")
                    break
                except Exception as e:
                    print(f"WebSocket error for user {username}: {e}")
                    try:
                        await websocket.close()
                    except:
                        pass
                    break
                    
        except JWTError as e:
            print(f"Token validation error: {e}")
            await websocket.close(code=4001, reason="Invalid token")
            return
            
    except Exception as e:
        print(f"WebSocket connection error: {e}")
        try:
            await websocket.close()
        except:
            pass

@app.on_event("startup")
async def startup_event():
    # Create default admin user if it doesn't exist
    from sqlalchemy.orm import Session
    from .database import SessionLocal
    db = SessionLocal()
    try:
        admin = db.query(TeamRoster).filter(TeamRoster.operator_handle == "admin").first()
        if not admin:
            admin = TeamRoster(
                operator_handle="admin",
                email="admin@rt3.com",
                team_role=UserRole.ADMIN,
                hashed_password=get_password_hash("admin"),
                name="Admin User",
                active=False
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()

@app.get("/")
def read_root():
    return {
        "message": "Welcome to RT3 Management System API",
        "documentation": "/docs",
        "version": "1.0.0"
    }
