module.exports = {

    run: function(creep, job) {
        creep.toggleWorkingState();
        
        // Position: 43, 19, W37S38
        const source = Game.getObjectById('5bbcaaf69099fc012e63284e');


        if ( creep.room.name === source.room.name && 
            source.energy === 0 && 
            source.ticksToRegeneration > 20 
        ) {

            const builds = creep.room.find(FIND_CONSTRUCTION_SITES)

            if ( builds.length > 0 && creep.store[RESOURCE_ENERGY] > 0 ) {
                creep.myBuild(builds[0])
                return;
            }

            const repairs = creep.room.find(FIND_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_ROAD ||
                              s.structureType === STRUCTURE_CONTAINER ) &&
                             s.hits < s.hitsMax
            })

            if ( repairs.length > 0 && creep.store[RESOURCE_ENERGY] > 0 ) {
                const structure = repairs[0];
                creep.repair(structure);
                return;
            }
        }

        creep.myHarvest(source);
    }
}