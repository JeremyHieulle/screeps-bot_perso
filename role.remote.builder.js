module.exports = {

    run: function(creep, job) {
        creep.memory.working ??= false
        creep.toggleWorkingState();
        
        const roomSrc = Game.rooms['W37S37'];
        const roomDst = Game.rooms['W36S38'];

        if ( creep.room.name !== roomDst.name ) {
            creep.moveTo(roomDst.controller);
            return
        }
        
        if(creep.getActiveBodyparts(ATTACK) > 0) {
            const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS).filter(c => !isAlly(c.owner.username));

            if ( target && creep.pos.getRangeTo(target) < 20 ) {
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

