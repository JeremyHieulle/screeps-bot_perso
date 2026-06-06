const { buildBody } = require('spawning.bodyBuilder');
const cache = require('room.cache');

Room.prototype.recordMetricsTest = function () {

    // =========================================
    // INIT
    // =========================================

    this.memory.metricsTest ??= {};

    const metrics = this.memory.metricsTest;

    metrics.lastUpdated = Game.time;

    // =========================================
    // CREEPS
    // =========================================

    const creeps = this.find(FIND_MY_CREEPS);

    metrics.creepCount = creeps.length;

    metrics.roles = {};

    let spawnUsage = 0;
    let workParts = 0;
    let carryParts = 0;

    for (const creep of creeps) {

        const role = creep.memory.role || 'unknown';

        metrics.roles[role] ??= 0;
        metrics.roles[role]++;

        // =========================
        // BODYPARTS
        // =========================

        for (const part of creep.body) {

            if (part.hits <= 0) continue;

            switch (part.type) {

                case WORK:
                    workParts++;
                    break;

                case CARRY:
                    carryParts++;
                    break;
            }
        }

        // =========================
        // SPAWN LOAD
        // =========================

        spawnUsage += (
            creep.body.length * 3
        ) / CREEP_LIFE_TIME;
    }

    // queued creeps
    for (const queued of (this.memory.spawnQueue || [])) {

        spawnUsage += (
            queued.body.length * 3
        ) / CREEP_LIFE_TIME;
    }

    metrics.spawnLoad = Number(
        spawnUsage.toFixed(3)
    );

    // =========================================
    // ENERGY ECONOMY
    // =========================================

    metrics.energyIncomeEstimate =
        workParts * HARVEST_POWER;

    metrics.carryCapacity =
        carryParts * CARRY_CAPACITY;

    // =========================================
    // STORAGE BUFFER
    // =========================================

    const storage = this.storage;

    metrics.storageEnergy =
        storage?.store[RESOURCE_ENERGY] || 0;

    const terminal = this.terminal;

    metrics.terminalEnergy =
        terminal?.store[RESOURCE_ENERGY] || 0;

    // =========================================
    // DROPPED ENERGY
    // =========================================

    const dropped = this.find(FIND_DROPPED_RESOURCES, {
        filter: r =>
            r.resourceType === RESOURCE_ENERGY
    });

    metrics.droppedEnergy = dropped.reduce(
        (sum, r) => sum + r.amount,
        0
    );

    // =========================================
    // CONTAINERS
    // =========================================

    const containers =
        this.getCached(
            LOOK_STRUCTURES,
            STRUCTURE_CONTAINER
        );

    let containerEnergy = 0;

    for (const c of containers) {

        containerEnergy +=
            c.store[RESOURCE_ENERGY] || 0;
    }

    metrics.containerEnergy =
        containerEnergy;

    // =========================================
    // REPAIR PRESSURE
    // =========================================

    const repairables = this.find(FIND_STRUCTURES, {
        filter: s => {

            // ignore roads low impact
            if (
                s.structureType === STRUCTURE_ROAD
            ) {
                return false;
            }

            // rampart/wall softcap
            if (
                s.structureType === STRUCTURE_WALL ||
                s.structureType === STRUCTURE_RAMPART
            ) {
                return s.hits < 500000;
            }

            return s.hits < s.hitsMax;
        }
    });

    let repairPressure = 0;

    for (const s of repairables) {

        if (
            s.structureType === STRUCTURE_WALL ||
            s.structureType === STRUCTURE_RAMPART
        ) {

            repairPressure += (
                500000 - s.hits
            );

        } else {

            repairPressure += (
                s.hitsMax - s.hits
            );
        }
    }

    metrics.repairPressure =
        repairPressure;

    // =========================================
    // BUILD PRESSURE
    // =========================================

    const sites =
        this.find(FIND_CONSTRUCTION_SITES);

    metrics.constructionSites =
        sites.length;

    metrics.buildPressure =
        sites.reduce(
            (sum, s) =>
                sum + (
                    s.progressTotal - s.progress
                ),
            0
        );

    // =========================================
    // CONTROLLER
    // =========================================

    metrics.controller = {

        level:
            this.controller?.level || 0,

        progress:
            this.controller?.progress || 0,

        progressTotal:
            this.controller?.progressTotal || 0,

        downgrade:
            this.controller?.ticksToDowngrade || 0
    };

    // =========================================
    // SOURCES
    // =========================================

    const sources = this.find(FIND_SOURCES);

    metrics.sources = [];

    for (const source of sources) {

        metrics.sources.push({

            id: source.id,

            energy: source.energy,

            freeSpots:
                source.pos
                    .getOpenPositions?.()
                    ?.length || 0
        });
    }

    // =========================================
    // LINKS
    // =========================================

    const links =
        this.getCached(
            LOOK_STRUCTURES,
            STRUCTURE_LINK
        );

    metrics.links = [];

    for (const link of links) {

        const meta =
            this.memory.cache
                ?.structureMeta
                ?.[link.id];

        metrics.links.push({

            id: link.id,

            tag: meta?.tag || null,

            energy:
                link.store[RESOURCE_ENERGY],

            free:
                link.store.getFreeCapacity(
                    RESOURCE_ENERGY
                )
        });
    }

    // =========================================
    // CPU DEBUG
    // =========================================

    metrics.cpu = Game.cpu.getUsed();

    return metrics;
};

