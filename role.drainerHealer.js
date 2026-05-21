module.exports = {

    run: function(creep, job) {

        const positions = [
            new RoomPosition(3, 4, 'W37S38'),
            new RoomPosition(4, 4, 'W37S38'),
            new RoomPosition(4, 5, 'W37S38'),
            new RoomPosition(4, 6, 'W37S38'),
        ];

        // assignation stable du slot
        if (creep.memory.slot === undefined) {

            const taken = Object.values(Game.creeps)
                .filter(c =>
                    c.memory.role === 'drainerHealer' &&
                    c.memory.slot !== undefined
                )
                .map(c => c.memory.slot);

            for (let i = 0; i < positions.length; i++) {
                if (!taken.includes(i)) {
                    creep.memory.slot = i;
                    break;
                }
            }
        }

        const pos = positions[creep.memory.slot ?? 0];

        // 1. move uniquement si pas à la position
        if (!creep.pos.isEqualTo(pos)) {
            creep.moveTo(pos);
            return;
        }

        const targetPos = new RoomPosition(3, 5, 'W37S38');

        const targets = targetPos.lookFor(LOOK_CREEPS);
        const target = targets[0];

        if (target && target.hits < target.hitsMax) {
            creep.heal(target);
        }
    }
};