module.exports = {

    run: function(creep, job) {

        creep.toggleWorkingState();
        
        if(!job) {
            creep.say('🕹');
            // const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            //     filter: s =>
            //         s.structureType === STRUCTURE_EXTENSION
            // });

            // if (target) {
            //     if (creep.dismantle(target) === ERR_NOT_IN_RANGE) {
            //         creep.moveTo(target);
            //     }
            //     return;
            // }
            if (creep.memory.working) {
                const target = Game.getObjectById('6a0d7cd7a9844d0013c548b6');
                creep.build(target);
            } else {
                const target = Game.getObjectById('6a09bd8a3a3fd2304d6af0a3');
                creep.myWithdraw(target, RESOURCE_ENERGY)
            }
            return;
            
            if (creep.getActiveBodyparts(ATTACK) > 0) {
                let target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { 
                    filter: function(object) {
                        return object.getActiveBodyparts(ATTACK) > 0;
                    }
                });
                if (!target)
                    target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
                if ( target && creep.pos.getRangeTo(target) < 50) {
                    if(creep.attack(target) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                } else {
                    creep.moveTo(Game.flags.manual);
                }
            } else {
                creep.moveTo(Game.flags.manual);
            }
        } else {
            creep.say('⁉scoutjob?')
        }

        // if (creep.memory.working) {
        //     creep.say('🕹 🎒');
        //     const terminal = creep.room.findTerminal();
        //     if (terminal) {
        //         for (const resourceType in creep.store) {
        //             creep.myTransfer(terminal, resourceType);
        //         }

        //     }
        // } else {
        //     const storage = creep.room.findStorage();

        //     if (storage) {
        //         for (const resourceType in storage.store) {
        //             creep.myWithdraw(storage, resourceType);
        //         }
        //         creep.say('🕹 ✨');
        //         return;
        //     }
        //     creep.getEnergy();
        // }


        // if(!job) {
        //     creep.say('🕹');
        //     const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { 
        //         filter: function(object) {
        //             return object.getActiveBodyparts(ATTACK) > 0;
        //         }
        //     });

        //     if ( target && creep.pos.getRangeTo(target) < 2) {
        //         if(creep.attack(target) == ERR_NOT_IN_RANGE) {
        //             creep.moveTo(target);
        //         }
        //     } else {
        //         // if (creep.room.name === 'W37S37') {
        //         //     creep.claimController(creep.room.controller);
        //         // }
        //         creep.moveTo(creep.room.controller);
        //     }
        // } else {
        //     creep.say('claimjob?')
        // }
    }
}