Room.prototype.buildCache = function() {
    cache.buildRoomCache(this);
}

Room.prototype.updateCache = function() {
    cache.updateRoomCache(this);
}

Room.prototype.getCached = function(category, item) {

    this._cached ??= {};
    this._cached[category] ??= {};

    if (this._cached[category][item]) {
        return this._cached[category][item];
    }

    const ids = this.memory.cache?.[category]?.[item] || [];

    const objects = [];

    for (const id of ids) {

        const obj = Game.getObjectById(id);

        if (obj) {
            objects.push(obj);
        }
    }

    // runtime cache
    this._cached[category][item] = objects;

    return objects;
};

Room.prototype.getCache = function(category, item) {

    this._cache ??= {};
    this._cache[category] ??= {};

    if (this._cache[category][item]) {
        return this._cache[category][item];
    }

    const ids = this.memory.cache?.[category]?.[item] || [];

    // runtime cache
    this._cache[category][item] = ids;

    return ids;
};

Room.prototype.hasExtractor = function(mineral) {

    const extractor = this.getCached(LOOK_STRUCTURES, STRUCTURE_EXTRACTOR)    
    
    if (extractor.length > 0) return true;

    return false;
}

Room.prototype.debugPlan = function(plan) {
    const v = this.visual;

    const colorMap = {
        spawn: "#ffffff",
        storage: "#ffaa00",
        terminal: "#00ffff",
        link: "#00ff00",
        tower: "#ff0000",
        extension: "#6666ff",
        lab: "#ff66ff",
        container: "#888888",
        road: "#444444",
        rampart: "#999999",
        walls: "#333333",
        powerSpawn: "#ffff00",
        nuker: "#ff00aa"
    };

    function draw(type, list) {

        if (!list) return;

        for (const p of list) {

            v.circle(p.x, p.y, {
                radius: 0.35,
                fill: colorMap[type] || "#ffffff",
                opacity: 0.3
            });

            v.text(type[0], p.x, p.y, {
                font: 0.3,
                color: "#000000",
                opacity: 0.3
            });
        }
    }

    for (const type in plan.structures) {
        draw(type, plan.structures[type]);
    }

    for (const type in plan.optional) {
        draw(type, plan.optional[type]);
    }

    // core highlight
    if (plan.core) {
        v.circle(plan.core.x, plan.core.y, {
            radius: 0.6,
            fill: "#ff0000",
            opacity: 0.2
        });
    }
};

Room.prototype.getCore = function () {
    const mem = this.memory.plan;

    if (!mem.corePos) {
        console.log(`${this} Core not found, need room.analyzer`);
        return ERR_NOT_FOUND;
    }

    const core = new RoomPosition(
        mem.corePos.x,
        mem.corePos.y,
        this.name
    )
    
    return core
}

