/**
 * Restaurant & Kitchen Detection-Based Analytics Engine
 * Computes analytics for restaurant/kitchen monitoring from raw detection data
 */

const FOOD_CLASSES     = ['pizza', 'hot dog', 'donut', 'sandwich', 'cake', 'banana', 'broccoli', 'carrot', 'orange', 'apple'];
const UTENSIL_CLASSES  = ['fork', 'knife', 'spoon', 'bowl', 'cup', 'wine glass', 'bottle'];
const APPLIANCE_CLASSES = ['microwave', 'oven', 'toaster', 'refrigerator', 'sink'];
const FURNITURE_CLASSES = ['dining table', 'chair'];
const PERSON_CLASSES   = ['person'];
const ALL_RESTAURANT_CLASSES = [...FOOD_CLASSES, ...UTENSIL_CLASSES, ...APPLIANCE_CLASSES, ...FURNITURE_CLASSES];

const DENSITY_THRESHOLDS = {
    food:     { low: 2, moderate: 5, high: 10 },
    utensils: { low: 2, moderate: 4, high: 8  }
};

function isRestaurantRelevant(className) {
    const cl = (className || '').toLowerCase();
    return [...ALL_RESTAURANT_CLASSES, ...PERSON_CLASSES].some(r => cl.includes(r));
}

/** Helper – count persons / chairs / tables / remotes + category buckets */
function getFrameCounts(detectedObjects) {
    let persons = 0, chairs = 0, tables = 0, remotes = 0;
    let food = 0, utensils = 0, appliances = 0, furniture = 0;
    if (!detectedObjects || !Array.isArray(detectedObjects)) {
        return { persons, chairs, tables, remotes, food, utensils, appliances, furniture };
    }
    detectedObjects.forEach(obj => {
        const cn = (obj.class || '').toLowerCase();
        if (cn.includes('person'))            persons++;
        else if (cn.includes('chair'))        { chairs++; furniture++; }
        else if (cn.includes('dining table')) { tables++; furniture++; }
        else if (cn.includes('remote'))       remotes++;
        else if (FOOD_CLASSES.some(f => cn.includes(f)))      food++;
        else if (UTENSIL_CLASSES.some(u => cn.includes(u)))   utensils++;
        else if (APPLIANCE_CLASSES.some(a => cn.includes(a))) appliances++;
    });
    return { persons, chairs, tables, remotes, food, utensils, appliances, furniture };
}

