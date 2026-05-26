module.exports = {

    run(creep, job) {

        if (!job) {
            const pos = creep.memory.workPos;

            if (pos) {
                if (creep.pos.x !== pos.x || creep.pos.y !== pos.y) {
                    creep.moveTo(pos.x, pos.y);
                }
            }
            return
        }
        
        if (job.type === 'haul' && creep.store[RESOURCE_ENERGY] === 0) {
            const storage = creep.room.getCached("structure", STRUCTURE_STORAGE)
            if (storage.length > 0)
                creep.myWithdraw(storage[0]);

            return;
        }

        if (job.type === 'withdraw' && creep.store.getFreeCapacity() === 0) {
            const storage = creep.room.getCached("structure", STRUCTURE_STORAGE);
            if (storage.length > 0)
                creep.myTransfer(storage[0]);

            return;
        }

        creep.doJob(job);

    }
};