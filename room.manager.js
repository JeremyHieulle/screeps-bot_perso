const heatmap = require('room.heatmap');
const visual = require('room.visual');

function getExistingStructures(room) {

    if (!room.memory._structureCache || Game.time % 50 === 0) {

        const built = {};
        const sites = {};

        const structures = room.find(FIND_STRUCTURES);
        for (const s of structures) {
            if (!built[s.structureType]) built[s.structureType] = [];
            built[s.structureType].push({ x: s.pos.x, y: s.pos.y });
        }

        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        for (const s of constructionSites) {
            if (!sites[s.structureType]) sites[s.structureType] = [];
            sites[s.structureType].push({ x: s.pos.x, y: s.pos.y });
        }

        room.memory._structureCache = { built, sites };
    }

    return room.memory._structureCache;
}

function canBuild(room, type, planned, existing) {

    const built = existing.built[type] || [];
    const sites = existing.sites[type] || [];
    const rcl = room.controller.level;

    const alreadyBuilt = built.some(p => p.x === planned.x && p.y === planned.y);
    if (alreadyBuilt) return false;

    const alreadyPlanned = sites.some(p => p.x === planned.x && p.y === planned.y);
    if (alreadyPlanned) return false;

    const dependencies = planned.dependsOn || [];

    for (const dep of dependencies) {

        const depBuilt = existing.built[dep] || [];

        if (depBuilt.length === 0) return false;
    }

    const max = CONTROLLER_STRUCTURES[type]?.[rcl] || 0;

    const current = built.length + sites.length;

    return current < max;
}

function getCandidates(room) {

    const plan = room.memory.plan?.structures;
    if (!plan) return [];

    const existing = getExistingStructures(room);

    const candidates = [];

    const myRCL = room.controller.level;
    function addCandidate(room, type, planned, meta = {}) {    

        if (!planned) return;
        if (!canBuild(room, type, planned, existing)) return;

        candidates.push({
            type,
            x: planned.x,
            y: planned.y,
            meta
        });
    }

    // 1. structures générales
    for (const type in plan) {
        if (type === 'road') continue;

        const entries = plan[type];
        if (!entries) continue;

        const list = Array.isArray(entries)
            ? entries
            : Object.values(entries).flat(2);

        for (const p of list || []) {
            addCandidate(room, type, p);
        }
    }

    // 2. priorités
    const controllerContainer = room.memory.plan?.controller?.container;
    addCandidate(room, STRUCTURE_CONTAINER, controllerContainer, { critical: true });

    const sources = room.memory.plan?.sources || {};
    for (const id in sources) {
        const src = sources[id];
        if (src?.container) {
            addCandidate(room, STRUCTURE_CONTAINER, src.container, {
                critical: true,
                sourceId: id
            });
        }
    }

    return candidates;
}

function scoreCandidate(c, room) {
    let score = 0;

    const type = c.type;

    // base priority
    const base = {
        [STRUCTURE_STORAGE]: 2000,
        [STRUCTURE_LINK]: 1000,
        [STRUCTURE_SPAWN]: 900,
        [STRUCTURE_EXTENSION]: 800,
        [STRUCTURE_TOWER]: 700,
        [STRUCTURE_CONTAINER]: 500,
        [STRUCTURE_ROAD]: 50
    };

    score += base[type] || 100;

    // critical infra boost
    if (c.meta?.critical) score += 1000;

    const core = room.getCore();

    if (core !== ERR_NOT_FOUND) {
        const dist = Math.abs(c.x - core.x) + Math.abs(c.y - core.y);
        score -= dist * 2;
    } else {
        // slight center bias (optional, safe heuristic)
        const dx = c.x - 25;
        const dy = c.y - 25;
        const dist = Math.sqrt(dx * dx + dy * dy);
        score -= dist * 0.5;
    }

    return score;
}

function buildNextStructure(room) {
    // limit construction sites

    const sites = room.find(FIND_CONSTRUCTION_SITES);
    const LIMIT = 2;
    if (sites.length >= LIMIT) return;

    const candidates = getCandidates(room);
    if (!candidates.length) return;

    for (const c of candidates) {
        c.score = scoreCandidate(c, room);
    }

    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];
    if (!best) return;
    const result = room.createConstructionSite(best.x, best.y, best.type);

    if (result === OK) {
        if (!room.memory._buildLog) room.memory._buildLog = [];
        room.memory._buildLog.push({
            t: Game.time,
            type: best.type,
            x: best.x,
            y: best.y
        });
    }
}

function getExistingRoads(room) {
    const roads = room.find(FIND_STRUCTURES)
        .filter(s => s.structureType === STRUCTURE_ROAD)
        .map(s => `${s.pos.x},${s.pos.y}`);

    const sites = room.find(FIND_CONSTRUCTION_SITES)
        .filter(s => s.structureType === STRUCTURE_ROAD)
        .map(s => `${s.pos.x},${s.pos.y}`);

    return new Set([...roads, ...sites]);
}

function getPlannedRoadSet(room) {
    const roads = room.memory.plan?.structures?.road || [];

    const set = new Set();

    for (const r of roads) {
        set.add(`${r.x},${r.y}`);
    }

    return set;
}

function getRoadCandidates(room, threshold = 50) {
    const heatmap = room.memory.heatmap || {};
    const existing = getExistingRoads(room);
    const planned = getPlannedRoadSet(room);

    const candidates = [];

    for (const key in heatmap) {
        if (!planned.has(key)) continue;

        const heat = heatmap[key];
        if (heat < threshold) continue;

        if (existing.has(key)) continue;

        const [x, y] = key.split(',').map(Number);

        candidates.push({
            pos: { x, y },
            heat
        });
    }

    return candidates;
}

function scoreRoad(c) {
    return c.heat;
}

function buildRoads(room) {
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    const LIMIT = 2;

    if (sites.length >= LIMIT) return;

    const candidates = getRoadCandidates(room);

    if (!candidates.length) return;

    for (const c of candidates) {
        c.score = scoreRoad(c);
    }

    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];

    const result = room.createConstructionSite(
        best.pos.x,
        best.pos.y,
        STRUCTURE_ROAD
    );

    if (result === OK) {
        if (!room.memory.roadLog) room.memory.roadLog = [];
        room.memory.roadLog.push({
            t: Game.time,
            x: best.pos.x,
            y: best.pos.y,
            heat: best.heat
        });
    }
}

module.exports = {
    run(room) {

        if (!room.controller?.my) 
            return;
        
        const mem = room.memory;
        const cache = room.memory.cache
        
        if (!cache || Game.time % 500 === 0) {
            room.buildCache();
        }
            
        if (Game.time % 5 === 0) {
            room.updateCache();
        }
        
        room.runLinks();
        
        // Spawn demand supply
        room.spawnCreepsNeeded();

        // Remplacement des jobs fixes (dis au creep de rejoindre l'autre creep)
        const creeps = room.find(FIND_MY_CREEPS);
        for ( const creep of creeps ) {
            // Recherche des creeps à remplacer
            if (creep.ticksToLive < 100) {
                const replacement = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                    filter: c =>
                        c.memory.role === creep.memory.role &&
                        !c.memory.jobId
                });

                // Affectation du remplacement
                if ( replacement ) { replacement.memory.replaces = creep.name }
            }
        }
        
        mem.state ??= 'planner'

        if (mem.state === 'planner') {
            heatmap.runHeatmap(room);
            if (Game.time % 25 === 0) buildRoads(room);
            if (Game.time % 10 === 0) buildNextStructure(room);
            
        }
        
        visual.run(room);
    }
};