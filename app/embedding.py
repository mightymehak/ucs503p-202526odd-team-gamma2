from io import BytesIO
import base64

try:
    from .embeddings_resnet import get_resnet_embedding, get_resnet_embedding_from_bytes, get_resnet_embeddings_variants_from_bytes
    EMBEDDING_DIM = 2048

    # Safe wrapper: use from_bytes if possible, else fallback
    def get_image_embedding_from_base64(image_b64: str):
        image_bytes = base64.b64decode(image_b64)
        return get_resnet_embedding_from_bytes(image_bytes)

    def get_image_embeddings_variants_from_base64(image_b64: str):
        image_bytes = base64.b64decode(image_b64)
        return get_resnet_embeddings_variants_from_bytes(image_bytes)

except Exception:
    import hashlib
    import numpy as np
    EMBEDDING_DIM = 2048

    def _hash_embed(image_bytes: bytes, dim: int = EMBEDDING_DIM) -> np.ndarray:
        h = hashlib.sha256(image_bytes).digest()
        arr = np.frombuffer(h, dtype=np.uint8).astype(np.float32)
        reps = (dim + arr.size - 1) // arr.size
        tiled = np.tile(arr, reps)[:dim]
        norm = np.linalg.norm(tiled)
        return tiled if norm == 0 else tiled / norm

    def get_image_embedding_from_base64(image_b64: str):
        image_bytes = base64.b64decode(image_b64)
        return _hash_embed(image_bytes)

    def get_image_embeddings_variants_from_base64(image_b64: str):
        image_bytes = base64.b64decode(image_b64)
        v = _hash_embed(image_bytes)
        return [v] * 8
