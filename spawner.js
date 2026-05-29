module.exports = {
    init: function(room) {
        room.memory.requested['harvester'] = room.find(FIND_SOURCES).length;
        for (const role in roles) {
            room.memory.requested[role] =
                roles[role].requested;
        }
    },

    run(room) {

        const queue = room.memory.spawnQueue ??= [];
        if (!queue.length) return;

        // const enemies = room.find(FIND_HOSTILE_CREEPS);
        // const storage = room.find(FIND_STRUCTURES, {
        //     filter: s => s.structureType === STRUCTURE_STORAGE &&
        //             s.store[RESOURCE_ENERGY] < 5000
        // });


        // if (enemies.length > 0 && storage.length > 0) {
        //     console.log('Ennemis présent avec low eco, spawn temporairement désactivé');
        //     return;
        // }
        
        const spawns = room.find(FIND_MY_SPAWNS);
        let spawn = null;
        if ( spawns.length > 0 ) {
            
            for (spawn of spawns) {
                
                if (!spawn) continue;
                
                if (spawn.spawning) {
                    const spawningCreep = Game.creeps[spawn.spawning.name];
                    spawn.room.visual.text(
                        '🛠️' + spawningCreep.memory.role,
                        spawn.pos.x + 1,
                        spawn.pos.y,
                        { align: 'left', opacity: 0.7 }
                    );
                    continue;
                }
            }
        }



        queue.sort((a,b)=>a.priority-b.priority);

        const request = queue[0];

        if (_.sum(request.body, p=>BODYPART_COST[p]) > room.energyAvailable)
            return;

        const result = spawn.spawnCreep(request.body, request.name, {
            memory:{
                role:request.role,
                jobId:request.jobId,
                working:false,
                bornIn:spawn.name,
                state:'afk',
                ...request.pushMemory
            }
        });
        if (result === OK) {
            queue.shift();
            console.log(`Spawning ${request.name} at ${room.name} with body: ${request.body}`)
        } else {
            console.log(`Echec spawn ${request.name} at ${room.name} (${result})`)
        }
    },
};