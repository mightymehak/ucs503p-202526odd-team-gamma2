import time
from app.queue_config import dequeue_job, r
from app.embedding import get_image_embedding_from_base64
from app.faiss_db import FaissImageDB
import json
import traceback
import os

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

DB_INDEX_PATH = "faiss.index"
DB_METADATA_PATH = "metadata.pkl"
db = FaissImageDB(dim=2048)

try:
    db.load(DB_INDEX_PATH, DB_METADATA_PATH)
    print("Loaded FAISS database.")
except FileNotFoundError:
    print("No existing FAISS DB found; starting new one.")

while True:
    try:
        if r.get("faiss:reload") == "1":
            try:
                db.load(DB_INDEX_PATH, DB_METADATA_PATH)
            except Exception:
                pass
            r.delete("faiss:reload")
    except Exception:
        pass
    job = dequeue_job()
    if not job:
        time.sleep(2)
        continue

    print(f"\n🔹 Processing job: {job['job_id']} ({job['type']})")

    try:
        image_b64 = job["image_b64"]
        location = job.get("location")
        date = job.get("date")
        itemName = job.get("itemName", "Unnamed Item")
        job_type = job.get("type", "")

        # Get embedding from in-memory base64 image
        embedding = get_image_embedding_from_base64(image_b64)
        print(f"Generated embedding for job {job['job_id']}")

        if job_type == "user_complaint":
            search_target_type = "found_report"
        elif job_type == "admin_found":
            search_target_type = "lost_report"
        else:
            search_target_type = None

        if search_target_type:
            matches = db.query(embedding, search_type=search_target_type, k=5, query_location=location)
            high_conf, med_conf = db.get_best_matches(matches)
        else:
            high_conf, med_conf = [], []

        

        if high_conf:
            result = {
                "status": "matched",
                "matches": high_conf,
                "message": "Match found! Please report to Lost & Found department.",
            }
            # Still add to database even if matched
            metadata = {
                "job_id": job["job_id"],
                "location": location,
                "date": date,
                "itemName": itemName,
                "type": "lost_report" if job_type == "user_complaint" else "found_report",
                "user_id": job.get("user_id"),
                "user_name": job.get("user_name"),
                "timestamp": job.get("timestamp", time.time())
            }
            db.add_embedding(embedding, metadata)
            db.save(DB_INDEX_PATH, DB_METADATA_PATH)
            # If this is a user complaint, propagate match to corresponding found items
            if job_type == "user_complaint":
                try:
                    for m in high_conf:
                        meta = m.get("meta", {})
                        target_found_job_id = meta.get("job_id")
                        if not target_found_job_id:
                            continue
                        found_job_info_str = r.get(f"job:{target_found_job_id}")
                        if found_job_info_str:
                            found_job_info = json.loads(found_job_info_str)
                            found_job_info["status"] = "matched"
                            found_job_info["message"] = "Matched with a lost complaint"
                            r.set(f"job:{target_found_job_id}", json.dumps(found_job_info))
                            r.expire(f"job:{target_found_job_id}", 60*60*24*30)
                        found_result = {
                            "status": "matched",
                            "matches": [{
                                "meta": {
                                    "job_id": job["job_id"],
                                    "type": "lost_report",
                                    "location": location,
                                    "date": date,
                                    "itemName": itemName,
                                },
                                "score": m.get("score", 1.0)
                            }],
                            "message": "Match found with a user lost complaint."
                        }
                        r.set(f"result:{target_found_job_id}", json.dumps(found_result))
                        r.expire(f"result:{target_found_job_id}", 60*60*24*30)
                except Exception as redis_e:
                    print(f"⚠️ Redis propagation error for user high_conf: {redis_e}")
                    traceback.print_exc()
            
            # If this is an admin_found job, propagate 'matched' status to matched lost complaints
            if job_type == "admin_found":
                # Inner try/except block for Redis operations
                try:
                    for m in high_conf:
                        meta = m.get("meta", {})
                        target_job_id = meta.get("job_id")
                        if not target_job_id:
                            continue
                        # Update target lost complaint job status
                        target_job_info_str = r.get(f"job:{target_job_id}")
                        if target_job_info_str:
                            target_job_info = json.loads(target_job_info_str)
                            target_job_info["status"] = "matched"
                            target_job_info["message"] = "Matched with a found item"
                            r.set(f"job:{target_job_id}", json.dumps(target_job_info))
                            r.expire(f"job:{target_job_id}", 60*60*24*30)
                        target_result = {
                            "status": "matched",
                            "matches": [{
                                "meta": {
                                    "job_id": job["job_id"],
                                    "type": "admin_found",
                                    "location": location,
                                    "date": date,
                                    "itemName": itemName,
                                },
                                "score": m.get("score", 1.0)
                            }],
                            "message": "Match found with an admin reported item."
                        }
                        r.set(f"result:{target_job_id}", json.dumps(target_result))
                        r.expire(f"result:{target_job_id}", 60*60*24*30)
                except Exception as redis_e:
                    # Log internal Redis errors but don't fail the main processing loop
                    print(f"⚠️ Redis propagation error for high_conf: {redis_e}")
                    traceback.print_exc()

        elif med_conf:
            result = {
                "status": "matched",
                "matches": med_conf,
                "message": "Potential match found! Please check with Lost & Found department.",
            }
            # Still add to database even if matched
            metadata = {
                "job_id": job["job_id"],
                "location": location,
                "date": date,
                "itemName": itemName,
                "type": "lost_report" if job_type == "user_complaint" else "found_report",
                "user_id": job.get("user_id"),
                "user_name": job.get("user_name"),
                "timestamp": job.get("timestamp", time.time())
            }
            db.add_embedding(embedding, metadata)
            db.save(DB_INDEX_PATH, DB_METADATA_PATH)
            # If this is a user complaint, propagate potential match to found items
            if job_type == "user_complaint":
                try:
                    for m in med_conf:
                        meta = m.get("meta", {})
                        target_found_job_id = meta.get("job_id")
                        if not target_found_job_id:
                            continue
                        found_job_info_str = r.get(f"job:{target_found_job_id}")
                        if found_job_info_str:
                            found_job_info = json.loads(found_job_info_str)
                            found_job_info["status"] = "matched"
                            found_job_info["message"] = "Potential match with a lost complaint"
                            r.set(f"job:{target_found_job_id}", json.dumps(found_job_info))
                            r.expire(f"job:{target_found_job_id}", 60*60*24*30)
                        found_result = {
                            "status": "matched",
                            "matches": [{
                                "meta": {
                                    "job_id": job["job_id"],
                                    "type": "lost_report",
                                    "location": location,
                                    "date": date,
                                    "itemName": itemName,
                                },
                                "score": m.get("score", 0.8)
                            }],
                            "message": "Potential match found with a user lost complaint."
                        }
                        r.set(f"result:{target_found_job_id}", json.dumps(found_result))
                        r.expire(f"result:{target_found_job_id}", 60*60*24*30)
                except Exception as redis_e:
                    print(f"⚠️ Redis propagation error for user med_conf: {redis_e}")
                    traceback.print_exc()
            
            # Propagate medium confidence matches for admin_found as "matched" to user complaints
            if job_type == "admin_found":
                # Inner try/except block for Redis operations
                try:
                    for m in med_conf:
                        meta = m.get("meta", {})
                        target_job_id = meta.get("job_id")
                        if not target_job_id:
                            continue
                        target_job_info_str = r.get(f"job:{target_job_id}")
                        if target_job_info_str:
                            target_job_info = json.loads(target_job_info_str)
                            target_job_info["status"] = "matched"
                            target_job_info["message"] = "Potential match with a found item"
                            r.set(f"job:{target_job_id}", json.dumps(target_job_info))
                            r.expire(f"job:{target_job_id}", 60*60*24*30)
                        target_result = {
                            "status": "matched",
                            "matches": [{
                                "meta": {
                                    "job_id": job["job_id"],
                                    "type": "admin_found",
                                    "location": location,
                                    "date": date,
                                    "itemName": itemName,
                                },
                                "score": m.get("score", 0.8)
                            }],
                            "message": "Potential match found with an admin item."
                        }
                        r.set(f"result:{target_job_id}", json.dumps(target_result))
                        r.expire(f"result:{target_job_id}", 60*60*24*30)
                except Exception as redis_e:
                    # Log internal Redis errors but don't fail the main processing loop
                    print(f"⚠️ Redis propagation error for med_conf: {redis_e}")
                    traceback.print_exc()

        else:
            # Add the job as lost or found, depending on its type
            metadata = {
                "job_id": job["job_id"],  # Store job_id for tracking
                "location": location,
                "date": date,
                "itemName": itemName,
                "type": "lost_report" if job_type == "user_complaint" else "found_report",
                "user_id": job.get("user_id"),
                "user_name": job.get("user_name"),
                "timestamp": job.get("timestamp", time.time())
            }
            db.add_embedding(embedding, metadata)
            db.save(DB_INDEX_PATH, DB_METADATA_PATH)
            result = {
                "status": "no_match",
                "message": (
                    "No match found; complaint has been added."
                    if job_type == "user_complaint"
                    else "No match found; found item has been added to the database."
                ),
            }
        
        
        
        # Update job status in Redis
        job_info_str = r.get(f"job:{job['job_id']}")
        if job_info_str:
            job_info = json.loads(job_info_str)
            job_info["status"] = result["status"]
            job_info["processed_at"] = time.time()
            r.set(f"job:{job['job_id']}", json.dumps(job_info))
            r.expire(f"job:{job['job_id']}", 60*60*24*30)

        # Save the result back to Redis
        r.set(f"result:{job['job_id']}", json.dumps(result))
        r.expire(f"result:{job['job_id']}", 60*60*24*30)
        print(f"✅ Job {job['job_id']} processed and saved to Redis")

    except Exception as e:
        # This catches errors during setup, embedding generation, or main processing
        print(f"❌ Error processing job {job['job_id']}: {e}")
        traceback.print_exc()
