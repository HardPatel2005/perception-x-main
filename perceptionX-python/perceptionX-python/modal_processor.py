"""
Modal GPU Processor - On-demand GPU processing for video files
This module handles video processing on Modal's free GPU infrastructure
"""
import modal
import os
import tempfile
import subprocess
import cv2
import numpy as np
import time
from ultralytics import YOLO
# BYTETracker will be defined inline in the function
import imageio_ffmpeg as ffmpeg
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from bson.binary import Binary
import cloudinary
import cloudinary.uploader
import json
import asyncio

# Create Modal app
app = modal.App("perceptionx-video-processor")

# Create a persistent volume for model cache (survives container restarts)
model_cache_volume = modal.Volume.from_name("yolo-model-cache", create_if_missing=True)

# Define GPU image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.10")
    .pip_install([
        "ultralytics",
        "opencv-python",
        "numpy",
        "pillow",
        "imageio-ffmpeg",
        "pymongo",
        "motor",
        "cloudinary",
        "requests"
    ])
    .apt_install(["ffmpeg"])
    .run_commands("mkdir -p /yolov11 /app /models")
)

# GPU configuration - T4 GPU (free tier eligible)
gpu_config = "T4"

# Modal secret name created from the dashboard/CLI.
# Create it with: modal secret create perceptionx-secrets ...
MODAL_SECRET_NAME = os.environ.get("MODAL_SECRET_NAME", "perceptionx-secrets")

# Service-type class mapping (same as in app.py)
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
                
                # Filter by service type
                if not is_service_relevant(class_name, service_type):
                    continue
                
                # Get confidence
                if hasattr(boxes.conf[i], 'item'):
                    conf = float(boxes.conf[i].item())
                elif hasattr(boxes.conf[i], 'cpu'):
                    conf = float(boxes.conf[i].cpu().item())
                else:
                    conf = float(boxes.conf[i])
                
                # Get bbox
                if hasattr(boxes.xyxy[i], 'cpu'):
                    xyxy = boxes.xyxy[i].cpu().tolist()
                elif hasattr(boxes.xyxy[i], 'tolist'):
                    xyxy = boxes.xyxy[i].tolist()
                else:
                    xyxy = list(boxes.xyxy[i])
                
                x1, y1, x2, y2 = xyxy[0], xyxy[1], xyxy[2], xyxy[3]
                
                # Add to detected objects
                event["detectedObjects"].append({
                    "class": class_name,
                    "confidence": round(conf, 3),
                    "bbox": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2)
                    }
                })
                
                # Update counts
                if class_name not in event["objectCounts"]:
                    event["objectCounts"][class_name] = 0
                event["objectCounts"][class_name] += 1
                
            except Exception as e:
                print(f"⚠️ Error processing detection {i}: {e}")
                continue
        
    except Exception as e:
        print(f"⚠️ Error extracting detection event: {e}")
    
    return event

def send_progress_sync(callback_url, progress, message=None):
    """Send progress update (synchronous version for Modal)"""
    if callback_url:
        try:
            payload = {"progress": progress}
            if message:
                payload["message"] = message
            requests.post(callback_url, json=payload, timeout=2)
        except:
            pass

