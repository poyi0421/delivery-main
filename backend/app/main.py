from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, merchants, orders

app = FastAPI(title="外送系統 API", version="1.0.0")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # React frontend URL should be configured here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(merchants.router, prefix="/api/merchants", tags=["merchants"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "歡迎來到外送系統 API！"}