/* ═══════════════════════════════════════════════════════════════════
   1. SCENE OVERVIEW
═══════════════════════════════════════════════════════════════════ */
function calculateSceneOverview(detectionEvents) {
    const empty = {
        totalItems: 0, foodItems: 0, utensils: 0, appliances: 0, furniture: 0,
        avgItemsPerFrame: 0, peakItems: 0, peakItemTimestamp: null, totalFrames: 0,
        kitchenActivityLevel: 'Very Low', kitchenActivityScore: 0,
        mostCommonItem: 'N/A', mostCommonItemCount: 0, mostCommonItemPercentage: '0',
        itemDiversity: 0, tableOccupancy: 0,
        peakPersons: 0, avgPersonsPerFrame: 0, overcrowdingEvents: 0, avgSeatFillRate: 0,
        avgInferenceTimeMs: 0, mostDetectedFoodItem: 'N/A',
        mostDetectedObjectExcludingPeopleFurniture: 'N/A',
        currentFrame: { totalItems: 0, foodItems: 0, utensils: 0, appliances: 0, persons: 0 }
    };
    if (!detectionEvents || detectionEvents.length === 0) return empty;

    let totalItems = 0, framesWithData = 0, framesWithItems = 0;
    const itemCounts = {};
    let peakItems = 0, peakItemTimestamp = null;
    let totalFood = 0, totalUtensils = 0, totalAppliances = 0, totalFurniture = 0;
    let framesWithTable = 0;
    const itemCountsMode = {};

    // Person / seat tracking
    let maxPersonsInFrame = 0, overcrowdingEvents = 0, totalPersonsAll = 0;
    const seatFillRates = [];
    let totalInferenceMs = 0, inferenceCount = 0;

    // Current-frame snapshot
    const curEvent = detectionEvents[detectionEvents.length - 1];
    let curTotal = 0, curFood = 0, curUtensils = 0, curAppliances = 0, curPersons = 0;
    if (curEvent && curEvent.detectedObjects) {
        curEvent.detectedObjects.forEach(obj => {
            const cn = (obj.class || '').toLowerCase();
            if (cn.includes('person')) { curPersons++; return; }
            if (ALL_RESTAURANT_CLASSES.some(r => cn.includes(r))) {
                curTotal++;
                if (FOOD_CLASSES.some(f => cn.includes(f))) curFood++;
                if (UTENSIL_CLASSES.some(u => cn.includes(u))) curUtensils++;
                if (APPLIANCE_CLASSES.some(a => cn.includes(a))) curAppliances++;
            }
        });
    }

    detectionEvents.forEach(event => {
        if (event.inferenceTimeMs && event.inferenceTimeMs > 0) {
            totalInferenceMs += event.inferenceTimeMs;
            inferenceCount++;
        }
        if (!event.detectedObjects || !Array.isArray(event.detectedObjects) || event.detectedObjects.length === 0) return;

        framesWithData++;
        let frameItems = 0, hasTable = false;
        let framePersons = 0, frameChairs = 0;

        event.detectedObjects.forEach(obj => {
            const cn = (obj.class || '').toLowerCase();
            if (cn.includes('person')) { framePersons++; totalPersonsAll++; return; }
            if (cn.includes('chair'))  { frameChairs++; }
            if (ALL_RESTAURANT_CLASSES.some(r => cn.includes(r))) {
                frameItems++; totalItems++;
                const item = ALL_RESTAURANT_CLASSES.find(r => cn.includes(r)) || cn;
                itemCounts[item] = (itemCounts[item] || 0) + 1;
                if (FOOD_CLASSES.some(f => cn.includes(f)))      totalFood++;
                if (UTENSIL_CLASSES.some(u => cn.includes(u)))   totalUtensils++;
                if (APPLIANCE_CLASSES.some(a => cn.includes(a))) totalAppliances++;
                if (FURNITURE_CLASSES.some(f => cn.includes(f))) totalFurniture++;
                if (cn.includes('dining table')) hasTable = true;
            }
        });

        if (frameItems > 0) framesWithItems++;
        if (hasTable) framesWithTable++;
        itemCountsMode[frameItems] = (itemCountsMode[frameItems] || 0) + 1;
        if (frameItems > peakItems) {
            peakItems = frameItems;
            let ts = event.timestamp;
            if (ts && ts > 1000000) ts = ts / 1000;
            peakItemTimestamp = ts || null;
        }
        if (framePersons > maxPersonsInFrame) maxPersonsInFrame = framePersons;
        if (framePersons > 4) overcrowdingEvents++;
        if (frameChairs > 0) seatFillRates.push(Math.min((framePersons / frameChairs) * 100, 200));
    });

    const totalFrames = detectionEvents.length;
    const avgItemsPerFrame = framesWithData > 0 ? totalItems / framesWithData : 0;
    const itemMode = Object.keys(itemCountsMode).reduce((a, b) => itemCountsMode[a] > itemCountsMode[b] ? a : b, '0');
    const estimatedUniqueItems = parseInt(itemMode) || Math.round(avgItemsPerFrame);

    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const mostCommon = sortedItems[0];
    const foodSorted = sortedItems.filter(([item]) => FOOD_CLASSES.includes(item));
    const mostDetectedFoodItem = foodSorted[0]
        ? foodSorted[0][0].charAt(0).toUpperCase() + foodSorted[0][0].slice(1) : 'N/A';
    const nonFurnitureItems = sortedItems.filter(([item]) => !FURNITURE_CLASSES.includes(item));
    const mostDetectedObjectExcludingPeopleFurniture = nonFurnitureItems[0]
        ? nonFurnitureItems[0][0].charAt(0).toUpperCase() + nonFurnitureItems[0][0].slice(1) : 'N/A';

    const itemDetectionFrequency = totalFrames > 0 ? Math.round((framesWithItems / totalFrames) * 100) : 0;
    let kitchenActivityLevel = 'Very Low';
    if (avgItemsPerFrame >= 4 && itemDetectionFrequency >= 50) kitchenActivityLevel = 'Very High';
    else if (avgItemsPerFrame >= 3 && itemDetectionFrequency >= 40) kitchenActivityLevel = 'High';
    else if (avgItemsPerFrame >= 2 && itemDetectionFrequency >= 25) kitchenActivityLevel = 'Moderate';
    else if (avgItemsPerFrame >= 0.5) kitchenActivityLevel = 'Low';

    const densityScore = Math.min(avgItemsPerFrame * 15, 100);
    const kitchenActivityScore = Math.round((itemDetectionFrequency * 0.6 + densityScore * 0.4));
    const tableOccupancy = totalFrames > 0 ? Math.round((framesWithTable / totalFrames) * 100) : 0;
    const avgSeatFillRate = seatFillRates.length > 0
        ? Math.round(seatFillRates.reduce((a, b) => a + b, 0) / seatFillRates.length) : 0;
    const avgInferenceTimeMs = inferenceCount > 0 ? Math.round(totalInferenceMs / inferenceCount) : 0;

    return {
        totalItems: estimatedUniqueItems,
        foodItems:    Math.round(framesWithData > 0 ? totalFood / framesWithData : 0),
        utensils:     Math.round(framesWithData > 0 ? totalUtensils / framesWithData : 0),
        appliances:   Math.round(framesWithData > 0 ? totalAppliances / framesWithData : 0),
        furniture:    Math.round(framesWithData > 0 ? totalFurniture / framesWithData : 0),
        avgItemsPerFrame: Math.round(avgItemsPerFrame * 10) / 10,
        peakItems, peakItemTimestamp, totalFrames, framesWithItems, itemDetectionFrequency,
        kitchenActivityLevel, kitchenActivityScore,
        mostCommonItem: mostCommon ? mostCommon[0].charAt(0).toUpperCase() + mostCommon[0].slice(1) : 'N/A',
        mostCommonItemCount: mostCommon ? mostCommon[1] : 0,
        mostCommonItemPercentage: mostCommon && totalItems > 0 ? ((mostCommon[1] / totalItems) * 100).toFixed(1) : '0',
        itemDiversity: Object.keys(itemCounts).length,
        tableOccupancy, totalItemDetections: totalItems,
        totalFoodDetections: totalFood, totalUtensilDetections: totalUtensils, totalApplianceDetections: totalAppliances,
        // ── NEW occupancy / person fields ──
        peakPersons: maxPersonsInFrame,
        avgPersonsPerFrame: totalFrames > 0 ? Math.round(totalPersonsAll / totalFrames * 10) / 10 : 0,
        overcrowdingEvents,
        avgSeatFillRate,
        avgInferenceTimeMs,
        mostDetectedFoodItem,
        mostDetectedObjectExcludingPeopleFurniture,
        currentFrame: { totalItems: curTotal, foodItems: curFood, utensils: curUtensils, appliances: curAppliances, persons: curPersons }
    };
}

