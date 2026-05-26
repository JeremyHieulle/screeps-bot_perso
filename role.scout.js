function getScoutTarget(roomName) {

    const exits = Game.map.describeExits(roomName);

    let best = null;
    let bestScore = -Infinity;

    for (const dir in exits) {

        const room = exits[dir];

        const intel = Memory.intel?.rooms?.[room];
        const penalty = Memory.scoutPenalty?.[room] || 0;

        let score = 0;

        // priorité absolue : inconnue
        if (!intel) score += 1000;

        // moins récemment visitée = mieux
        if (intel) {
            score += (Game.time - intel.lastSeen) / 10;
        }

        // pénalité mort
        if (intel?.hostile)
            score -= 500;

        // léger random pour éviter lock
        score += Math.random() * 10;

        if (score > bestScore) {
            bestScore = score;
            best = room;
        }
    }

    return best;
}

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

module.exports = {

    run(creep) {

        if (!creep.memory.lastRoom) {
            creep.memory.lastRoom = creep.room.name
        }
        if (!creep.memory.state || creep.memory.state === "afk") {
            creep.memory.state = "travel"
        }

        if (creep.room.name !== creep.memory.lastRoom) {
            creep.memory.lastRoom = creep.room.name
        }

        if (!creep.memory.target) {
            creep.memory.target = getScoutTarget(creep.room.name);
        }


        const target = creep.memory.target

        if (!target) {
            return; // idle naturel (ou reroll next tick)
        }

        if (creep.memory.state === "travel") {

            // si arrivé
            if (creep.room.name === target && 
                creep.pos.x !== 0 && creep.pos.x !== 49 &&
                creep.pos.y !== 0 && creep.pos.y !== 49
            ) {
                creep.memory.state = "scan";
                return;
            }

            creep.moveTo(new RoomPosition(25, 25, target));

            return;
        }

        // =========================
        // SCAN STATE
        // =========================
        if (creep.memory.state === "scan") {

            scanRoom(creep.room);

            creep.memory.targetRoom = null;
            creep.memory.state = "travel";
        }
    }
};