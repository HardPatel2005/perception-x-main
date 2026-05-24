/**
 * Wildlife & Livestock Detection-Based Analytics Engine
 * Computes analytics for animal monitoring from raw detection data
 */

// Wildlife-relevant classes
const WILDLIFE_CLASSES = ['elephant', 'giraffe', 'zebra', 'bear', 'horse', 'cow', 'sheep', 'dog', 'cat', 'bird'];
const LARGE_ANIMALS = ['elephant', 'giraffe', 'zebra', 'bear', 'horse', 'cow'];
const SMALL_ANIMALS = ['sheep', 'dog', 'cat', 'bird'];
const PREDATORS = ['bear'];
const LIVESTOCK = ['cow', 'sheep', 'horse'];
const PETS = ['dog', 'cat'];
const WILD_ANIMALS = ['elephant', 'giraffe', 'zebra', 'bear', 'bird'];

// Density thresholds
const DENSITY_THRESHOLDS = {
    animal: { low: 2, moderate: 5, high: 10 },
    livestock: { low: 2, moderate: 4, high: 8 }
};

function isWildlifeRelevant(className) {
    const cl = (className || '').toLowerCase();
    return WILDLIFE_CLASSES.some(w => cl.includes(w));
}

/**
 * Calculate scene overview for wildlife
 */
