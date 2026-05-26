function computeRoomDanger(room) {

    const hostiles = room.find(FIND_HOSTILE_CREEPS);

    let creepThreat = 0;

    for (const c of hostiles) {

        let attackParts = 0;
        let healParts = 0;

        for (const p of c.body) {
            if (p.type === ATTACK || p.type === RANGED_ATTACK) attackParts++;
            if (p.type === HEAL) healParts++;
        }

        creepThreat += attackParts * 3 + healParts * 2 + 1;
    }

    const towers = room.find(FIND_HOSTILE_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER
    }).length;

    const controllerLevel = room.controller?.level || 0;

    return creepThreat + towers * 10 + controllerLevel * 5;
}

function scanRoom(room) {

    Memory.intel ??= { rooms: {} };

    const r_structures = room.find(FIND_STRUCTURES);
    const r_sources = room.find(FIND_SOURCES);
    const r_minerals = room.find(FIND_MINERALS);
    const r_controllerLevel = room.controller?.level || 0;

    const r_danger = computeRoomDanger(room);

    let r_value = r_sources.length * 10;

    const minerals = [];

    for (const mineral of r_minerals) {

        minerals.push({
            density: mineral.density || 0,
            mineralType: mineral.mineralType
        });

        r_value += 3 + (mineral.density || 0) * 2;
    }

    Memory.intel.rooms[room.name] = {
        lastSeen: Game.time,
        owner: room.controller?.owner?.username || null,
        rcl: r_controllerLevel,
        sources: r_sources.length,
        minerals,
        danger: r_danger,
        hostile: false,
        value: r_value
    };
}

function exploreExits(creep) {

    const exits = Game.map.describeExits(creep.room.name);

    for (const dir in exits) {
        const room = exits[dir];

        if (!Memory.intel?.rooms?.[room]) {
            creep.moveTo(new RoomPosition(25, 25, room));
            return;
        }
    }

    // si tout est connu → errance contrôlée
    const randomDir = Math.floor(Math.random() * 4) + 1;
    const exits2 = Game.map.describeExits(creep.room.name);

    if (exits2[randomDir] && !Memory.intel[exits2[randomDir]].hostile) {
        creep.moveTo(new RoomPosition(25, 25, exits2[randomDir]));
    }
}

module.exports = {

    run(creep) {

        if (!creep.memory.lastRoom) {
            creep.memory.lastRoom = creep.room.name
        }

        if (creep.room.name !== creep.memory.lastRoom) {
            creep.memory.lastRoom = creep.room.name
        }

        // =========================
        // PAS DE TARGET = idle exploration
        // =========================
        if (!creep.memory.target) {
            this.exploreExits(creep);
            return;
        }

        // =========================
        // MOVE
        // =========================
        if (creep.room.name !== creep.memory.target) {
            creep.moveTo(new RoomPosition(25, 25, creep.memory.target));
            return;
        }

        // =========================
        // SCAN
        // =========================
        scanRoom(creep.room);

        creep.memory.target = null;
    }
};