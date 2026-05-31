// role.remoteReserver.js

module.exports = {
    run: function(creep) {

        const targetRoom = creep.memory.targetRoom;
        const homeRoom = Game.spawns[creep.memory.bornIn].room;
        // =============================
        // DEPLACEMENT
        // =============================
        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { reusePath: 50 });
            return;
        }

        const controller = creep.room.controller;
        if (!controller) return;

        // =============================
        // UPDATE spawnReserverAt (every 50 ticks)
        // =============================
        if (Game.time % 50 === 0) {
            const ticksToEnd = controller.reservation?.ticksToEnd || 0;
            if (homeRoom?.memory?.remotes?.[targetRoom]) {
                // on veut spawner un nouveau quand il restera ~4000 ticks
                homeRoom.memory.remotes[targetRoom].spawnReserverAt = Game.time + ticksToEnd - 4000;
            }
        }

        // =============================
        // RESERVE
        // =============================
        if (creep.reserveController(controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { reusePath: 50, range: 1 });
        }
    }
};