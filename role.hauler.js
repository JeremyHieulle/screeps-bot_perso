module.exports = {

    run(creep, job) {

        if (!job) {
            creep.toggleWorkingState();
            if ( creep.memory.working ) {
                if (creep.room.controller.level < 4) {
                    const cachedCoreContainer = creep.room.findByTag("core", STRUCTURE_CONTAINER);
                    if (cachedCoreContainer && cachedCoreContainer.store[RESOURCE_ENERGY] < 1000) {
                        creep.myTransfer(cachedCoreContainer, RESOURCE_ENERGY);
                        return;
                    } else {
                        const controllerJob = creep.room.memory.jobs[`upgrade_${creep.room.controller.id}`]
                        const workPos = controllerJob.workPos;

                        if (creep.pos.isNearTo(workPos.x, workPos.y)) {
                            creep.drop(RESOURCE_ENERGY);
                            return;
                        } else {
                            creep.moveTo(workPos.x, workPos.y);
                            return;
                        }
                    }
                } else {
                    const upgradeContainer = creep.room.findByTag("controller", STRUCTURE_CONTAINER)
                    if ( upgradeContainer && upgradeContainer.store[RESOURCE_ENERGY] < 1000 ) {
                        creep.myTransfer(upgradeContainer, RESOURCE_ENERGY);
                        return;
                    }
                    const storage = creep.room.getCached("structure", STRUCTURE_STORAGE)
                    if ( storage.length > 0 ) {
                        for ( const resourceType in creep.store ) {
                            if ( creep.store[resourceType] > 0 ) {
                                creep.myTransfer(storage[0], resourceType)
                            }
                        }
                        return;
                    }
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
            creep.idle();
            return
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
            const weights = { container: 1, storage: 1 };
            creep.getEnergy({ excludeIds, weights });
            return;
        }

        if ((job.type === 'pickup' || job.type === 'withdraw') && creep.store.getFreeCapacity() === 0) {
            const storage = creep.room.getCached("structure", STRUCTURE_STORAGE);
            if (storage.length > 0) {
                if ( creep.pos.isNearTo(storage[0]) ) {
                    creep.transfer(storage[0], RESOURCE_ENERGY)
                    creep.memory.jobId = null;
                }
                creep.moveTo(storage[0])
            } else {
                creep.memory.jobId = null;
            }
            return;
        }
        creep.doJob(job);
    }
};