Room.prototype.requestJob = function (creep) {

    creep.memory.jobId ??= null;

    const role = creep.memory.role;
    const jobTypes = this.getJobTypeForRole(role);

    const exclude = new Set();

    if (
        role === 'hauler' &&
        creep.store.getFreeCapacity() === 0
    ) {
        exclude.add('withdraw');
        exclude.add('pickup');
    }

    const hasManager =
        this.getCache("logistics", "hasManager") > 0;

    const corePos = this.memory.plan.corePos;

    const jobs = Object.values(this.memory.jobs)

        .filter(job => {

            // =============================
            // ROLE FILTER
            // =============================
            if (!jobTypes.includes(job.type)) return false;

            // =============================
            // EXCLUDE FILTER
            // =============================
            if (exclude.has(job.type)) return false;

            // =============================
            // ASSIGNED FILTER
            // =============================
            if (job.assigned) return false;

            // =============================
            // ZONE FILTER
            // =============================
            const area = job.area || 'global';

            // managers ONLY core
            if (role === 'manager' && area !== 'core') {
                return false;
            }

            // haulers avoid core if manager exists
            if (
                role === 'hauler' &&
                hasManager &&
                area === 'core'
            ) {
                return false;
            }

            // =============================
            // DIRTY ANTI-CORE PICKUP
            // =============================
            if (
                role === 'hauler' &&
                job.type === 'pickup'
            ) {

                const target =
                    Game.getObjectById(job.originId);

                if (
                    target &&
                    corePos &&
                    target.pos.getRangeTo(
                        corePos.x,
                        corePos.y
                    ) <= 2
                ) {
                    return false;
                }
            }

            return true;
        })

        .map(job => {

            const target =
                Game.getObjectById(job.originId);

            if (!target) return null;

            return {
                ...job,
                target
            };
        })

        .filter(Boolean)

        .sort((a, b) => {

            const prio =
                (b.priority || 0) -
                (a.priority || 0);

            if (prio !== 0) return prio;

            return (
                creep.pos.getRangeTo(a.target) -
                creep.pos.getRangeTo(b.target)
            );
        });

    if (!jobs.length) return false;

    const job = this.memory.jobs[jobs[0].id];

    // réservation immédiate
    creep.memory.jobId = job.id;
    job.assigned = creep.name;
    job.assignedTick = Game.time;

    return true;
};

Room.prototype.runLinks = function () {

    const links = this.getCached(LOOK_STRUCTURES, STRUCTURE_LINK);
    const meta = this.memory.cache?.structureMeta;

    if (!links || !meta) return;

    const coreLink = this.findByTag("core", STRUCTURE_LINK);
    if (!coreLink) return;

    const coreEnergy = coreLink.store[RESOURCE_ENERGY]
    const coreFree = coreLink.store.getFreeCapacity(RESOURCE_ENERGY)

    const TRANSFER_MIN = 300;

    for (const link of links) {

        const m = meta[link.id];
        if (!m) continue;

        const energy = link.store[RESOURCE_ENERGY] || 0;
        const free = link.store.getFreeCapacity(RESOURCE_ENERGY);

        // =========================
        // SOURCE LINK LOGIC
        // =========================

        if (m.tag === "source" && energy >= TRANSFER_MIN && coreFree >= TRANSFER_MIN) {
            link.transferEnergy(coreLink);
        }

        if (m.tag === "controller" && free >= TRANSFER_MIN && coreEnergy >= TRANSFER_MIN) {
            coreLink.transferEnergy(link)
        }
    }
};


const REMOTE_MINER_ROLE = 'remoteMiner';
const REMOTE_HAULER_ROLE = 'remoteHauler';

// =============================
// HELPERS
// =============================

function calcRemoteHauling(distance, roomEnergyCapacity) {

    // Flux à couvrir : 10e/tick par source, aller-retour = 2*distance ticks
    // CARRY needed = ceil(2 * distance * 10 / 50)
    const totalCarry = Math.ceil(2 * distance * 10 / 50);
    const totalMove = totalCarry;

    const costPerPair = BODYPART_COST[CARRY] + BODYPART_COST[MOVE]; // 100e
    const totalCost = (totalCarry + totalMove) * costPerPair / 2; // évite double comptage

    // Parts par hauler : limité par 50 parts max et roomEnergyCapacity
    const maxCarryByParts = Math.floor(25); // 50 parts / 2 (carry+move)
    const maxCarryByEnergy = Math.floor(roomEnergyCapacity / costPerPair);
    const carryPerHauler = Math.min(maxCarryByParts, maxCarryByEnergy);

    const energyPerHauler = carryPerHauler * costPerPair;

    // Nombre de haulers nécessaires
    const haulerCount = Math.ceil(totalCarry / carryPerHauler);

    return { haulerCount, energyPerHauler };
}

