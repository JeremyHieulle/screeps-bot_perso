// manage.sources.js

// =============================
// HELPERS
// =============================




// =============================
// HARVESTER
// =============================

function depositEnergy(creep) {

    const hasHauler = creep.room.getCache("logistics", "hasHauler");
    if (!hasHauler && creep.getActiveBodyparts(MOVE) > 0) {
        const refill = creep.room.getCached(LOOK_STRUCTURES, STRUCTURE_SPAWN)

        if (refill.length > 0) {
            creep.myTransfer(refill[0]);
            return OK;
        }
    }

    const links = creep.room.getCached(LOOK_STRUCTURES, STRUCTURE_LINK);
    const myLink = links.find(l => l.pos.getRangeTo(creep) <= 1 && l.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

    if (myLink) {
        creep.transfer(myLink, RESOURCE_ENERGY);
        return OK;
    }

    return ERR_ACCESS_DENIED; 
}

function runHarvester(creep) {

    const sourceId = creep.memory.sourceId;
    if (!sourceId) return;

    const source = Game.getObjectById(sourceId);
    if (!source) return;

    const harvestPerTick = creep.getActiveBodyparts(WORK) * HARVEST_POWER;
    const carryCapacity = creep.store.getCapacity();
    const currentCarry = creep.store.getUsedCapacity();

    if (currentCarry + harvestPerTick > carryCapacity) {
        if (depositEnergy(creep) === OK) {
            return;
        }
    }

    const workPos = creep.memory.workPos;
    if (workPos) {
        const pos = new RoomPosition(workPos.x, workPos.y, creep.room.name);
        if (!creep.pos.isEqualTo(pos)) {
            creep.moveTo(pos);
        }
    }
    
    if (source.energy === 0) {
        creep.idle();
        return;
    }

    creep.myHarvest(source);
    creep.say('⛏');
}

// =============================
// SPAWN
// =============================

function manageHarvesterSpawn(room) {

    const harvesters = room.getCreepsByRole('harvester');

    const queued = (room.memory.spawnQueue || [])
        .filter(q => q.role === 'harvester').length;

    const total = harvesters.length + queued;

    const sources = room.memory?.plan?.spatialJob
        .filter(j => j.tag === 'source') || [];

    if (!sources.length) return;

    // =============================
    // BODY
    // =============================
    const body = [];
    const maxEnergy = room.energyCapacityAvailable;

    if (maxEnergy < 300) return;

    if (maxEnergy >= 800) {
        body.push(WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE);
    } else {
        const workPerCreep = Math.floor((maxEnergy - 100) / 100);
        for (let i = 2; i < workPerCreep; i++) body.push(WORK);
        body.push(WORK, CARRY, MOVE);
    }

    // =============================
    // REQUESTED
    // =============================
    let requested = 0;

    if (maxEnergy >= 800) {
        requested = sources.length;
    } else {
        const terrain = room.getTerrain();
        let slots = 0;
        for (const spatialJob of sources) {
            const source = Game.getObjectById(spatialJob.targetId);
            if (!source) continue;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const x = source.pos.x + dx;
                    const y = source.pos.y + dy;
                    if (terrain.get(x, y) !== TERRAIN_MASK_WALL) slots++;
                }
            }
        }
        const workPerCreep = Math.floor((maxEnergy - 100) / 100);
        requested = Math.min(slots, Math.ceil(sources.length * 5 / workPerCreep));
    }

    if (total >= requested) return;

    // =============================
    // SOURCE ASSIGNMENT
    // =============================
    const countBySource = {};
    for (const s of sources) countBySource[s.targetId] = 0;

    for (const h of harvesters) {
        if (h.memory.sourceId in countBySource) {
            countBySource[h.memory.sourceId]++;
        }
    }
    for (const q of (room.memory.spawnQueue || [])) {
        if (q.role === 'harvester' && q.memory?.sourceId in countBySource) {
            countBySource[q.memory.sourceId]++;
        }
    }

    const target = sources.reduce((best, s) =>
        countBySource[s.targetId] < countBySource[best.targetId] ? s : best
    );

    const spawnBody = total === 0
        ? [WORK, CARRY, MOVE]
        : body;

    room.addToSpawnQueue({
        role: 'harvester',
        body: spawnBody,
        priority: total === 0 ? 1 : 10,
        memory: {
            role: 'harvester',
            sourceId: target.targetId,
            workPos: { x: target.workPos.x, y: target.workPos.y }
        }
    });
}

// =============================
// EXPORTS
// =============================

module.exports = {
    run: function(room) {
        manageHarvesterSpawn(room);
    },
    runHarvester
};