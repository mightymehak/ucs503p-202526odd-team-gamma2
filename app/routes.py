from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from uuid import uuid4
import time
from app.queue_config import enqueue_job, r
import json
import base64
from typing import Optional

router = APIRouter()

@router.post("/user/complaint")
async def upload_user_complaint(
    file: UploadFile = File(...),
    location: str = Form(...),
    date: str = Form(None),
    itemName: str = Form(...),
    authorization: Optional[str] = Header(None)
):
    try:
        # Extract user_id from token (simplified - you may need to decode JWT)
        user_id = None
        if authorization:
            # For now, we'll store user_id separately - you can decode JWT here
            # This is a placeholder - implement proper JWT decoding
            pass
        
        # Read file into memory
        image_bytes = await file.read()
        # Encode as base64 string for safe JSON transport
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')

        job_id = str(uuid4())
        job = {
            "job_id": job_id,
            "type": "user_complaint",
            "image_b64": image_b64,
            "location": location,
            "date": date,
            "itemName": itemName,
            "timestamp": time.time(),
            "user_id": user_id  # Store user_id if available
        }
        enqueue_job(job)
        
        # Store job info in Redis for user tracking
        job_info = {
            "job_id": job_id,
            "type": "user_complaint",
            "location": location,
            "date": date,
            "itemName": itemName,
            "timestamp": time.time(),
            "status": "pending",
            "user_id": user_id
        }
        r.set(f"job:{job_id}", json.dumps(job_info))
        
        # Track user's jobs
        if user_id:
            r.sadd(f"user:jobs:{user_id}", job_id)
        else:
            # If no user_id, use a default or store in a general list
            r.sadd("jobs:all", job_id)
        
        print(f"Job queued: {job_id}")

        return {
            "status": "queued",
            "message": "Your complaint has been submitted and will be processed shortly.",
            "job_id": job_id,
        }
    except Exception as e:
        print(f"Error in /user/complaint: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@router.post("/admin/found")
async def upload_admin_found(
    file: UploadFile = File(...),
    location: str = Form(...),
    date: str = Form(None),
    itemName: str = Form(...)
):
    try:
        # Read file into memory
        image_bytes = await file.read()
        # Encode as base64 string
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')

        job_id = str(uuid4())
        job = {
            "job_id": job_id,
            "type": "admin_found",
            "image_b64": image_b64,
            "location": location,
            "date": date,
            "itemName": itemName,
            "timestamp": time.time()
        }
        enqueue_job(job)
        
        # Store job info in Redis for tracking
        job_info = {
            "job_id": job_id,
            "type": "admin_found",
            "location": location,
            "date": date,
            "itemName": itemName,
            "timestamp": time.time(),
            "status": "pending"
        }
        r.set(f"job:{job_id}", json.dumps(job_info))
        r.sadd("jobs:all", job_id)
        
        print(f"Job queued: {job_id}")

        return {
            "status": "queued",
            "message": "Found report submitted and will be processed shortly.",
            "job_id": job_id,
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

@router.get("/user/complaints")
async def get_user_complaints(authorization: Optional[str] = Header(None)):
    """
    Get all complaints for the current user.
    Returns list of complaints with their status from FAISS processing.
    """
    try:
        user_id = None
        if authorization:
            # Decode JWT to get user_id - placeholder for now
            # You'll need to implement proper JWT decoding
            pass
        
        complaints = []
        
        if user_id:
            # Get all job IDs for this user
            job_ids = r.smembers(f"user:jobs:{user_id}")
        else:
            # If no user_id, get all jobs (for testing)
            job_ids = r.smembers("jobs:all")
        
        for job_id in job_ids:
            job_info_str = r.get(f"job:{job_id}")
            if job_info_str:
                job_info = json.loads(job_info_str)
                
                # Get result status from Redis
                result_str = r.get(f"result:{job_id}")
                if result_str:
                    result = json.loads(result_str)
                    job_info["status"] = result.get("status", "pending")
                    job_info["matches"] = result.get("matches", [])
                    job_info["message"] = result.get("message", "")
                else:
                    job_info["status"] = "pending"
                    job_info["matches"] = []
                    job_info["message"] = "Processing..."
                
                complaints.append(job_info)
        
        # Sort by timestamp (newest first)
        complaints.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        
        return {"complaints": complaints}
    except Exception as e:
        print(f"Error in /user/complaints: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@router.get("/user/complaints/{job_id}")
async def get_complaint_by_id(job_id: str):
    """Get a specific complaint by job_id"""
    try:
        job_info_str = r.get(f"job:{job_id}")
        if not job_info_str:
            raise HTTPException(status_code=404, detail="Complaint not found")
        
        job_info = json.loads(job_info_str)
        
        # Get result status
        result_str = r.get(f"result:{job_id}")
        if result_str:
            result = json.loads(result_str)
            job_info["status"] = result.get("status", "pending")
            job_info["matches"] = result.get("matches", [])
            job_info["message"] = result.get("message", "")
        else:
            job_info["status"] = "pending"
            job_info["matches"] = []
            job_info["message"] = "Processing..."
        
        return job_info
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /user/complaints/{job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")
