module.exports = {

    run: function(creep, job) {
        if (!job) {
            creep.toggleWorkingState();
            if ( creep.memory.working ) {

                const sites = creep.room.find(FIND_CONSTRUCTION_SITES)
                if ( sites.length > 0 ) {
                    creep.myBuild(sites[0])
                    return;
                }

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
            creep.getEnergy();
            return;
        }

        creep.doJob(job);
    }
};