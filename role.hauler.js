module.exports = {

    run(creep, job) {

        if (!job) {
            creep.toggleWorkingState();
            if ( creep.memory.working ) {
                const upgradeContainer = creep.room.findUpgradeContainer();
                if ( upgradeContainer && upgradeContainer.store[RESOURCE_ENERGY] < 1500 ) {
                    creep.myTransfer(upgradeContainer);
                    return;
                }

                const storage = 
                creep.room.find(FIND_STRUCTURES, 
                    { filter: o => o.structureType === STRUCTURE_STORAGE &&
                        o.store.getFreeCapacity() > creep.store[RESOURCE_ENERGY]
                    }
                );

                if ( storage.length > 0 ) {
                    creep.myTransfer(storage[0], RESOURCE_ENERGY);
                    return;
                }
                
                const container = 
                creep.pos.findClosestByRange(FIND_STRUCTURES, 
                    { filter: o => o.structureType === STRUCTURE_CONTAINER &&
                        o.store.getFreeCapacity() > creep.store[RESOURCE_ENERGY] &&
                        o.pos.findInRange(FIND_SOURCES, 2).length === 0
                    }
                );
                if ( container ) {
                    creep.myTransfer(container, RESOURCE_ENERGY);
                    return;
                }

                const upgradeContainerPos = creep.room.memory.upgradeContainerPos;
                if ( upgradeContainerPos ) {
                    if ( !creep.pos.isNearTo(upgradeContainerPos.x, upgradeContainerPos.y)) {
                        creep.moveTo(upgradeContainerPos.x, upgradeContainerPos.y)
                    } else {
                        creep.drop(RESOURCE_ENERGY);
                    }
                }

            
            } else {

                const storage = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_STORAGE
                })[0];
                
                if (storage) {
                    const excludeIds = [storage.id];
                    const weights = { container: 2 };
                    creep.getEnergy({ excludeIds, weights });
                } else {
                    const excludeIds = [];
                    const weights = { container: 2 };
                    creep.getEnergy({ excludeIds, weights })
                }
            }
            return;
        }

        if (job.type === 'haul' && creep.store[RESOURCE_ENERGY] === 0) {
            for ( const resourceType in creep.store ) {
                if ( resourceType !== RESOURCE_ENERGY ) {
                    const storage = creep.room.findStorage()
                    creep.myTransfer(storage, resourceType)
                    return;
                }
            }
            const excludeIds = [];
            const weights = { container: 0.8, storage: 0.5 };
            creep.getEnergy({ excludeIds, weights });
            return;
        }

        if ((job.type === 'pickup' || job.type === 'withdraw') && creep.store.getFreeCapacity() === 0) {
            creep.memory.jobId = null;
            return;
        }
        creep.doJob(job);
    }
};