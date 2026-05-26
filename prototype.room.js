const { buildBody } = require('spawning.bodyBuilder');
const cache = require('room.cache');

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
    
    if (extractor) return true;

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
        this.getCache("logistics", "managerNeed") > 0;

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
            const zone = job.zone || 'global';

            // managers ONLY core
            if (role === 'manager' && zone !== 'core') {
                return false;
            }

            // haulers avoid core if manager exists
            if (
                role === 'hauler' &&
                hasManager &&
                zone === 'core'
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

    const spawn = this.find(FIND_MY_SPAWNS)[0];
    if (spawn?.spawning) {
        const spawningName = spawn.spawning.name;
        const role = Memory.creeps[spawningName]?.role;

        if (role) {
            creepCount[role] ??= 0;
            creepCount[role]++;
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
        this.spawnCreepForRole('harvester', 300, { priority: 0 });
        return;
    }

    if (total('hauler') < 2) {
        this.spawnCreepForRole('hauler', 300, { priority: 1 });
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

    if (( storage.length === 0 ) || ( storage.length > 0 && storage[0].store[RESOURCE_ENERGY] > 300000 )) {
        upgraderMaxCost = this.energyCapacityAvailable;
    }

    const urgentRepair = this.find(FIND_STRUCTURES, {
        filter: s =>
            s.hits < s.hitsMax / 2 &&
            s.structureType !== STRUCTURE_WALL
    });

    const roadSites = this.find(FIND_CONSTRUCTION_SITES, {
        filter: s => s.structureType === STRUCTURE_ROAD
    });

    const coreLink = this.findByTag("core", STRUCTURE_LINK)
    const hasManager = this.getCache("logistics", "hasManager");

    if ( storage.length > 0 && coreLink && total('manager') < 1 ) {
        this.spawnCreepForRole('manager');
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
        builder: 600,
        upgrader: 1800,
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