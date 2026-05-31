require('init');
const memoryManager = require('memory.manager');

require('global.functions')(global);
const diplomacy = require('global.diplomacy');
const roomManager = require('room.manager');
const roomDefense = require('room.defense');
const jobManager = require('job.manager');
const economyManager = require('room.economy');
const analyzer = require("room.analyzer");
const marketManager = require('market.manager');
const roles = {
    harvester: require('role.harvester'),
    builder: require('role.builder'),
    upgrader: require('role.upgrader'),
    hauler: require('role.hauler')
};

const spawnerManager = require('spawner');

function getCpu() {
  const sCpu = Game.cpu.getUsed()
  return sCpu
}

function printCpu(sCPU, obj, task) {
    Memory.stats ??= {};
    Memory.stats.cpu ??= {};
    Memory.stats.cpu[obj] ??= {};
    
    const stats = Memory.stats.cpu[obj]
    
    const alpha = 0.1;
    
    const cpu = Game.cpu.getUsed() - sCPU
    
    if (stats.avg == null) {
        stats.avg = cpu;
    } else {
        stats.avg = stats.avg * (1 - alpha) + cpu * alpha;
    }
    
    stats.peak = Math.max(stats.peak || 0, cpu);
    stats.last = cpu;
    stats.tick = Game.time;
    
    //console.log(`${obj} used ${cpu} cpu for ${task}`)
}

function measureCpu(what, callback) {
    const sCpu = Game.cpu.getUsed()
    const returnValue = callback()
    console.log(`${what} took ${Game.cpu.getUsed() - sCpu} cpu`)
    return returnValue
}

module.exports.loop = function () {

    const cpuStart = getCpu();
    // ==============================
    // 0. MEMORY MANAGER / RESET
    // ==============================
    const totalMemoryCpu = getCpu();

    memoryManager.run();

    printCpu(totalMemoryCpu, '0. MEMORY MANAGER / RESET', 'running' )

    // ==============================
    // 1. GLOBAL IMPORTANT
    // ==============================
    const globalWorkCpu = getCpu();

    diplomacy.run();

    printCpu(globalWorkCpu, '1. GLOBAL IMPORTANT', 'running' )

    // ==============================
    // 2. ROOM LOGIC
    // ==============================
    const totalRoomCpu = getCpu();
    for (let roomName in Game.rooms) {
        const room = Game.rooms[roomName];

        diplomacy.damageDetector(room);

        if (!room.controller?.my) continue;

        const mem = room.memory;

        if (!mem.plan?.corePos) {
            analyzer.analyzeRoom(room)
        } else {
            // room.debugPlan(mem.plan);
        }


        const roomcpu = getCpu();
        roomManager.run(room);
        printCpu(roomcpu, room, 'roomManager');
        
        const econcpu = getCpu();
        economyManager.run(room);
        printCpu(econcpu, room, 'economyManager');

        const jobcpu = getCpu();
        jobManager.run(room);
        printCpu(jobcpu, room, 'jobManager');

        const defcpu = getCpu();
        roomDefense.run(room);
        printCpu(defcpu, room, 'defenseManager');

        const spwncpu = getCpu();
        spawnerManager.run(room);
        printCpu(spwncpu, room, 'spawnerManager');
    }
    
    printCpu(totalRoomCpu, '2. ROOM LOGIC', 'running' )

    // ==============================
    // 3. ACTIONS TEMPORAIRES
    // ==============================


    // ==============================
    // 4. CREEP LOGIC
    // ==============================
    const cpuCreepsTotal = getCpu()

    const creepCount = {};
    const hitsMin = {};

    const creepsCpu = getCpu()
    for (let name in Game.creeps) {    
        const creepCpu = getCpu()
        const creep = Game.creeps[name];

        creepCount[creep.memory.role] ??= 0;
        hitsMin[creep.memory.role] ??= Infinity;

        creepCount[creep.memory.role]++;
        if ( creep.hits < hitsMin[creep.memory.role] ) {
            hitsMin[creep.memory.role] = creep.hits;
        }

        // measureCpu(`[${creep.name}]`, () => creep.run());

        creep.run();

    }

    const total = Object.values(creepCount)
    .reduce((sum, n) => sum + n, 0);

    printCpu(cpuCreepsTotal, `4. CREEP LOGIC`, 'running ${total} creeps')

    // ==============================
    // 5. SPAWN GLOBAL ROLES
    // ==============================
    const cpuGlobalSpawnTotal = getCpu()

    if (Game.time % 1000 >= 0 && Game.time % 1000 < 50) {
        Game.spawns['Spawn1'].spawnCreep([CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE], 'Jeanne', { memory: { role: 'manual' } });
    }
    // const enemyRoom = Game.rooms['W38S38'];
    // if ( enemyRoom ) {
    //     const enemySafeMode = Game.rooms['W38S38'].controller.safeMode
    //     if (!enemySafeMode) {
    //         if ( Game.time % 750 ) {
    //             Game.rooms['W36S38'].spawnCreepForRole('attacker', 1500);
    //             Game.rooms['W37S37'].spawnCreepForRole('attacker', 1500);
    //         }
    //     }
    // }
    
    printCpu(cpuGlobalSpawnTotal, '5. SPAWN GLOBAL ROLES', 'running')


    // ==============================
    // 6. TEST MARKET
    // ==============================
    // const cpuMarketTotal = getCpu()

    marketManager.run();

    // printCpu(cpuOtherRoles, '6. TEST MARKET', 'running')

    // ==============================
    // 7. CE BOT NE CONSOMME PAS ASSEZ DE CPU. AIDONS-LE UN PEU
    // ==============================

    if (Game.cpu.generatePixel && Game.cpu.bucket >= 10000) {
        console.log('generating a pixel');
        Game.cpu.generatePixel();
    }
    
    printCpu(cpuStart, 'Game Loop', 'running')
}