/* ═══════════════════════════════════════════════════════════════════
   2. SCENE DENSITY (per-frame sampled, now includes persons/chairs/tables)
═══════════════════════════════════════════════════════════════════ */
function calculateSceneDensity(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return { frames: [], itemDensityLevel: 'Very Low', avgItemDensity: 0, videoDurationSeconds: 0, totalFrames: 0 };
    }
    const densityFrames = [];
    let totalItemCount = 0;
    const sampleRate = Math.max(1, Math.floor(detectionEvents.length / 100));

    for (let i = 0; i < detectionEvents.length; i += sampleRate) {
        const event = detectionEvents[i];
        const { persons, chairs, tables, food, utensils, appliances } = getFrameCounts(event.detectedObjects);
        const total = food + utensils + appliances;
        totalItemCount += total;
        densityFrames.push({
            frame: event.frameId !== undefined ? event.frameId : i,
            timestamp: event.timestamp || null,
            totalItems: total, food, utensils, appliances,
            persons, chairs, tables
        });
    }

    const sampledCount = densityFrames.length;
    const avgItemDensity = sampledCount > 0 ? totalItemCount / sampledCount : 0;
    let itemDensityLevel = 'Very Low';
    if (avgItemDensity >= DENSITY_THRESHOLDS.food.high)     itemDensityLevel = 'Very High';
    else if (avgItemDensity >= DENSITY_THRESHOLDS.food.moderate) itemDensityLevel = 'High';
    else if (avgItemDensity >= DENSITY_THRESHOLDS.food.low) itemDensityLevel = 'Moderate';
    else if (avgItemDensity >= 1)                           itemDensityLevel = 'Low';

    let videoDurationSeconds = 0;
    if (detectionEvents.length > 0) {
        const first = detectionEvents[0].timestamp || 0;
        const last  = detectionEvents[detectionEvents.length - 1].timestamp || 0;
        if (last > first && last > 1000) videoDurationSeconds = (last - first) / 1000;
        else if (last > first) videoDurationSeconds = last - first;
        else videoDurationSeconds = detectionEvents.length / 30;
    }
    return { frames: densityFrames, itemDensityLevel, avgItemDensity: Math.round(avgItemDensity * 10) / 10, videoDurationSeconds, totalFrames: detectionEvents.length };
}

