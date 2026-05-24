# app.py
import sys
import asyncio
import os
import requests
import tempfile
import subprocess
from io import BytesIO
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

from motor.motor_asyncio import AsyncIOMotorClient
from ultralytics import YOLO
from PIL import Image
import numpy as np
import cv2
from bson import ObjectId
import imageio_ffmpeg as ffmpeg
from bson.binary import Binary
from dotenv import load_dotenv

# --------------------- CONFIG ------------------------
load_dotenv()

PORT = int(os.environ.get("PORT", 8000))
MONGO_URI = os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "test")
COLLECTION_NAME = os.environ.get("COLLECTION_NAME", "files")
WEIGHTS_PATH = os.environ.get("WEIGHTS_PATH", "./yolov11/best.pt")
MODEL_WEIGHTS_URL = os.environ.get("MODEL_WEIGHTS_URL", "")

os.environ['MPLCONFIGDIR'] = '/tmp'
os.environ["ULTRALYTICS_CONFIG_DIR"] = "/tmp/ultralytics"

if not MONGO_URI:
    print("❌ Error: MONGO_URI environment variable is not set. Exiting.")
    sys.exit(1)

client = AsyncIOMotorClient(MONGO_URI)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]

_MODEL = None

# --------------------- MODEL ------------------------
def download_weights_if_missing():
    if os.path.exists(WEIGHTS_PATH):
        print(f"✅ Model exists at: {WEIGHTS_PATH}")
        return True
    if not MODEL_WEIGHTS_URL:
        print(f"❌ Weights not found at {WEIGHTS_PATH} and no MODEL_WEIGHTS_URL provided.")
        return False
    try:
        os.makedirs(os.path.dirname(WEIGHTS_PATH), exist_ok=True)
        print(f"⬇️ Downloading model from {MODEL_WEIGHTS_URL} ...")
        r = requests.get(MODEL_WEIGHTS_URL, stream=True, timeout=60)
        r.raise_for_status()
        with open(WEIGHTS_PATH, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print("✅ Model downloaded successfully.")
        return True
    except Exception as e:
        print(f"❌ Error downloading model: {e}")
        return False

def load_model():
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    try:
        if not os.path.exists(WEIGHTS_PATH):
            ok = download_weights_if_missing()
            if not ok:
                raise FileNotFoundError("YOLO model weights not found and could not be downloaded.")
        _MODEL = YOLO(WEIGHTS_PATH)
        print("🧠 YOLO model loaded.")
        return _MODEL
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        _MODEL = None
        raise

# --------------------- MONGO HELPERS ------------------------
async def fetch_file_from_mongo(file_id):
    try:
        obj_id = ObjectId(file_id)
    except:
        return None, None
    doc = await collection.find_one({"_id": obj_id})
    if not doc or "data" not in doc:
        return None, None
    return bytes(doc["data"]), doc.get("mimetype", "")

async def save_processed_file(file_id, processed_bytes):
    try:
        obj_id = ObjectId(file_id)
    except:
        return False
    result = await collection.update_one(
        {"_id": obj_id},
        {"$set": {"processedData": Binary(processed_bytes)}}
    )
    return result.modified_count > 0 or result.matched_count > 0

# --------------------- IMAGE ------------------------
async def process_image(file_id, model):
    data, _ = await fetch_file_from_mongo(file_id)
    if not data:
        return False

    img = Image.open(BytesIO(data)).convert("RGB")

    # Run YOLO in a background thread (non-blocking)
    results = await asyncio.to_thread(model, np.array(img))

    annotated = results[0].plot()
    bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
    success, buffer = cv2.imencode(".jpg", bgr)
    if not success:
        return False
    return await save_processed_file(file_id, buffer.tobytes())

# --------------------- VIDEO ------------------------
async def process_video(file_id, model):
    data, _ = await fetch_file_from_mongo(file_id)
    if not data:
        return False
    tmp_in = os.path.join(tempfile.gettempdir(), f"input_{file_id}.mp4")
    tmp_out = os.path.join(tempfile.gettempdir(), f"out_{file_id}.avi")
    mp4_path = tmp_out.replace(".avi", ".mp4")

    try:
        with open(tmp_in, "wb") as f:
            f.write(data)

        cap = cv2.VideoCapture(tmp_in)
        if not cap.isOpened():
            return False

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        out = cv2.VideoWriter(tmp_out, cv2.VideoWriter_fourcc(*"XVID"), fps, (width, height))

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Run YOLO in a background thread
            results = await asyncio.to_thread(model, frame)
            annotated = results[0].plot()
            try:
                annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
            except:
                annotated_bgr = annotated
            out.write(annotated_bgr)

        cap.release()
        out.release()

        ffmpeg_exe = ffmpeg.get_ffmpeg_exe()
        subprocess.run(
            [ffmpeg_exe, "-y", "-i", tmp_out, "-vcodec", "libx264", "-crf", "23", "-preset", "fast", mp4_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=300
        )

        with open(mp4_path, "rb") as f:
            processed_video = f.read()

        return await save_processed_file(file_id, processed_video)

    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg conversion failed. Stderr: {e.stderr.decode()}")
        return False
    except subprocess.TimeoutExpired:
        print("❌ FFmpeg conversion timed out.")
        return False
    finally:
        for f in [tmp_in, tmp_out, mp4_path]:
            try:
                os.remove(f)
            except:
                pass

# --------------------- PROCESS ------------------------
async def run_process(file_id, file_type):
    if _MODEL is None:
        raise RuntimeError("YOLO model is not loaded")
    if file_type.startswith("image"):
        return await process_image(file_id, _MODEL)
    elif file_type.startswith("video"):
        return await process_video(file_id, _MODEL)
    else:
        return False

# --------------------- FASTAPI ------------------------
app = FastAPI(title="YOLO Processing Service")

class ProcessRequest(BaseModel):
    fileId: str
    fileType: str

@app.on_event("startup")
async def startup_event():
    try:
        load_model()
        print("Service startup complete.")
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")

@app.get("/")
async def root():
    return {"message": "YOLO backend is running!"}

@app.get("/health")
async def health():
    if _MODEL is None:
        raise HTTPException(status_code=503, detail="Model not ready")
    return {"status": "ok"}

@app.get("/warmup")
async def warmup():
    if _MODEL is None:
        load_model()
    return {"status": "ready"}

@app.post("/process")
async def process_endpoint(payload: ProcessRequest):
    if _MODEL is None:
        raise HTTPException(status_code=503, detail="YOLO model not ready")
    try:
        ok = await run_process(payload.fileId, payload.fileType)
        if not ok:
            raise HTTPException(status_code=500, detail="Processing failed")
        return {"status": "ok", "fileId": payload.fileId}
    except Exception as e:
        print(f"❌ Processing failed for file {payload.fileId}: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed. Reason: {e}")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=False)
