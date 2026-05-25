module.exports = {

    run(creep, job) {
        if (creep.room.memory.logistics.hasHauler) {
            if (!job) {
                const target = creep.memory.sourceId;
                if (target) {
                    const source = Game.getObjectById(target);
                    creep.myHarvest(source)
                    return
                } else {
                    const sources = creep.room.find(FIND_SOURCES)
                        .sort((a, b) => {

                            const aAssigned = _.filter(Game.creeps,
                                c => c.memory.sourceId === a.id
                            ).length;

                            const bAssigned = _.filter(Game.creeps,
                                c => c.memory.sourceId === b.id
                            ).length;

                            return aAssigned - bAssigned;
                        });
                    creep.memory.sourceId = sources[0].id
                }
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

        creep.toggleWorkingState();
        if (creep.memory.working ) {
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
        } else {
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            creep.myHarvest(source);
        }
    }
};