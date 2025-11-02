import redis
import os
import json

REDIS_HOST = os.getenv("REDIS_HOST", "redis-14696.c330.asia-south1-1.gce.redns.redis-cloud.com")
REDIS_PORT = os.getenv("REDIS_PORT", "14696")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "6CWoI4fVTA1WVSDZibKXuqGgeW3RfxnT")

r = redis.StrictRedis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    decode_responses=True
)

def enqueue_job(job_data: dict):
    r.rpush("lostandfound_jobs", json.dumps(job_data))

def dequeue_job():
    job = r.blpop("lostandfound_jobs", timeout=5)
    if job:
        _, data = job
        return json.loads(data)
    return None
