/**
 * Production-Grade Traffic Monitoring Analytics Engine
 * Uses object tracking to compute realistic traffic intelligence metrics
 */

// Vehicle class mapping
const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train', 'boat', 'vehicle'];
const PEDESTRIAN_CLASSES = ['person', 'hand', 'face', 'head', 'body'];
const INFRASTRUCTURE_CLASSES = ['traffic light', 'stop sign', 'parking meter', 'fire hydrant'];

// Tracking configuration
const TRACKING_CONFIG = {
    IOU_THRESHOLD: 0.3,        // IoU threshold for matching objects
    MAX_DISTANCE_RATIO: 0.2,    // Max distance ratio for tracking
    MAX_FRAME_GAP: 10,          // Max frames between detections to maintain track
    MIN_TRACK_LENGTH: 3          // Minimum frames to consider a valid track
};

/**
 * Calculate IoU (Intersection over Union) between two bounding boxes
 */
function calculateIoU(bbox1, bbox2) {
    if (!bbox1 || !bbox2 || !bbox1.x1 || !bbox1.y1 || !bbox1.x2 || !bbox1.y2 ||
        !bbox2.x1 || !bbox2.y1 || !bbox2.x2 || !bbox2.y2) {
        return 0;
    }

    const x1 = Math.max(bbox1.x1, bbox2.x1);
    const y1 = Math.max(bbox1.y1, bbox2.y1);
    const x2 = Math.min(bbox1.x2, bbox2.x2);
    const y2 = Math.min(bbox1.y2, bbox2.y2);

    if (x2 <= x1 || y2 <= y1) return 0;

    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = (bbox1.x2 - bbox1.x1) * (bbox1.y2 - bbox1.y1);
    const area2 = (bbox2.x2 - bbox2.x1) * (bbox2.y2 - bbox2.y1);
    const union = area1 + area2 - intersection;

    return union > 0 ? intersection / union : 0;
}

/**
 * Get center point of bounding box
 */
function getBboxCenter(bbox) {
    if (!bbox || !bbox.x1 || !bbox.y1 || !bbox.x2 || !bbox.y2) {
        return { x: 0, y: 0 };
    }
    return {
        x: (bbox.x1 + bbox.x2) / 2,
        y: (bbox.y1 + bbox.y2) / 2
    };
}

/**
 * Calculate distance between two points
 */
function getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Track unique objects across frames using IoU and position
 * Optimized version that uses existing track_id if available from ByteTrack
 * Returns map of trackId -> { class, firstSeen, lastSeen, frames, positions }
 */
function trackObjects(detectionEvents) {
    if (!detectionEvents || !Array.isArray(detectionEvents) || detectionEvents.length === 0) {
        return new Map();
    }

    // OPTIMIZATION: If events already have track_id from ByteTrack, use them directly
    const hasTrackIds = detectionEvents.some(event => 
        event.detectedObjects && event.detectedObjects.some(obj => obj.track_id !== undefined)
    );

    if (hasTrackIds) {
        // Use existing track IDs from ByteTrack - much faster!
        return trackObjectsFromByteTrack(detectionEvents);
    }

    // Fallback to IoU-based tracking for events without track IDs
    const tracks = new Map(); // trackId -> track data
    let nextTrackId = 1;
    const activeTracks = new Map(); // frameIndex -> [trackIds]

    detectionEvents.forEach((event, frameIndex) => {
        try {
            if (!event || !event.detectedObjects || !Array.isArray(event.detectedObjects)) {
                return;
            }

            const currentFrameTracks = [];
            const unmatchedDetections = [];

            // Match detections to existing tracks
            event.detectedObjects.forEach(detection => {
                try {
                    if (!detection || !detection.bbox || !detection.class) return;

                    const detectionCenter = getBboxCenter(detection.bbox);
                    let bestMatch = null;
                    let bestIoU = 0;
                    let bestTrackId = null;

                    // OPTIMIZATION: Limit search to recent frames only (last 5 frames for speed)
                    const searchWindow = Math.min(5, TRACKING_CONFIG.MAX_FRAME_GAP);
                    for (let i = Math.max(0, frameIndex - searchWindow); i < frameIndex; i++) {
                        const prevTracks = activeTracks.get(i) || [];
                        prevTracks.forEach(trackId => {
                            const track = tracks.get(trackId);
                            if (!track || track.class !== detection.class) return;

                            const iou = calculateIoU(detection.bbox, track.lastBbox);
                            const distance = getDistance(detectionCenter, track.lastPosition);
                            const maxDistance = Math.max(
                                (track.lastBbox.x2 - track.lastBbox.x1),
                                (track.lastBbox.y2 - track.lastBbox.y1)
                            ) * TRACKING_CONFIG.MAX_DISTANCE_RATIO;

                            if (iou > TRACKING_CONFIG.IOU_THRESHOLD && distance <= maxDistance) {
                                if (iou > bestIoU) {
                                    bestIoU = iou;
                                    bestMatch = track;
                                    bestTrackId = trackId;
                                }
                            }
                        });
                    }

                    if (bestMatch && bestTrackId) {
                        // Update existing track
                        bestMatch.lastSeen = event.timestamp || frameIndex;
                        bestMatch.frames++;
                        bestMatch.lastBbox = detection.bbox;
                        bestMatch.lastPosition = detectionCenter;
                        // Limit positions to avoid memory issues (keep only last 10)
                        bestMatch.positions.push({
                            frame: frameIndex,
                            timestamp: event.timestamp || frameIndex,
                            bbox: detection.bbox,
                            center: detectionCenter
                        });
                        if (bestMatch.positions.length > 10) {
                            bestMatch.positions = bestMatch.positions.slice(-10);
                        }
                        currentFrameTracks.push(bestTrackId);
                    } else {
                        // New detection - create new track
                        unmatchedDetections.push(detection);
                    }
                } catch (err) {
                    console.warn('Error processing detection:', err);
                }
            });

            // Create new tracks for unmatched detections
            unmatchedDetections.forEach(detection => {
                try {
                    if (!detection || !detection.bbox || !detection.class) return;
                    const trackId = nextTrackId++;
                    const center = getBboxCenter(detection.bbox);
                    const timestamp = event.timestamp || frameIndex;
                    tracks.set(trackId, {
                        trackId,
                        class: (detection.class || '').toLowerCase().trim(),
                        firstSeen: timestamp,
                        lastSeen: timestamp,
                        frames: 1,
                        firstBbox: detection.bbox,
                        lastBbox: detection.bbox,
                        firstPosition: center,
                        lastPosition: center,
                        positions: [{
                            frame: frameIndex,
                            timestamp: timestamp,
                            bbox: detection.bbox,
                            center: center
                        }]
                    });
                    currentFrameTracks.push(trackId);
                } catch (err) {
                    console.warn('Error creating track:', err);
                }
            });

            activeTracks.set(frameIndex, currentFrameTracks);
        } catch (err) {
            console.warn(`Error processing frame ${frameIndex}:`, err);
        }
    });

    // Filter out short tracks
    const validTracks = new Map();
    tracks.forEach((track, trackId) => {
        if (track.frames >= TRACKING_CONFIG.MIN_TRACK_LENGTH) {
            validTracks.set(trackId, track);
        }
    });

    return validTracks;
}

