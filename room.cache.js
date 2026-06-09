// room.cache.js

function _buildStructureCache(room) {

    const cache = {};
    const structures = room.find(FIND_STRUCTURES);

    for (const structure of structures) {
        const type = structure.structureType;
        cache[type] ??= [];
        cache[type].push(structure.id);
    }

    return cache;
}

function _buildStructureMetaCache(room) {

    const plan = room.memory.plan;
    const metaCache = {};

    const metaList = new Set([
        STRUCTURE_CONTAINER,
        STRUCTURE_LINK
    ]);

    const structures = room.find(FIND_STRUCTURES);

    for (const s of structures) {
        if (!metaList.has(s.structureType)) continue;

        const list = plan?.structures?.[s.structureType];
        if (!list) continue;

        for (const p of list) {
            if (s.pos.x === p.x && s.pos.y === p.y) {
                metaCache[s.id] = {
                    tag: p.tag || null,
                    mineral: p.mineral || null
                };
                break;
            }
        }
    }

    return metaCache;
}

function _getSourceCapacity(room) {

    const terrain = room.getTerrain();
    const sources = room.find(FIND_SOURCES);
    let totalSlots = 0;

    for (const source of sources) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = source.pos.x + dx;
                const y = source.pos.y + dy;
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) totalSlots++;
            }
        }
    }

    return totalSlots;
}

function _buildLogisticsCache(room) {

    const sources = room.find(FIND_SOURCES);
    const structures = room.find(FIND_STRUCTURES);

    let repairDemand    = 0;
    let towerDemand     = 0;
    let spawnDemand     = 0;
    let extensionDemand = 0;

    const energyPerTickMax       = sources.length * SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME;
    const workNeeded             = energyPerTickMax / HARVEST_POWER;
    const estimatedWorkPerCreep  = 2 * Math.floor((room.energyCapacityAvailable - 50) / 250);
    const workPerCreep           = Math.min(estimatedWorkPerCreep, 5);
    const sourceCapacity         = _getSourceCapacity(room);

    const harvesterNeed = Math.min(
        sourceCapacity,
        Math.ceil(workNeeded / workPerCreep),
        6
    );

    for (const s of structures) {
        if (s.structureType === STRUCTURE_TOWER) {
            towerDemand += Math.max(0, 500 - (s.store?.[RESOURCE_ENERGY] || 0));
        }
        if (s.structureType === STRUCTURE_SPAWN) {
            spawnDemand += Math.max(0, s.energyCapacity - s.energy);
        }
        if (s.structureType === STRUCTURE_EXTENSION) {
            extensionDemand += Math.max(0, s.energyCapacity - s.energy);
        }
    }

    const totalDemand = repairDemand + towerDemand + spawnDemand + extensionDemand;
    const haulerNeed  = Math.max(1, Math.ceil(totalDemand / 1000));

    const energy                    = room.energyCapacityAvailable;
    const builderWorkPowerEstimate  = energy / 200;
    const upgraderWorkPowerEstimate = energy / 100;
    const builderMax                = (energyPerTickMax - 5) / builderWorkPowerEstimate;
    const upgraderMax               = (energyPerTickMax - 5) / upgraderWorkPowerEstimate;

    const hasManager = room.find(FIND_MY_CREEPS, {
        filter: c => c.memory.role === 'manager'
    }).length > 0 ? 1 : 0;
    const hasHauler = room.find(FIND_MY_CREEPS, {
        filter: c => c.memory.role === 'hauler'
    }).length > 0 ? 1 : 0;
    
    return {
        demand: {
            repair:    repairDemand,
            tower:     towerDemand,
            spawn:     spawnDemand,
            extension: extensionDemand,
            total:     totalDemand
        },
        harvesterNeed,
        haulerNeed,
        builderMax,
        upgraderMax,
        hasManager,
        hasHauler
    };
}

function _updateStructureCacheFromBuildLog(room) {

    const log = room.memory._buildLog || [];

    for (const entry of log) {
        const structures = room.lookForAt(LOOK_STRUCTURES, entry.x, entry.y);
        const built = structures.find(s => s.structureType === entry.type);

        if (!built) continue;

        const cache = global._cache[room.name].structure;
        cache[entry.type] ??= [];

        if (!cache[entry.type].includes(built.id)) {
            cache[entry.type].push(built.id);
            console.log(`[CACHE] added ${entry.type} ${built.id}`);
        }

        entry.done = true;
    }

    room.memory._buildLog = log.filter(e => !e.done);
}

// =============================
// BUILD — premier appel ou reset global
// =============================

function buildRoomCache(room) {

    global._cache ??= {};
    global._cache[room.name] = {
        structure:     _buildStructureCache(room),
        structureMeta: _buildStructureMetaCache(room),
        logistics:     _buildLogisticsCache(room),
    };
}

// =============================
// UPDATE — tous les N ticks
// =============================

function updateRoomCache(room) {

    global._cache ??= {};
    global._cache[room.name] ??= {};
    global._cache[room.name].logistics = _buildLogisticsCache(room);
    _updateStructureCacheFromBuildLog(room);
}

module.exports = { buildRoomCache, updateRoomCache };