function getAssignedCreeps(role, sourceId = null, targetRoom = null) {
    return Object.values(Game.creeps).filter(c => {
        if (c.memory.role !== role) return false;
        if (sourceId && c.memory.sourceId !== sourceId) return false;
        if (targetRoom && c.memory.targetRoom !== targetRoom) return false;
        return true;
    });
}

// =============================
// INIT
// =============================

function initRemoteData(room, remoteName) {

    const intel = Memory.intel.rooms[remoteName];
    const spawn = room.find(FIND_MY_SPAWNS)[0];

    room.memory.remotes ??= {};
    room.memory.remotes[remoteName] = { sources: {} };

    for (const source of intel.sources) {

        const sourcePos = new RoomPosition(source.pos.x, source.pos.y, remoteName);

        const result = PathFinder.search(spawn.pos, { pos: sourcePos, range: 1 }, {
            plainCost: 2,
            swampCost: 10,
            roomCallback: (rName) => {
                const r = Game.rooms[rName];
                if (!r) return new PathFinder.CostMatrix();
                const matrix = new PathFinder.CostMatrix();
                r.find(FIND_STRUCTURES).forEach(s => {
                    if (s.structureType === STRUCTURE_ROAD) {
                        matrix.set(s.pos.x, s.pos.y, 1);
                    } else if (
                        s.structureType !== STRUCTURE_CONTAINER &&
                        s.structureType !== STRUCTURE_RAMPART
                    ) {
                        matrix.set(s.pos.x, s.pos.y, 255);
                    }
                });
                return matrix;
            }
        });

        room.memory.remotes[remoteName].sources[source.id] = {
            distance: result.path.length,
            path: Room.serializePath(result.path),
            containerId: null
        };
    }
}

// =============================
// SPAWN
// =============================

function spawnForRemote(room, remoteName) {

    const intel = Memory.intel.rooms[remoteName];
    const localSources = room.memory.remotes[remoteName].sources;

    for (const source of intel.sources) {

        const data = localSources[source.id];

        // =============================
        // REMOTE MINER
        // =============================
        const miners = getAssignedCreeps(REMOTE_MINER_ROLE, source.id);

        if (miners.length === 0) {
            room.spawnCreepForRole(REMOTE_MINER_ROLE, room.energyCapacityAvailable, {
                memory: {
                    targetRoom: remoteName,
                    sourceId: source.id,
                    sourcePos: source.pos,
                    containerId: data.containerId || null
                }
            });
        }

        // =============================
        // REMOTE HAULER
        // =============================
        if (!data.containerId && miners.length === 0) continue;

        const haulers = getAssignedCreeps(REMOTE_HAULER_ROLE, source.id);
        const { haulerCount, energyPerHauler } = calcRemoteHauling(data.distance, room.energyCapacityAvailable);


        if (haulers.length < haulerCount) {
            room.spawnCreepForRole(REMOTE_HAULER_ROLE, energyPerHauler, {
                memory: {
                    targetRoom: remoteName,
                    sourceId: source.id,
                    sourcePos: source.pos,
                    containerId: data.containerId || null
                }
            });
        }

        const remoteData = room.memory.remotes[remoteName];

        // =============================
        // REMOTE DEFENSE
        // =============================

        if (remoteData.invaderCore) {
            const killers = getAssignedCreeps('coreKiller')
                .filter(c => c.memory.targetRoom === remoteName);
            if (killers.length === 0) {
                room.spawnCreepForRole('coreKiller', 1000, {
                    memory: { targetRoom: remoteName }
                });
            }
        }

        if (remoteData.invaders) {
            const defenders = getAssignedCreeps('remoteDefender')
                .filter(c => c.memory.targetRoom === remoteName);
            if (defenders.length === 0) {
                room.spawnCreepForRole('remoteDefender', 1800, {
                    memory: { targetRoom: remoteName }
                });
            }
        }
    }

    // =============================
    // REMOTE RESERVER
    // =============================
    const remoteData = room.memory.remotes[remoteName];
    const reservers = getAssignedCreeps('remoteReserver', null, remoteName);

    const shouldSpawn = !remoteData.spawnReserverAt || 
                        Game.time >= remoteData.spawnReserverAt;

    if (reservers.length === 0 && shouldSpawn) {
        room.spawnCreepForRole('remoteReserver', 1300, {
            memory: {
                targetRoom: remoteName,
            }
        });
    }
}

