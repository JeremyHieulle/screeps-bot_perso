const { buildBody } = require('spawning.bodyBuilder');
const cache = require('room.cache');

Room.prototype.buildCache = function() {
    cache.buildRoomCache(this);
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

// Obtenir un objet à une position donnée dans la salle
Room.prototype.getObjectByPos = function (...args) {

    let pos, lookType, predicate;

    if (args[0] instanceof RoomPosition) {
        // signature (pos, lookType, predicate)
        pos = args[0];
        lookType = args[1];
        predicate = args[2];
    } else {
        // signature (x, y, lookType, predicate)
        pos = new RoomPosition(args[0], args[1], this.name);
        lookType = args[2];
        predicate = args[3];
    }

    const objects = this.lookForAt(lookType, pos);

    for (const o of objects) {
        if (!predicate || predicate(o)) {
            return o;
        }
    }

    return null;
};

Room.prototype.requestJob = function (creep) {
    creep.memory.jobId ??= null;

    const role = creep.memory.role;
    const jobTypes = this.getJobTypeForRole(role);

    const exclude = new Set();

    if (role === 'hauler' && creep.store.getFreeCapacity() === 0) {
        exclude.add('withdraw');
        exclude.add('pickup');
    }

    const corePos = this.memory.plan.corePos
    const jobs = Object.values(this.memory.jobs)
        .filter(job => {

            if (!jobTypes.includes(job.type)) return false;
            if (exclude.has(job.type)) return false;
            if (job.assigned) return false;

            // dirty anti-core pickup for haulers
            if (
                role === 'hauler' &&
                job.type === 'pickup'
            ) {
                const target = Game.getObjectById(job.originId);

                if (
                    target &&
                    corePos &&
                    target.pos.getRangeTo(corePos.x, corePos.y) <= 2
                ) {
                    return false;
                }
            }

            return true;
        })
        .map(job => {
            const target = Game.getObjectById(job.originId);

            if (!target) return null;

            return {
                ...job,
                target
            };
        })
        .filter(Boolean)
        .sort((a, b) =>
            creep.pos.getRangeTo(a.target) -
            creep.pos.getRangeTo(b.target)
        );

    
    if (!jobs.length) return false;

    const job = this.memory.jobs[jobs[0].id];

    // réservation immédiate
    creep.memory.jobId = job.id;
    job.assigned = creep.name;
    job.assignedTick = Game.time;

    
    console.log(creep.memory.jobId)
    console.log(creep.room.memory.jobs[jobs[0].id].id)
    return true;
};

// Assigner les jobs aux creeps disponibles selon la priorité métier et spawner si nécessaire
Room.prototype.assignJobs = function () {

    const spawn = this.find(FIND_MY_SPAWNS)[0];
    const jobs = Object.values(this.memory.jobs);
    
    const harvestJobs = jobs.filter(j => j.type === 'harvest')
        .sort((a, b) =>
            spawn.pos.getRangeTo(a.pos) -
            spawn.pos.getRangeTo(b.pos)
        );

    const haulJobs = jobs.filter(j => j.type === 'haul')
        .sort((a, b) =>
            spawn.pos.getRangeTo(a.pos) -
            spawn.pos.getRangeTo(b.pos)
        );

    const upgradeJobs = jobs.filter(j => j.type === 'upgrade');
    const repairJobs = jobs.filter(j => j.type === 'repair');
    const otherJobs = jobs.filter(j => !['harvest', 'haul', 'upgrade', 'repair'].includes(j.type));

    // Priorité : harvest
    for (const job of harvestJobs) {
        if (job.assigned) continue;
        this.assignJob(job, 'harvester');
    }

    // Priorité : haul
    for (const job of haulJobs) {
        if (job.assigned) continue;

        const role = this.getRoleForJob(job);
        this.assignJob(job, role);
    }

    // Priorité : upgrade
    for (const job of upgradeJobs) {
        if (job.assigned) continue;

        const role = this.getRoleForJob(job);
        this.assignJob(job, role);
    }

    // Priorité : repair
    for (const job of repairJobs) {
        if (job.assigned) continue;

        const role = this.getRoleForJob(job);
        this.assignJob(job, role);
    }

    // Priorité : autres
    for (const job of otherJobs) {
        if (job.assigned) continue;

        const role = this.getRoleForJob(job);
        this.assignJob(job, role);
    }
};

// Assigner un job spécifique au meilleur creep disponible
Room.prototype.assignJob = function (job, role) {

    const creeps = this.find(FIND_MY_CREEPS);

    let bestCreep = null;
    let bestScore = Infinity;

    for (const creep of creeps) {
        if (creep.memory.jobId) continue;
        if (creep.memory.role !== role) continue;

        const dist = creep.pos.getRangeTo(job.pos.x, job.pos.y);

        if (dist < bestScore) {
            bestScore = dist;
            bestCreep = creep;
        }
    }
    if (bestCreep) {
        console.log(`bestCreep ${bestCreep.name} assigned for ${job.id}`);
        job.assigned = bestCreep.name;
        bestCreep.memory.jobId = job.id;
    }
};

Room.prototype.spawnCreepsNeeded = function() {

    const creeps = this.find(FIND_MY_CREEPS);

    // Comptage des creeps existants
    const creepCount = {};
    for (const creep of creeps) {
        if ( creep && creep.ticksToLive >= 100 ) { 
            creepCount[creep.memory.role] ??= 0;
            creepCount[creep.memory.role]++
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

    const sources = this.find(FIND_SOURCES);
    const extractor = this.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_EXTRACTOR
    });
    const exhausted_mineral = this.find(FIND_MINERALS, {
        filter: m => m.mineralAmount === 0 });

    const mineralHarvester = (( extractor.length - exhausted_mineral ) > 0) ? extractor.length - exhausted_mineral : 0
    const harvesterNeeded = sources.length + mineralHarvester;
    if ( this.memory.requested['harvester'] !== harvesterNeeded ) this.memory.requested['harvester'] = harvesterNeeded;


    const workingPower = Math.floor(this.energyCapacityAvailable / 200);

    const totalBuild = this.find(FIND_CONSTRUCTION_SITES).reduce(
        (sum, building) => sum + building.progressTotal - building.progress, 0);
    const totalRepair = this.find(FIND_STRUCTURES).reduce(
        (sum, building) => sum + building.hitsMax - building.hits, 0);
    const urgentRepair = this.find(FIND_STRUCTURES, {
        filter: s => s.hits < s.hitsMax / 2 &&
                     s.structureType !== STRUCTURE_WALL
    });

    // const buildersNeeded = (urgentRepair.length > 0 || totalBuild > 0) ? Math.min(2, Math.ceil(totalRepair / 200000 + totalBuild / 100000)) : 0;
    let buildersNeeded = 0;
    const sites = this.find(FIND_CONSTRUCTION_SITES)
    buildersNeeded = Math.min(sites.length, 1);
    if ( urgentRepair.length > 0 ) buildersNeeded++

    if ( this.memory.requested['builder'] !== buildersNeeded ) this.memory.requested['builder'] = buildersNeeded

    if ( ( creepCount['harvester'] ??= 0 ) < this.getCache("logistics", "harvesterNeed") ) this.spawnCreepForRole('harvester');

    const droppedEnergy = this.find(FIND_DROPPED_RESOURCES)
        .reduce((sum, r) => sum + r.amount, 0);

    const haulStress = droppedEnergy / 1000;

    const requestedHauler = Math.max(
        this.getCache("logistics", "haulerNeed"),
        Math.ceil(haulStress)
    );

    if ( ( creepCount['hauler'] ??= 0 ) < requestedHauler ) this.spawnCreepForRole('hauler');

    if ( ( creepCount['upgrader'] ??= 0 ) < this.memory.requested['upgrader'] ) this.spawnCreepForRole('upgrader');

    if ( ( creepCount['builder'] ??= 0 ) < this.memory.requested['builder'] ) this.spawnCreepForRole('builder');

    // this.memory.requested['drainer'] ??= 0
    // this.memory.requested['drainerHealer'] ??= 0
    
    // if ( ( creepCount['drainerHealer'] ??= 0 ) < this.memory.requested['drainerHealer'] ) this.spawnCreepForRole('drainerHealer');

    // if ( ( creepCount['drainer'] ??= 0 ) < this.memory.requested['drainer'] ) this.spawnCreepForRole('drainer');

}

Room.prototype.spawnCreepForRole = function(role, max, opts) {

    this.memory.spawnQueue ??= [];

    const exists = this.memory.spawnQueue.some(
        r => r.role === role
    );

    if (exists) return;
    
    const limit = max || 200000;

    const energyByRole = {
        hauler: this.energyCapacityAvailable * 2 / 3,
        builder: 600,
        upgrader: 1400,
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

    const name = `${role}_${Game.time}`;
    const pushMemory = opts || {}

    console.log(`${this} ${role} added to spawnQueue`);

    this.memory.spawnQueue.push({
        priority: this.getRolePriority(role),
        role,
        body,
        name: `${role}_${Game.time}_${Math.random().toString(36).slice(2,4)}`,
        pushMemory
    });
};

// Obtenir le rôle approprié pour un job
Room.prototype.getRoleForJob = function (job) {

      switch(job.type) {
        case 'harvest': return 'harvester';
        case 'haul': return 'hauler';
        case 'upgrade': return 'upgrader';
        case 'build': return 'builder';
        case 'repair': return 'builder';
        case 'withdraw': return 'hauler';
        default: false;
    }
}

Room.prototype.getJobTypeForRole = function (role) {

      switch(role) {
        case 'harvester': return ['harvest'];
        case 'hauler': return ['haul','pickup','withdraw'];
        case 'upgrader': return ['upgrade'];
        case 'builder': return ['build','repair'];
        default: false;
    }  
}

Room.prototype.getJobPriority = function(job) {

    switch(job.type) {
        case 'harvest': return 1;
        case 'pickup': return 20;
        case 'haul': return 2;
        case 'upgrade': return 3;
        case 'build': return 5;
        case 'repair': return 5;
        default: return 10;
    }
};

Room.prototype.getRolePriority = function(role) {

    switch(role) {
        case 'harvester': return 1;
        case 'hauler': return 2;
        case 'upgrader': return 3;
        case 'builder': return 5;
        default: return 10;
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