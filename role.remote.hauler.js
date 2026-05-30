// role.remoteHauler.js

module.exports = {
    run: function(creep) {

        creep.toggleWorkingState();

        const targetRoom = creep.memory.targetRoom;
        const homeRoom = Game.spawns[creep.memory.bornIn].room;
        const sourcePos = creep.memory.sourcePos;

        // =============================
        // WORKING : livraison à la home
        // =============================
        if (creep.memory.working) {

            if (creep.room.name !== homeRoom) {
            const pos = new RoomPosition(25, 25, homeRoom);
            creep.moveTo(pos, { reusePath: 50, range: 2 });
                return;
            }

            const storage = creep.room.getCached('structure', STRUCTURE_STORAGE);
            if (storage.length > 0) {
                creep.myTransfer(storage[0]);
                return;
            }

            const container = creep.room.getCached('structure', STRUCTURE_CONTAINER);
            if (container.length > 0) {
                creep.myTransfer(container[0]);
                return;
            }

            return;
        }

        // =============================
        // NOT WORKING : pickup/withdraw
        // =============================
        if (creep.room.name !== targetRoom) {
            const pos = new RoomPosition(creep.memory.sourcePos.x, creep.memory.sourcePos.y, targetRoom);
            creep.moveTo(pos, { reusePath: 50, range: 2 });
            return;
        }

        // drops au sol en priorité
        const drop = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY
        });
        if (drop.length > 0) {
            creep.myPickup(drop[0]);
            return;
        }

        // container de la source assignée
        const containerId = creep.memory.containerId;
        const container = Game.getObjectById(containerId);

        if (container && container.store[RESOURCE_ENERGY] > 0) {
            creep.myWithdraw(container, RESOURCE_ENERGY);
            return;
        }

        // pas de container encore, on attend sur la sourcePos
        if (sourcePos) {
            const pos = new RoomPosition(sourcePos.x, sourcePos.y, targetRoom);
            if (!creep.pos.isEqualTo(pos)) {
                creep.moveTo(pos, { reusePath: 50 });
            }
        }
    }
};