// =============================
// PROTOTYPE
// =============================

Room.prototype.runRemotes = function() {
    for (const [remoteName, remote] of Object.entries(Memory.remotes || {})) {
        if (remote.owner !== this.name) continue;

        if (!this.memory.remotes?.[remoteName]) {
            initRemoteData(this, remoteName);
        }

        spawnForRemote(this, remoteName);
    }
};

Room.prototype.spawnCreepsNeeded = function() {

    const creeps = this.find(FIND_MY_CREEPS);

    // =============================
    // COUNT EXISTING + SPAWNING
    // =============================
    const creepCount = {};

    for (const creep of creeps) {
        if (creep && creep.ticksToLive >= 100) {
            creepCount[creep.memory.role] ??= 0;
            creepCount[creep.memory.role]++;
        }
    }

    const spawns = this.getCached(LOOK_STRUCTURES, STRUCTURE_SPAWN);
    for (const spawn of spawns) {
        if (spawn?.spawning) {
            const spawningName = spawn.spawning.name;
            const role = Memory.creeps[spawningName]?.role;

            if (role) {
                creepCount[role] ??= 0;
                creepCount[role]++;
            }
        }
    }

    // =============================
    // QUEUED COUNT
    // =============================
    const queued = {};

    for (const q of (this.memory.spawnQueue || [])) {

        if (q.priority > 1) continue;

        queued[q.role] ??= 0;
        queued[q.role]++;
    }

    const total = (role) =>
        (creepCount[role] ?? 0) +
        (queued[role] ?? 0);

    // =============================
    // BOOTSTRAP PHASE
    // =============================
    if (total('harvester') === 0) {
        this.spawnCreepForRole('harvester', Math.max(300, this.energyAvailable), { priority: 0 });
        return;
    }

    if (total('hauler') < 1 ) {
        this.spawnCreepForRole('hauler', Math.max(300, this.energyAvailable), { priority: 1 });
        return;
    }

    // =============================
    // HARVESTER NEED
    // =============================
    const harvesterNeed = this.getCache("logistics", "harvesterNeed");
    const haulerNeed = this.getCache("logistics", "haulerNeed");

    const sources = this.find(FIND_SOURCES);

    const extractor = this.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_EXTRACTOR
    });

    const exhausted_mineral = this.find(FIND_MINERALS, {
        filter: m => m.mineralAmount === 0
    });

    const mineralHarvester =
        ((extractor.length - exhausted_mineral.length) > 0)
            ? (extractor.length - exhausted_mineral.length)
            : 0;

    if (total('harvester') < harvesterNeed + mineralHarvester) {
        this.spawnCreepForRole('harvester');
    }

    // =============================
    // HAULER STRESS
    // =============================
    const droppedEnergy = this.find(FIND_DROPPED_RESOURCES)
        .reduce((sum, r) => sum + r.amount, 0);

    const haulStress = droppedEnergy / 1000;

    const requestedHauler = Math.max(
        haulerNeed,
        Math.ceil(haulStress)
    );

    if (total('hauler') < requestedHauler) {
        this.spawnCreepForRole('hauler');
    }

    // =============================
    // BUILDER / UPGRADER
    // =============================
    const builderMax = this.getCache("logistics", "builderMax");
    const upgraderMax = this.getCache("logistics", "upgraderMax");

    let upgraderMaxCost = 200;
    let requestedUpgrader = 0;
    let requestedBuilder = 0;

    const sites = this.find(FIND_CONSTRUCTION_SITES, {
        filter: s => s.structureType !== STRUCTURE_ROAD
    });

    const storage = this.getCached("structure", STRUCTURE_STORAGE);

    if (( this.controller.level < 4 ) || ( storage.length > 0 && storage[0].store[RESOURCE_ENERGY] > 300000 )) {
        upgraderMaxCost = this.energyCapacityAvailable;
    }

    const urgentRepair = Object.values(this.memory.jobs || {})
    .filter(job => job.type === 'repair');

    const roadSites = this.find(FIND_CONSTRUCTION_SITES, {
        filter: s => s.structureType === STRUCTURE_ROAD
    });

    const coreLink = this.findByTag("core", STRUCTURE_LINK)
    const hasManager = this.getCache("logistics", "hasManager");

    if ( storage.length > 0 && coreLink && total('manager') < 1 && this.name !== 'W35S38') {
        this.spawnCreepForRole('manager', this.energyCapacityAvailable, {memory: { workPos: { x: this.memory.plan.corePos.x, y: this.memory.plan.corePos.y }}});
    } 

    // =============================
    // LOGIC BUILDER / UPGRADER
    // =============================
    if (sites.length > 0) {
        requestedUpgrader = 1;
        requestedBuilder = builderMax;
    } else {
        requestedUpgrader = (this.energyCapacityAvailable > 1000) ? 1 : upgraderMax;
        requestedBuilder = 0;
    }

    if (roadSites.length > 0 || urgentRepair.length > 0) {
        requestedBuilder = Math.max(requestedBuilder, 1);
        requestedUpgrader = Math.min(requestedUpgrader, 1);
    }

    if (total('upgrader') < requestedUpgrader) {
        this.spawnCreepForRole('upgrader', upgraderMaxCost);
    }

    if (total('builder') < requestedBuilder) {
        this.spawnCreepForRole('builder');
    }

    if (Object.keys(Memory.intel?.rooms || {}).length < 10) {
        this.spawnCreepForRole('scout');
    }
};

