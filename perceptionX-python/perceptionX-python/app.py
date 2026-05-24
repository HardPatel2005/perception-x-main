import sys
import asyncio
import os
import requests
import tempfile
import subprocess
from io import BytesIO
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
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
import cloudinary
import cloudinary.uploader
import cloudinary.api
from byte_tracker import BYTETracker

# Modal GPU integration
try:
    from modal_client import process_video_with_modal
    MODAL_AVAILABLE = True
except ImportError:
    MODAL_AVAILABLE = False
    print("⚠️ Modal not available - install with: pip install modal")

# --------------------- CONFIG ------------------------
load_dotenv()

# --------------------- CLOUDINARY ------------------------
CLOUDINARY_ENABLED = False
cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
api_key = os.environ.get("CLOUDINARY_API_KEY")
api_secret = os.environ.get("CLOUDINARY_API_SECRET")

if cloud_name and api_key and api_secret:
    try:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        # Test the configuration
        try:
            cloudinary.api.ping()
            CLOUDINARY_ENABLED = True
            print("✅ Cloudinary configured and verified")
        except Exception as test_error:
            print(f"⚠️ Cloudinary credentials provided but test failed: {test_error}")
            CLOUDINARY_ENABLED = False
    except Exception as e:
        print(f"⚠️ Cloudinary configuration error: {e}")
        CLOUDINARY_ENABLED = False
else:
    print("⚠️ Cloudinary credentials not found. Processed files will use MongoDB.")

PORT = int(os.environ.get("PORT", 8001))
MONGO_URI = os.environ.get("MONGO_URI")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "test")
COLLECTION_NAME = os.environ.get("COLLECTION_NAME", "files")
WEIGHTS_PATH = os.environ.get("WEIGHTS_PATH", "./yolov11/best.pt")
MODEL_WEIGHTS_URL = os.environ.get("MODEL_WEIGHTS_URL", "")

# Modal GPU configuration
USE_MODAL_GPU = os.environ.get("USE_MODAL_GPU", "false").lower() == "true"

os.environ['MPLCONFIGDIR'] = '/tmp'
os.environ["ULTRALYTICS_CONFIG_DIR"] = "/tmp/ultralytics"

# --------------------- MONGODB ------------------------
client = None
collection = None

if MONGO_URI:
    try:
        client = AsyncIOMotorClient(MONGO_URI)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ Failed to connect MongoDB: {e}")
else:
    print("⚠️ No MONGO_URI provided. MongoDB features disabled.")

# --------------------- YOLO MODEL ------------------------
_MODEL = None
_DEVICE = None  # Cache device detection

