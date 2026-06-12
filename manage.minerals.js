// manage.minerals.js

// =============================
// HARVESTER
// =============================

function runMineral(creep) {

    const mineralId = creep.memory.mineralId;
    if (!mineralId) return;

    const mineral = Game.getObjectById(mineralId);
    if (!mineral) return;

    const workPos = creep.memory.workPos;
    if (workPos) {
        const pos = new RoomPosition(workPos.x, workPos.y, creep.room.name);
        if (!creep.pos.isEqualTo(pos)) {
            creep.moveTo(pos);
        }
    }
    
    if (mineral.mineralAmount === 0) {
        creep.idle();
        return;
    }

    creep.myHarvest(mineral);
    creep.say('⛏');
}

// =============================
// SPAWN
// =============================

function manageMineralSpawn(room) {

    if (!room.hasStructure(STRUCTURE_EXTRACTOR)) return;

    const mineralPlan = room.memory?.plan?.spatialJob
        .filter(j => j.tag === 'mineral')[0] || [];
    if (!mineralPlan) return;

    const mineral = Game.getObjectById(mineralPlan.targetId);
    if (!mineral || mineral.mineralAmount === 0) {
        return;
    }

    const harvesters = room.getCreepsByRole('mineral');

    const queued = (room.memory.spawnQueue || [])
        .filter(q => q.role === 'mineral').length;

    const total = harvesters.length + queued;

    if (total >= mineralPlan.length) return;


    const body = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];

    room.addToSpawnQueue({
        role: 'mineral',
        body: body,
        priority: 20,
        memory: {
            role: 'mineral',
            mineralId: mineral.id,
            workPos: { x: mineralPlan.workPos.x, y: mineralPlan.workPos.y }
        }
    });
}

// =============================
// EXPORTS
// =============================

module.exports = {
    run: function(room) {
        manageMineralSpawn(room);
    },
    runMineral: runMineral
};