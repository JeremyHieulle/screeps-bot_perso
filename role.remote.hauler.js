module.exports = {

    run: function(creep, job) {
        creep.toggleWorkingState();
        
        creep.memory.haulPos ??= { x: 33, y: 23, roomName: 'W38S38' };

        const haulTo = Game.spawns[creep.memory.bornIn].room;

        const pos = creep.memory.haulPos;

        // awerkiller
        // const haulFrom = new RoomPosition(34, 46, 'W38S38');
        const haulFrom = new RoomPosition(pos.x, pos.y, pos.roomName);

        const afkPos = new RoomPosition(2,46,'W37S38');


        if ( creep.memory.working ) {

            if (creep.room.name !== haulTo.name ) {
                creep.moveTo(haulTo.controller)
                return;
            } 
            const storage = creep.room.findStorage();
            if (storage)  {
                creep.myTransfer(storage);
                return
            }

            const any = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                            s.pos.x === creep.room.memory.corePos.x &&
                            s.pos.y === creep.room.memory.corePos.y              
            })
            if (any)  {
                creep.myTransfer(any[0]);
                return
            }

        } else {

            if ( creep.room.name !== haulFrom.roomName ) {
                creep.moveTo(haulFrom)
                return;
            }

            if ( creep.room.name === haulFrom.roomName ) {
                if (creep.pos.x === 49) {
                    creep.moveTo(haulFrom);
                    return;
                }
            }
        } 
        const drop = Game.rooms[haulFrom.roomName].find(FIND_DROPPED_RESOURCES)
        if (drop.length > 0) {
            creep.myPickup(drop[0]);
            return;
        }
        const container = Game.rooms[haulFrom.roomName].find(FIND_STRUCTURES, {
            filter: s => ( s.structureType === STRUCTURE_CONTAINER ||
                        s.structureType === STRUCTURE_STORAGE ) &&
                        s.store[RESOURCE_ENERGY] > 0
        })
        if (container.length > 0) {
            creep.myWithdraw(container[0], RESOURCE_ENERGY)
        }

    }
}