/**
 * Fast tracking using existing ByteTrack IDs
 * This is much faster than IoU-based tracking
 */
function trackObjectsFromByteTrack(detectionEvents) {
    const tracks = new Map(); // trackId -> track data
    
    detectionEvents.forEach((event, frameIndex) => {
        if (!event || !event.detectedObjects || !Array.isArray(event.detectedObjects)) {
            return;
        }

        event.detectedObjects.forEach(detection => {
            if (!detection || !detection.bbox || !detection.class) return;
            
            const trackId = detection.track_id;
            if (trackId === undefined || trackId === null) return;

            const center = getBboxCenter(detection.bbox);
            const timestamp = event.timestamp || frameIndex;

            if (tracks.has(trackId)) {
                // Update existing track
                const track = tracks.get(trackId);
                track.lastSeen = timestamp;
                track.frames++;
                track.lastBbox = detection.bbox;
                track.lastPosition = center;
                // Limit positions to avoid memory issues (keep only last 10)
                track.positions.push({
                    frame: frameIndex,
                    timestamp: timestamp,
                    bbox: detection.bbox,
                    center: center
                });
                if (track.positions.length > 10) {
                    track.positions = track.positions.slice(-10);
                }
            } else {
                // Create new track
                tracks.set(trackId, {
                    trackId,
                    class: (detection.class || '').toLowerCase().trim(),
                    firstSeen: timestamp,
                    lastSeen: timestamp,
                    frames: 1,
                    firstBbox: detection.bbox,
                    lastBbox: detection.bbox,
                    firstPosition: center,
                    lastPosition: center,
                    positions: [{
                        frame: frameIndex,
                        timestamp: timestamp,
                        bbox: detection.bbox,
                        center: center
                    }]
                });
            }
        });
    });

    // Filter out short tracks
    const validTracks = new Map();
    tracks.forEach((track, trackId) => {
        if (track.frames >= TRACKING_CONFIG.MIN_TRACK_LENGTH) {
            validTracks.set(trackId, track);
        }
    });

    return validTracks;
}

/**
 * Count unique vehicles using tracking
 */
function countUniqueVehicles(tracks) {
    let count = 0;
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            count++;
        }
    });
    return count;
}

/**
 * Count unique pedestrians using tracking
 */
function countUniquePedestrians(tracks) {
    let count = 0;
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
            count++;
        }
    });
    return count;
}

/**
 * Calculate traffic flow rate (vehicles per minute/hour)
 */
function calculateTrafficFlowRate(tracks, totalDurationSeconds) {
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    const totalDurationMinutes = totalDurationSeconds / 60;
    const totalDurationHours = totalDurationSeconds / 3600;

    return {
        vehiclesPerMinute: totalDurationMinutes > 0 ? Math.round(vehicleTracks.length / totalDurationMinutes) : 0,
        vehiclesPerHour: totalDurationHours > 0 ? Math.round(vehicleTracks.length / totalDurationHours) : 0,
        totalVehicles: vehicleTracks.length
    };
}

/**
 * Detect pedestrian crossing events (zone-based)
 */
function detectPedestrianCrossings(tracks, detectionEvents) {
    const crossings = [];
    const pedestrianTracks = [];

    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
            pedestrianTracks.push(track);
        }
    });

    // Define crossing zones (assume bottom 30% of frame is road, middle 40% is crossing zone)
    pedestrianTracks.forEach(track => {
        if (track.positions.length < 5) return;

        const firstPos = track.positions[0].center;
        const lastPos = track.positions[track.positions.length - 1].center;

        // Check if pedestrian moved horizontally across the frame (crossing behavior)
        const horizontalMovement = Math.abs(lastPos.x - firstPos.x);
        const verticalMovement = Math.abs(lastPos.y - firstPos.y);

        // Crossing detected if significant horizontal movement
        if (horizontalMovement > 100 && verticalMovement < 200) {
            crossings.push({
                trackId: track.trackId,
                timestamp: track.firstSeen,
                duration: track.lastSeen - track.firstSeen,
                startPosition: firstPos,
                endPosition: lastPos
            });
        }
    });

    return {
        totalCrossings: crossings.length,
        events: crossings.slice(0, 20) // Return top 20 events
    };
}

