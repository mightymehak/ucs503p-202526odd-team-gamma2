import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
from fastapi import FastAPI
from app.routes import router

app = FastAPI(title="Lost & Found AI Upload with ResNet Embeddings")

@app.get("/")
async def root():
    return {"message": "Lost and Found AI Backend is running with ResNet embeddings"}

app.include_router(router)