def get_device():
    """Detect and return the best available device (GPU or CPU)"""
    global _DEVICE
    if _DEVICE is not None:
        return _DEVICE
    try:
        import torch
        if torch.cuda.is_available():
            _DEVICE = 'cuda'
            print(f"✅ GPU detected: {torch.cuda.get_device_name(0)}")
            print(f"   GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
        else:
            _DEVICE = 'cpu'
            print("⚠️ GPU not available, using CPU")
    except ImportError:
        _DEVICE = 'cpu'
        print("⚠️ PyTorch not available, using CPU")
    except Exception as e:
        _DEVICE = 'cpu'
        print(f"⚠️ Error detecting device: {e}, using CPU")
    return _DEVICE

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
        
        # Detect device
        device = get_device()
        
        # Load model with device specification
        _MODEL = YOLO(WEIGHTS_PATH)
        
        # Move model to device if GPU available
        if device == 'cuda':
            try:
                import torch
                _MODEL.model.to(device)
                print(f"✅ Model moved to GPU")
            except Exception as e:
                print(f"⚠️ Could not move model to GPU: {e}")
        
        print(f"🧠 YOLO model loaded on {device}.")
        return _MODEL
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        _MODEL = None
        raise

# --------------------- MONGO HELPERS ------------------------
async def fetch_file_from_cloudinary(cloudinary_url):
    """Download file from Cloudinary CDN"""
    try:
        print(f"☁️ Downloading file from Cloudinary: {cloudinary_url}")
        response = requests.get(cloudinary_url, stream=True, timeout=300)
        response.raise_for_status()
        
        # Read file in chunks to handle large files
        chunks = []
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                chunks.append(chunk)
        
        file_data = b''.join(chunks)
        print(f"✅ Downloaded {len(file_data)} bytes from Cloudinary")
        return file_data
    except Exception as e:
        print(f"❌ Error downloading from Cloudinary: {e}")
        return None

async def fetch_file_from_mongo(file_id, cloudinary_url=None):
    """Fetch file from Cloudinary (preferred) or MongoDB (fallback)"""
    
    # Priority 1: Download from Cloudinary if URL provided
    if cloudinary_url:
        file_data = await fetch_file_from_cloudinary(cloudinary_url)
        if file_data:
            # Get mimetype from MongoDB document
            if client is not None and collection is not None:
                try:
                    obj_id = ObjectId(file_id)
                    doc = await collection.find_one({"_id": obj_id})
                    mimetype = doc.get("mimetype", "video/mp4") if doc else "video/mp4"
                    return file_data, mimetype
                except:
                    pass
            return file_data, "video/mp4"  # Default for videos
        else:
            print("⚠️ Cloudinary download failed, falling back to MongoDB")
    
    # Priority 2: Fallback to MongoDB
    if client is None or collection is None:
        return None, None
    try:
        obj_id = ObjectId(file_id)
    except Exception:
        return None, None
    try:
        doc = await collection.find_one({"_id": obj_id})
        if not doc or "data" not in doc:
            return None, None
        return bytes(doc["data"]), doc.get("mimetype", "")
    except Exception as e:
        print(f"❌ Error fetching from MongoDB: {e}")
        return None, None

# Service-type class mapping for filtering
SERVICE_CLASSES = {
    'traffic-monitoring': {
        'vehicles': ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train', 'boat', 'vehicle'],
        'pedestrians': ['person', 'hand', 'face', 'head', 'body'],
        'infrastructure': ['traffic light', 'stop sign', 'parking meter', 'fire hydrant']
    },
    'wildlife-monitoring': {
        'animals': ['elephant', 'giraffe', 'zebra', 'bear', 'horse', 'cow', 'sheep', 'dog', 'cat', 'bird']
    },
    'restaurant-monitoring': {
        'food': ['pizza', 'hot dog', 'donut', 'sandwich', 'cake', 'banana', 'broccoli', 'carrot', 'orange', 'apple'],
        'utensils': ['fork', 'knife', 'spoon', 'bowl', 'cup', 'wine glass', 'bottle'],
        'appliances': ['microwave', 'oven', 'toaster', 'refrigerator', 'sink'],
        'furniture': ['dining table', 'chair'],
        'people': ['person'],
        'electronics': ['remote', 'tv', 'laptop']
    }
}

# Legacy alias for traffic
TRAFFIC_CLASSES = SERVICE_CLASSES['traffic-monitoring']

def is_traffic_relevant(class_name):
    """Check if a class is traffic-relevant"""
    class_lower = class_name.lower()
    for category in TRAFFIC_CLASSES.values():
        if any(tc in class_lower for tc in category):
            return True
    return False

def is_service_relevant(class_name, service_type='traffic-monitoring'):
    """Check if a class is relevant for the given service type"""
    class_lower = class_name.lower()
    service_classes = SERVICE_CLASSES.get(service_type, SERVICE_CLASSES['traffic-monitoring'])
    for category in service_classes.values():
        if any(sc in class_lower for sc in category):
            return True
    return False

def extract_detection_event(result, frame_id=None, timestamp=None, inference_time_ms=None, service_type='traffic-monitoring'):
    """Extract detection event from YOLO result"""
    event = {
        "frameId": frame_id if frame_id is not None else 0,
        "timestamp": timestamp if timestamp is not None else 0.0,
        "detectedObjects": [],
        "inferenceTimeMs": inference_time_ms if inference_time_ms is not None else 0.0,
        "objectCounts": {}
    }
    
    if result is None or not hasattr(result, 'boxes') or result.boxes is None:
        return event
    
    try:
        boxes = result.boxes
        class_names = result.names if hasattr(result, 'names') else {}
        
        # Count boxes
        try:
            if hasattr(boxes, '__len__'):
                num_boxes = len(boxes)
            elif hasattr(boxes, 'shape') and len(boxes.shape) > 0:
                num_boxes = boxes.shape[0]
            elif hasattr(boxes, 'cls') and hasattr(boxes.cls, '__len__'):
                num_boxes = len(boxes.cls)
            else:
                num_boxes = 0
        except:
            num_boxes = 0
        
        for i in range(num_boxes):
            try:
                # Get class ID
                if hasattr(boxes.cls[i], 'item'):
                    cls_id = int(boxes.cls[i].item())
                elif hasattr(boxes.cls[i], 'cpu'):
                    cls_id = int(boxes.cls[i].cpu().item())
                else:
                    cls_id = int(boxes.cls[i])
                
                # Get class name
                class_name = class_names.get(cls_id, f"class_{cls_id}")
                
                # Get confidence
                if hasattr(boxes.conf[i], 'item'):
                    conf = float(boxes.conf[i].item())
                elif hasattr(boxes.conf[i], 'cpu'):
                    conf = float(boxes.conf[i].cpu().item())
                else:
                    conf = float(boxes.conf[i])
                
                # Get bounding box
                if hasattr(boxes, 'xyxy') and boxes.xyxy is not None:
                    if hasattr(boxes.xyxy[i], 'tolist'):
                        xyxy = boxes.xyxy[i].tolist()
                    elif hasattr(boxes.xyxy[i], 'cpu'):
                        xyxy = boxes.xyxy[i].cpu().tolist()
                    else:
                        xyxy = list(boxes.xyxy[i])
                else:
                    xyxy = [0, 0, 0, 0]
                
                # Filter by service type - only add relevant classes
                if is_service_relevant(class_name, service_type):
                    event["detectedObjects"].append({
                        "class": class_name,
                        "confidence": conf,
                        "bbox": {
                            "x1": float(xyxy[0]),
                            "y1": float(xyxy[1]),
                            "x2": float(xyxy[2]),
                            "y2": float(xyxy[3])
                        }
                    })
                
                # Count objects
                if class_name not in event["objectCounts"]:
                    event["objectCounts"][class_name] = 0
                event["objectCounts"][class_name] += 1
            except Exception as e:
                continue
    except Exception as e:
        pass
    
    return event

async def save_processed_file(file_id, processed_bytes, detection_events=None):
    """Save processed file to Cloudinary (preferred) or MongoDB (fallback)"""
    # Check if MongoDB is available
    if client is None or collection is None:
        return False
    try:
        obj_id = ObjectId(file_id)
    except Exception:
        return False
    
    try:
        doc = await collection.find_one({"_id": obj_id})
        if not doc:
            return False
    except Exception as e:
        print(f"❌ Error fetching document from MongoDB: {e}")
        return False
    
    # Determine if original was from Cloudinary (use Cloudinary for processed too)
    use_cloudinary = bool(doc.get("cloudinaryId") or doc.get("cloudinaryUrl"))
    # Check mimetype first to determine file type
    mimetype = doc.get("mimetype", "")
    is_video = mimetype.startswith("video/")
    # Also check file extension or size as additional indicator
    filename = doc.get("filename", "")
    is_video = is_video or filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'))
    file_type = "video" if is_video else "image"
    print(f"📄 File type detection: mimetype={mimetype}, filename={filename}, detected={file_type}")
    
    # Priority 1: Try Cloudinary if original was from Cloudinary or it's a video
    # BUT: If quota is exceeded, silently fall back to MongoDB (don't fail)
    if (use_cloudinary or is_video) and CLOUDINARY_ENABLED:
        try:
            print(f"☁️ Attempting to upload processed file to Cloudinary ({len(processed_bytes)} bytes)")
            
            # Save to temp file first with correct extension
            file_ext = '.mp4' if file_type == "video" else '.jpg'
            tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
            tmp_file.write(processed_bytes)
            tmp_file.close()
            
            print(f"☁️ Uploading {file_type} file to Cloudinary: {tmp_file.name} ({len(processed_bytes) / (1024*1024):.2f} MB)")
            
            # Use upload_large() for files > 100MB (handles chunked uploads better)
            # Regular upload() for smaller files
            LARGE_FILE_THRESHOLD = 100 * 1024 * 1024  # 100MB
            use_large_upload = len(processed_bytes) > LARGE_FILE_THRESHOLD
            
            # Upload to Cloudinary with explicit resource_type and retry logic for transient errors
            max_retries = 3
            upload_result = None
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    if use_large_upload:
                        print(f"📦 Using chunked upload for large file ({len(processed_bytes) / (1024*1024):.2f} MB)")
                        upload_result = cloudinary.uploader.upload_large(
                            tmp_file.name,
                            resource_type=file_type,  # "video" or "image"
                            folder="perceptionx/processed",
                            public_id=f"processed_{file_id}",
                            overwrite=True,
                            use_filename=False,
                            chunk_size=20000000,  # 20MB chunks
                            timeout=600  # 10 minute timeout for large files
                        )
                    else:
                        upload_result = cloudinary.uploader.upload(
                            tmp_file.name,
                            resource_type=file_type,  # "video" or "image"
                            folder="perceptionx/processed",
                            public_id=f"processed_{file_id}",
                            overwrite=True,
                            use_filename=False,
                            timeout=300  # 5 minute timeout for regular files
                        )
                    break  # Success, exit retry loop
                except Exception as retry_error:
                    last_error = retry_error
                    error_str = str(retry_error)
                    if attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 3  # Exponential backoff: 3s, 6s, 9s
                        print(f"⚠️ Cloudinary upload attempt {attempt + 1}/{max_retries} failed: {error_str[:200]}")
                        print(f"   Retrying in {wait_time} seconds...")
                        await asyncio.sleep(wait_time)
                    else:
                        # Last attempt failed, will be handled below
                        print(f"❌ All Cloudinary upload attempts failed. Last error: {error_str[:200]}")
                        raise
            
            if upload_result is None:
                raise last_error if last_error else Exception("Cloudinary upload failed after retries")
            
            # Clean up temp file
            os.unlink(tmp_file.name)
            
            print(f"✅ Uploaded processed file to Cloudinary: {upload_result['public_id']}")
            print(f"   URL: {upload_result['secure_url']}")
            
            # Update MongoDB with Cloudinary info and detection events
            update_data = {
                "processedCloudinaryId": upload_result['public_id'],
                "processedCloudinaryUrl": upload_result['secure_url']
            }
            if detection_events:
                update_data["detectionEvents"] = detection_events
            
            result = await collection.update_one(
                {"_id": obj_id},
                {"$set": update_data}
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as e:
            error_msg = str(e).lower()
            # Clean up temp file if it exists
            try:
                if 'tmp_file' in locals():
                    os.unlink(tmp_file.name)
            except:
                pass
            
            # Check if it's a quota error - silently fall back, don't log as error
            if 'quota' in error_msg or 'space' in error_msg:
                # Don't log quota errors - just silently use MongoDB
                print(f"⚠️ Cloudinary quota exceeded - will try to save detection events only")
            else:
                print(f"⚠️ Cloudinary upload failed after all retries: {str(e)[:200]}")
                print(f"   File size: {len(processed_bytes) / (1024*1024):.2f} MB")
                print(f"   Will attempt to save detection events only if file is too large for MongoDB")
            
            # Fall through to check if we can save to MongoDB or at least save detection events
    
    # Priority 2: Use MongoDB ONLY for small files (< 10MB) - MongoDB has 16MB document limit
    # CRITICAL: Never save large processed videos/images to MongoDB - they will fail!
    MAX_MONGODB_SIZE = 10 * 1024 * 1024  # 10MB limit for safety (MongoDB max is 16MB)
    
    if len(processed_bytes) > MAX_MONGODB_SIZE:
        file_size_mb = len(processed_bytes) / (1024*1024)
        max_size_mb = MAX_MONGODB_SIZE / (1024*1024)
        print(f"⚠️ Processed file too large for MongoDB ({file_size_mb:.2f} MB > {max_size_mb:.2f} MB)")
        print(f"   Cloudinary upload failed and file exceeds MongoDB's 16MB document limit.")
        print(f"   Attempting to save detection events only...")
        
        # Still save detection events if they exist (they're small)
        if detection_events:
            # Store detection events only (they're small)
            # Limit events to avoid MongoDB size issues
            max_events = 5000  # Safe limit for detection events
            events_to_save = detection_events[:max_events] if len(detection_events) > max_events else detection_events
            
            update_data = {
                "detectionEvents": events_to_save,
                "detectionEventsCount": len(detection_events),
                "detectionEventsTruncated": True if len(detection_events) > max_events else False,
                "processedFileTooLarge": True,
                "processedFileSize": len(processed_bytes),
                "processedFileSizeMB": round(file_size_mb, 2),
                "cloudinaryUploadFailed": True
            }
            
            try:
                result = await collection.update_one(
                {"_id": obj_id},
                {"$set": update_data}
            )
                if result.modified_count > 0 or result.matched_count > 0:
                    print(f"✅ Saved {len(events_to_save)} detection events (out of {len(detection_events)} total)")
                    print(f"⚠️ Processed file ({file_size_mb:.2f} MB) could not be saved - too large for MongoDB.")
                    print(f"   Detection data saved successfully. Processed video file was not saved due to size limits.")
                    return True  # Return success since we saved detection events
            except Exception as e:
                print(f"❌ Error saving detection events: {e}")
                import traceback
                traceback.print_exc()
                return False
        
        # If no detection events, we still return True to indicate processing completed
        # The video was processed, we just couldn't save it due to size
        print(f"⚠️ No detection events to save. Processing completed but file could not be stored.")
        return True  # Return True - processing was successful, storage failed due to size
    
    # File is small enough for MongoDB - save it
    print(f"📦 Saving processed file to MongoDB ({len(processed_bytes) / (1024*1024):.2f} MB)")
    update_data = {"processedData": Binary(processed_bytes)}
    
    # Store detection events in batches to avoid MongoDB 16MB document limit
    if detection_events:
        # Calculate size estimate (rough: ~500 bytes per event)
        estimated_size = len(detection_events) * 500
        max_events_per_doc = 20000  # Safe limit (~10MB per document)
        
        if len(detection_events) > max_events_per_doc:
            print(f"⚠️ Large detection events array ({len(detection_events)} events), storing sample...")
            # Store in batches in the main document
            # Keep only summary stats in main doc, store full events separately if needed
            # For now, we'll store a sample and aggregate stats
            sample_size = min(1000, len(detection_events))  # Keep first 1000 for quick access
            update_data["detectionEvents"] = detection_events[:sample_size]
            update_data["detectionEventsCount"] = len(detection_events)
            update_data["detectionEventsTruncated"] = True
            print(f"📊 Storing {sample_size} sample events (out of {len(detection_events)} total)")
        else:
            update_data["detectionEvents"] = detection_events
            print(f"✅ Storing all {len(detection_events)} detection events")
    
    try:
        result = await collection.update_one(
            {"_id": obj_id},
            {"$set": update_data}
        )
        success = result.modified_count > 0 or result.matched_count > 0
        if success:
            print(f"✅ Processed file saved to MongoDB successfully")
            if detection_events:
                print(f"✅ Saved detection events")
        return success
    except Exception as e:
        print(f"❌ Error saving to MongoDB: {e}")
        # If MongoDB save fails, try to at least save detection events
        if detection_events:
            try:
                update_data_minimal = {
                    "detectionEvents": detection_events[:1000] if len(detection_events) > 1000 else detection_events,
                    "detectionEventsCount": len(detection_events),
                    "detectionEventsTruncated": True if len(detection_events) > 1000 else False
                }
                await collection.update_one(
                    {"_id": obj_id},
                    {"$set": update_data_minimal}
                )
                print(f"✅ Saved detection events as fallback")
                return True
            except:
                pass
        return False

# --------------------- IMAGE PROCESSING ------------------------
async def process_image(file_id, model, cloudinary_url=None, progress_callback_url=None, service_type='traffic-monitoring'):
    data, _ = await fetch_file_from_mongo(file_id, cloudinary_url)
    if data is None:
        return False
    try:
        await send_progress(progress_callback_url, 40, "Processing image...")
        img = Image.open(BytesIO(data)).convert("RGB")
        
        # Use optimized predict with device specification
        device = get_device()
        half = device == 'cuda'  # FP16 on GPU for 2x speed
        # Use smaller imgsz for CPU (320 is fastest, 416 is good balance)
        imgsz = 320 if device == 'cpu' else 416
        results = await asyncio.to_thread(
            model.predict,
            np.array(img),
            device=device,
            imgsz=imgsz,  # Smaller = faster
            conf=0.25,
            half=half,  # FP16 on GPU
            verbose=True,
            agnostic_nms=True,  # Faster NMS
            max_det=100  # Limit detections for speed
        )
        
        annotated = results[0].plot()
        bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
        success, buffer = cv2.imencode(".jpg", bgr)
        if not success:
            return False
        
        # Extract detection event for image (frame 0) - filter by service type
        detection_event = extract_detection_event(results[0], frame_id=0, timestamp=0.0, service_type=service_type)
        detection_events = [detection_event] if detection_event["detectedObjects"] else []
        
        await send_progress(progress_callback_url, 90, "Saving processed image...")
        result = await save_processed_file(file_id, buffer.tobytes(), detection_events=detection_events)
        await send_progress(progress_callback_url, 100, "Complete!")
        return result
    except Exception as e:
        print(f"❌ Image processing error: {e}")
        return False

# --------------------- VIDEO PROCESSING ------------------------
async def process_video(file_id, model, cloudinary_url=None, progress_callback_url=None, service_type='traffic-monitoring'):
    # Check if Modal GPU should be used
    if USE_MODAL_GPU and MODAL_AVAILABLE and cloudinary_url:
        try:
            result = await process_video_with_modal(
                file_id=file_id,
                video_url=cloudinary_url,
                service_type=service_type,
                progress_callback_url=progress_callback_url,
                mongo_uri=MONGO_URI,
                database_name=DATABASE_NAME,
                collection_name=COLLECTION_NAME,
                cloudinary_cloud_name=cloud_name if CLOUDINARY_ENABLED else None,
                cloudinary_api_key=api_key if CLOUDINARY_ENABLED else None,
                cloudinary_api_secret=api_secret if CLOUDINARY_ENABLED else None
            )
            
            if result and result.get("success"):
                # Detection events are already saved by Modal processor
                return True
            else:
                print("⚠️ Modal GPU processing failed, falling back to local processing")
        except Exception as e:
            print(f"⚠️ Modal GPU error: {e}, falling back to local processing")
    
    # Fall back to local processing (existing code)
    print("🖥️ Using local processing (CPU/GPU)")
    # Initialize variables early to avoid UnboundLocalError
    actual_total_frames = 0
    actual_fps = 25
    actual_width = 0
    actual_height = 0
    
    data, _ = await fetch_file_from_mongo(file_id, cloudinary_url)
    if data is None:
        return False
    tmp_in = os.path.join(tempfile.gettempdir(), f"input_{file_id}.mp4")
    mp4_path = os.path.join(tempfile.gettempdir(), f"processed_{file_id}.mp4")
    scaled_input = None
    try:
        await send_progress(progress_callback_url, 30, "Preparing video...")
        with open(tmp_in, "wb") as f:
            f.write(data)
        
        # Get video info first
        cap = cv2.VideoCapture(tmp_in)
        if not cap.isOpened():
            return False
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        
        # Set actual_total_frames from initial video (will be updated later if different)
        actual_total_frames = total_frames
        
        print(f"📹 Video info: {width}x{height}, {fps} FPS, {total_frames} frames")
        
        # OPTIMIZATION 1: Downscale large videos for faster processing (CPU optimization)
        # Process at max 1280px for 2-3x faster inference while maintaining quality
        max_dimension = 1280
        processing_width = width
        processing_height = height
        if width > max_dimension or height > max_dimension:
            scale = min(max_dimension / width, max_dimension / height)
            processing_width = int(width * scale)
            processing_height = int(height * scale)
            print(f"📉 Downscaling video from {width}x{height} to {processing_width}x{processing_height} for faster processing")
            
            await send_progress(progress_callback_url, 32, "Optimizing video size...")
            ffmpeg_exe = ffmpeg.get_ffmpeg_exe()
            scaled_input = os.path.join(tempfile.gettempdir(), f"scaled_input_{file_id}.mp4")
            
            # Fast downscale with FFmpeg (much faster than OpenCV)
            subprocess.run(
                [ffmpeg_exe, "-y", "-i", tmp_in,
                 "-vf", f"scale={processing_width}:{processing_height}",
                 "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
                 "-an",  # Remove audio for faster processing
                 scaled_input],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=60
            )
            yolo_input = scaled_input
        else:
            yolo_input = tmp_in
        
        # Get device and optimize settings for CPU
        device = get_device()
        # OPTIMIZATION 2: Use smaller imgsz for CPU (320 is fastest, 416 is good balance)
        # 320 = ~3x faster than 640, 416 = ~2.4x faster than 640
        imgsz = 320 if device == 'cpu' else 416  # Smaller for CPU = much faster
        half = device == 'cuda'  # FP16 only on GPU
        
        print(f"🚀 Processing video with YOLO (device: {device}, imgsz: {imgsz}, half: {half})")
        await send_progress(progress_callback_url, 40, "Starting video processing...")
        
        # Use frame-by-frame processing with progress updates for accurate progress tracking
        # This is faster than native YOLO video processing on CPU and provides real-time progress
        print("📊 Using frame-by-frame processing with progress updates")
        await send_progress(progress_callback_url, 42, "Reading video frames...")
        
        cap = cv2.VideoCapture(yolo_input)
        if not cap.isOpened():
            return False
        
        # Get actual frame count from the video file
        # Note: actual_total_frames was already initialized and set from total_frames above (line 481)
        # Scaling doesn't change frame count, so we don't need to reassign it
        actual_fps = cap.get(cv2.CAP_PROP_FPS) or fps
        actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        # actual_total_frames is already set correctly from total_frames (line 481)
        # No need to reassign since scaling doesn't change frame count
        
        # Use actual dimensions for output
        output_width = actual_width
        output_height = actual_height
        output_fps = actual_fps
        
        # Use mp4v codec for VideoWriter (more compatible, will be recompressed by FFmpeg anyway)
        # Note: This is just a temporary container - FFmpeg will properly compress it
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(mp4_path, fourcc, output_fps, (output_width, output_height), True)
        
        if not out.isOpened():
            print(f"⚠️ VideoWriter failed with mp4v, trying XVID codec...")
            fourcc = cv2.VideoWriter_fourcc(*'XVID')
            mp4_path = mp4_path.replace('.mp4', '.avi')  # XVID works better with .avi
            out = cv2.VideoWriter(mp4_path, fourcc, output_fps, (output_width, output_height), True)
            if not out.isOpened():
                raise RuntimeError("Failed to initialize VideoWriter with any codec")
        
        frame_count = 0
        # Optimized batch sizes for faster processing
        batch_size = 64 if device == 'cpu' else 128  # Larger batches = faster
        
        frame_batch = []
        all_detection_events = []  # Collect all detection events
        last_progress_update = 0
        
        # Initialize ByteTrack tracker for object tracking
        tracker = BYTETracker(frame_rate=actual_fps, track_thresh=0.5, high_thresh=0.6, match_thresh=0.8)
        print("✅ ByteTrack tracker initialized")
        
        await send_progress(progress_callback_url, 45, f"Processing frames (0/{actual_total_frames})...")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                # Process remaining frames in batch
                if len(frame_batch) > 0:
                    final_progress = int(45 + (frame_count / actual_total_frames) * 45) if actual_total_frames > 0 else 88
                    await send_progress(progress_callback_url, final_progress,
                                      f"Processing final batch ({frame_count}/{actual_total_frames})...")
                    
                    batch_results = await asyncio.to_thread(
                        model.predict,
                        frame_batch,
                        device=device,
                        imgsz=imgsz,
                        conf=0.25,
                        half=half,
                        verbose=True,
                        agnostic_nms=True,
                        max_det=100
                    )
                    batch_start_frame = frame_count - len(frame_batch)
                    for i, result in enumerate(batch_results):
                        # Extract detection event for this frame
                        frame_idx = batch_start_frame + i
                        timestamp = frame_idx / actual_fps if actual_fps > 0 else 0.0
                        detection_event = extract_detection_event(result, frame_id=frame_idx, timestamp=timestamp, service_type=service_type)
                        
                        # Update tracker with detections
                        tracked_objects = tracker.update(detection_event["detectedObjects"], frame_id=frame_idx)
                        
                        # Add track IDs to detection event
                        for det_obj in detection_event["detectedObjects"]:
                            # Find matching track ID by bbox position
                            for track_obj in tracked_objects:
                                track_bbox = track_obj.get('bbox')
                                det_bbox = det_obj.get('bbox')
                                
                                # Handle bbox format: tracker returns list [x1, y1, x2, y2], detection has dict
                                if track_bbox is None or det_bbox is None:
                                    continue
                                
                                # Tracker bbox is a list [x1, y1, x2, y2] (from byte_tracker.py)
                                if isinstance(track_bbox, (list, tuple)) and len(track_bbox) >= 4:
                                    track_x1, track_y1 = track_bbox[0], track_bbox[1]
                                else:
                                    continue
                                
                                # Detection bbox is a dict {x1, y1, x2, y2}
                                det_x1 = det_bbox.get('x1', 0) if isinstance(det_bbox, dict) else 0
                                det_y1 = det_bbox.get('y1', 0) if isinstance(det_bbox, dict) else 0
                                
                                # Check if bbox positions match (within 5 pixels) and class matches
                                if (abs(track_x1 - det_x1) < 5 and
                                    abs(track_y1 - det_y1) < 5 and
                                    track_obj.get('class') == det_obj.get('class')):
                                    det_obj['track_id'] = track_obj.get('track_id')
                                    break
                        
                        if detection_event["detectedObjects"]:
                            all_detection_events.append(detection_event)
                        
                        annotated = result.plot()
                        if annotated is not None and len(annotated.shape) == 3:
                            if annotated.dtype != np.uint8:
                                annotated = (annotated * 255).astype(np.uint8) if annotated.max() <= 1.0 else annotated.astype(np.uint8)
                            # Resize if needed to match output dimensions
                            if annotated.shape[:2] != (output_height, output_width):
                                annotated = cv2.resize(annotated, (output_width, output_height))
                            annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
                        else:
                            annotated_bgr = frame_batch[i]
                        out.write(annotated_bgr)
                break
            
            frame_batch.append(frame)
            frame_count += 1
            
            # Process batch when full
            if len(frame_batch) >= batch_size:
                # Calculate and send progress update
                if actual_total_frames > 0:
                    progress = int(45 + (frame_count / actual_total_frames) * 45)
                    # Update every 1% for smooth, detailed progress tracking
                    if progress - last_progress_update >= 1:
                        await send_progress(progress_callback_url, progress, 
                                          f"Processing frames ({frame_count}/{actual_total_frames})...")
                        last_progress_update = progress
                
                # Process batch
                batch_results = await asyncio.to_thread(
                    model.predict,
                    frame_batch,
                    device=device,
                    imgsz=imgsz,
                    conf=0.25,
                    half=half,
                    verbose=True,
                    agnostic_nms=True,
                    max_det=100
                )
                
                # Write processed frames and collect detection events
                batch_start_frame = frame_count - len(frame_batch)
                for i, result in enumerate(batch_results):
                    # Extract detection event for this frame
                    frame_idx = batch_start_frame + i
                    timestamp = frame_idx / actual_fps if actual_fps > 0 else 0.0
                    detection_event = extract_detection_event(result, frame_id=frame_idx, timestamp=timestamp, service_type=service_type)
                    
                    # Update tracker with detections
                    tracked_objects = tracker.update(detection_event["detectedObjects"], frame_id=frame_idx)
                    
                    # Add track IDs to detection event
                    for det_obj in detection_event["detectedObjects"]:
                        # Find matching track ID by bbox position
                        for track_obj in tracked_objects:
                            track_bbox = track_obj.get('bbox')
                            det_bbox = det_obj.get('bbox')
                            
                            # Handle bbox format: tracker returns list [x1, y1, x2, y2], detection has dict
                            if track_bbox is None or det_bbox is None:
                                continue
                            
                            # Tracker bbox is a list [x1, y1, x2, y2] (from byte_tracker.py)
                            if isinstance(track_bbox, (list, tuple)) and len(track_bbox) >= 4:
                                track_x1, track_y1 = track_bbox[0], track_bbox[1]
                            else:
                                continue
                            
                            # Detection bbox is a dict {x1, y1, x2, y2}
                            det_x1 = det_bbox.get('x1', 0) if isinstance(det_bbox, dict) else 0
                            det_y1 = det_bbox.get('y1', 0) if isinstance(det_bbox, dict) else 0
                            
                            if (abs(track_x1 - det_x1) < 5 and
                                abs(track_y1 - det_y1) < 5 and
                                track_obj.get('class') == det_obj.get('class')):
                                det_obj['track_id'] = track_obj.get('track_id')
                                break
                    
                    if detection_event["detectedObjects"]:
                        all_detection_events.append(detection_event)
                    
                    annotated = result.plot()
                    if annotated is not None and len(annotated.shape) == 3:
                        if annotated.dtype != np.uint8:
                            annotated = (annotated * 255).astype(np.uint8) if annotated.max() <= 1.0 else annotated.astype(np.uint8)
                        # Resize if needed to match output dimensions
                        if annotated.shape[:2] != (output_height, output_width):
                            annotated = cv2.resize(annotated, (output_width, output_height))
                        annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
                    else:
                        annotated_bgr = frame_batch[i]
                    out.write(annotated_bgr)
                
                frame_batch = []
        
        cap.release()
        out.release()
        annotated_video_path = mp4_path
        
        print(f"✅ Video processed: {annotated_video_path} ({frame_count} frames)")
        
        # CRITICAL: OpenCV VideoWriter produces poorly compressed video
        # ALWAYS use FFmpeg to properly compress the video to match input file size
        await send_progress(progress_callback_url, 85, "Compressing video with FFmpeg...")
        ffmpeg_exe = ffmpeg.get_ffmpeg_exe()
        optimized_path = os.path.join(tempfile.gettempdir(), f"optimized_{file_id}.mp4")
        
        # Calculate target bitrate for high quality output
        # Goal: 70-100MB output for 23MB input (3-4x input size is acceptable for high quality)
        input_file_size = len(data) if data else 0
        video_duration = actual_total_frames / actual_fps if actual_fps > 0 else 1
        
        # Calculate target bitrate for high quality (allow 3-4x input size)
        target_bitrate = None
        target_bitrate_kbps = None
        if input_file_size > 0 and video_duration > 0:
            # Calculate target bitrate in kbps
            # Target: 3x input size for high quality (23MB input => ~70MB output)
            # This gives good quality while keeping file size reasonable
            target_bitrate_kbps = int((input_file_size * 8 / video_duration) * 3.0 / 1000)
            # Cap at reasonable limits (1Mbps to 10Mbps for high quality)
            target_bitrate_kbps = max(1000, min(target_bitrate_kbps, 10000))
            target_bitrate = f"{target_bitrate_kbps}k"
            target_size_mb = (target_bitrate_kbps * video_duration / 8) / 1024
            print(f"📊 Target bitrate: {target_bitrate} kbps (input: {input_file_size / (1024*1024):.2f} MB, target: ~{target_size_mb:.2f} MB)")
        
        # Use optimized FFmpeg settings for high quality and fast processing
        # Strategy: Use bitrate targeting for size control, or CRF 23 for high quality
        ffmpeg_cmd = [
            ffmpeg_exe, "-y", "-i", annotated_video_path,
            "-vcodec", "libx264",
            "-r", str(actual_fps),  # Preserve original FPS
            "-preset", "fast",  # Fast encoding for speed (good quality/speed balance)
            "-movflags", "+faststart",  # Web optimization
            "-threads", "0",  # Use all CPU threads
            "-pix_fmt", "yuv420p",  # Compatibility
            "-vsync", "cfr",  # Constant frame rate
            "-g", "60",  # Keyframe interval (2 seconds at 30fps)
            "-bf", "2",  # Use B-frames for better quality
        ]
        
        # Use bitrate targeting for size control, or CRF 23 for high quality
        if target_bitrate and target_bitrate_kbps:
            # Single-pass encoding with bitrate targeting (faster than 2-pass)
            # Bitrate mode gives us control over final file size (target: 3x input for quality)
            ffmpeg_cmd.extend([
                "-b:v", target_bitrate,
                "-maxrate", target_bitrate,
                "-bufsize", f"{target_bitrate_kbps * 2}k"
            ])
            target_size_mb = (target_bitrate_kbps * video_duration / 8) / 1024
            print(f"📊 Using bitrate targeting: {target_bitrate} kbps (target: ~{target_size_mb:.2f} MB)")
        else:
            # Fallback: Use CRF 23 for high quality (lower = better quality, larger file)
            ffmpeg_cmd.extend(["-crf", "23"])
            print(f"📊 Using CRF 23 for high quality compression (no input size available)")
        
        ffmpeg_cmd.append(optimized_path)
        
        await send_progress(progress_callback_url, 87, "Encoding video (this may take a moment)...")
        subprocess.run(
            ffmpeg_cmd,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=600  # 10 min timeout for compression
        )
        
        # Check output file size - only recompress if way too large (e.g., >100MB for Cloudinary limit)
        if os.path.exists(optimized_path):
            output_size = os.path.getsize(optimized_path)
            output_size_mb = output_size / (1024*1024)
            size_ratio = (output_size / input_file_size * 100) if input_file_size > 0 else 0
            print(f"📦 Output file size: {output_size_mb:.2f} MB (input: {input_file_size / (1024*1024):.2f} MB, ratio: {size_ratio:.1f}%)")
            
            # Only recompress if file is too large for Cloudinary (100MB limit) or extremely large (>500MB)
            CLOUDINARY_MAX_SIZE = 100 * 1024 * 1024  # 100MB Cloudinary limit
            if output_size > CLOUDINARY_MAX_SIZE:
                print(f"⚠️ Output is {output_size_mb:.2f} MB (exceeds 100MB Cloudinary limit) - recompressing...")
                recompressed_path = os.path.join(tempfile.gettempdir(), f"recompressed_{file_id}.mp4")
                
                # Calculate bitrate to target ~80MB (under Cloudinary limit)
                target_mb = 80
                target_bitrate_kbps_recompress = int((target_mb * 1024 * 1024 * 8 / video_duration) / 1000)
                target_bitrate_kbps_recompress = max(1000, min(target_bitrate_kbps_recompress, 8000))
                aggressive_bitrate = f"{target_bitrate_kbps_recompress}k"
                
                recompress_cmd = [
                    ffmpeg_exe, "-y", "-i", optimized_path,
                    "-vcodec", "libx264",
                    "-b:v", aggressive_bitrate,
                    "-maxrate", aggressive_bitrate,
                    "-bufsize", f"{target_bitrate_kbps_recompress * 2}k",
                    "-crf", "25",  # Good quality
                    "-preset", "fast",  # Fast encoding
                    "-movflags", "+faststart",
                    "-threads", "0",
                    "-pix_fmt", "yuv420p",
                    recompressed_path
                ]
                
                subprocess.run(
                    recompress_cmd,
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=600
                )
                
                if os.path.exists(recompressed_path):
                    new_size = os.path.getsize(recompressed_path)
                    new_size_mb = new_size / (1024*1024)
                    print(f"📦 Recompressed size: {new_size_mb:.2f} MB")
                    if new_size < output_size and new_size <= CLOUDINARY_MAX_SIZE:
                        optimized_path = recompressed_path
                        output_size = new_size
                        print(f"✅ Recompression successful - file is now {new_size_mb:.2f} MB (under 100MB limit)")
                    else:
                        os.remove(recompressed_path)
                        print(f"⚠️ Recompression didn't help - using original")
            elif output_size_mb > 100:
                print(f"⚠️ Output is {output_size_mb:.2f} MB (acceptable but large - may have upload issues)")
            else:
                print(f"✅ Output size is acceptable: {output_size_mb:.2f} MB")
        
        # Ensure we have a valid compressed file
        if not os.path.exists(optimized_path):
            raise RuntimeError(f"FFmpeg compression failed - output file not found: {optimized_path}")
        
        final_video_path = optimized_path
        final_size = os.path.getsize(final_video_path)
        print(f"✅ Final compressed video: {final_size / (1024*1024):.2f} MB")
        
        await send_progress(progress_callback_url, 95, "Saving processed video...")
        with open(final_video_path, "rb") as f:
            processed_video = f.read()
        result = await save_processed_file(file_id, processed_video, detection_events=all_detection_events)
        await send_progress(progress_callback_url, 100, "Complete!")
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg conversion failed. Stderr: {e.stderr.decode()}")
        return False
    except subprocess.TimeoutExpired:
        print("❌ FFmpeg conversion timed out.")
        return False
    except Exception as e:
        print(f"❌ Video processing error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Clean up temp files
        temp_files = [tmp_in, mp4_path]
        if scaled_input and os.path.exists(scaled_input):
            temp_files.append(scaled_input)
        if 'optimized_path' in locals():
            temp_files.append(optimized_path)
        for f in temp_files:
            try:
                if os.path.exists(f):
                    if os.path.isdir(f):
                        import shutil
                        shutil.rmtree(f)
                    else:
                        os.remove(f)
            except:
                pass

# --------------------- PROGRESS CALLBACK ------------------------
async def send_progress(callback_url, progress, message=None):
    """Send progress update to Node.js service"""
    if callback_url:
        try:
            payload = {"progress": progress}
            if message:
                payload["message"] = message
            # Use asyncio.to_thread for non-blocking HTTP request
            await asyncio.to_thread(
                requests.post, 
                callback_url, 
                json=payload, 
                timeout=2
            )
        except Exception as e:
            # Don't fail processing if progress callback fails
            pass

# --------------------- PROCESS ROUTINE ------------------------
async def run_process(file_id, file_type, cloudinary_url=None, progress_callback_url=None, service_type='traffic-monitoring'):
    if _MODEL is None:
        raise RuntimeError("YOLO model is not loaded")
    if file_type.startswith("image"):
        return await process_image(file_id, _MODEL, cloudinary_url, progress_callback_url, service_type)
    elif file_type.startswith("video"):
        return await process_video(file_id, _MODEL, cloudinary_url, progress_callback_url, service_type)
    else:
        return False

# --------------------- FASTAPI ------------------------
app = FastAPI(title="YOLO Processing Service")

class ProcessRequest(BaseModel):
    fileId: str
    fileType: str
    cloudinaryUrl: str = None  # Optional Cloudinary URL
    cloudinaryId: str = None   # Optional Cloudinary public_id
    progressCallbackUrl: str = None  # Optional progress callback URL
    serviceType: str = 'traffic-monitoring'  # Service type for class filtering

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
        import time
        start_time = time.time()

        print("=" * 60)
        print(f"📥 NEW PROCESSING REQUEST RECEIVED")
        print(f"   📄 File ID   : {payload.fileId}")
        print(f"   🎞️  File Type : {payload.fileType}")
        print(f"   🔧 Service   : {payload.serviceType or 'traffic-monitoring'}")
        if payload.cloudinaryUrl:
            print(f"   ☁️  Cloudinary: {payload.cloudinaryUrl}")
        else:
            print(f"   ⚠️  No Cloudinary URL — will fetch from MongoDB")
        if USE_MODAL_GPU and MODAL_AVAILABLE:
            print(f"   🚀 GPU Mode  : Modal GPU (ON)")
        else:
            print(f"   🖥️  GPU Mode  : Local CPU (Modal GPU OFF or unavailable)")
        print("=" * 60)

        ok = await run_process(
            payload.fileId, 
            payload.fileType, 
            payload.cloudinaryUrl,
            payload.progressCallbackUrl,
            payload.serviceType or 'traffic-monitoring'
        )
        if not ok:
            raise HTTPException(status_code=500, detail="Processing failed")

        elapsed = time.time() - start_time
        print("=" * 60)
        print(f"✅ FILE PROCESSED SUCCESSFULLY")
        print(f"   📄 File ID : {payload.fileId}")
        print(f"   ⏱️  Duration: {elapsed:.1f}s ({elapsed/60:.1f} min)")
        print("=" * 60)
        return {"status": "ok", "fileId": payload.fileId}
    except Exception as e:
        print(f"❌ Processing failed for file {payload.fileId}: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed. Reason: {e}")

# --------------------- LIVE DETECTION WEBSOCKET ------------------------
import base64
import time as _time

@app.websocket("/ws/live-detect")
async def live_detect_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time camera object detection.
    Receives base64-encoded JPEG frames, runs YOLO, returns detection JSON.
    Query params: service_type (default: traffic-monitoring)
    """
    await websocket.accept()
    
    # Get service type from query params
    service_type = websocket.query_params.get("service_type", "traffic-monitoring")
    
    if _MODEL is None:
        await websocket.send_json({"error": "Model not loaded"})
        await websocket.close()
        return
    
    device = get_device()
    half = device == 'cuda'
    frame_id = 0
    session_start = _time.time()
    
    print(f"📹 Live detection session started (service: {service_type}, device: {device})")
    
    try:
        while True:
            # Receive base64 JPEG frame from browser
            data = await websocket.receive_text()
            
            try:
                # Decode base64 to image
                # Strip data URL prefix if present
                if "," in data:
                    data = data.split(",", 1)[1]
                
                img_bytes = base64.b64decode(data)
                img_array = np.frombuffer(img_bytes, dtype=np.uint8)
                frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                
                if frame is None:
                    await websocket.send_json({"error": "Invalid frame"})
                    continue
                
                h, w = frame.shape[:2]
                
                # Run YOLO inference (blocking, but fast at imgsz=320)
                t0 = _time.time()
                results = await asyncio.to_thread(
                    _MODEL.predict,
                    frame,
                    device=device,
                    imgsz=320,
                    conf=0.25,
                    half=half,
                    verbose=False,
                    agnostic_nms=True,
                    max_det=50
                )
                inference_ms = (_time.time() - t0) * 1000
                
                # Extract detections
                timestamp = _time.time() - session_start
                event = extract_detection_event(
                    results[0],
                    frame_id=frame_id,
                    timestamp=timestamp,
                    inference_time_ms=inference_ms,
                    service_type=service_type
                )
                
                # Build response with normalized bbox coordinates (0-1 range)
                detections = []
                for obj in event["detectedObjects"]:
                    bbox = obj["bbox"]
                    detections.append({
                        "class": obj["class"],
                        "confidence": round(obj["confidence"], 3),
                        "x1": round(bbox["x1"] / w, 4),
                        "y1": round(bbox["y1"] / h, 4),
                        "x2": round(bbox["x2"] / w, 4),
                        "y2": round(bbox["y2"] / h, 4)
                    })
                
                await websocket.send_json({
                    "frameId": frame_id,
                    "timestamp": round(timestamp, 3),
                    "inferenceMs": round(inference_ms, 1),
                    "detections": detections,
                    "objectCounts": event["objectCounts"]
                })
                
                frame_id += 1
                
            except Exception as e:
                await websocket.send_json({"error": str(e)})
                
    except WebSocketDisconnect:
        duration = _time.time() - session_start
        print(f"📹 Live detection session ended: {frame_id} frames in {duration:.1f}s")
    except Exception as e:
        print(f"❌ Live detection error: {e}")
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=PORT)
