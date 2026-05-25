module.exports = {

    run(creep, job) {

        if (!job) {
            creep.toggleWorkingState();
            if ( creep.memory.working ) {
                const upgradeContainer = creep.room.findByTag("controller", STRUCTURE_CONTAINER);
                if ( upgradeContainer && upgradeContainer.store[RESOURCE_ENERGY] < 1500 ) {
                    creep.myTransfer(upgradeContainer);
                    return;
                }

                const storage = creep.room.getCached("structure", STRUCTURE_STORAGE)
                if ( storage.length > 0 && storage.store.getFreeCapacity() > creep.store[RESOURCE_ENERGY]) {
                    creep.myTransfer(storage[0], RESOURCE_ENERGY);
                    return;
                }
                
                const container = creep.room.findByTag("core", STRUCTURE_CONTAINER)
                if (container && container.store.getFreeCapacity() > creep.store[RESOURCE_ENERGY]) {
                    creep.myTransfer(container, RESOURCE_ENERGY);
                    return;
                }

                const corePos = creep.room.memory.plan.corePos;
                if ( !creep.pos.isNearTo(corePos.x, corePos.y)) {
                    creep.moveTo(corePos.x, corePos.y)
                } else {
                    creep.drop(RESOURCE_ENERGY);
                }

            
            } else {

                const storage = creep.room.getCached("structure", STRUCTURE_STORAGE);
                
                if (storage.length > 0) {
                    const excludeIds = [storage[0].id];
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
                    let target = null;
                    target = creep.room.getCached("structure", STRUCTURE_STORAGE)
                    if (target.length === 0) target = creep.room.getCached("structure", STRUCTURE_TERMINAL)
                    if (target.length === 0) target = creep.room.findByTag("core", STRUCTURE_CONTAINER)
                    if (target.length > 0) {
                        creep.myTransfer(target[0], resourceType)
                    }
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