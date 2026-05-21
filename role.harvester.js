module.exports = {

    run(creep, job) {
        
        if (creep.room.memory.logistics.hasHauler) {
            if (!job) {
                creep.idle();
                return;
            }

            if ( creep.store.getFreeCapacity() === 0 ) {
                const links = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_LINK &&
                            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });

                for ( const link of links ) {
                    if ( creep.pos.isNearTo(link) ) {
                        creep.transfer(link, RESOURCE_ENERGY);
                        return;
                    }
                }
            }
            creep.doJob(job);

            return;
        }

        // Spécifité harvester avec CARRY
        creep.memory.state ??= 'filling';

        if (creep.memory.state == 'filling' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'full';
        }

        if (creep.memory.state == 'full' && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.state = 'filling'
        }

        if (creep.memory.state === 'filling' ) {
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            creep.myHarvest(source);
        }

        if (creep.memory.state === 'full') {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return ( structure.structureType == STRUCTURE_EXTENSION
                        || structure.structureType == STRUCTURE_SPAWN )
                        && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (targets.length > 0 ) {
                creep.myTransfer(targets[0]);
            } else {
                const source = creep.pos.findClosestByPath(FIND_SOURCES);
                creep.myHarvest(source)
            }
        }
    }
};