module.exports = {
    run: function(creep, job) {
        const forcedAttack = (Game.flags.attack);
        if (forcedAttack) {
            if(creep.room.name === Game.flags.attack.room.name) {
                const targets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3).filter(t => !isAlly(t.owner.username));
                if(targets.length > 0) {
                    if(creep.attack(targets[0]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(targets[0]);
                    }
                    return;
                }
           
                const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s =>
                        s.structureType === STRUCTURE_RAMPART &&
                        !s.my && 
                        !isAlly(s.owner.username)
                });


                if (target) {
                    if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                    return;
                }
            }
            creep.moveTo(Game.flags.attack);
            return;
        }

        const hostiles = creep.room.find(FIND_HOSTILE_CREEPS).filter(c => !isAlly(c.owner.username));
        if (hostiles.length > 0 ) {
            if (creep.attack(hostiles[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(hostiles[0])
            };
        }
        // const attackPos = new RoomPosition(34, 46, 'W38S38');
        // const healPos  = new RoomPosition(5, 20, 'W37S38');
        // const afkPos = new RoomPosition(4, 46, 'W37S38');

        // creep.memory.state ??= 'afk';

        // if ( creep.memory.state === 'move' ) {
        //     if (creep.pos.x === 1 ||
        //         creep.pos.x === 49 ||
        //         creep.pos.y === 1 ||
        //         creep.pos.y === 49
        //     ) {
        //         creep.moveTo(attackPos);
        //         return
        //     }

        //     if (creep.room.name === attackPos.roomName) {
        //         creep.memory.state = 'attacking'
        //     }

        //     creep.moveTo(attackPos);
        //     return;
        // }

        // if (creep.memory.state === 'attacking') {
        //     // creep.memory.state = 'wounded';
        // }


        // if (creep.memory.state === 'healing' && creep.hits === creep.hitsMax) {
        //     creep.memory.state = 'afk';
        // }

        // if (creep.memory.state === 'afk' && creep.pos.isNearTo(afkPos)) {
        //     const enemyRoom = Game.rooms[attackPos.roomName];
        //     if (enemyRoom) {
        //         const towers = enemyRoom.find(FIND_STRUCTURES, {
        //             filter: s => s.structureType === STRUCTURE_TOWER &&
        //                             s.store[RESOURCE_ENERGY] > 9
        //         })
        //         console.log(towers)
        //         if (towers.length <= 0) {
        //             console.log("gogogo");
        //             creep.memory.state = 'move';
        //             return;
        //         }
        //     }
        // }

        // // actions
        // if (creep.memory.state === 'afk') {
        //     creep.moveTo(afkPos);
        //     if(creep.room.name === afkPos.roomName) {
        //         const targets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 4);
        //         if(targets.length > 0) {
        //             if(creep.attack(targets[0]) == ERR_NOT_IN_RANGE) {
        //                 creep.moveTo(targets[0]);
        //             }
        //         }
        //     }
        // }
        // if (creep.memory.state === 'wounded') {
        //     creep.moveTo(afkPos);
        // }

        // if (creep.memory.state === 'healing') {
        //     creep.moveTo(healPos);
        // }


        // if (creep.memory.state === 'attacking') {
        //     if (creep.room.name !== attackPos.roomName) {
        //         creep.moveTo(attackPos);
        //         return;
        //     }
        //     const target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);

        //     if (target) {
        //         if (creep.attack(target) === ERR_NOT_IN_RANGE) {
        //             creep.moveTo(target);
        //         };
        //         return
        //     } else {
        //         const newTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        //             filter: s => s.structureType === STRUCTURE_TOWER || 
        //                         s.structureType === STRUCTURE_LINK || 
        //                         s.structureType === STRUCTURE_WALL
        //             })
                
        //         if (creep.attack(newTarget) === ERR_NOT_IN_RANGE) {
        //             creep.moveTo(newTarget);
        //         };
        //     }
        // }
    }
}