function calculateSceneOverview(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return {
            totalAnimals: 0,
            largeAnimals: 0,
            smallAnimals: 0,
            predators: 0,
            livestock: 0,
            pets: 0,
            wildAnimals: 0,
            avgAnimalsPerFrame: 0,
            peakAnimals: 0,
            peakAnimalTimestamp: null,
            totalFrames: 0,
            animalActivityLevel: 'Very Low',
            animalActivityScore: 0,
            mostCommonSpecies: 'N/A',
            mostCommonSpeciesCount: 0,
            mostCommonSpeciesPercentage: '0',
            speciesDiversity: 0,
            currentFrame: { totalAnimals: 0, largeAnimals: 0, smallAnimals: 0, predators: 0 }
        };
    }

    let totalAnimals = 0;
    let framesWithData = 0;
    let framesWithAnimals = 0;
    const speciesCounts = {};

    // Current frame
    const currentFrame = detectionEvents[detectionEvents.length - 1];
    let currentAnimals = 0, currentLarge = 0, currentSmall = 0, currentPredators = 0;
    if (currentFrame && currentFrame.detectedObjects) {
        currentFrame.detectedObjects.forEach(obj => {
            const cn = (obj.class || '').toLowerCase();
            if (WILDLIFE_CLASSES.some(w => cn.includes(w))) {
                currentAnimals++;
                if (LARGE_ANIMALS.some(a => cn.includes(a))) currentLarge++;
                if (SMALL_ANIMALS.some(a => cn.includes(a))) currentSmall++;
                if (PREDATORS.some(a => cn.includes(a))) currentPredators++;
            }
        });
    }

    // Process all frames
    let peakAnimals = 0;
    let peakAnimalTimestamp = null;
    const animalCountsMode = {};

    detectionEvents.forEach(event => {
        if (event.detectedObjects && Array.isArray(event.detectedObjects) && event.detectedObjects.length > 0) {
            framesWithData++;
            let frameAnimals = 0;

            event.detectedObjects.forEach(obj => {
                const cn = (obj.class || '').toLowerCase();
                if (WILDLIFE_CLASSES.some(w => cn.includes(w))) {
                    frameAnimals++;
                    totalAnimals++;
                    // Count species
                    const species = WILDLIFE_CLASSES.find(w => cn.includes(w)) || cn;
                    speciesCounts[species] = (speciesCounts[species] || 0) + 1;
                }
            });

            if (frameAnimals > 0) framesWithAnimals++;
            animalCountsMode[frameAnimals] = (animalCountsMode[frameAnimals] || 0) + 1;

            if (frameAnimals > peakAnimals) {
                peakAnimals = frameAnimals;
                let ts = event.timestamp;
                if (ts && ts > 1000000) ts = ts / 1000;
                peakAnimalTimestamp = ts || null;
            }
        }
    });

    const totalFrames = detectionEvents.length;
    const avgAnimalsPerFrame = framesWithData > 0 ? totalAnimals / framesWithData : 0;

    // MODE for unique count
    const animalMode = Object.keys(animalCountsMode).reduce((a, b) =>
        animalCountsMode[a] > animalCountsMode[b] ? a : b, '0'
    );
    const estimatedUniqueAnimals = parseInt(animalMode) || Math.round(avgAnimalsPerFrame);

    // Species counts for unique estimate
    let totalLarge = 0, totalSmall = 0, totalPredators = 0, totalLivestock = 0, totalPets = 0, totalWild = 0;
    Object.entries(speciesCounts).forEach(([species, count]) => {
        if (LARGE_ANIMALS.includes(species)) totalLarge += count;
        if (SMALL_ANIMALS.includes(species)) totalSmall += count;
        if (PREDATORS.includes(species)) totalPredators += count;
        if (LIVESTOCK.includes(species)) totalLivestock += count;
        if (PETS.includes(species)) totalPets += count;
        if (WILD_ANIMALS.includes(species)) totalWild += count;
    });

    // Most common species
    const sortedSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]);
    const mostCommon = sortedSpecies[0];

    // Activity level
    const animalDetectionFrequency = totalFrames > 0 ? Math.round((framesWithAnimals / totalFrames) * 100) : 0;
    let animalActivityLevel = 'Very Low';
    if (avgAnimalsPerFrame >= 3 && animalDetectionFrequency >= 50) animalActivityLevel = 'Very High';
    else if (avgAnimalsPerFrame >= 2 && animalDetectionFrequency >= 40) animalActivityLevel = 'High';
    else if (avgAnimalsPerFrame >= 1.5 && animalDetectionFrequency >= 25) animalActivityLevel = 'Moderate';
    else if (avgAnimalsPerFrame >= 0.5) animalActivityLevel = 'Low';

    const densityScore = Math.min(avgAnimalsPerFrame * 20, 100);
    const animalActivityScore = Math.round((animalDetectionFrequency * 0.6 + densityScore * 0.4));

    return {
        totalAnimals: estimatedUniqueAnimals,
        largeAnimals: Math.round(framesWithData > 0 ? totalLarge / framesWithData : 0),
        smallAnimals: Math.round(framesWithData > 0 ? totalSmall / framesWithData : 0),
        predators: Math.round(framesWithData > 0 ? totalPredators / framesWithData : 0),
        livestock: Math.round(framesWithData > 0 ? totalLivestock / framesWithData : 0),
        pets: Math.round(framesWithData > 0 ? totalPets / framesWithData : 0),
        wildAnimals: Math.round(framesWithData > 0 ? totalWild / framesWithData : 0),
        avgAnimalsPerFrame: Math.round(avgAnimalsPerFrame * 10) / 10,
        peakAnimals,
        peakAnimalTimestamp,
        totalFrames,
        framesWithAnimals,
        animalDetectionFrequency,
        animalActivityLevel,
        animalActivityScore,
        mostCommonSpecies: mostCommon ? mostCommon[0].charAt(0).toUpperCase() + mostCommon[0].slice(1) : 'N/A',
        mostCommonSpeciesCount: mostCommon ? mostCommon[1] : 0,
        mostCommonSpeciesPercentage: mostCommon && totalAnimals > 0 ? ((mostCommon[1] / totalAnimals) * 100).toFixed(1) : '0',
        speciesDiversity: Object.keys(speciesCounts).length,
        totalAnimalDetections: totalAnimals,
        currentFrame: {
            totalAnimals: currentAnimals,
            largeAnimals: currentLarge,
            smallAnimals: currentSmall,
            predators: currentPredators
        }
    };
}

/**
 * Calculate scene density for wildlife
 */
