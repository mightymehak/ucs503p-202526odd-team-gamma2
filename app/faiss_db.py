import faiss
import numpy as np
import pickle
import os

def normalize(vec):
    norm = np.linalg.norm(vec)
    return vec if norm == 0 else vec / norm

class FaissImageDB:
    def __init__(self, dim=2048):
        self.index = faiss.IndexFlatIP(dim)
        self.metadata = []

    def add_embedding(self, embedding, meta: dict):
        embedding = normalize(embedding)
        self.index.add(np.array([embedding]).astype(np.float32))
        self.metadata.append(meta)

    def location_similarity(self, loc1, loc2):
        if not loc1 or not loc2:
            return 0.5
        a = str(loc1).strip().lower()
        b = str(loc2).strip().lower()
        if a == b:
            return 1.0
        return 0.5

    def query(self, embedding, search_type, k=5, query_location=None, w_embed=0.9, w_loc=0.1):
        # search_type: "lost_report" for admin/found, "found_report" for user/complaint
        if self.index.ntotal == 0 or len(self.metadata) == 0:
            return []
        embedding = normalize(embedding)
        D, I = self.index.search(np.array([embedding]).astype(np.float32), min(k, self.index.ntotal))
        matches = []
        for i, score in zip(I[0], D[0]):
            idx = int(i)
            if idx < 0 or idx >= len(self.metadata):
                continue
            meta = self.metadata[idx]
            if not isinstance(meta, dict) or meta.get('deleted') or meta.get('type') != search_type:
                continue
            sim_score = (score + 1) / 2  # Normalize to [0,1]
            loc_score = self.location_similarity(meta.get("location"), query_location)
            combined_score = w_embed * sim_score + w_loc * loc_score
            combined_score = min(max(combined_score, 0.0), 1.0)
            matches.append({"meta": meta, "score": float(combined_score)})
        return matches

    def get_best_matches(self, matches):
        # Sort by score descending, then select by thresholds
        matches = sorted(matches, key=lambda x: x["score"], reverse=True)
        high_conf = [m for m in matches if m["score"] >= 0.92]
        med_conf = [m for m in matches if 0.72 <= m["score"] < 0.92]
        return high_conf, med_conf

    def save(self, index_path: str, metadata_path: str):
        faiss.write_index(self.index, index_path)
        with open(metadata_path, "wb") as f:
            pickle.dump(self.metadata, f)

    def load(self, index_path: str, metadata_path: str):
        if os.path.exists(index_path):
            self.index = faiss.read_index(index_path)
        else:
            raise FileNotFoundError(f"FAISS index file not found: {index_path}")
        if os.path.exists(metadata_path):
            with open(metadata_path, "rb") as f:
                self.metadata = pickle.load(f)
        else:
            raise FileNotFoundError(f"Metadata file not found: {metadata_path}")
        try:
            ntotal = getattr(self.index, 'ntotal', 0)
            if isinstance(self.metadata, list):
                if len(self.metadata) > ntotal:
                    self.metadata = self.metadata[:ntotal]
                elif len(self.metadata) < ntotal:
                    pad = ntotal - len(self.metadata)
                    self.metadata.extend([{"deleted": True}] * pad)
        except Exception:
            pass

    def remove_by_job_id(self, job_id: str) -> bool:
        # Soft-delete: mark metadata entries as deleted to keep index positions stable
        changed = False
        for i, m in enumerate(self.metadata):
            if isinstance(m, dict) and m.get("job_id") == job_id and not m.get("deleted"):
                m["deleted"] = True
                self.metadata[i] = m
                changed = True
        return changed