/* ═══════════════════════════════════════════════════════════════════
   3. OCCUPANCY DATA – per-frame persons / chairs / tables / fill-rate
═══════════════════════════════════════════════════════════════════ */
function calculateOccupancyData(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) return [];
    const sampleRate = Math.max(1, Math.floor(detectionEvents.length / 150));
    const data = [];
    for (let i = 0; i < detectionEvents.length; i += sampleRate) {
        const event = detectionEvents[i];
        const { persons, chairs, tables } = getFrameCounts(event.detectedObjects);
        const seatFillRate = chairs > 0 ? Math.min(Math.round((persons / chairs) * 100), 200) : (persons > 0 ? 100 : 0);
        data.push({
            frame: event.frameId !== undefined ? event.frameId : i,
            persons, chairs, tables,
            seatFillRate,
            inferenceMs: Math.round((event.inferenceTimeMs || 0) * 10) / 10
        });
    }
    return data;
}

/* ═══════════════════════════════════════════════════════════════════
   4. INFERENCE HISTOGRAM
═══════════════════════════════════════════════════════════════════ */
function calculateInferenceHistogram(detectionEvents) {
    const bins = [
        { bin: '<50ms',    min: 0,   max: 50,       count: 0 },
        { bin: '50-75ms',  min: 50,  max: 75,        count: 0 },
        { bin: '75-100ms', min: 75,  max: 100,       count: 0 },
        { bin: '100-150ms',min: 100, max: 150,       count: 0 },
        { bin: '>150ms',   min: 150, max: Infinity,  count: 0 }
    ];
    detectionEvents.forEach(event => {
        const ms = event.inferenceTimeMs || 0;
        if (ms > 0) {
            const bin = bins.find(b => ms >= b.min && ms < b.max);
            if (bin) bin.count++;
        }
    });
    return bins.map(({ bin, count }) => ({ bin, count }));
}

/* ═══════════════════════════════════════════════════════════════════
   5. ANOMALY TIMELINE
═══════════════════════════════════════════════════════════════════ */
function calculateAnomalyTimeline(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) return [];
    const sampleRate = Math.max(1, Math.floor(detectionEvents.length / 80));
    return detectionEvents
        .filter((_, i) => i % sampleRate === 0)
        .map((event, idx) => {
            const { persons, chairs, food } = getFrameCounts(event.detectedObjects);
            let status = 'empty';
            if (persons > 4)                   status = 'overcrowded';
            else if (persons > 2)              status = 'busy';
            else if (persons > 0 || food > 2)  status = 'normal';
            return {
                frame: event.frameId !== undefined ? event.frameId : idx * sampleRate,
                status, persons, chairs, foodItems: food,
                timestamp: event.timestamp || 0
            };
        });
}