/**
 * Calculate congestion index (0-100)
 */
function calculateCongestionIndex(tracks, detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) return 0;

    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    // Calculate average vehicles per frame
    const framesWithVehicles = new Set();
    vehicleTracks.forEach(track => {
        track.positions.forEach(pos => {
            framesWithVehicles.add(pos.frame);
        });
    });

    const avgVehiclesPerFrame = framesWithVehicles.size > 0
        ? vehicleTracks.length / framesWithVehicles.size
        : 0;

    // Calculate average dwell time
    const dwellTimes = vehicleTracks.map(track => track.lastSeen - track.firstSeen);
    const avgDwellTime = dwellTimes.length > 0
        ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
        : 0;

    // Congestion index: combination of density and dwell time
    const densityScore = Math.min(100, (avgVehiclesPerFrame / 5) * 100);
    const dwellScore = Math.min(100, (avgDwellTime / 10) * 50);
    const congestionIndex = Math.round((densityScore * 0.6 + dwellScore * 0.4));

    return Math.min(100, Math.max(0, congestionIndex));
}

/**
 * Calculate average vehicle dwell time (seconds)
 */
function calculateAverageDwellTime(tracks) {
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    if (vehicleTracks.length === 0) return 0;

    const dwellTimes = vehicleTracks.map(track => {
        return track.lastSeen - track.firstSeen;
    });

    const avgDwellTime = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
    return Math.round(avgDwellTime * 10) / 10;
}

/**
 * Generate safety alerts (collision risks, violations)
 */
function generateSafetyAlerts(tracks, detectionEvents) {
    const alerts = [];
    const vehicleTracks = [];
    const pedestrianTracks = [];

    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        } else if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
            pedestrianTracks.push(track);
        }
    });

    // Check for near collisions (vehicles and pedestrians in close proximity)
    vehicleTracks.forEach(vehicleTrack => {
        pedestrianTracks.forEach(pedestrianTrack => {
            // Check if they were in the same frame and close together
            vehicleTrack.positions.forEach(vPos => {
                pedestrianTrack.positions.forEach(pPos => {
                    if (vPos.frame === pPos.frame) {
                        const distance = getDistance(vPos.center, pPos.center);
                        if (distance < 150) { // Close proximity threshold
                            alerts.push({
                                type: 'Near Collision Risk',
                                message: `Vehicle and pedestrian in close proximity (${Math.round(distance)}px`,
                                severity: 'high',
                                timestamp: vPos.timestamp,
                                frame: vPos.frame
                            });
                        }
                    }
                });
            });
        });
    });

    // Check for high-speed vehicles (rapid movement)
    vehicleTracks.forEach(track => {
        if (track.positions.length < 3) return;
        const speeds = [];
        for (let i = 1; i < track.positions.length; i++) {
            const prev = track.positions[i - 1];
            const curr = track.positions[i];
            const distance = getDistance(prev.center, curr.center);
            const timeDiff = curr.timestamp - prev.timestamp;
            if (timeDiff > 0) {
                const speed = distance / timeDiff;
                speeds.push(speed);
            }
        }
        const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
        if (avgSpeed > 5) { // High speed threshold
            alerts.push({
                type: 'High Speed Vehicle',
                message: `Vehicle detected moving at high speed`,
                severity: 'medium',
                timestamp: track.firstSeen,
                frame: track.positions[0].frame
            });
        }
    });

    // Check for traffic density alerts
    const congestionIndex = calculateCongestionIndex(tracks, detectionEvents);
    if (congestionIndex > 70) {
        alerts.push({
            type: 'Traffic Congestion',
            message: `High congestion detected (Index: ${congestionIndex})`,
            severity: 'medium',
            timestamp: detectionEvents[detectionEvents.length - 1]?.timestamp || 0,
            frame: detectionEvents.length - 1
        });
    }

    // Sort by severity and timestamp
    alerts.sort((a, b) => {
        if (a.severity === 'high' && b.severity !== 'high') return -1;
        if (a.severity !== 'high' && b.severity === 'high') return 1;
        return b.timestamp - a.timestamp;
    });

    return alerts.slice(0, 20); // Return top 20 alerts
}

/**
 * Calculate vehicle mode distribution
 */
function calculateVehicleModeDistribution(tracks) {
    const distribution = {
        car: 0,
        truck: 0,
        bus: 0,
        motorcycle: 0,
        bicycle: 0,
        other: 0
    };

    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (className.includes('car')) {
            distribution.car++;
        } else if (className.includes('truck')) {
            distribution.truck++;
        } else if (className.includes('bus')) {
            distribution.bus++;
        } else if (className.includes('motorcycle')) {
            distribution.motorcycle++;
        } else if (className.includes('bicycle') || className.includes('bike')) {
            distribution.bicycle++;
        } else if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            distribution.other++;
        }
    });

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) {
        return [];
    }

    return Object.entries(distribution)
        .filter(([_, count]) => count > 0)
        .map(([mode, count]) => ({
            name: mode.charAt(0).toUpperCase() + mode.slice(1),
            value: count,
            percentage: ((count / total) * 100).toFixed(1)
        }))
        .sort((a, b) => b.value - a.value);
}

/**
 * Calculate lane/zone density (simplified: divide frame into zones)
 */
