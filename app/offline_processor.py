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
    job = dequeue_job()
    if not job:
        time.sleep(2)
        continue

    print(f"\n🔹 Processing job: {job['job_id']} ({job['type']})")

    try:
        image_b64 = job["image_b64"]
        location = job.get("location")
        date = job.get("date")
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
                "status": "high_confidence",
                "matches": high_conf,
                "message": "Match found! Please report to Lost & Found department.",
            }
        elif med_conf:
            result = {
                "status": "medium_confidence",
                "matches": med_conf,
                "message": "Potential match found! Please check with Lost & Found department.",
            }
        else:
            # Add the job as lost or found, depending on its type
            metadata = {
                "location": location,
                "date": date,
                "type": "lost_report" if job_type == "user_complaint" else "found_report",
                # (Optional: add a unique identifier if needed)
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

        # Save the result back to Redis
        r.set(f"result:{job['job_id']}", json.dumps(result))
        print(f"✅ Job {job['job_id']} processed and saved to Redis")

    except Exception as e:
        print(f"❌ Error processing job {job['job_id']}: {e}")
        traceback.print_exc()