/* ═══════════════════════════════════════════════════════════════════
   6. RAW FRAMES DATA (for table)
═══════════════════════════════════════════════════════════════════ */
function calculateFramesData(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) return [];
    const sampleRate = Math.max(1, Math.floor(detectionEvents.length / 120));
    return detectionEvents
        .filter((_, i) => i % sampleRate === 0)
        .map((event, idx) => {
            const { persons, chairs, tables, remotes } = getFrameCounts(event.detectedObjects);
            return {
                frame: event.frameId !== undefined ? event.frameId : idx * sampleRate,
                persons, chairs, tables, remotes,
                inferenceMs: Math.round((event.inferenceTimeMs || 0) * 10) / 10,
                isAnomaly: persons > 4
            };
        });
}

/* ═══════════════════════════════════════════════════════════════════
   7. ITEM DISTRIBUTION
═══════════════════════════════════════════════════════════════════ */
function calculateItemDistribution(detectionEvents) {
    const distribution = {};
    ALL_RESTAURANT_CLASSES.forEach(cls => { distribution[cls] = 0; });
    detectionEvents.forEach(event => {
        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const cn = (obj.class || '').toLowerCase();
                const item = ALL_RESTAURANT_CLASSES.find(r => cn.includes(r));
                if (item) distribution[item]++;
            });
        }
    });
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Object.entries(distribution)
        .filter(([_, count]) => count > 0)
        .map(([item, count]) => ({
            name: item.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            value: count,
            percentage: ((count / total) * 100).toFixed(1),
            category: FOOD_CLASSES.includes(item) ? 'Food' :
                      UTENSIL_CLASSES.includes(item) ? 'Utensil' :
                      APPLIANCE_CLASSES.includes(item) ? 'Appliance' : 'Furniture'
        }))
        .sort((a, b) => b.value - a.value);
}

/* ═══════════════════════════════════════════════════════════════════
   8. CATEGORY DISTRIBUTION
═══════════════════════════════════════════════════════════════════ */
function calculateCategoryDistribution(detectionEvents) {
    let food = 0, utensils = 0, appliances = 0, furniture = 0;
    detectionEvents.forEach(event => {
        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const cn = (obj.class || '').toLowerCase();
                if (FOOD_CLASSES.some(f => cn.includes(f)))      food++;
                else if (UTENSIL_CLASSES.some(u => cn.includes(u)))   utensils++;
                else if (APPLIANCE_CLASSES.some(a => cn.includes(a))) appliances++;
                else if (FURNITURE_CLASSES.some(f => cn.includes(f))) furniture++;
            });
        }
    });
    const total = food + utensils + appliances + furniture;
    if (total === 0) return [];
    const result = [];
    if (food > 0)      result.push({ name: 'Food Items',  value: food,      percentage: ((food / total) * 100).toFixed(1) });
    if (utensils > 0)  result.push({ name: 'Utensils',    value: utensils,  percentage: ((utensils / total) * 100).toFixed(1) });
    if (appliances > 0)result.push({ name: 'Appliances',  value: appliances,percentage: ((appliances / total) * 100).toFixed(1) });
    if (furniture > 0) result.push({ name: 'Furniture',   value: furniture, percentage: ((furniture / total) * 100).toFixed(1) });
    return result.sort((a, b) => b.value - a.value);
}

/* ═══════════════════════════════════════════════════════════════════
   9. TEMPORAL TRENDS
═══════════════════════════════════════════════════════════════════ */
function calculateTemporalTrends(detectionEvents, timeWindowSeconds = 60) {
    if (!detectionEvents || detectionEvents.length === 0) return [];
    const firstTimestamp = detectionEvents[0].timestamp || 0;
    const timeBins = {};
    const sampleRate = Math.max(1, Math.floor(detectionEvents.length / 100));
    for (let i = 0; i < detectionEvents.length; i += sampleRate) {
        const event = detectionEvents[i];
        const bin = Math.floor((event.timestamp - firstTimestamp) / timeWindowSeconds);
        if (!timeBins[bin]) timeBins[bin] = { food: 0, utensils: 0, appliances: 0 };
        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const cn = (obj.class || '').toLowerCase();
                if (FOOD_CLASSES.some(f => cn.includes(f)))      timeBins[bin].food++;
                else if (UTENSIL_CLASSES.some(u => cn.includes(u)))   timeBins[bin].utensils++;
                else if (APPLIANCE_CLASSES.some(a => cn.includes(a))) timeBins[bin].appliances++;
            });
        }
    }
    const maxBin = Math.max(...Object.keys(timeBins).map(Number), 0);
    return Array.from({ length: maxBin + 1 }, (_, bin) => ({
        time: `${Math.floor((bin * timeWindowSeconds) / 60)}:${String((bin * timeWindowSeconds) % 60).padStart(2, '0')}`,
        food:      timeBins[bin]?.food      || 0,
        utensils:  timeBins[bin]?.utensils  || 0,
        appliances:timeBins[bin]?.appliances|| 0
    }));
}