function calculateLaneDensity(tracks, detectionEvents) {
    const zones = {
        top: 0,
        middle: 0,
        bottom: 0
    };

    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    vehicleTracks.forEach(track => {
        track.positions.forEach(pos => {
            const y = pos.center.y;
            // Assume frame height is normalized (0-1) or use actual pixel values
            // For simplicity, divide into thirds
            if (y < 0.33) {
                zones.top++;
            } else if (y < 0.66) {
                zones.middle++;
            } else {
                zones.bottom++;
            }
        });
    });

    return [
        { name: 'Top Zone', count: zones.top },
        { name: 'Middle Zone', count: zones.middle },
        { name: 'Bottom Zone', count: zones.bottom }
    ];
}

/**
 * Calculate signal compliance (simplified: based on vehicle behavior)
 */
function calculateSignalCompliance(tracks, detectionEvents) {
    // Simplified: assume vehicles stopping = compliance, rapid movement = potential violation
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    let compliant = 0;
    let violations = 0;

    vehicleTracks.forEach(track => {
        if (track.positions.length < 2) {
            compliant++;
            return;
        }

        // Check for sudden stops (compliance) vs continuous movement (potential violation)
        const speeds = [];
        for (let i = 1; i < track.positions.length; i++) {
            const prev = track.positions[i - 1];
            const curr = track.positions[i];
            const distance = getDistance(prev.center, curr.center);
            const timeDiff = curr.timestamp - prev.timestamp;
            if (timeDiff > 0) {
                speeds.push(distance / timeDiff);
            }
        }

        const hasStop = speeds.some(speed => speed < 0.5);
        if (hasStop) {
            compliant++;
        } else {
            violations++;
        }
    });

    const total = compliant + violations;
    if (total === 0) {
        return { compliant: 0, violations: 0, complianceRate: 0 };
    }

    return {
        compliant,
        violations,
        complianceRate: Math.round((compliant / total) * 100)
    };
}

/**
 * Calculate directional traffic flow (left, right, up, down)
 */
function calculateDirectionalTrafficFlow(tracks, detectionEvents) {
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    const directions = {
        left: 0,
        right: 0,
        up: 0,
        down: 0,
        stationary: 0
    };

    vehicleTracks.forEach(track => {
        if (track.positions.length < 2) {
            directions.stationary++;
            return;
        }

        const firstPos = track.positions[0].center;
        const lastPos = track.positions[track.positions.length - 1].center;

        const dx = lastPos.x - firstPos.x;
        const dy = lastPos.y - firstPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Minimum movement threshold
        if (distance < 20) {
            directions.stationary++;
            return;
        }

        // Determine primary direction
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal movement
            if (dx > 0) {
                directions.right++;
            } else {
                directions.left++;
            }
        } else {
            // Vertical movement
            if (dy > 0) {
                directions.down++;
            } else {
                directions.up++;
            }
        }
    });

    return {
        left: directions.left,
        right: directions.right,
        up: directions.up,
        down: directions.down,
        stationary: directions.stationary,
        total: Object.values(directions).reduce((a, b) => a + b, 0)
    };
}

/**
 * Detect red light violations
 */
function detectRedLightViolations(tracks, detectionEvents) {
    const violations = [];
    const vehicleTracks = [];
    const trafficLightTracks = [];

    // Separate vehicles and traffic lights
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        } else if (className.includes('traffic light') || className.includes('trafficlight')) {
            trafficLightTracks.push(track);
        }
    });

    // For each traffic light, check for nearby vehicles
    trafficLightTracks.forEach(lightTrack => {
        if (lightTrack.positions.length === 0) return;

        const lightPos = lightTrack.positions[0].center; // Assume traffic light position
        const violationZone = 200; // Pixels - zone around traffic light

        vehicleTracks.forEach(vehicleTrack => {
            // Check if vehicle passed through traffic light zone
            const passedThrough = vehicleTrack.positions.some(pos => {
                const distance = getDistance(pos.center, lightPos);
                return distance < violationZone;
            });

            if (passedThrough) {
                // Check if vehicle was moving (potential violation)
                if (vehicleTrack.positions.length >= 3) {
                    const speeds = [];
                    for (let i = 1; i < vehicleTrack.positions.length; i++) {
                        const prev = vehicleTrack.positions[i - 1];
                        const curr = vehicleTrack.positions[i];
                        const dist = getDistance(prev.center, curr.center);
                        const timeDiff = curr.timestamp - prev.timestamp;
                        if (timeDiff > 0) {
                            speeds.push(dist / timeDiff);
                        }
                    }
                    const avgSpeed = speeds.length > 0 
                        ? speeds.reduce((a, b) => a + b, 0) / speeds.length 
                        : 0;

                    // If vehicle was moving fast near traffic light, potential violation
                    if (avgSpeed > 2) {
                        violations.push({
                            trackId: vehicleTrack.trackId,
                            vehicleClass: vehicleTrack.class,
                            timestamp: vehicleTrack.firstSeen,
                            frame: vehicleTrack.positions[0].frame,
                            speed: avgSpeed,
                            severity: avgSpeed > 5 ? 'high' : 'medium'
                        });
                    }
                }
            }
        });
    });

    return {
        totalViolations: violations.length,
        violations: violations.slice(0, 20) // Return top 20
    };
}

/**
 * Calculate traffic flow trend over time
 */
function calculateTrafficFlowTrend(tracks, detectionEvents, timeWindowSeconds = 30) {
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    if (detectionEvents.length === 0) return [];

    const firstTimestamp = detectionEvents[0].timestamp || 0;
    const lastTimestamp = detectionEvents[detectionEvents.length - 1].timestamp || 0;
    const totalDuration = lastTimestamp - firstTimestamp;

    const timeBins = {};
    vehicleTracks.forEach(track => {
        const bin = Math.floor((track.firstSeen - firstTimestamp) / timeWindowSeconds);
        if (!timeBins[bin]) {
            timeBins[bin] = 0;
        }
        timeBins[bin]++;
    });

    const trendData = [];
    const maxBin = Math.floor(totalDuration / timeWindowSeconds);
    for (let bin = 0; bin <= maxBin; bin++) {
        const timeLabel = `${Math.floor((bin * timeWindowSeconds) / 60)}:${String((bin * timeWindowSeconds) % 60).padStart(2, '0')}`;
        trendData.push({
            time: timeLabel,
            vehicles: timeBins[bin] || 0
        });
    }

    return trendData;
}

