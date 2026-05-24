"""
ByteTrack Object Tracker
A simplified implementation of ByteTrack for multi-object tracking
"""

import numpy as np
from collections import defaultdict

class BYTETracker:
    """
    Simplified ByteTrack tracker for traffic monitoring
    """
    def __init__(self, frame_rate=30, track_thresh=0.5, high_thresh=0.6, match_thresh=0.8, track_buffer=30):
        self.frame_id = 0
        self.track_id = 0
        self.tracked_tracks = []  # List of Track objects
        self.lost_tracks = []     # List of lost tracks
        self.removed_tracks = []  # List of removed tracks
        
        self.frame_rate = frame_rate
        self.track_thresh = track_thresh
        self.high_thresh = high_thresh
        self.match_thresh = match_thresh
        self.track_buffer = track_buffer
        
        self.max_time_lost = int(self.frame_rate / 30.0 * self.track_buffer)

    def update(self, detections, frame_id=None):
        """
        Update tracker with new detections
        
        Args:
            detections: List of detections, each with bbox [x1, y1, x2, y2], confidence, class
            frame_id: Current frame number
        
        Returns:
            List of tracked objects with track_id
        """
        if frame_id is not None:
            self.frame_id = frame_id
        else:
            self.frame_id += 1
        
        # Convert detections to Track objects
        detections_list = []
        for det in detections:
            if isinstance(det, dict):
                bbox = det.get('bbox', {})
                detections_list.append({
                    'bbox': [bbox.get('x1', 0), bbox.get('y1', 0), bbox.get('x2', 0), bbox.get('y2', 0)],
                    'confidence': det.get('confidence', 0.5),
                    'class': det.get('class', 'unknown')
                })
            else:
                detections_list.append(det)
        
        # Separate detections by confidence
        high_conf_dets = [d for d in detections_list if d['confidence'] >= self.high_thresh]
        low_conf_dets = [d for d in detections_list if self.track_thresh <= d['confidence'] < self.high_thresh]
        
        # Update tracked tracks
        tracked_objects = []
        
        # Match high confidence detections with existing tracks
        if len(self.tracked_tracks) > 0 and len(high_conf_dets) > 0:
            matches, unmatched_tracks, unmatched_dets = self._associate_detections_to_trackers(
                self.tracked_tracks, high_conf_dets
            )
            
            # Update matched tracks
            for match in matches:
                track_idx, det_idx = match
                track = self.tracked_tracks[track_idx]
                det = high_conf_dets[det_idx]
                track.update(det, self.frame_id)
                tracked_objects.append({
                    'track_id': track.track_id,
                    'bbox': det['bbox'],
                    'confidence': det['confidence'],
                    'class': det['class'],
                    'frame_id': self.frame_id
                })
            
            # Handle unmatched tracks (mark as lost)
            for track_idx in unmatched_tracks:
                track = self.tracked_tracks[track_idx]
                if track.time_since_update > self.max_time_lost:
                    self.removed_tracks.append(track)
                else:
                    self.lost_tracks.append(track)
            
            # Remove matched tracks from tracked_tracks
            self.tracked_tracks = [t for i, t in enumerate(self.tracked_tracks) if i not in [m[0] for m in matches]]
            
            # Create new tracks for unmatched detections
            for det_idx in unmatched_dets:
                det = high_conf_dets[det_idx]
                new_track = Track(det, self.frame_id, self.track_id)
                self.track_id += 1
                self.tracked_tracks.append(new_track)
                tracked_objects.append({
                    'track_id': new_track.track_id,
                    'bbox': det['bbox'],
                    'confidence': det['confidence'],
                    'class': det['class'],
                    'frame_id': self.frame_id
                })
        else:
            # No existing tracks, create new ones for all high confidence detections
            for det in high_conf_dets:
                new_track = Track(det, self.frame_id, self.track_id)
                self.track_id += 1
                self.tracked_tracks.append(new_track)
                tracked_objects.append({
                    'track_id': new_track.track_id,
                    'bbox': det['bbox'],
                    'confidence': det['confidence'],
                    'class': det['class'],
                    'frame_id': self.frame_id
                })
        
        # Try to recover lost tracks with low confidence detections
        if len(self.lost_tracks) > 0 and len(low_conf_dets) > 0:
            matches, _, unmatched_low_dets = self._associate_detections_to_trackers(
                self.lost_tracks, low_conf_dets
            )
            
            for match in matches:
                track_idx, det_idx = match
                track = self.lost_tracks[track_idx]
                det = low_conf_dets[det_idx]
                track.update(det, self.frame_id)
                self.tracked_tracks.append(track)
                tracked_objects.append({
                    'track_id': track.track_id,
                    'bbox': det['bbox'],
                    'confidence': det['confidence'],
                    'class': det['class'],
                    'frame_id': self.frame_id
                })
            
            # Remove matched tracks from lost_tracks
            self.lost_tracks = [t for i, t in enumerate(self.lost_tracks) if i not in [m[0] for m in matches]]
        
        # Update time_since_update for all tracked tracks
        for track in self.tracked_tracks:
            track.time_since_update += 1
        
        return tracked_objects
    
    def _associate_detections_to_trackers(self, tracks, detections):
        """
        Associate detections to trackers using IoU
        """
        if len(tracks) == 0 or len(detections) == 0:
            return [], list(range(len(tracks))), list(range(len(detections)))
        
        # Compute IoU matrix
        iou_matrix = np.zeros((len(tracks), len(detections)), dtype=np.float32)
        for t, track in enumerate(tracks):
            for d, det in enumerate(detections):
                iou_matrix[t, d] = self._compute_iou(track.bbox, det['bbox'])
        
        # Greedy matching
        matches = []
        unmatched_tracks = list(range(len(tracks)))
        unmatched_dets = list(range(len(detections)))
        
        # Sort by IoU descending
        if iou_matrix.size > 0:
            while True:
                max_iou = np.max(iou_matrix)
                if max_iou < self.match_thresh:
                    break
                
                t_idx, d_idx = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
                matches.append((t_idx, d_idx))
                unmatched_tracks.remove(t_idx)
                unmatched_dets.remove(d_idx)
                
                # Remove matched row and column
                iou_matrix[t_idx, :] = 0
                iou_matrix[:, d_idx] = 0
        
        return matches, unmatched_tracks, unmatched_dets
    
    def _compute_iou(self, bbox1, bbox2):
        """
        Compute Intersection over Union (IoU) of two bounding boxes
        """
        x1_1, y1_1, x2_1, y2_1 = bbox1
        x1_2, y1_2, x2_2, y2_2 = bbox2
        
        # Calculate intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i <= x1_i or y2_i <= y1_i:
            return 0.0
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = area1 + area2 - intersection
        
        if union == 0:
            return 0.0
        
        return intersection / union


class Track:
    """
    Single object track
    """
    def __init__(self, detection, frame_id, track_id):
        self.track_id = track_id
        self.bbox = detection['bbox']  # [x1, y1, x2, y2]
        self.confidence = detection['confidence']
        self.class_name = detection['class']
        self.frame_id = frame_id
        self.time_since_update = 0
        self.history = [detection['bbox']]
        
    def update(self, detection, frame_id):
        """Update track with new detection"""
        self.bbox = detection['bbox']
        self.confidence = detection['confidence']
        self.class_name = detection['class']
        self.frame_id = frame_id
        self.time_since_update = 0
        self.history.append(detection['bbox'])
        
        # Keep only recent history (last 10 frames)
        if len(self.history) > 10:
            self.history = self.history[-10:]
