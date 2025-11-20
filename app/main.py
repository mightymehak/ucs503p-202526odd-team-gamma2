import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router

app = FastAPI(title="Lost & Found AI Upload with ResNet Embeddings")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://ucs503p-202526odd-team-gamma2.onrender.com",
        "https://lostandfounduserauthentication.onrender.com",
    ],
    allow_origin_regex=r"^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Lost and Found AI Backend is running with ResNet embeddings"}

app.include_router(router, prefix="/api", tags=["api"])
