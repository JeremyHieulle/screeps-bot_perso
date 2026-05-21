module.exports = {

    run: function(creep, job) {
        // creep.toggleWorkingState();

        const roomSrc = Game.rooms['W36S38'];
        const roomDst = Game.rooms['W37S38'];
        
        // if ( target && creep.room.name == Game.flags.remote.pos.roomName && creep.pos.getRangeTo(target) < 2) {
        //     if(creep.attack(target) == ERR_NOT_IN_RANGE) {
        //         creep.moveTo(target);
        //     }
        //     return;
        // }
        // if ( creep.memory.working === true ) {
        //     if ( creep.room.name == Game.flags.remote.pos.roomName ) {
        //         const builds = {}; //creep.room.find(FIND_CONSTRUCTION_SITES)
        //         if ( builds.length > 0 ) {
        //             if (creep.build(builds[0]) === ERR_NOT_IN_RANGE) {
        //                 creep.moveTo(builds[0]);
        //             }
        //         } else {
        //             const controller = creep.room.controller;
        //             console.log(controller);
        //             if (!creep.myUpgrade(controller)) { creep.myTransfer(Game.spawns['Spawn2']) }//creep.moveTo(Game.flags.sos)};
        //         }
        //     } else {
        //         creep.moveTo(Game.flags.remote);
        //     }
        // } else {        
        //     if ( creep.room.name === Game.flags.remote.pos.roomName ) {
        //         const tombstones = creep.room.find(FIND_TOMBSTONES, {
        //             filter: t => t.store[RESOURCE_ENERGY] > 0
        //         });
        //         if ( tombstones.length > 0 ) {
        //             creep.myWithdraw(tombstones[0])
        //             return;
        //         } 
                
        //         const drops = creep.room.find(FIND_DROPPED_RESOURCES)
        //         if ( drops.length > 0 ) {
        //             creep.myPickup(drops[0])
        //             return;
        //         } 

        //         else {
        //             const source = creep.room.find(FIND_SOURCES)[creep.memory.sourceId || 0]
        //             creep.myHarvest(source)
        //         }
        //     } else {
        //         creep.moveTo(Game.flags.remote);
        //     }
        //     // creep.getEnergy({ excludeIds, weights });
        // }
        if ( creep.room.name === Game.rooms['W37S38'] ) {
            const target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: h => h.hits < h.hitsMax 
            })
            if (target) {
                creep.myHeal(target);
            } else {
                creep.moveTo(Game.flags.heal)
            }
        } else {
            creep.moveTo(Game.flags.heal);
        }
    }
}