Room.prototype.spawnCreepForRole = function(role, max, opts = {}) {

    this.memory.spawnQueue ??= [];

    const priority = opts.priority ?? this.getRolePriority(role);

    const exists = this.memory.spawnQueue.some(
        r =>
            r.role === role &&
            r.priority === priority
    );

    if (exists) return;
    
    const limit = max || 200000;

    const energyByRole = {
        hauler: this.energyCapacityAvailable * 2 / 3,
        builder: 2400,
        upgrader: 2100,
        // remoteHauler: 1500,
        scout: 2100,
        attacker: 2100,
        healer: 600,
        guard: 1200
    };

    const maxEnergy = energyByRole[role] || this.energyCapacityAvailable;
    const energy = Math.min(limit, maxEnergy, this.energyCapacityAvailable);

    const body = buildBody(role, energy);

    if (!body || body.length === 0) return ERR_NOT_ENOUGH_ENERGY;
    if (role === 'upgrader' && body.length > 20) {
        body.push(MOVE);
        body.push(MOVE);
        body.push(MOVE);
        body.push(MOVE);
        body.push(MOVE);
        body.push(MOVE);
    }
    const name = `${role}_${Game.time}_${Math.random().toString(36).slice(2,8)}`;
    const pushMemory = opts.memory || {};

    console.log(`${this} ${role} added to spawnQueue`);

    this.memory.spawnQueue.push({
        priority,
        role,
        body,
        name,
        pushMemory
    });
};

Room.prototype.getJobTypeForRole = function (role) {

      switch(role) {
        case 'harvester': return ['harvest'];
        case 'hauler': return ['haul','pickup','withdraw'];
        case 'upgrader': return ['upgrade'];
        case 'builder': return ['build','repair'];
        case 'manager': return ['haul','withdraw'];
        default: false;
    }  
}

Room.prototype.getRolePriority = function(role) {

    switch(role) {
        case 'harvester': return 10;
        case 'hauler': return 20;
        case 'upgrader': return 30;
        case 'builder': return 50;
        default: return 100;
    }
};

Room.prototype.findByTag = function (tag, structureType = null) {

    const meta = this.memory.cache?.structureMeta;
    if (!meta) return null;

    for (const id in meta) {

        if (meta[id].tag !== tag) continue;

        if (structureType) {
            const obj = Game.getObjectById(id);
            if (!obj || obj.structureType !== structureType) continue;
        }

        return Game.getObjectById(id);
    }

    return null;
};