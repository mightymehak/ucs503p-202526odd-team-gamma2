from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from uuid import uuid4
import time
from app.queue_config import enqueue_job, r
import json
import base64
from typing import Optional
import typing
import os
from fastapi.responses import FileResponse
from app.faiss_db import FaissImageDB

def _get_user_id_from_auth(authorization: typing.Optional[str]) -> typing.Optional[str]:
    try:
        if not authorization:
            return None
        parts = authorization.split()
        if len(parts) != 2 or parts[0] != 'Bearer':
            return None
        token = parts[1]
        segments = token.split('.')
        if len(segments) != 3:
            return None
        payload_segment = segments[1]
        padding = '=' * (-len(payload_segment) % 4)
        decoded = base64.urlsafe_b64decode(payload_segment + padding)
        payload = json.loads(decoded.decode('utf-8'))
        # Accept tokens both with and without 'type' field
        t = payload.get('type')
        # If type present and not user/admin, reject
        if t is not None and t not in ('user', 'admin'):
            return None
        return payload.get('id') or payload.get('user_id')
    except Exception:
        return None

router = APIRouter()

 

@router.post("/user/complaint")
async def upload_user_complaint(
    file: UploadFile = File(...),
    location: str = Form(...),
    date: str = Form(None),
    itemName: str = Form(...),
    userId: Optional[str] = Form(None),
    userName: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    try:
        auth_user_id = _get_user_id_from_auth(authorization)
        user_id = auth_user_id or userId
        
        image_bytes = await file.read()
        if file.content_type not in ("image/jpeg", "image/png"):
            raise HTTPException(status_code=400, detail="Invalid image type. Use JPEG or PNG.")
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image too large (max 10MB)")
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
            "user_id": user_id,
            "user_name": userName
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
            "user_id": user_id,
            "user_name": userName,
        }
        r.set(f"job:{job_id}", json.dumps(job_info))
        r.expire(f"job:{job_id}", 60*60*24*30)
        
        if user_id:
            r.sadd(f"user:jobs:{user_id}", job_id)
        # Track globally for admin visibility
        r.sadd("jobs:lost_all", job_id)
        
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
        image_bytes = await file.read()
        if file.content_type not in ("image/jpeg", "image/png"):
            raise HTTPException(status_code=400, detail="Invalid image type. Use JPEG or PNG.")
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image too large (max 10MB)")
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
            "status": "pending",
        }
        r.set(f"job:{job_id}", json.dumps(job_info))
        r.expire(f"job:{job_id}", 60*60*24*30)
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