/* ═══════════════════════════════════════════════════════════════════
   10. CONFIDENCE ANALYTICS
═══════════════════════════════════════════════════════════════════ */
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
        let frameConf = 0, frameConfCount = 0;
        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const conf = obj.confidence || 0;
                const cn   = (obj.class || '').toLowerCase();
                if (![...ALL_RESTAURANT_CLASSES, ...PERSON_CLASSES].some(r => cn.includes(r))) return;
                if (conf > 0) {
                    totalConfidence += conf; confidenceCount++;
                    frameConf += conf; frameConfCount++;
                    if (conf < 0.5) lowConfidenceCount++;
                    if (!confidenceByClass[cn]) confidenceByClass[cn] = { sum: 0, count: 0 };
                    confidenceByClass[cn].sum += conf;
                    confidenceByClass[cn].count++;
                }
            });
        }
        if (i % trendSampleRate === 0 && frameConfCount > 0) {
            confidenceTrend.push({ frame: i, timestamp: event.timestamp || i, avgConfidence: frameConf / frameConfCount });
        }
    }
    const avgConfidence = confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 1000) / 1000 : 0;
    const avgConfidenceByClass = {};
    Object.keys(confidenceByClass).forEach(cn => {
        const d = confidenceByClass[cn];
        avgConfidenceByClass[cn] = d.count > 0 ? Math.round((d.sum / d.count) * 1000) / 1000 : 0;
    });
    return { avgConfidence, avgConfidenceByClass, confidenceTrend: confidenceTrend.slice(0, 50), lowConfidenceCount };
}

/* ═══════════════════════════════════════════════════════════════════
   11. ALERTS  (overcrowding + food events)
═══════════════════════════════════════════════════════════════════ */
function generateAlerts(detectionEvents) {
    const alerts = [];
    const alertSampleRate = Math.max(1, Math.floor(detectionEvents.length / 500));
    let previousFoodCount = 0;

    for (let fi = 0; fi < detectionEvents.length; fi += alertSampleRate) {
        const event = detectionEvents[fi];
        const { persons, food, utensils, tables } = getFrameCounts(event.detectedObjects);

        if (persons > 4) {
            alerts.push({ type: 'Overcrowded', severity: 'high',
                message: `${persons} people in frame ${fi} — overcrowding threshold exceeded`,
                timestamp: event.timestamp || fi, frame: fi });
        }
        if (persons === 0 && tables > 0 && food === 0) {
            alerts.push({ type: 'Empty Restaurant', severity: 'low',
                message: `No people or food detected at frame ${fi}`,
                timestamp: event.timestamp || fi, frame: fi });
        }
        if (food > 5) {
            alerts.push({ type: 'High Food Activity', severity: 'medium',
                message: `${food} food items detected in frame ${fi}`,
                timestamp: event.timestamp || fi, frame: fi });
        }
        if (tables > 0 && utensils === 0 && food > 0) {
            alerts.push({ type: 'Missing Utensils', severity: 'low',
                message: `Food on table but no utensils in frame ${fi}`,
                timestamp: event.timestamp || fi, frame: fi });
        }
        const spike = food - previousFoodCount;
        if (spike > 3) {
            alerts.push({ type: 'Food Spike', severity: 'medium',
                message: `Food count spiked by ${spike} in frame ${fi}`,
                timestamp: event.timestamp || fi, frame: fi });
        }
        previousFoodCount = food;
    }

    alerts.sort((a, b) => {
        if (a.severity === 'high' && b.severity !== 'high') return -1;
        if (a.severity !== 'high' && b.severity === 'high') return 1;
        return b.timestamp - a.timestamp;
    });
    return alerts.slice(0, 25);
}