/**
 * Calculate pedestrian crossing timeline
 */
function calculatePedestrianCrossingTimeline(crossingEvents, detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) return [];

    const firstTimestamp = detectionEvents[0].timestamp || 0;
    const timeWindowSeconds = 30;
    const timeBins = {};

    crossingEvents.forEach(event => {
        const bin = Math.floor((event.timestamp - firstTimestamp) / timeWindowSeconds);
        if (!timeBins[bin]) {
            timeBins[bin] = 0;
        }
        timeBins[bin]++;
    });

    const timeline = [];
    const lastTimestamp = detectionEvents[detectionEvents.length - 1].timestamp || 0;
    const maxBin = Math.floor((lastTimestamp - firstTimestamp) / timeWindowSeconds);

    for (let bin = 0; bin <= maxBin; bin++) {
        const timeLabel = `${Math.floor((bin * timeWindowSeconds) / 60)}:${String((bin * timeWindowSeconds) % 60).padStart(2, '0')}`;
        timeline.push({
            time: timeLabel,
            crossings: timeBins[bin] || 0
        });
    }

    return timeline;
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return {
            avgLatency: 0,
            minLatency: 0,
            maxLatency: 0,
            fps: 0,
            latencyData: []
        };
    }

    const inferenceTimes = [];
    detectionEvents.forEach(event => {
        if (event.inferenceTimeMs && event.inferenceTimeMs > 0) {
            inferenceTimes.push(event.inferenceTimeMs);
        }
    });

    const totalDuration = (detectionEvents[detectionEvents.length - 1].timestamp || 0) - (detectionEvents[0].timestamp || 0);
    const fps = totalDuration > 0 ? detectionEvents.length / totalDuration : 0;

    const avgLatency = inferenceTimes.length > 0
        ? Math.round((inferenceTimes.reduce((a, b) => a + b, 0) / inferenceTimes.length) * 10) / 10
        : 0;

    const minLatency = inferenceTimes.length > 0 ? Math.min(...inferenceTimes) : 0;
    const maxLatency = inferenceTimes.length > 0 ? Math.max(...inferenceTimes) : 0;

    // Prepare latency trend data
    const latencyData = [];
    const timeWindowSeconds = 10;
    const timeBins = {};

    detectionEvents.forEach(event => {
        if (event.inferenceTimeMs && event.inferenceTimeMs > 0) {
            const bin = Math.floor((event.timestamp || 0) / timeWindowSeconds);
            if (!timeBins[bin]) {
                timeBins[bin] = [];
            }
            timeBins[bin].push(event.inferenceTimeMs);
        }
    });

    Object.keys(timeBins).forEach(bin => {
        const avg = timeBins[bin].reduce((a, b) => a + b, 0) / timeBins[bin].length;
        latencyData.push({
            time: `${parseInt(bin) * timeWindowSeconds}s`,
            latency: Math.round(avg * 10) / 10
        });
    });

    return {
        avgLatency,
        minLatency,
        maxLatency,
        fps: Math.round(fps * 10) / 10,
        latencyData: latencyData.sort((a, b) => parseInt(a.time) - parseInt(b.time))
    };
}

/**
 * Calculate lane utilization (entry vs exit counts)
 */
function calculateLaneUtilization(tracks, detectionEvents) {
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    // Define entry/exit zones (left/right edges of frame)
    const frameWidth = 1920; // Assume standard width, will be adjusted
    const entryZone = frameWidth * 0.1; // Left 10%
    const exitZone = frameWidth * 0.9; // Right 90%

    let entryCount = 0;
    let exitCount = 0;

    vehicleTracks.forEach(track => {
        if (track.positions.length < 2) return;
        const firstPos = track.positions[0].center;
        const lastPos = track.positions[track.positions.length - 1].center;

        // Entry: starts in entry zone
        if (firstPos.x < entryZone) {
            entryCount++;
        }
        // Exit: ends in exit zone
        if (lastPos.x > exitZone) {
            exitCount++;
        }
    });

    return { entryCount, exitCount, total: entryCount + exitCount };
}

/**
 * Calculate traffic jam duration and idle vehicle ratio
 */
function calculateCongestionIntelligence(tracks, detectionEvents) {
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    let idleVehicles = 0;
    let totalJamDuration = 0;
    const jamPeriods = [];

    vehicleTracks.forEach(track => {
        if (track.positions.length < 3) return;

        // Calculate speeds
        const speeds = [];
        for (let i = 1; i < track.positions.length; i++) {
            const prev = track.positions[i - 1];
            const curr = track.positions[i];
            const dist = getDistance(prev.center, curr.center);
            const timeDiff = curr.timestamp - prev.timestamp;
            if (timeDiff > 0) {
                speeds.push(dist / timeDiff);
            }
        }

        const avgSpeed = speeds.length > 0 
            ? speeds.reduce((a, b) => a + b, 0) / speeds.length 
            : 0;

        // Idle: speed < 0.5 pixels per second
        if (avgSpeed < 0.5) {
            idleVehicles++;
            const dwellTime = track.lastSeen - track.firstSeen;
            totalJamDuration += dwellTime;
            jamPeriods.push({
                trackId: track.trackId,
                duration: dwellTime,
                startTime: track.firstSeen
            });
        }
    });

    const idleRatio = vehicleTracks.length > 0 
        ? (idleVehicles / vehicleTracks.length) * 100 
        : 0;

    return {
        idleVehicleRatio: Math.round(idleRatio * 10) / 10,
        totalJamDuration: Math.round(totalJamDuration),
        jamPeriods: jamPeriods.slice(0, 10),
        idleVehicles,
        totalVehicles: vehicleTracks.length
    };
}

