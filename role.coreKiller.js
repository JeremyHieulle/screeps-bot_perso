// role.coreKiller.js
module.exports = {
    run: function(creep) {

        const targetRoom = creep.memory.targetRoom;
        const homeRoom = Game.spawns[creep.memory.bornIn].room;

        if (creep.memory.returning) {
            if (creep.room.name !== homeRoom.name) {
                creep.moveTo(new RoomPosition(25, 25, homeRoom.name), { reusePath: 50 });
                return;
            }

            const spawn = Game.spawns[creep.memory.bornIn] || homeRoom.find(FIND_MY_SPAWNS)[0];
            if (!creep.pos.isNearTo(spawn)) {
                creep.moveTo(spawn, { reusePath: 50 });
                return;
            }
            if (spawn) spawn.recycleCreep(creep);
            return;
        }

        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { reusePath: 50 });
            return;
        }
        
        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { reusePath: 50 });
            return;
        }

        const core = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_INVADER_CORE
        })[0];

        if (!core) {
            if (homeRoom?.memory?.remotes?.[targetRoom]) {
                homeRoom.memory.remotes[targetRoom].invaderCore = false;
                creep.memory.returning = true;
            }
            return;
        }

        if (creep.attack(core) === ERR_NOT_IN_RANGE) {
            creep.moveTo(core, { reusePath: 10, range: 1 });
        }
    }
};