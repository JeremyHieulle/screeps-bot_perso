function _buildStructureCache(room) {

    const structureCache = {
        spawn: [],
        extension: [],
        road: [],
        constructedWall: [],
        rampart: [],
        keeperLair: [],
        portal: [],
        controller: [],
        link: [],
        storage: [],
        tower: [],
        observer: [],
        powerBank: [],
        powerSpawn: [],
        extractor: [],
        lab: [],
        terminal: [],
        container: [],
        nuker: [],
        factory: [],
        invaderCore: [],
    };

    const structures = room.find(FIND_STRUCTURES);

    for (const structure of structures) {

        const type = structure.structureType;

        if (!structureCache[type]) {
            structureCache[type] = [];
        }

        structureCache[type].push(structure.id);
    }

    return structureCache;
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

function _buildTransportCache(room) {

    const sources = room.find(FIND_SOURCES);
    const storage = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_STORAGE
    })[0];
    const terminal = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TERMINAL
    })[0];
    const spawn = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_SPAWN
    })[0];
    const containers = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    });

    const transportCache = {
        sourceToCore: [],
        containerToCore: [],
        core: {
            storageId: storage?.id || null,
            terminalId: terminal?.id || null,
            spawnId: spawn?.id || null
        },
        avgDistances: {
            source: 0,
            container: 0
        }
    };

    // SOURCE → CORE
    for (const source of sources) {
        const path = spawn.pos.findPathTo(source);

        transportCache.sourceToCore.push({
            sourceId: source.id,
            distance: path.length,
            costPerTick: source.energyCapacity / Math.max(path.length, 1)
        });
    }

    // CONTAINERS → CORE
    if (containers) {
        for (const c of containers) {

            const path = c.pos.findPathTo(storage || spawn);

            transportCache.containerToCore.push({
                containerId: c.id,
                distance: path.length,
                decayPressure: c.store?.getUsedCapacity?.(RESOURCE_ENERGY) || 0
            });
        }
    }

    return transportCache;
}

function _buildRepairCache(room) {
    return undefined;
}

function _getSourceCapacity(room) {

    const sources = room.find(FIND_SOURCES);

    let totalSlots = 0;

    for (const source of sources) {

        const terrain = room.getTerrain();

        let slots = 0;

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {

                if (dx === 0 && dy === 0) continue;

                const x = source.pos.x + dx;
                const y = source.pos.y + dy;

                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    slots++;
                }
            }
        }

        totalSlots += slots;
    }

    return totalSlots;
}

function _buildLogisticsCache(room) {

    const sources = room.find(FIND_SOURCES)
    const storage = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_STORAGE
    })[0];
    
    const terminal = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TERMINAL
    })[0];

    const structures = room.find(FIND_STRUCTURES);

    let repairDemand = 0;
    let towerDemand = 0;
    let spawnDemand = 0;
    let extensionDemand = 0;

    const energyPerTickMax = sources.length * SOURCE_ENERGY_CAPACITY / 300;
    const workNeeded = energyPerTickMax / HARVEST_POWER;
    const estimatedWorkPerCreep = 2 * Math.floor(( room.energyCapacityAvailable - 50 ) / 250)
    const workPerCreep = Math.min(estimatedWorkPerCreep, 5);
    
    const sourceCapacity = _getSourceCapacity(room);

    const harvesterNeed = Math.min(
        sourceCapacity,
        Math.ceil(workNeeded / workPerCreep),
        6
    );

    // ENERGY CONSUMERS
    for (const s of structures) {

        // towers
        if (s.structureType === STRUCTURE_TOWER) {
            towerDemand += Math.max(0, 500)// - s.store?.[RESOURCE_ENERGY]);
        }

        // spawns
        if (s.structureType === STRUCTURE_SPAWN) {
            spawnDemand += Math.max(0, s.energyCapacity)// - s.energy);
        }

        // extensions
        if (s.structureType === STRUCTURE_EXTENSION) {
            extensionDemand += Math.max(0, s.energyCapacity)// - s.energy);
        }
    }

    const totalDemand =
        repairDemand +
        towerDemand +
        spawnDemand +
        extensionDemand;

    // SIMPLE HAULER ESTIMATE
    const haulerNeed = Math.ceil(totalDemand / 1000);


    const energy = room.energyCapacityAvailable;

    const builderWorkPowerEstimate = energy / 200;
    const upgraderWorkPowerEstimate = energy / 100;

    const builderMax = (energyPerTickMax - 5) / builderWorkPowerEstimate;
    const upgraderMax = (energyPerTickMax - 5) / upgraderWorkPowerEstimate;

    const managers = room.find(FIND_MY_CREEPS, {
        filter: c =>
            c.memory.role === 'manager'
    });

    const hasManager = managers.length > 0 ? 1 : 0;

    // MODE SIMPLE (tu pourras enrichir après)
    let mode = "low";

    if (totalDemand > 50000) mode = "high";
    else if (totalDemand > 20000) mode = "mid";

    return {
        demand: {
            repair: repairDemand,
            tower: towerDemand,
            spawn: spawnDemand,
            extension: extensionDemand,
            total: totalDemand
        },
        harvesterNeed,
        haulerNeed,
        builderMax,
        upgraderMax,
        hasManager,
        mode
    };
}

function _updateStructureCacheFromBuildLog(room) {

    const log = room.memory._buildLog || [];

    for (const entry of log) {

        const structures = room.lookForAt(
            LOOK_STRUCTURES,
            entry.x,
            entry.y
        );

        const built = structures.find(
            s => s.structureType === entry.type
        );

        if (!built) continue;

        const cache = room.memory.cache.structure;

        cache[entry.type] ??= [];

        if (!cache[entry.type].includes(built.id)) {

            cache[entry.type].push(built.id);

            console.log(
                `[CACHE] added ${entry.type} ${built.id}`
            );
        }

        // remove completed entry
        entry.done = true;
    }

    room.memory._buildLog =
        log.filter(e => !e.done);
}

function buildRoomCache(room) {
    room.memory.cache = {
        structure: _buildStructureCache(room),
        structureMeta: _buildStructureMetaCache(room), 
        transport: _buildTransportCache(room),
        repair: _buildRepairCache(room),
    };
}

function updateRoomCache(room) {
    room.memory.cache.logistics = _buildLogisticsCache(room)
    _updateStructureCacheFromBuildLog(room)
}

module.exports = { buildRoomCache, updateRoomCache }