/**
 * Detect jaywalking (pedestrians crossing outside designated zones)
 */
function detectJaywalking(tracks, detectionEvents) {
    const pedestrianTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
            pedestrianTracks.push(track);
        }
    });

    const jaywalkingEvents = [];
    // Assume bottom 30% is road zone
    const roadZoneStart = 0.7; // 70% from top = bottom 30%

    pedestrianTracks.forEach(track => {
        if (track.positions.length < 3) return;

        // Check if pedestrian was in road zone
        const inRoadZone = track.positions.some(pos => {
            // Normalize y position (assuming frame height)
            const normalizedY = pos.center.y / 1080; // Assume 1080p
            return normalizedY > roadZoneStart;
        });

        if (inRoadZone) {
            // Check for horizontal movement (crossing)
            const firstPos = track.positions[0].center;
            const lastPos = track.positions[track.positions.length - 1].center;
            const horizontalMovement = Math.abs(lastPos.x - firstPos.x);

            if (horizontalMovement > 50) {
                jaywalkingEvents.push({
                    trackId: track.trackId,
                    timestamp: track.firstSeen,
                    frame: track.positions[0].frame,
                    distance: horizontalMovement,
                    severity: horizontalMovement > 200 ? 'high' : 'medium'
                });
            }
        }
    });

    return {
        totalJaywalking: jaywalkingEvents.length,
        events: jaywalkingEvents.slice(0, 20)
    };
}

/**
 * Detect vehicle clustering (traffic jams)
 */
function detectVehicleClustering(tracks, detectionEvents) {
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    const clusters = [];
    const clusterThreshold = 100; // pixels

    // Find clusters of vehicles at similar positions
    vehicleTracks.forEach((track, idx) => {
        if (track.positions.length === 0) return;

        const currentPos = track.positions[track.positions.length - 1].center;
        const nearbyVehicles = vehicleTracks.filter((otherTrack, otherIdx) => {
            if (idx === otherIdx || otherTrack.positions.length === 0) return false;
            const otherPos = otherTrack.positions[otherTrack.positions.length - 1].center;
            const distance = getDistance(currentPos, otherPos);
            return distance < clusterThreshold;
        });

        if (nearbyVehicles.length >= 2) {
            clusters.push({
                center: currentPos,
                vehicleCount: nearbyVehicles.length + 1,
                timestamp: track.lastSeen
            });
        }
    });

    // Remove duplicate clusters
    const uniqueClusters = [];
    clusters.forEach(cluster => {
        const isDuplicate = uniqueClusters.some(uc => {
            const dist = getDistance(uc.center, cluster.center);
            return dist < clusterThreshold;
        });
        if (!isDuplicate) {
            uniqueClusters.push(cluster);
        }
    });

    return {
        totalClusters: uniqueClusters.length,
        clusters: uniqueClusters.slice(0, 10),
        maxClusterSize: uniqueClusters.length > 0 
            ? Math.max(...uniqueClusters.map(c => c.vehicleCount))
            : 0
    };
}

/**
 * Detect crowd gathering zones
 */
function detectCrowdGatheringZones(tracks, detectionEvents) {
    const pedestrianTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
            pedestrianTracks.push(track);
        }
    });

    const gatheringZones = [];
    const zoneThreshold = 150; // pixels

    // Find zones with multiple pedestrians
    pedestrianTracks.forEach((track, idx) => {
        if (track.positions.length === 0) return;

        const currentPos = track.positions[track.positions.length - 1].center;
        const nearbyPedestrians = pedestrianTracks.filter((otherTrack, otherIdx) => {
            if (idx === otherIdx || otherTrack.positions.length === 0) return false;
            const otherPos = otherTrack.positions[otherTrack.positions.length - 1].center;
            const distance = getDistance(currentPos, otherPos);
            return distance < zoneThreshold;
        });

        if (nearbyPedestrians.length >= 2) {
            gatheringZones.push({
                center: currentPos,
                pedestrianCount: nearbyPedestrians.length + 1,
                timestamp: track.lastSeen
            });
        }
    });

    // Remove duplicates
    const uniqueZones = [];
    gatheringZones.forEach(zone => {
        const isDuplicate = uniqueZones.some(uz => {
            const dist = getDistance(uz.center, zone.center);
            return dist < zoneThreshold;
        });
        if (!isDuplicate) {
            uniqueZones.push(zone);
        }
    });

    return {
        totalZones: uniqueZones.length,
        zones: uniqueZones.slice(0, 10),
        maxCrowdSize: uniqueZones.length > 0 
            ? Math.max(...uniqueZones.map(z => z.pedestrianCount))
            : 0
    };
}

/**
 * Calculate infrastructure interaction
 */