function calculateSceneDensity(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return {
            frames: [],
            animalDensityLevel: 'Very Low',
            avgAnimalDensity: 0,
            videoDurationSeconds: 0,
            totalFrames: 0
        };
    }

    const densityFrames = [];
    let totalAnimalCount = 0;
    const sampleRate = Math.max(1, Math.floor(detectionEvents.length / 100));

    for (let i = 0; i < detectionEvents.length; i += sampleRate) {
        const event = detectionEvents[i];
        let animalCount = 0;
        let livestockCount = 0;
        let wildCount = 0;

        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const cn = (obj.class || '').toLowerCase();
                if (WILDLIFE_CLASSES.some(w => cn.includes(w))) {
                    animalCount++;
                    if (LIVESTOCK.some(l => cn.includes(l))) livestockCount++;
                    if (WILD_ANIMALS.some(w => cn.includes(w))) wildCount++;
                }
            });
        }

        totalAnimalCount += animalCount;
        densityFrames.push({
            frame: i,
            timestamp: event.timestamp || null,
            totalAnimals: animalCount,
            livestock: livestockCount,
            wild: wildCount
        });
    }

    const sampledFramesCount = densityFrames.length;
    const avgAnimalDensity = sampledFramesCount > 0 ? totalAnimalCount / sampledFramesCount : 0;

    let animalDensityLevel = 'Very Low';
    if (avgAnimalDensity >= DENSITY_THRESHOLDS.animal.high) animalDensityLevel = 'Very High';
    else if (avgAnimalDensity >= DENSITY_THRESHOLDS.animal.moderate) animalDensityLevel = 'High';
    else if (avgAnimalDensity >= DENSITY_THRESHOLDS.animal.low) animalDensityLevel = 'Moderate';
    else if (avgAnimalDensity >= 1) animalDensityLevel = 'Low';

    let videoDurationSeconds = 0;
    if (detectionEvents.length > 0) {
        const first = detectionEvents[0].timestamp || 0;
        const last = detectionEvents[detectionEvents.length - 1].timestamp || 0;
        if (last > first && last > 1000) videoDurationSeconds = (last - first) / 1000;
        else if (last > first) videoDurationSeconds = last - first;
        else videoDurationSeconds = detectionEvents.length / 30;
    }

    return {
        frames: densityFrames,
        animalDensityLevel,
        avgAnimalDensity: Math.round(avgAnimalDensity * 10) / 10,
        videoDurationSeconds,
        totalFrames: detectionEvents.length
    };
}

/**
 * Calculate species distribution
 */
function calculateSpeciesDistribution(detectionEvents) {
    const distribution = {};
    WILDLIFE_CLASSES.forEach(cls => { distribution[cls] = 0; });

    detectionEvents.forEach(event => {
        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const cn = (obj.class || '').toLowerCase();
                const species = WILDLIFE_CLASSES.find(w => cn.includes(w));
                if (species) distribution[species]++;
            });
        }
    });

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    return Object.entries(distribution)
        .filter(([_, count]) => count > 0)
        .map(([species, count]) => ({
            name: species.charAt(0).toUpperCase() + species.slice(1),
            value: count,
            percentage: ((count / total) * 100).toFixed(1)
        }))
        .sort((a, b) => b.value - a.value);
}

/**
 * Calculate temporal trends for wildlife
 */
function calculateTemporalTrends(detectionEvents, timeWindowSeconds = 60) {
    if (!detectionEvents || detectionEvents.length === 0) return [];

    const firstTimestamp = detectionEvents[0].timestamp || 0;
    const timeBins = {};
    const sampleRate = Math.max(1, Math.floor(detectionEvents.length / 100));

    for (let i = 0; i < detectionEvents.length; i += sampleRate) {
        const event = detectionEvents[i];
        const bin = Math.floor((event.timestamp - firstTimestamp) / timeWindowSeconds);

        if (!timeBins[bin]) {
            timeBins[bin] = { livestock: 0, wild: 0, pets: 0 };
        }

        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const cn = (obj.class || '').toLowerCase();
                if (LIVESTOCK.some(l => cn.includes(l))) timeBins[bin].livestock++;
                else if (WILD_ANIMALS.some(w => cn.includes(w))) timeBins[bin].wild++;
                else if (PETS.some(p => cn.includes(p))) timeBins[bin].pets++;
            });
        }
    }

    const trends = [];
    const maxBin = Math.max(...Object.keys(timeBins).map(Number), 0);
    for (let bin = 0; bin <= maxBin; bin++) {
        const timeLabel = `${Math.floor((bin * timeWindowSeconds) / 60)}:${String((bin * timeWindowSeconds) % 60).padStart(2, '0')}`;
        trends.push({
            time: timeLabel,
            livestock: timeBins[bin]?.livestock || 0,
            wild: timeBins[bin]?.wild || 0,
            pets: timeBins[bin]?.pets || 0
        });
    }
    return trends;
}

