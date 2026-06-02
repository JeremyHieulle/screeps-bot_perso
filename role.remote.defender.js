// role.remoteDefender.js
module.exports = {
    run: function(creep) {

        const targetRoom = creep.memory.targetRoom;
        const homeRoom = Game.spawns[creep.memory.bornIn].room;

        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { reusePath: 50 });
            return;
        }

        const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);

        if (hostiles.length === 0) {
            if (homeRoom?.memory?.remotes?.[targetRoom]) {
                homeRoom.memory.remotes[targetRoom].invaders = false;
            }
            // recycle
            const spawn = Game.spawns[creep.memory.bornIn] || homeRoom.find(FIND_MY_SPAWNS)[0];
            if (creep.room.name !== homeRoom.name) {
                creep.moveTo(new RoomPosition(25, 25, homeRoom.name), { reusePath: 50 });
                return;
            }
            if (spawn) spawn.recycleCreep(creep);
            return;
        }

        const target = creep.pos.findClosestByRange(hostiles);
        const range = creep.pos.getRangeTo(target);

        if (range <= 2) {
            creep.rangedAttack(target);
            const fled = PathFinder.search(creep.pos, {
                pos: target.pos,
                range: 4
            }, {
                flee: true,
                maxRooms: 1,
                plainCost: 2,
                swampCost: 10  // évite activement les swamps
            });
            if (fled.path.length > 0) creep.moveByPath(fled.path);
            return;
        }
        
        if (range <= 3) {
            creep.rangedAttack(target);
            creep.heal(creep);
            return;
        }

        creep.rangedAttack(target);
        creep.moveTo(target, { reusePath: 5, range: 3 });
    }
};