function calculateInfrastructureInteraction(tracks, detectionEvents) {
    const infrastructureTracks = [];
    const vehicleTracks = [];
    const pedestrianTracks = [];

    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (className.includes('traffic light') || className.includes('stop sign') || className.includes('parking meter')) {
            infrastructureTracks.push(track);
        } else if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        } else if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
            pedestrianTracks.push(track);
        }
    });

    const interactions = {
        trafficLights: {
            detected: infrastructureTracks.filter(t => t.class.includes('traffic light')).length,
            interactions: 0
        },
        stopSigns: {
            detected: infrastructureTracks.filter(t => t.class.includes('stop sign')).length,
            interactions: 0
        },
        parkingMeters: {
            detected: infrastructureTracks.filter(t => t.class.includes('parking meter')).length,
            interactions: 0
        }
    };

    // Count interactions (vehicles/pedestrians near infrastructure)
    infrastructureTracks.forEach(infraTrack => {
        if (infraTrack.positions.length === 0) return;
        const infraPos = infraTrack.positions[0].center;
        const interactionRadius = 200;

        const nearbyVehicles = vehicleTracks.filter(vTrack => {
            if (vTrack.positions.length === 0) return false;
            const vPos = vTrack.positions[vTrack.positions.length - 1].center;
            return getDistance(infraPos, vPos) < interactionRadius;
        });

        const nearbyPedestrians = pedestrianTracks.filter(pTrack => {
            if (pTrack.positions.length === 0) return false;
            const pPos = pTrack.positions[pTrack.positions.length - 1].center;
            return getDistance(infraPos, pPos) < interactionRadius;
        });

        if (infraTrack.class.includes('traffic light')) {
            interactions.trafficLights.interactions += nearbyVehicles.length;
        } else if (infraTrack.class.includes('stop sign')) {
            interactions.stopSigns.interactions += nearbyVehicles.length;
        } else if (infraTrack.class.includes('parking meter')) {
            interactions.parkingMeters.interactions += nearbyPedestrians.length;
        }
    });

    return interactions;
}

/**
 * Calculate hourly traffic patterns
 */
function calculateHourlyTrafficPatterns(tracks, detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) return [];

    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    const hourlyData = {};
    vehicleTracks.forEach(track => {
        // Convert timestamp to hour (0-23)
        const hour = Math.floor((track.firstSeen % 86400) / 3600);
        if (!hourlyData[hour]) {
            hourlyData[hour] = 0;
        }
        hourlyData[hour]++;
    });

    // Fill in all 24 hours
    const pattern = [];
    for (let hour = 0; hour < 24; hour++) {
        pattern.push({
            hour: hour,
            vehicles: hourlyData[hour] || 0
        });
    }

    return pattern;
}

/**
 * Calculate day vs night density
 */
function calculateDayNightDensity(tracks, detectionEvents) {
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    let dayVehicles = 0;
    let nightVehicles = 0;

    vehicleTracks.forEach(track => {
        const hour = Math.floor((track.firstSeen % 86400) / 3600);
        // Day: 6 AM to 8 PM (6-20)
        if (hour >= 6 && hour < 20) {
            dayVehicles++;
        } else {
            nightVehicles++;
        }
    });

    return {
        day: dayVehicles,
        night: nightVehicles,
        dayPercentage: vehicleTracks.length > 0 
            ? Math.round((dayVehicles / vehicleTracks.length) * 100) 
            : 0
    };
}

/**
 * Calculate density heatmap data
 */
function calculateDensityHeatmap(tracks, detectionEvents, gridSize = 10) {
    const vehicleTracks = [];
    tracks.forEach(track => {
        const className = track.class.toLowerCase();
        if (VEHICLE_CLASSES.some(v => className.includes(v))) {
            vehicleTracks.push(track);
        }
    });

    // Create grid (assume 1920x1080 frame)
    const grid = {};
    const cellWidth = 1920 / gridSize;
    const cellHeight = 1080 / gridSize;

    vehicleTracks.forEach(track => {
        track.positions.forEach(pos => {
            const gridX = Math.floor(pos.center.x / cellWidth);
            const gridY = Math.floor(pos.center.y / cellHeight);
            const key = `${gridX},${gridY}`;
            if (!grid[key]) {
                grid[key] = { x: gridX, y: gridY, count: 0 };
            }
            grid[key].count++;
        });
    });

    return Object.values(grid).map(cell => ({
        x: cell.x,
        y: cell.y,
        density: cell.count
    }));
}

/**
 * Main analytics computation function
 */