/**
 * Calculate confidence analytics
 */
function calculateConfidenceAnalytics(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return { avgConfidence: 0, avgConfidenceByClass: {}, confidenceTrend: [], lowConfidenceCount: 0 };
    }

    const confidenceByClass = {};
    const confidenceTrend = [];
    let totalConfidence = 0, confidenceCount = 0, lowConfidenceCount = 0;
    const trendSampleRate = Math.max(1, Math.floor(detectionEvents.length / 30));

    for (let i = 0; i < detectionEvents.length; i++) {
        const event = detectionEvents[i];
        let frameConfidence = 0, frameConfidenceCount = 0;

        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const conf = obj.confidence || 0;
                const cn = (obj.class || '').toLowerCase();
                if (!WILDLIFE_CLASSES.some(w => cn.includes(w))) return;

                if (conf > 0) {
                    totalConfidence += conf;
                    confidenceCount++;
                    frameConfidence += conf;
                    frameConfidenceCount++;
                    if (conf < 0.5) lowConfidenceCount++;

                    if (!confidenceByClass[cn]) confidenceByClass[cn] = { sum: 0, count: 0 };
                    confidenceByClass[cn].sum += conf;
                    confidenceByClass[cn].count++;
                }
            });
        }

        if (i % trendSampleRate === 0 && frameConfidenceCount > 0) {
            confidenceTrend.push({
                frame: i,
                timestamp: event.timestamp || i,
                avgConfidence: frameConfidence / frameConfidenceCount
            });
        }
    }

    const avgConfidence = confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 1000) / 1000 : 0;
    const avgConfidenceByClass = {};
    Object.keys(confidenceByClass).forEach(cn => {
        const data = confidenceByClass[cn];
        avgConfidenceByClass[cn] = data.count > 0 ? Math.round((data.sum / data.count) * 1000) / 1000 : 0;
    });

    return { avgConfidence, avgConfidenceByClass, confidenceTrend: confidenceTrend.slice(0, 50), lowConfidenceCount };
}

/**
 * Generate wildlife alerts
 */
