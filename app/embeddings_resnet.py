import torch
from torchvision import models, transforms
from PIL import Image, ImageOps
import numpy as np
from io import BytesIO

_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Load ResNet50 model pretrained on ImageNet
from torchvision.models import ResNet50_Weights
_MODEL = models.resnet50(weights=ResNet50_Weights.DEFAULT).to(_DEVICE)
_MODEL.eval()

# Preprocessing pipeline for ImageNet
_PREPROCESS = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def _extract_features(x_tensor, model):
    with torch.no_grad():
        x = model.conv1(x_tensor)
        x = model.bn1(x)
        x = model.relu(x)
        x = model.maxpool(x)
        x = model.layer1(x)
        x = model.layer2(x)
        x = model.layer3(x)
        x = model.layer4(x)
        x = model.avgpool(x)
        x = x.view(x.size(0), -1)
    return x

def get_resnet_embedding(image_path: str):
    img = Image.open(image_path).convert("RGB")
    input_tensor = _PREPROCESS(img).unsqueeze(0).to(_DEVICE)
    embedding = _extract_features(input_tensor, _MODEL)
    vec = embedding.cpu().numpy().flatten()
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm

def _embed_img(img: Image.Image) -> np.ndarray:
    input_tensor = _PREPROCESS(img).unsqueeze(0).to(_DEVICE)
    embedding = _extract_features(input_tensor, _MODEL)
    vec = embedding.cpu().numpy().flatten()
    norm = np.linalg.norm(vec)
    return vec if norm == 0 else vec / norm

def get_resnet_embedding_from_bytes(image_bytes: bytes):
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img = ImageOps.autocontrast(img, cutoff=2)
    base = img
    flip = ImageOps.mirror(base)
    variants = [
        base,
        base.rotate(90, expand=True),
        base.rotate(180, expand=True),
        base.rotate(270, expand=True),
        flip,
        flip.rotate(90, expand=True),
        flip.rotate(180, expand=True),
        flip.rotate(270, expand=True),
    ]
    vecs = [_embed_img(v) for v in variants]
    avg = np.mean(np.stack(vecs, axis=0), axis=0)
    norm = np.linalg.norm(avg)
    return avg if norm == 0 else avg / norm

def get_resnet_embeddings_variants_from_bytes(image_bytes: bytes):
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img = ImageOps.autocontrast(img, cutoff=2)
    base = img
    flip = ImageOps.mirror(base)
    variants = [
        base,
        base.rotate(90, expand=True),
        base.rotate(180, expand=True),
        base.rotate(270, expand=True),
        flip,
        flip.rotate(90, expand=True),
        flip.rotate(180, expand=True),
        flip.rotate(270, expand=True),
    ]
    vecs = [_embed_img(v) for v in variants]
    return vecs
