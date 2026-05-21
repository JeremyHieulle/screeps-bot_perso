module.exports = {

    run(creep, job) {
        if (creep.room.memory.logistics.hasHauler) {
            if (!job) {

                creep.toggleWorkingState();

                if ( creep.memory.working ) {

                    creep.myUpgrade(creep.room.controller);
                    return;
                } else {

                    const upgradeContainer = creep.room.findUpgradeContainer();
                    
                    if ( upgradeContainer && upgradeContainer.store[RESOURCE_ENERGY] > 0 ) {

                        creep.myWithdraw(upgradeContainer, RESOURCE_ENERGY);
                        return;
                    }
                }

                creep.idle();
                return;
            }

            if (creep.store[RESOURCE_ENERGY] === 0) {

                creep.getEnergy();
                return;
            }

            creep.doJob(job);
            return;
        }

        if (creep.store[RESOURCE_ENERGY] === 0) {

            const upgradeContainer = creep.room.findUpgradeContainer();
            
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