from io import BytesIO
import base64

try:
    from .embeddings_resnet import get_resnet_embedding, get_resnet_embedding_from_bytes
    EMBEDDING_DIM = 2048

    # Safe wrapper: use from_bytes if possible, else fallback
    def get_image_embedding_from_base64(image_b64: str):
        image_bytes = base64.b64decode(image_b64)
        return get_resnet_embedding_from_bytes(image_bytes)

except Exception:
    def get_image_embedding_from_base64(_b64: str):
        raise RuntimeError("Embedding backend not initialized")
    EMBEDDING_DIM = 2048