@app.function(
    image=image,
    gpu=gpu_config,
    volumes={"/models": model_cache_volume},  # Mount persistent volume for model cache
    secrets=[modal.Secret.from_name(MODAL_SECRET_NAME)],
    timeout=3600  # 1 hour max
)
def process_video_on_gpu(
    file_id: str,
    video_url: str,
    service_type: str = 'traffic-monitoring',
    progress_callback_url: str = None,
    mongo_uri: str = None,
    database_name: str = "test",
    collection_name: str = "files",
    cloudinary_cloud_name: str = None,
    cloudinary_api_key: str = None,
    cloudinary_api_secret: str = None
):
    """
    Process video on Modal's free GPU
    
    Args:
        file_id: MongoDB file ID
        video_url: URL to download video (Cloudinary or direct URL)
        service_type: Type of service (traffic-monitoring, wildlife-monitoring, restaurant-monitoring)
        progress_callback_url: URL to send progress updates
        mongo_uri: MongoDB connection string
        database_name: MongoDB database name
        collection_name: MongoDB collection name
        cloudinary_cloud_name: Cloudinary cloud name
        cloudinary_api_key: Cloudinary API key
        cloudinary_api_secret: Cloudinary API secret
    
    Returns:
        dict with success status, processed_video_url, detection_events, and file_id
    """
    import sys
    # Allow secret-backed env vars to override missing parameters.
    cloudinary_cloud_name = cloudinary_cloud_name or os.environ.get("CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key = cloudinary_api_key or os.environ.get("CLOUDINARY_API_KEY")
    cloudinary_api_secret = cloudinary_api_secret or os.environ.get("CLOUDINARY_API_SECRET")
    mongo_uri = mongo_uri or os.environ.get("MONGO_URI")
    # Add root to path so we can import byte_tracker from mounted file
    if "/" not in sys.path:
        sys.path.insert(0, "/")
    
    # Check if file is already processed (prevent duplicate processing)
    if mongo_uri:
        try:
            from pymongo import MongoClient
            check_client = MongoClient(mongo_uri)
            check_db = check_client[database_name]
            check_collection = check_db[collection_name]
            
            existing_file = check_collection.find_one({"_id": ObjectId(file_id)})
            if existing_file and (existing_file.get("processedCloudinaryUrl") or existing_file.get("processedData")):
                check_client.close()
                print(f"⚠️ File {file_id} already processed, skipping duplicate processing")
                return {
                    "success": True,
                    "file_id": file_id,
                    "processed_video_url": existing_file.get("processedCloudinaryUrl"),
                    "detection_events": existing_file.get("detectionEvents", []),
                    "already_processed": True
                }
            check_client.close()
        except Exception as e:
            pass  # Continue if check fails
    
    # Silent start - summary will be shown at the end
    
    # Define BYTETracker inline (since we can't mount files easily)
    from collections import defaultdict
    
    class BYTETracker:
        """Simplified ByteTrack tracker for object tracking"""
        def __init__(self, frame_rate=30, track_thresh=0.5, high_thresh=0.6, match_thresh=0.8, track_buffer=30):
            self.frame_id = 0
            self.track_id = 0
            self.tracked_tracks = []
            self.lost_tracks = []
            self.frame_rate = frame_rate
            self.track_thresh = track_thresh
            self.high_thresh = high_thresh
            self.match_thresh = match_thresh
            self.max_time_lost = int(frame_rate / 30.0 * track_buffer)
        
        def update(self, detections, frame_id=None):
            """Update tracker with detections - simplified version"""
            if frame_id is not None:
                self.frame_id = frame_id
            else:
                self.frame_id += 1
            
            # Simple tracking - assign track IDs sequentially
            tracked = []
            for det in detections:
                if isinstance(det, dict):
                    bbox = det.get('bbox', {})
                    if isinstance(bbox, dict):
                        bbox_list = [bbox.get('x1',0), bbox.get('y1',0), bbox.get('x2',0), bbox.get('y2',0)]
                    else:
                        bbox_list = bbox
                    tracked.append({
                        'track_id': self.track_id,
                        'bbox': bbox_list,
                        'class': det.get('class', 'unknown'),
                        'confidence': det.get('confidence', 0.0)
                    })
                    self.track_id += 1
            return tracked
    
    # Load credentials from Modal secrets if not provided as parameters
    if not mongo_uri:
        mongo_uri = os.environ.get("MONGO_URI")
    if not database_name or database_name == "test":
        database_name = os.environ.get("DATABASE_NAME", database_name or "test")
    if not collection_name or collection_name == "files":
        collection_name = os.environ.get("COLLECTION_NAME", collection_name or "files")
    if not cloudinary_cloud_name:
        cloudinary_cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    if not cloudinary_api_key:
        cloudinary_api_key = os.environ.get("CLOUDINARY_API_KEY")
    if not cloudinary_api_secret:
        cloudinary_api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    
    # Configure Cloudinary if available
    if cloudinary_cloud_name and cloudinary_api_key and cloudinary_api_secret:
        cloudinary.config(
            cloud_name=cloudinary_cloud_name,
            api_key=cloudinary_api_key,
            api_secret=cloudinary_api_secret,
            secure=True
        )
    
    # Download video
    send_progress_sync(progress_callback_url, 30, "Downloading video...")
    try:
        response = requests.get(video_url, timeout=300, stream=True)
        response.raise_for_status()
        video_data = response.content
    except Exception as e:
        return {"success": False, "error": f"Failed to download video: {e}"}
    
    # Save to temp file
    tmp_in = os.path.join(tempfile.gettempdir(), f"input_{file_id}.mp4")
    with open(tmp_in, "wb") as f:
        f.write(video_data)
    
    # Get video info
    cap = cv2.VideoCapture(tmp_in)
    if not cap.isOpened():
        return {"success": False, "error": "Failed to open video file"}
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    
    # Load YOLO model on GPU (use persistent volume cache)
    send_progress_sync(progress_callback_url, 35, "Loading AI model on GPU...")
    model_cache_path = "/models/yolov8n.pt"
    
    try:
        # Try custom model first
        model_path = "/yolov11/best.pt"
        if os.path.exists(model_path):
            model = YOLO(model_path)
        else:
            # Check if model exists in volume cache
            if os.path.exists(model_cache_path):
                print("📦 Loading model from cache (no download needed)")
                model = YOLO(model_cache_path)
            else:
                # Download model and save to volume cache for future use
                print("⬇️ Downloading model (first time, will cache for future use)...")
                model = YOLO("yolov8n.pt")  # This downloads to default location
                # Copy to volume cache for persistence
                import shutil
                default_path = "yolov8n.pt"
                if os.path.exists(default_path):
                    shutil.copy(default_path, model_cache_path)
                    model_cache_volume.commit()  # Commit to persist
                    print("✅ Model cached to volume for future use")
    except Exception as e:
        # Fallback: try loading from cache or download
        try:
            if os.path.exists(model_cache_path):
                model = YOLO(model_cache_path)
            else:
                model = YOLO("yolov8n.pt")
        except Exception as e2:
            return {"success": False, "error": f"Failed to load model: {e2}"}
    
    # Process video
    mp4_path = os.path.join(tempfile.gettempdir(), f"processed_{file_id}.mp4")
    
    # Initialize tracker
    tracker = BYTETracker(frame_rate=fps, track_thresh=0.5, high_thresh=0.6, match_thresh=0.8)
    
    # Process frames
    cap = cv2.VideoCapture(tmp_in)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(mp4_path, fourcc, fps, (width, height), True)
    
    if not out.isOpened():
        print("⚠️ VideoWriter failed with mp4v, trying XVID codec...")
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        mp4_path = mp4_path.replace('.mp4', '.avi')
        out = cv2.VideoWriter(mp4_path, fourcc, fps, (width, height), True)
        if not out.isOpened():
            return {"success": False, "error": "Failed to initialize VideoWriter"}
    
    frame_count = 0
    batch_size = 512  # Larger batches for maximum GPU throughput
    frame_batch = []
    all_detection_events = []
    last_progress_update = 40
    start_time = time.time()
    
    send_progress_sync(progress_callback_url, 40, "Processing video on GPU...")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            # Process remaining batch
            if len(frame_batch) > 0:
                batch_results = model.predict(
                    frame_batch,
                    device="cuda",
                    imgsz=640,  # Full resolution on GPU
                    conf=0.25,
                    half=True,  # FP16 on GPU for speed
                    verbose=False,
                    agnostic_nms=True,
                    max_det=100
                )
                batch_start_frame = frame_count - len(frame_batch)
                for i, result in enumerate(batch_results):
                    frame_idx = batch_start_frame + i
                    timestamp = frame_idx / fps if fps > 0 else 0.0
                    detection_event = extract_detection_event(result, frame_id=frame_idx, timestamp=timestamp, service_type=service_type)
                    
                    # Update tracker
                    tracked_objects = tracker.update(detection_event["detectedObjects"], frame_id=frame_idx)
                    
                    # Add track IDs
                    for det_obj in detection_event["detectedObjects"]:
                        for track_obj in tracked_objects:
                            track_bbox = track_obj.get('bbox')
                            det_bbox = det_obj.get('bbox')
                            
                            if track_bbox is None or det_bbox is None:
                                continue
                            
                            if isinstance(track_bbox, (list, tuple)) and len(track_bbox) >= 4:
                                track_x1, track_y1 = track_bbox[0], track_bbox[1]
                            else:
                                continue
                            
                            det_x1 = det_bbox.get('x1', 0) if isinstance(det_bbox, dict) else 0
                            det_y1 = det_bbox.get('y1', 0) if isinstance(det_bbox, dict) else 0
                            
                            if (abs(track_x1 - det_x1) < 5 and
                                abs(track_y1 - det_y1) < 5 and
                                track_obj.get('class') == det_obj.get('class')):
                                det_obj['track_id'] = track_obj.get('track_id')
                                break
                    
                    # Frame-by-frame detection log (log every 10 frames to avoid spam)
                    if detection_event["detectedObjects"]:
                        all_detection_events.append(detection_event)
                        # Log what's detected (every 10 frames or first/last frame of batch)
                        if frame_idx % 10 == 0 or i == 0 or i == len(batch_results) - 1:
                            detected_classes = {}
                            for obj in detection_event["detectedObjects"]:
                                class_name = obj.get('class', 'unknown')
                                detected_classes[class_name] = detected_classes.get(class_name, 0) + 1
                            
                            if detected_classes:
                                classes_str = ", ".join([f"{count}x {cls}" for cls, count in detected_classes.items()])
                                print(f"📹 Frame {frame_idx}/{total_frames}: {classes_str}")
                    
                    annotated = result.plot()
                    if annotated is not None and len(annotated.shape) == 3:
                        if annotated.dtype != np.uint8:
                            annotated = (annotated * 255).astype(np.uint8) if annotated.max() <= 1.0 else annotated.astype(np.uint8)
                        if annotated.shape[:2] != (height, width):
                            annotated = cv2.resize(annotated, (width, height))
                        annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
                    else:
                        annotated_bgr = frame_batch[i]
                    out.write(annotated_bgr)
            break
        
        frame_batch.append(frame)
        frame_count += 1
        
        # Process batch when full
        if len(frame_batch) >= batch_size:
            # Update progress (less frequent updates for cleaner logs)
            if total_frames > 0:
                progress = int(40 + (frame_count / total_frames) * 45)
                if progress - last_progress_update >= 5:  # Update every 5% instead of 2%
                    send_progress_sync(progress_callback_url, progress, 
                                      f"Processing {frame_count}/{total_frames} frames...")
                    last_progress_update = progress
            
            # Process batch on GPU (silent, no verbose output)
            batch_results = model.predict(
                frame_batch,
                device="cuda",
                imgsz=640,
                conf=0.25,
                half=True,
                verbose=False,
                agnostic_nms=True,
                max_det=100
            )
            
            batch_start_frame = frame_count - len(frame_batch)
            for i, result in enumerate(batch_results):
                frame_idx = batch_start_frame + i
                timestamp = frame_idx / fps if fps > 0 else 0.0
                detection_event = extract_detection_event(result, frame_id=frame_idx, timestamp=timestamp, service_type=service_type)
                
                # Update tracker
                tracked_objects = tracker.update(detection_event["detectedObjects"], frame_id=frame_idx)
                
                # Add track IDs
                for det_obj in detection_event["detectedObjects"]:
                    for track_obj in tracked_objects:
                        track_bbox = track_obj.get('bbox')
                        det_bbox = det_obj.get('bbox')
                        
                        if track_bbox is None or det_bbox is None:
                            continue
                        
                        if isinstance(track_bbox, (list, tuple)) and len(track_bbox) >= 4:
                            track_x1, track_y1 = track_bbox[0], track_bbox[1]
                        else:
                            continue
                        
                        det_x1 = det_bbox.get('x1', 0) if isinstance(det_bbox, dict) else 0
                        det_y1 = det_bbox.get('y1', 0) if isinstance(det_bbox, dict) else 0
                        
                        if (abs(track_x1 - det_x1) < 5 and
                            abs(track_y1 - det_y1) < 5 and
                            track_obj.get('class') == det_obj.get('class')):
                            det_obj['track_id'] = track_obj.get('track_id')
                            break
                
                # Frame-by-frame detection log (log every 10 frames to avoid spam)
                if detection_event["detectedObjects"]:
                    all_detection_events.append(detection_event)
                    # Log what's detected (every 10 frames or first frame of batch)
                    if frame_idx % 10 == 0 or i == 0:
                        detected_classes = {}
                        for obj in detection_event["detectedObjects"]:
                            class_name = obj.get('class', 'unknown')
                            detected_classes[class_name] = detected_classes.get(class_name, 0) + 1
                        
                        if detected_classes:
                            classes_str = ", ".join([f"{count}x {cls}" for cls, count in detected_classes.items()])
                            print(f"📹 Frame {frame_idx}/{total_frames}: {classes_str}")
                
                annotated = result.plot()
                if annotated is not None and len(annotated.shape) == 3:
                    if annotated.dtype != np.uint8:
                        annotated = (annotated * 255).astype(np.uint8) if annotated.max() <= 1.0 else annotated.astype(np.uint8)
                    if annotated.shape[:2] != (height, width):
                        annotated = cv2.resize(annotated, (width, height))
                    annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
                else:
                    annotated_bgr = frame_batch[i]
                out.write(annotated_bgr)
            
            frame_batch = []
    
    cap.release()
    out.release()
    
    processing_time = time.time() - start_time
    
    # ===================== 2-PASS BITRATE-CONTROLLED COMPRESSION =====================
    # Cloudinary has a HARD 100MB limit. We target 90MB (10MB headroom) guaranteed in 1 attempt.
    TARGET_MB = 90
    AUDIO_KBPS = 96  # small audio budget for videos

    send_progress_sync(progress_callback_url, 88, "Compressing video...")
    ffmpeg_exe = ffmpeg.get_ffmpeg_exe()
    compressed_path = os.path.join(tempfile.gettempdir(), f"compressed_{file_id}.mp4")
    pass1_log = os.path.join(tempfile.gettempdir(), f"ffmpeg2pass_{file_id}")

    # Step 1: Get real duration via ffprobe (more accurate than frame_count/fps)
    try:
        probe_result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", mp4_path],
            capture_output=True, text=True, timeout=30
        )
        duration_sec = float(probe_result.stdout.strip())
        if duration_sec <= 0:
            raise ValueError("zero duration")
    except Exception:
        # Fallback: estimate from frame_count and fps
        duration_sec = frame_count / fps if fps > 0 else frame_count / 25.0

    # Step 2: Calculate exact target video bitrate
    total_kbps = int((TARGET_MB * 8 * 1024) / duration_sec)
    video_kbps = max(100, total_kbps - AUDIO_KBPS)

    print(f"📦 Starting 2-pass compression (duration: {duration_sec:.1f}s, frames: {frame_count})")
    print(f"📦 Target Bitrate: {video_kbps} kbps video + {AUDIO_KBPS} kbps audio → guaranteed ≤{TARGET_MB}MB")

    try:
        # Pass 1 — analysis (no output, writes stats to pass1_log)
        print("🎬 Pass 1 — analysing video...")
        subprocess.run([
            ffmpeg_exe, "-y", "-i", mp4_path,
            "-c:v", "libx264", "-b:v", f"{video_kbps}k",
            "-preset", "medium",
            "-pass", "1", "-passlogfile", pass1_log,
            "-an", "-f", "null",
            "/dev/null"
        ], check=True, timeout=600, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        # Pass 2 — final encode to exact bitrate
        print("🎬 Pass 2 — encoding final output...")
        subprocess.run([
            ffmpeg_exe, "-y", "-i", mp4_path,
            "-c:v", "libx264", "-b:v", f"{video_kbps}k",
            "-preset", "medium",
            "-pass", "2", "-passlogfile", pass1_log,
            "-c:a", "aac", "-b:a", f"{AUDIO_KBPS}k",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            compressed_path
        ], check=True, timeout=600, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        final_size = os.path.getsize(compressed_path)
        final_size_mb = final_size / (1024 * 1024)
        print(f"📦 Compression finished! Size: {final_size_mb:.2f} MB")

        with open(compressed_path, "rb") as f:
            processed_video = f.read()

    except Exception as e:
        print(f"⚠️ 2-pass compression failed: {e}, using raw processed video")
        with open(mp4_path, "rb") as f:
            processed_video = f.read()
        final_size_mb = len(processed_video) / (1024 * 1024)
    finally:
        # Cleanup pass-log files
        for ext in ["-0.log", "-0.log.mbtree"]:
            try: os.unlink(pass1_log + ext)
            except: pass

    
    # Cleanup intermediate files
    for tmp_path in [compressed_path, mp4_path]:
        try: os.unlink(tmp_path)
        except: pass
    
    # ===================== CLOUDINARY UPLOAD =====================
    processed_url = None
    if cloudinary_cloud_name:
        try:
            send_progress_sync(progress_callback_url, 95, "Uploading to Cloudinary...")
            
            tmp_upload = os.path.join(tempfile.gettempdir(), f"upload_{file_id}.mp4")
            with open(tmp_upload, "wb") as f:
                f.write(processed_video)
            
            upload_timeout = max(600, int(final_size_mb * 12))
            print(f"☁️ Fast Uploading {final_size_mb:.2f} MB to Cloudinary (timeout: {upload_timeout}s)...")
            
            # Using chunked upload_large is significantly faster and more reliable for files >20MB
            if final_size_mb > 20:
                 upload_result = cloudinary.uploader.upload_large(
                    tmp_upload,
                    resource_type="video",
                    folder="perceptionx/processed",
                    public_id=f"processed_{file_id}",
                    overwrite=True,
                    timeout=upload_timeout,
                    chunk_size=10000000 # 10MB chunks uploaded concurrently by Cloudinary SDK
                )
            else:
                 upload_result = cloudinary.uploader.upload(
                    tmp_upload,
                    resource_type="video",
                    folder="perceptionx/processed",
                    public_id=f"processed_{file_id}",
                    overwrite=True,
                    timeout=upload_timeout
                )
            
            processed_url = upload_result["secure_url"]
            print(f"✅ Uploaded to Cloudinary successfully: {processed_url}")
            os.unlink(tmp_upload)
        except Exception as e:
            print(f"⚠️ Cloudinary upload failed: {e}")
            try: os.unlink(tmp_upload)
            except: pass
    
    # Save to MongoDB if available
    mongo_saved = False
    if mongo_uri:
        try:
            from pymongo import MongoClient
            client = MongoClient(mongo_uri)
            db = client[database_name]
            collection = db[collection_name]
            
            update_data = {}
            
            if processed_url:
                update_data["processedCloudinaryUrl"] = processed_url
                update_data["processedCloudinaryId"] = f"processed_{file_id}"
            
            if all_detection_events:
                event_count = len(all_detection_events)
                max_events_per_doc = 20000
                
                if event_count > max_events_per_doc:
                    sample_size = min(1000, event_count)
                    update_data["detectionEvents"] = all_detection_events[:sample_size]
                    update_data["detectionEventsCount"] = event_count
                    update_data["detectionEventsTruncated"] = True
                else:
                    update_data["detectionEvents"] = all_detection_events
            
            video_size_mb = len(processed_video) / (1024 * 1024)
            max_mongodb_size_mb = 10
            
            if video_size_mb <= max_mongodb_size_mb:
                update_data["processedData"] = Binary(processed_video)
            
            if update_data:
                # Also set a flag to mark as processed (for frontend polling)
                update_data["isProcessed"] = True
                result = collection.update_one(
                    {"_id": ObjectId(file_id)},
                    {"$set": update_data}
                )
                mongo_saved = result.modified_count > 0 or result.matched_count > 0
                if mongo_saved:
                    print(f"✅ Saved to MongoDB: processedCloudinaryUrl={processed_url is not None}, detectionEvents={len(all_detection_events)}")
            
            client.close()
        except Exception as e:
            # Try minimal save on error
            try:
                client = MongoClient(mongo_uri)
                db = client[database_name]
                collection = db[collection_name]
                minimal_update = {}
                if processed_url:
                    minimal_update["processedCloudinaryUrl"] = processed_url
                    minimal_update["processedCloudinaryId"] = f"processed_{file_id}"
                if all_detection_events:
                    minimal_update["detectionEvents"] = all_detection_events[:1000]
                    minimal_update["detectionEventsCount"] = len(all_detection_events)
                    minimal_update["detectionEventsTruncated"] = True
                if minimal_update:
                    minimal_update["isProcessed"] = True  # Mark as processed for frontend
                    collection.update_one({"_id": ObjectId(file_id)}, {"$set": minimal_update})
                    mongo_saved = True
                    print(f"✅ Saved minimal data to MongoDB (fallback): processedCloudinaryUrl={processed_url is not None}")
                client.close()
            except:
                pass
    
    send_progress_sync(progress_callback_url, 100, "Complete!")
    
    # Summary log at the end
    total_time = time.time() - start_time
    video_size_mb = len(processed_video) / (1024 * 1024)
    print("=" * 70)
    print("✅ GPU PROCESSING COMPLETE")
    print(f"   📄 File ID      : {file_id}")
    print(f"   📹 Frames       : {frame_count}")
    print(f"   🎯 Detections   : {len(all_detection_events)}")
    print(f"   📦 Video Size   : {video_size_mb:.2f} MB")
    print(f"   ⏱️  Processing   : {processing_time:.1f}s ({processing_time/frame_count*1000:.1f}ms/frame)")
    print(f"   ⏱️  Total Time   : {total_time:.1f}s")
    print(f"   ☁️  Cloudinary   : {'✅' if processed_url else '❌'}")
    print(f"   💾 MongoDB      : {'✅' if mongo_saved else '❌'}")
    if processed_url:
        print(f"   🔗 Processed URL: {processed_url}")
    print("=" * 70)
    
    return {
        "success": True,
        "file_id": file_id,
        "processed_video_url": processed_url,
        "detection_events": all_detection_events,
        "video_size": len(processed_video),
        "frame_count": frame_count,
        "detection_count": len(all_detection_events)
    }