function generateAlerts(detectionEvents) {
    const alerts = [];
    const HERD_THRESHOLD = 5;
    const PREDATOR_ALERT = true;
    const alertSampleRate = Math.max(1, Math.floor(detectionEvents.length / 500));
    let previousAnimalCount = 0;

    for (let fi = 0; fi < detectionEvents.length; fi += alertSampleRate) {
        const event = detectionEvents[fi];
        let animalCount = 0, predatorCount = 0;

        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const cn = (obj.class || '').toLowerCase();
                if (WILDLIFE_CLASSES.some(w => cn.includes(w))) {
                    animalCount++;
                    if (PREDATORS.some(p => cn.includes(p))) predatorCount++;
                }
            });
        }

        if (animalCount > HERD_THRESHOLD) {
            alerts.push({
                type: 'Large Herd Detected',
                message: `${animalCount} animals detected in frame ${fi} (threshold: ${HERD_THRESHOLD})`,
                severity: 'medium',
                timestamp: event.timestamp || fi,
                frame: fi
            });
        }

        if (predatorCount > 0) {
            alerts.push({
                type: 'Predator Alert',
                message: `Predator detected in frame ${fi}`,
                severity: 'high',
                timestamp: event.timestamp || fi,
                frame: fi
            });
        }

        const spike = animalCount - previousAnimalCount;
        if (spike > 5) {
            alerts.push({
                type: 'Sudden Animal Influx',
                message: `Animal count increased by ${spike} in frame ${fi}`,
                severity: 'medium',
                timestamp: event.timestamp || fi,
                frame: fi
            });
        }

        previousAnimalCount = animalCount;
    }

    alerts.sort((a, b) => {
        if (a.severity === 'high' && b.severity !== 'high') return -1;
        if (a.severity !== 'high' && b.severity === 'high') return 1;
        return b.timestamp - a.timestamp;
    });

    return alerts.slice(0, 20);
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return { avgLatency: 0, minLatency: 0, maxLatency: 0, fps: 0, detectionThroughput: 0, latencyTrend: [] };
    }

    const inferenceTimes = [];
    detectionEvents.forEach(event => {
        if (event.inferenceTimeMs && event.inferenceTimeMs > 0) inferenceTimes.push(event.inferenceTimeMs);
    });

    const totalDuration = (detectionEvents[detectionEvents.length - 1].timestamp || 0) - (detectionEvents[0].timestamp || 0);
    const fps = totalDuration > 0 ? detectionEvents.length / totalDuration : 0;
    const detectionThroughput = totalDuration > 0 ? Math.round((detectionEvents.length / totalDuration) * 60) : 0;
    const avgLatency = inferenceTimes.length > 0 ? Math.round((inferenceTimes.reduce((a, b) => a + b, 0) / inferenceTimes.length) * 10) / 10 : 0;

    const latencyTrend = [];
    for (let i = 0; i < detectionEvents.length; i += 10) {
        const event = detectionEvents[i];
        if (event && event.inferenceTimeMs && event.inferenceTimeMs > 0) {
            latencyTrend.push({ frame: i, timestamp: event.timestamp || i, latency: event.inferenceTimeMs });
        }
    }

    return {
        avgLatency,
        minLatency: inferenceTimes.length > 0 ? Math.min(...inferenceTimes) : 0,
        maxLatency: inferenceTimes.length > 0 ? Math.max(...inferenceTimes) : 0,
        fps: Math.round(fps * 10) / 10,
        detectionThroughput,
        latencyTrend: latencyTrend.slice(0, 50)
    };
}

/**
 * Main wildlife analytics computation
 */
function computeWildlifeAnalytics(detectionEvents) {
    try {
        if (!detectionEvents || !Array.isArray(detectionEvents) || detectionEvents.length === 0) {
            return {
                sceneOverview: calculateSceneOverview([]),
                sceneDensity: calculateSceneDensity([]),
                speciesDistribution: [],
                temporalTrends: [],
                confidenceAnalytics: calculateConfidenceAnalytics([]),
                alerts: [],
                performanceMetrics: calculatePerformanceMetrics([])
            };
        }

        const MAX_EVENTS = 300;
        const eventsToProcess = detectionEvents.length > MAX_EVENTS
            ? detectionEvents.slice(0, MAX_EVENTS)
            : detectionEvents;

        console.log(`🐾 Computing wildlife analytics for ${eventsToProcess.length} events...`);
        const startTime = Date.now();

        const sceneOverview = calculateSceneOverview(eventsToProcess);
        const sceneDensity = calculateSceneDensity(eventsToProcess);
        const speciesDistribution = calculateSpeciesDistribution(eventsToProcess);
        const temporalTrends = calculateTemporalTrends(eventsToProcess, 60);
        const confidenceAnalytics = calculateConfidenceAnalytics(eventsToProcess);
        const alerts = generateAlerts(eventsToProcess);
        const performanceMetrics = calculatePerformanceMetrics(eventsToProcess);

        console.log(`✅ Wildlife analytics computed in ${Date.now() - startTime}ms`);

        return {
            sceneOverview,
            sceneDensity,
            speciesDistribution,
            temporalTrends,
            confidenceAnalytics,
            alerts,
            performanceMetrics
        };
    } catch (err) {
        console.error('❌ Error computing wildlife analytics:', err);
        return {
            sceneOverview: calculateSceneOverview([]),
            sceneDensity: calculateSceneDensity([]),
            speciesDistribution: [],
            temporalTrends: [],
            confidenceAnalytics: calculateConfidenceAnalytics([]),
            alerts: [],
            performanceMetrics: calculatePerformanceMetrics([])
        };
    }
}

module.exports = {
    computeWildlifeAnalytics,
    WILDLIFE_CLASSES,
    isWildlifeRelevant
};
