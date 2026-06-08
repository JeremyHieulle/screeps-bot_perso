module.exports = {

    run(creep, job) {
        if (creep.room.memory.logistics.hasHauler) {
            if (!job) {

                creep.toggleWorkingState();

                if ( creep.memory.working ) {

                    creep.myUpgrade(creep.room.controller);
                    return;
                } else {

                    const upgradeContainer = creep.room.findByTag("controller", STRUCTURE_CONTAINER);
                    
                    if ( upgradeContainer && upgradeContainer.store[RESOURCE_ENERGY] > 0 ) {

                        creep.myWithdraw(upgradeContainer, RESOURCE_ENERGY);
                        return;
                    }
                    
                    const coreContainer = creep.room.findByTag("core", STRUCTURE_CONTAINER);
                    if ( coreContainer && coreContainer.store[RESOURCE_ENERGY] > 0 ) {

                        creep.myWithdraw(coreContainer, RESOURCE_ENERGY);
                        return;
                    }
                }

                creep.idle();
                return;
            }

            if (creep.store[RESOURCE_ENERGY] < creep.getActiveBodyparts(WORK)) {

                creep.getEnergy();
                return;
            }

            creep.doJob(job);
            return;
        }

        if (creep.store[RESOURCE_ENERGY] === 0) {

            const upgradeContainer = creep.room.findByTag("controller", STRUCTURE_CONTAINER);
            
            if ( upgradeContainer && upgradeContainer.store[RESOURCE_ENERGY] > 0 ) {

                creep.myWithdraw(upgradeContainer, RESOURCE_ENERGY);
                return;
            }
            
            creep.getEnergy();
            return;
        }

        creep.myUpgrade(creep.room.controller);
    }
}