module.exports = {

    run: function(creep, job) {
        if (!job) {
            creep.toggleWorkingState();
            if ( creep.memory.working ) {
                const targetsToRepair = 
                creep.pos.findClosestByRange(FIND_STRUCTURES, 
                    { filter: o => o.hitsMax - o.hits > 0 &&
                        o.structureType !== STRUCTURE_WALL
                     }
                );

                if ( targetsToRepair ) {
                    creep.myRepair(targetsToRepair);
                    return;
                }

                creep.idle();
            } else {
                creep.getEnergy();
            }
            return;
        }
        
        if (creep.store[RESOURCE_ENERGY] === 0) {
            const terminal = creep.room.findTerminal();
            if (terminal && creep.pos.getRangeTo(terminal) < 7 && terminal.store[RESOURCE_ENERGY] > 0) {
                creep.myWithdraw(terminal, RESOURCE_ENERGY);
                return;
            }
            creep.getEnergy();
            return;
        }
        const s = Game.getObjectById('6a088a321a29c10013327b17');
        if (s && creep.room.name === 'W36S38') {
            creep.myBuild(s);
            return
        }
        creep.doJob(job);
    }
};