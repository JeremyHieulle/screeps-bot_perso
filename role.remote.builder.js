module.exports = {

    run: function(creep, job) {
        creep.memory.working ??= false
        creep.toggleWorkingState();
        
        const targetRoom = creep.memory.targetRoom;

        if ( creep.room.name !== targetRoom ) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { reusePath: 50 });
            return
        }
        
        if(creep.getActiveBodyparts(ATTACK) > 0) {
            const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)

            if ( target && !isAlly(target.owner.username) && targetcreep.pos.getRangeTo(target) < 20 ) {
                if(creep.attack(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
                return;
            }
        }
        
        if ( creep.memory.working === true ) {
            const spawnsite = creep.room.find(FIND_CONSTRUCTION_SITES, {
                filter: s => s.structureType === STRUCTURE_SPAWN
            })
            if ( spawnsite.length > 0 ) {
                if (creep.build(spawnsite[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawnsite[0]);
                }
                return
            }

            const build = target = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES)
            if ( build ) {
                if (creep.build(build) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(build);
                }
            }
        } else {        
            creep.getEnergy();
        }
    }
}

