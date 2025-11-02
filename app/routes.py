from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from uuid import uuid4
import time
from app.queue_config import enqueue_job, r
import json
import base64

router = APIRouter()

@router.post("/user/complaint")
async def upload_user_complaint(
    file: UploadFile = File(...),
    location: str = Form(...),
    date: str = Form(None)
):
    try:
        # Read file into memory
        image_bytes = await file.read()
        # Encode as base64 string for safe JSON transport
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')

        job = {
            "job_id": str(uuid4()),
            "type": "user_complaint",
            "image_b64": image_b64,
            "location": location,
            "date": date,
            "timestamp": time.time()
        }
        enqueue_job(job)
        print(f"Job queued: {job['job_id']}")

        return {
            "status": "queued",
            "message": "Your complaint has been submitted and will be processed shortly.",
            "job_id": job["job_id"],
        }
    except Exception as e:
        print(f"Error in /user/complaint: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@router.post("/admin/found")
async def upload_admin_found(
    file: UploadFile = File(...),
    location: str = Form(...),
    date: str = Form(None)
):
    try:
        # Read file into memory
        image_bytes = await file.read()
        # Encode as base64 string
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')

        job = {
            "job_id": str(uuid4()),
            "type": "admin_found",
            "image_b64": image_b64,
            "location": location,
            "date": date,
            "timestamp": time.time()
        }
        enqueue_job(job)
        print(f"Job queued: {job['job_id']}")

        return {
            "status": "queued",
            "message": "Found report submitted and will be processed shortly.",
            "job_id": job["job_id"],
        }
    except Exception as e:
        print(f"Error in /admin/found: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@router.get("/results/{job_id}")
async def get_result(job_id: str):
    result = r.get(f"result:{job_id}")
    if not result:
        return {"status": "pending", "message": "Result not yet ready, check back soon."}
    return json.loads(result)