function computeAnalytics(detectionEvents) {
    try {
        if (!detectionEvents || !Array.isArray(detectionEvents) || detectionEvents.length === 0) {
        return {
            kpis: {
                uniqueVehicles: 0,
                trafficFlowRate: { vehiclesPerMinute: 0, vehiclesPerHour: 0 },
                pedestrianCrossings: 0,
                congestionIndex: 0,
                avgDwellTime: 0,
                activeAlerts: 0
            },
            tracks: [],
            vehicleModeDistribution: [],
            laneDensity: [],
            signalCompliance: { compliant: 0, violations: 0, complianceRate: 0 },
            directionalFlow: {},
            redLightViolations: {},
            laneUtilization: {},
            congestionIntelligence: {},
            jaywalking: {},
            vehicleClustering: {},
            crowdGathering: {},
            infrastructureInteraction: {},
            hourlyPatterns: [],
            dayNightDensity: {},
            densityHeatmap: [],
            trafficFlowTrend: [],
            pedestrianCrossingTimeline: [],
            safetyAlerts: [],
            performanceMetrics: {
                avgLatency: 0,
                fps: 0,
                latencyData: []
            }
        };
    }

    // Track objects across frames
    const tracks = trackObjects(detectionEvents);

    // Calculate duration
    const firstEvent = detectionEvents[0];
    const lastEvent = detectionEvents[detectionEvents.length - 1];
    const totalDurationSeconds = (lastEvent.timestamp || 0) - (firstEvent.timestamp || 0) || 1;

    // Calculate all metrics
    const uniqueVehicles = countUniqueVehicles(tracks);
    const uniquePedestrians = countUniquePedestrians(tracks);
    const trafficFlowRate = calculateTrafficFlowRate(tracks, totalDurationSeconds);
    const pedestrianCrossings = detectPedestrianCrossings(tracks, detectionEvents);
    const congestionIndex = calculateCongestionIndex(tracks, detectionEvents);
    const avgDwellTime = calculateAverageDwellTime(tracks);
    const safetyAlerts = generateSafetyAlerts(tracks, detectionEvents);
    const vehicleModeDistribution = calculateVehicleModeDistribution(tracks);
    const laneDensity = calculateLaneDensity(tracks, detectionEvents);
    const signalCompliance = calculateSignalCompliance(tracks, detectionEvents);
    const directionalFlow = calculateDirectionalTrafficFlow(tracks, detectionEvents);
    const redLightViolations = detectRedLightViolations(tracks, detectionEvents);
    const laneUtilization = calculateLaneUtilization(tracks, detectionEvents);
    const congestionIntelligence = calculateCongestionIntelligence(tracks, detectionEvents);
    const jaywalking = detectJaywalking(tracks, detectionEvents);
    const vehicleClustering = detectVehicleClustering(tracks, detectionEvents);
    const crowdGathering = detectCrowdGatheringZones(tracks, detectionEvents);
    const infrastructureInteraction = calculateInfrastructureInteraction(tracks, detectionEvents);
    const hourlyPatterns = calculateHourlyTrafficPatterns(tracks, detectionEvents);
    const dayNightDensity = calculateDayNightDensity(tracks, detectionEvents);
    const densityHeatmap = calculateDensityHeatmap(tracks, detectionEvents, 10);
    const trafficFlowTrend = calculateTrafficFlowTrend(tracks, detectionEvents, 30);
    const pedestrianCrossingTimeline = calculatePedestrianCrossingTimeline(pedestrianCrossings.events, detectionEvents);
    const performanceMetrics = calculatePerformanceMetrics(detectionEvents);

    // Convert tracks Map to serializable format (array of track summaries)
    const tracksArray = Array.from(tracks.values()).map(track => ({
        trackId: track.trackId,
        class: track.class,
        firstSeen: track.firstSeen,
        lastSeen: track.lastSeen,
        frames: track.frames
    }));

    return {
        kpis: {
            uniqueVehicles,
            uniquePedestrians,
            trafficFlowRate,
            pedestrianCrossings: pedestrianCrossings.totalCrossings,
            congestionIndex,
            avgDwellTime,
            activeAlerts: safetyAlerts.length,
            redLightViolations: redLightViolations.totalViolations
        },
        tracks: tracksArray, // Serialized tracks
        vehicleModeDistribution,
        laneDensity,
        signalCompliance,
        directionalFlow,
        redLightViolations,
        laneUtilization,
        congestionIntelligence,
        jaywalking,
        vehicleClustering,
        crowdGathering,
        infrastructureInteraction,
        hourlyPatterns,
        dayNightDensity,
        densityHeatmap,
        trafficFlowTrend,
        pedestrianCrossingTimeline,
        safetyAlerts,
        performanceMetrics,
        // Legacy support for backward compatibility
        classFrequency: Array.from(tracks.values()).reduce((acc, track) => {
            const className = track.class;
            if (!acc[className]) acc[className] = 0;
            acc[className]++;
            return acc;
        }, {}),
        detectionFrequency: trafficFlowTrend.map(item => ({
            time: item.time,
            detections: item.vehicles,
            uniqueClasses: 1
        }))
    };
    } catch (err) {
        console.error('Error computing analytics:', err);
        // Return safe default structure on error
        return {
            kpis: {
                uniqueVehicles: 0,
                uniquePedestrians: 0,
                trafficFlowRate: { vehiclesPerMinute: 0, vehiclesPerHour: 0 },
                pedestrianCrossings: 0,
                congestionIndex: 0,
                avgDwellTime: 0,
                activeAlerts: 0,
                redLightViolations: 0
            },
            tracks: [],
            vehicleModeDistribution: [],
            laneDensity: [],
            signalCompliance: { compliant: 0, violations: 0, complianceRate: 0 },
            directionalFlow: {},
            redLightViolations: {},
            laneUtilization: {},
            congestionIntelligence: {},
            jaywalking: {},
            vehicleClustering: {},
            crowdGathering: {},
            infrastructureInteraction: {},
            hourlyPatterns: [],
            dayNightDensity: {},
            densityHeatmap: [],
            trafficFlowTrend: [],
            pedestrianCrossingTimeline: [],
            safetyAlerts: [],
            performanceMetrics: {
                avgLatency: 0,
                fps: 0,
                latencyData: []
            },
            classFrequency: {},
            detectionFrequency: []
        };
    }
}

module.exports = {
    computeAnalytics,
    trackObjects,
    trackObjectsFromByteTrack,
    countUniqueVehicles,
    countUniquePedestrians,
    calculateTrafficFlowRate,
    detectPedestrianCrossings,
    calculateCongestionIndex,
    calculateAverageDwellTime,
    generateSafetyAlerts,
    calculateVehicleModeDistribution,
    calculateLaneDensity,
    calculateSignalCompliance,
    calculateDirectionalTrafficFlow,
    detectRedLightViolations,
    calculateLaneUtilization,
    calculateCongestionIntelligence,
    detectJaywalking,
    detectVehicleClustering,
    detectCrowdGatheringZones,
    calculateInfrastructureInteraction,
    calculateHourlyTrafficPatterns,
    calculateDayNightDensity,
    calculateDensityHeatmap,
    calculateTrafficFlowTrend,
    calculatePerformanceMetrics
};