/* ═══════════════════════════════════════════════════════════════════
   12. PERFORMANCE METRICS
═══════════════════════════════════════════════════════════════════ */
function calculatePerformanceMetrics(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return { avgLatency: 0, minLatency: 0, maxLatency: 0, fps: 0, detectionThroughput: 0, latencyTrend: [] };
    }
    const inferenceTimes = detectionEvents
        .filter(e => e.inferenceTimeMs && e.inferenceTimeMs > 0)
        .map(e => e.inferenceTimeMs);

    const first = detectionEvents[0].timestamp || 0;
    const last  = detectionEvents[detectionEvents.length - 1].timestamp || 0;
    const totalDuration = last - first;
    const fps = totalDuration > 0 ? detectionEvents.length / totalDuration : 0;
    const detectionThroughput = totalDuration > 0 ? Math.round((detectionEvents.length / totalDuration) * 60) : 0;
    const avgLatency = inferenceTimes.length > 0
        ? Math.round((inferenceTimes.reduce((a, b) => a + b, 0) / inferenceTimes.length) * 10) / 10 : 0;

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

/* ═══════════════════════════════════════════════════════════════════
   MAIN ENTRY POINT
═══════════════════════════════════════════════════════════════════ */
function computeRestaurantAnalytics(detectionEvents) {
    try {
        if (!detectionEvents || !Array.isArray(detectionEvents) || detectionEvents.length === 0) {
            return {
                sceneOverview: calculateSceneOverview([]),
                sceneDensity: calculateSceneDensity([]),
                occupancyData: [], inferenceHistogram: calculateInferenceHistogram([]),
                anomalyTimeline: [], framesData: [],
                itemDistribution: [], categoryDistribution: [],
                temporalTrends: [], confidenceAnalytics: calculateConfidenceAnalytics([]),
                alerts: [], performanceMetrics: calculatePerformanceMetrics([])
            };
        }

        const MAX_EVENTS = 300;
        const eventsToProcess = detectionEvents.length > MAX_EVENTS
            ? detectionEvents.slice(0, MAX_EVENTS) : detectionEvents;

        console.log(`🍽️ Computing restaurant analytics for ${eventsToProcess.length} events...`);
        const t0 = Date.now();

        const result = {
            sceneOverview:       calculateSceneOverview(eventsToProcess),
            sceneDensity:        calculateSceneDensity(eventsToProcess),
            occupancyData:       calculateOccupancyData(eventsToProcess),
            inferenceHistogram:  calculateInferenceHistogram(eventsToProcess),
            anomalyTimeline:     calculateAnomalyTimeline(eventsToProcess),
            framesData:          calculateFramesData(eventsToProcess),
            itemDistribution:    calculateItemDistribution(eventsToProcess),
            categoryDistribution:calculateCategoryDistribution(eventsToProcess),
            temporalTrends:      calculateTemporalTrends(eventsToProcess, 60),
            confidenceAnalytics: calculateConfidenceAnalytics(eventsToProcess),
            alerts:              generateAlerts(eventsToProcess),
            performanceMetrics:  calculatePerformanceMetrics(eventsToProcess)
        };

        console.log(`✅ Restaurant analytics computed in ${Date.now() - t0}ms`);
        return result;
    } catch (err) {
        console.error('❌ Error computing restaurant analytics:', err);
        return {
            sceneOverview: calculateSceneOverview([]),
            sceneDensity: calculateSceneDensity([]),
            occupancyData: [], inferenceHistogram: [], anomalyTimeline: [], framesData: [],
            itemDistribution: [], categoryDistribution: [],
            temporalTrends: [], confidenceAnalytics: calculateConfidenceAnalytics([]),
            alerts: [], performanceMetrics: calculatePerformanceMetrics([])
        };
    }
}

module.exports = { computeRestaurantAnalytics, ALL_RESTAURANT_CLASSES, isRestaurantRelevant };
