module.exports = {
    init: function(room) {
        room.memory.requested['harvester'] = room.find(FIND_SOURCES).length;
        for (const role in roles) {
            room.memory.requested[role] =
                roles[role].requested;
        }
    },

    buildBody: function(role, maxEnergy) {
        if (role === 'scout') {
            const body = [
                TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,
                ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,
                ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,
                ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,
                ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,
            ];

            return body;
        }

        if (role === 'remoteBuilder') {
            const body = [
                WORK,CARRY,MOVE,WORK,CARRY,MOVE,
                WORK,CARRY,MOVE,WORK,CARRY,MOVE,
                WORK,CARRY,MOVE,WORK,CARRY,MOVE,
                WORK,CARRY,MOVE,WORK,CARRY,MOVE,
                WORK,CARRY,MOVE,WORK,CARRY,MOVE
            ];

            return body;
        }

        if (role === 'remoteHauler') {
            const body = [
                TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,
                CARRY,MOVE,CARRY,MOVE,CARRY,MOVE,
                CARRY,MOVE,CARRY,MOVE,CARRY,MOVE,
                CARRY,MOVE,CARRY,MOVE,CARRY,MOVE,
                MOVE,MOVE
            ];

            return body;
        }

        if (role === 'harvester') {
            let body = [CARRY, MOVE, WORK];
            let sum = 200;

            // DEPRECATED : nouveau spawn pour les harvesters > 550
            // La boucle ajoute un bodypart jusqu'à ce que ça pète
            for ( let i = 0; i < 5; i++) {
                sum += 100;
                if (sum > maxEnergy || body.length >= 50) break;
                body.push(WORK);
            }

            sum += 50;
            if (sum <= maxEnergy && body.length < 50) body.push(MOVE);
            sum += 50;
            if (sum <= maxEnergy && body.length < 50) body.push(MOVE);
            
            return body;
        }
    
        if (role === 'upgrader') {
            let body = [WORK, CARRY, MOVE];
            let sum = 200;
            let moveCount = 1;

            // La boucle ajoute un bodypart jusqu'à ce que ça pète
            while (1) {
                // d'après un test, un seul MOVE est plus efficace
                // (7 WORK au lieu de 6 = 1400 ressources déposés au lieu de 600)
                // if ( body.length / 3 > moveCount ) {
                //     sum += 50;
                //     if (sum > maxEnergy || body.length >= 50) break;
                //     body.push(MOVE);
                //     moveCount++;
                // }
                sum += 100;
                if (sum > 300 || body.length >= 50) break;
                body.push(WORK);
            }

            // Si on a encore de la place (break avant push work et il reste 50), on ajoute un MOVE
            if ( sum < maxEnergy && body.length < 50 ) { body.push(MOVE); }

            return body;
        }

        if (role === 'hauler') {
            let body = [CARRY, CARRY, MOVE];
            let sum = 150;

            // La boucle ajoute un bodypart jusqu'à ce que ça pète
            while (1) {
                sum += 150;
                if (sum > ( maxEnergy * 2 / 3 ) || body.length >= 50) break;
                body.push(CARRY);
                body.push(CARRY);
                body.push(MOVE);
            }

            return body;
        }

        if (role === 'builder') {
            let body = [WORK, CARRY, MOVE];
            let sum = 200;

            // La boucle ajoute un bodypart jusqu'à ce que ça pète
            while (1) {
                sum += 50;
                if (sum > maxEnergy || body.length >= 50) break;
                body.push(WORK);

                sum += 50;
                if (sum > maxEnergy || body.length >= 50) break;
                body.push(CARRY);

                sum += 100;
                if (sum > maxEnergy || body.length >= 50) break;
                body.push(MOVE);
            }

            // Le builder est équilibré en MOVE :
            // Si on a encore de la place (break avant push work et il reste 50), on ajoute un CARRY
            // if ( sum < 600 && body.length < 50 ) { body.push(CARRY); }

            return body;
        }

        if (role === 'longharvester') {
            let body = [WORK, CARRY, MOVE, MOVE];
            let sum = 250;
            
            // La boucle ajoute un bodypart jusqu'à ce que ça pète
            while (1) {
                sum += 50;
                if (sum > maxEnergy || body.length >= 50) break;
                body.push(MOVE);

                sum += 50;
                if (sum > maxEnergy || body.length >= 50) break;
                body.push(CARRY);

                sum += 50;
                if (sum > maxEnergy || body.length >= 50) break;
                body.push(MOVE);

                sum += 100;
                if (sum > maxEnergy || body.length >= 50) break;
                body.push(WORK);
            }

            // Le longharvester est équilibré en MOVE :
            // Si on a encore de la place (break avant push work et il reste 50), on ajoute un CARRY
            if ( sum < maxEnergy && body.length < 50 ) { body.push(CARRY); }

            return body;
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
        
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;

        if (spawn.spawning) {
            const spawningCreep = Game.creeps[spawn.spawning.name];
            spawn.room.visual.text('🛠️' + spawningCreep.memory.role,
                spawn.pos.x + 1, spawn.pos.y, { align: 'left', opacity: 0.7 });
            return;
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