@router.get("/admin/lost-items")
async def admin_list_lost_items():
    try:
        complaints = []
        job_ids = r.smembers("jobs:lost_all")
        for job_id in job_ids:
            job_info_str = r.get(f"job:{job_id}")
            if not job_info_str:
                continue
            job_info = json.loads(job_info_str)
            p = job_info.get("image_url")
            if p:
                job_info["image_available"] = True
            else:
                job_info["image_available"] = False
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
        complaints.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        return {"lost_items": complaints}
    except Exception as e:
        print(f"Error in /admin/lost-items: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@router.get("/admin/found-items")
async def admin_list_found_items():
    try:
        items = []
        job_ids = r.smembers("jobs:all")
        for job_id in job_ids:
            job_info_str = r.get(f"job:{job_id}")
            if not job_info_str:
                continue
            job_info = json.loads(job_info_str)
            if job_info.get("type") != "admin_found":
                continue
            result_str = r.get(f"result:{job_id}")
            if result_str:
                result = json.loads(result_str)
                job_info["status"] = result.get("status", job_info.get("status", "pending"))
                job_info["matches"] = result.get("matches", [])
                job_info["message"] = result.get("message", "")
            else:
                job_info["status"] = job_info.get("status", "pending")
                job_info["matches"] = []
                job_info["message"] = "Processing..."
            items.append(job_info)
        items.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        return {"found_items": items}
    except Exception as e:
        print(f"Error in /admin/found-items: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@router.get("/admin/lost-items-faiss")
async def admin_list_lost_items_faiss():
    try:
        import pickle
        metas = []
        meta_path = "metadata.pkl"
        if not os.path.exists(meta_path):
            return {"lost_items": []}
        # Build a map of lost job_ids that are matched via admin_found results
        matched_lost_ids = set()
        try:
            admin_job_ids = r.smembers("jobs:all")
            for aj in admin_job_ids:
                job_info_str = r.get(f"job:{aj}")
                if not job_info_str:
                    continue
                job_info = json.loads(job_info_str)
                if job_info.get("type") != "admin_found":
                    continue
                result_str = r.get(f"result:{aj}")
                if not result_str:
                    continue
                result = json.loads(result_str)
                matches = result.get("matches", []) or []
                for m in matches:
                    meta = m.get("meta", {})
                    tid = meta.get("job_id")
                    if tid:
                        matched_lost_ids.add(tid)
        except Exception:
            matched_lost_ids = set()
        with open(meta_path, "rb") as f:
            metadata = pickle.load(f)
        seen = set()
        for m in metadata:
            if not isinstance(m, dict):
                continue
            if m.get("type") != "lost_report":
                continue
            job_id = m.get("job_id")
            if job_id in seen:
                continue
            seen.add(job_id)
            job_info_str = r.get(f"job:{job_id}") if job_id else None
            if not job_info_str:
                # Skip entries that have been removed from Redis
                continue
            job_info = json.loads(job_info_str) if job_info_str else {}
            image_url = job_info.get("image_url")
            result_str = r.get(f"result:{job_id}") if job_id else None
            status = "pending"
            message = "Processing..."
            matches = []
            if result_str:
                result = json.loads(result_str)
                status = result.get("status", status)
                message = result.get("message", message)
                matches = result.get("matches", [])
            # Reconcile: if this lost job_id appears in admin_found matches, mark matched
            if job_id and job_id in matched_lost_ids:
                status = "matched"
                message = "Matched with an admin reported item."
                try:
                    # Update Redis result for user dashboard visibility
                    reconciled_result = {
                        "status": "matched",
                        "matches": matches or [],
                        "message": message,
                    }
                    r.set(f"result:{job_id}", json.dumps(reconciled_result))
                    r.expire(f"result:{job_id}", 60*60*24*30)
                    job_info_str2 = r.get(f"job:{job_id}")
                    if job_info_str2:
                        job_info2 = json.loads(job_info_str2)
                        job_info2["status"] = "matched"
                        job_info2["message"] = message
                        r.set(f"job:{job_id}", json.dumps(job_info2))
                        r.expire(f"job:{job_id}", 60*60*24*30)
                except Exception:
                    pass
            metas.append({
                "job_id": job_id,
                "itemName": m.get("itemName"),
                "location": m.get("location"),
                "date": m.get("date"),
                "timestamp": m.get("timestamp"),
                "status": status,
                "message": message,
                "matches": matches,
                "image_url": image_url,
                "user_id": m.get("user_id"),
                "user_name": m.get("user_name"),
            })
        metas.sort(key=lambda x: x.get("timestamp", 0) or 0, reverse=True)
        return {"lost_items": metas}
    except Exception as e:
        print(f"Error in /admin/lost-items-faiss: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")

 

@router.get("/results/{job_id}")
async def get_result(job_id: str):
    result = r.get(f"result:{job_id}")
    if not result:
        return {"status": "pending", "message": "Result not yet ready, check back soon."}
    return json.loads(result)

@router.get("/user/complaints")
async def get_user_complaints(authorization: Optional[str] = Header(None), userId: Optional[str] = None):
    """
    Get all complaints for the current user.
    Returns list of complaints with their status from FAISS processing.
    """
    try:
        user_id = _get_user_id_from_auth(authorization) or userId
        complaints = []
        if not user_id:
            return {"complaints": complaints}
        job_ids = r.smembers(f"user:jobs:{user_id}")
        
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
                    msg = result.get("message", "")
                    if job_info["status"] != "matched" and msg.lower().startswith("matched"):
                        msg = "No match found; complaint has been added."
                    job_info["message"] = msg
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
            msg = result.get("message", "")
            if job_info["status"] != "matched" and msg.lower().startswith("matched"):
                msg = "No match found; complaint has been added."
            job_info["message"] = msg
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

@router.delete("/user/complaints/{job_id}")
async def delete_user_complaint(job_id: str, authorization: Optional[str] = Header(None), userId: Optional[str] = None):
    try:
        user_id = _get_user_id_from_auth(authorization) or userId

        job_info_str = r.get(f"job:{job_id}")
        if not job_info_str:
            raise HTTPException(status_code=404, detail="Complaint not found")
        job_info = json.loads(job_info_str)

        # Authorization: allow owner only
        if user_id and job_info.get("user_id") and job_info.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this complaint")

        # Remove job data and result
        r.delete(f"job:{job_id}")
        r.delete(f"result:{job_id}")

        

        # Remove from user set if we know user_id
        uid = job_info.get("user_id") or user_id
        if uid:
            r.srem(f"user:jobs:{uid}", job_id)

        # Also remove from global set if present
        r.srem("jobs:all", job_id)
        r.srem("jobs:lost_all", job_id)

        try:
            db = FaissImageDB(dim=2048)
            db.load("faiss.index", "metadata.pkl")
            changed = db.remove_by_job_id(job_id)
            if changed:
                db.save("faiss.index", "metadata.pkl")
                r.set("faiss:reload", "1")
        except Exception:
            pass

        try:
            ids = r.smembers("jobs:all") or []
            for fid in ids:
                res = r.get(f"result:{fid}")
                if not res:
                    continue
                data = json.loads(res)
                matches = data.get("matches") or []
                filtered = []
                for m in matches:
                    meta = m.get("meta") or {}
                    if meta.get("job_id") != job_id:
                        filtered.append(m)
                if len(filtered) != len(matches):
                    data["matches"] = filtered
                    if not filtered and data.get("status") == "matched":
                        data["status"] = "no_match"
                        ji = r.get(f"job:{fid}")
                        if ji:
                            j = json.loads(ji)
                            if j.get("type") == "admin_found":
                                data["message"] = "No match found; found item has been added to the database."
                            else:
                                data["message"] = "No match found; complaint has been added."
                    r.set(f"result:{fid}", json.dumps(data))
                    r.expire(f"result:{fid}", 60*60*24*30)
        except Exception:
            pass

        return {"status": "deleted", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting complaint {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@router.post("/user/complaints/{job_id}/delete")
async def delete_user_complaint_post(job_id: str, authorization: Optional[str] = Header(None), userId: Optional[str] = None):
    # Fallback for environments that block DELETE
    return await delete_user_complaint(job_id, authorization, userId)
@router.delete("/admin/found/{job_id}")
async def delete_admin_found(job_id: str):
    try:
        job_info_str = r.get(f"job:{job_id}")
        if not job_info_str:
            raise HTTPException(status_code=404, detail="Found item not found")
        job_info = json.loads(job_info_str)
        if job_info.get("type") != "admin_found":
            raise HTTPException(status_code=400, detail="Not an admin found item")

        r.delete(f"job:{job_id}")
        r.delete(f"result:{job_id}")

        

        r.srem("jobs:all", job_id)

        try:
            db = FaissImageDB(dim=2048)
            db.load("faiss.index", "metadata.pkl")
            changed = db.remove_by_job_id(job_id)
            if changed:
                db.save("faiss.index", "metadata.pkl")
                r.set("faiss:reload", "1")
        except Exception:
            pass

        try:
            sets = ["jobs:all", "jobs:lost_all"]
            for s in sets:
                ids = r.smembers(s) or []
                for tid in ids:
                    res = r.get(f"result:{tid}")
                    if not res:
                        continue
                    data = json.loads(res)
                    matches = data.get("matches") or []
                    filtered = []
                    changed_any = False
                    for m in matches:
                        meta = m.get("meta") or {}
                        if meta.get("job_id") != job_id:
                            filtered.append(m)
                        else:
                            changed_any = True
                    if changed_any:
                        data["matches"] = filtered
                        if not filtered and data.get("status") == "matched":
                            data["status"] = "no_match"
                            ji = r.get(f"job:{tid}")
                            if ji:
                                j = json.loads(ji)
                                if j.get("type") == "admin_found":
                                    data["message"] = "No match found; found item has been added to the database."
                                else:
                                    data["message"] = "No match found; complaint has been added."
                        r.set(f"result:{tid}", json.dumps(data))
                        r.expire(f"result:{tid}", 60*60*24*30)
        except Exception:
            pass

        return {"status": "deleted", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting found item {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@router.post("/admin/found/{job_id}/delete")
async def delete_admin_found_post(job_id: str):
    return await delete_admin_found(job_id)
