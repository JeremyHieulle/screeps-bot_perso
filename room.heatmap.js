function initHeatmap(room) {
    if (!room.memory.heatmap) {
        room.memory.heatmap = {};
    }
}

function recordCreepMovement(creep, room) {
    const pos = creep.pos;
    const key = `${pos.x},${pos.y}`;

    const weightByRole = {
        harvester: 3,
        hauler: 5,
        upgrader: 2,
        builder: 1
    };

    const weight = weightByRole[creep.memory.role] || 1;

    room.memory.heatmap[key] = (room.memory.heatmap[key] || 0) + weight;
}

function decayHeatmap(room) {
    const map = room.memory.heatmap;
    if (!map) return;

    for (const key in map) {
        map[key] *= 0.95;

        if (map[key] < 0.5) {
            delete map[key];
        }
    }
}

module.exports.runHeatmap = function(room) {
    initHeatmap(room);

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        if (creep.room.name !== room.name) continue;

        recordCreepMovement(creep, room);
    }

    if (Game.time % 50 === 0) {
        decayHeatmap(room);
    }
}