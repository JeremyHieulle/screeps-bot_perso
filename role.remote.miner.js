// role.remoteMiner.js

module.exports = {
    run: function(creep) {

        const targetRoom = creep.memory.targetRoom;
        const sourceId = creep.memory.sourceId;
        const sourcePos = creep.memory.sourcePos;

        // =============================
        // DEPLACEMENT VERS LA ROOM
        // =============================
        if (creep.room.name !== targetRoom) {
            const pos = new RoomPosition(creep.memory.sourcePos.x, creep.memory.sourcePos.y, targetRoom);
            creep.moveTo(pos, { reusePath: 50,  range: 1 });
            return;
        }

        const source = Game.getObjectById(sourceId);

        if (!source) {
            creep.moveTo(new RoomPosition(sourcePos.x, sourcePos.y, targetRoom), { reusePath: 50 });
            return;
        }

        // =============================
        // GESTION CONTAINER
        // =============================
        if (!creep.memory.containerId) {

            const container = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })[0];

            if (container) {
                creep.memory.containerId = container.id;
                // update local data dans la home room

                const homeRoom = Game.spawns[creep.memory.bornIn].room;
                if (homeRoom?.memory?.remotes?.[targetRoom]?.sources?.[sourceId]) {
                    homeRoom.memory.remotes[targetRoom].sources[sourceId].containerId = container.id;
                }
            } else {
                const site = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                })[0];

                if (!site && creep.pos.getRangeTo(source) <= 1) {
                    creep.room.createConstructionSite(creep.pos, STRUCTURE_CONTAINER);
                }
            }
        }

        // =============================
        // POSITION SUR LE CONTAINER
        // =============================
        const container = Game.getObjectById(creep.memory.containerId);

        if (container && !creep.pos.isEqualTo(container.pos)) {
            creep.moveTo(container.pos, { reusePath: 50 });
            return;
        }

        if (!container && creep.pos.getRangeTo(source) > 1) {
            creep.moveTo(source, { reusePath: 50 });
            return;
        }

        // =============================
        // SOURCE VIDE : build / repair
        // =============================
        if (source.energy === 0 && source.ticksToRegeneration > 20) {

            if (creep.store[RESOURCE_ENERGY] === 0) {

                const drop = creep.room.lookForAt(LOOK_RESOURCES, creep);
                if (drop.length > 0) {
                    creep.pickup(drop[0]);
                    return;
                }

                const structs = creep.room.lookForAt(LOOK_STRUCTURES, creep);
                const c = structs.find(s =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    s.store[RESOURCE_ENERGY] > 0
                );
                if (c) creep.withdraw(c, RESOURCE_ENERGY);
                return;
            }

            const builds = creep.room.find(FIND_CONSTRUCTION_SITES);
            if (builds.length > 0) {
                creep.myBuild(builds[0]);
                return;
            }

            const repairs = creep.room.find(FIND_STRUCTURES, {
                filter: s => (
                    s.structureType === STRUCTURE_ROAD ||
                    s.structureType === STRUCTURE_CONTAINER
                ) && s.hits < s.hitsMax
            });
            if (repairs.length > 0) {
                creep.repair(repairs[0]);
                return;
            }
        }

        // =============================
        // HARVEST
        // =============================
        creep.myHarvest(source);
    }
};