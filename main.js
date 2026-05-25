require('init');
const memoryManager = require('memory.manager');

require('utils/global.functions')(global);
const diplomacy = require('global.diplomacy');
const roomManager = require('room.manager');
const roomDefense = require('room.defense');
const jobManager = require('job.manager');
const economyManager = require('room.economy');
const analyzer = require("room.analyzer");

const roles = {
    longharvester: require('role.longharvester'),
    harvester: require('role.harvester'),
    builder: require('role.builder'),
    upgrader: require('role.upgrader'),
    hauler: require('role.hauler')
};

const spawnerManager = require('spawner');



function buildDangerMap(room) {

    const terrain = Game.map.getRoomTerrain(room.name);
    const matrix = new PathFinder.CostMatrix();

    const queue = [];

    // 1️⃣ seed = exits
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {

            if (terrain.get(x,y) === TERRAIN_MASK_WALL) continue;

            if (x === 0 || y === 0 || x === 49 || y === 49) {
                matrix.set(x,y,1);
                queue.push({x,y});
            }
        }
    }

    // 2️⃣ flood fill
    while (queue.length) {

        const pos = queue.shift();
        const value = matrix.get(pos.x,pos.y);

        for (let dx=-1; dx<=1; dx++) {
            for (let dy=-1; dy<=1; dy++) {

                const nx = pos.x + dx;
                const ny = pos.y + dy;

                if (nx<0||ny<0||nx>49||ny>49) continue;
                if (terrain.get(nx,ny) === TERRAIN_MASK_WALL) continue;

                if (matrix.get(nx,ny) !== 0) continue;

                matrix.set(nx,ny,value+1);
                queue.push({x:nx,y:ny});
            }
        }
    }

    return matrix;
}

function drawDangerMap(room, matrix) {

    const vis = room.visual;

    for (let x=0;x<50;x++){
        for (let y=0;y<50;y++){

            const v = matrix.get(x,y);
            if (!v) continue;

            vis.text(
                v,
                x,
                y,
                {font:0.4, opacity:0.6}
            );
        }
    }
}

function serializeMatrix(matrix) {
    const data = [];

    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            data.push(matrix.get(x,y));
        }
    }

    return data;
}

function deserializeMatrix(data) {

    const matrix = new PathFinder.CostMatrix();

    let i = 0;

    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            matrix.set(x,y,data[i++]);
        }
    }

    return matrix;
}

function getCpu() {
  const sCpu = Game.cpu.getUsed()
  return sCpu
}

function printCpu(sCPU, obj, task) {
    const cpu = Game.cpu.getUsed() - sCPU
    // console.log(`${obj} used ${cpu} cpu for ${task}`)
}

function measureCpu(what, callback) {
    const sCpu = Game.cpu.getUsed()
    const returnValue = callback()
    console.log(`${what} took ${Game.cpu.getUsed() - sCpu} cpu`)
    return returnValue
}

module.exports.loop = function () {

    // ==============================
    // 0. MEMORY MANAGER / RESET
    // ==============================

    memoryManager.run();


    // ==============================
    // 0. GLOBAL IMPORTANT
    // ==============================

    diplomacy.run();


    // ==============================
    // 1. ROOM LOGIC
    // ==============================

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



    // ==============================
    // 2. ACTIONS TEMPORAIRES
    // ==============================

    // TEMP LINK W36S38
    const linkFrom_1 = Game.getObjectById('6a0ab9f0700e8db26c046f67');
    const linkFrom_2 = Game.getObjectById('6a0ab6421c370712f14b2199');
    const linkTo = Game.getObjectById('6a0ab30ee45edf33d8d39d21');
    if (linkFrom_1 && linkTo && linkTo.store.getFreeCapacity(RESOURCE_ENERGY) >= 200 ) linkFrom_1.transferEnergy(linkTo);
    if (linkFrom_2 && linkTo && linkTo.store.getFreeCapacity(RESOURCE_ENERGY) >= 200 ) linkFrom_2.transferEnergy(linkTo);

    // TEMP LINK W37S37
    const linkFrom2_1 = Game.getObjectById('6a01b8db96e31b50b048ffd9');
    const linkFrom2_2 = Game.getObjectById('6a09c602b231a894d86f885e');
    const linkTo2 = Game.getObjectById('6a07fd2c52094f673f8a6e69');
    if (linkFrom2_1 && linkTo2 && linkTo2.store.getFreeCapacity(RESOURCE_ENERGY) >= 200 ) linkFrom2_1.transferEnergy(linkTo2);
    if (linkFrom2_2 && linkTo2 && linkTo2.store.getFreeCapacity(RESOURCE_ENERGY) >= 200 ) linkFrom2_2.transferEnergy(linkTo2);



    // ==============================
    // 4. CREEP LOGIC
    // ==============================

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

        // printCpu(creepCpu, `${creep}`, 'yada yada')
    }

    const total = Object.values(creepCount)
    .reduce((sum, n) => sum + n, 0);
    printCpu(creepsCpu, `${total} creeps`, 'running')



    // ==============================
    // 4. SPAWN GLOBAL ROLES
    // ==============================
    
    
    const remoteMiner = Object.values(Game.creeps)
        .filter(c => c.memory.role === 'remoteMiner');

    if ( remoteMiner.length < 1 ) {
        Game.rooms['W36S38'].spawnCreepForRole('remoteMiner');
    }
     
    // if ( Game.time % 600 === 0 ) { 
    //     const room = Game.rooms['W37S37'];
    //     room.spawnCreepForRole('drainer');
    // }
    // if ( Game.time % 700 === 0 ) { 
    //     const room = Game.rooms['W36S38'];
    //     room.spawnCreepForRole('drainerHealer');
    // }

    // if ( Game.time % 1400 === 0 ) { 
    //     const room = Game.rooms['W37S37'];
    //     room.spawnCreepForRole('drainerHealer');
    // }


    if ((Game.time % 1500 ) - 78 === 0 ) {
        Game.rooms['W36S38'].spawnCreepForRole('remoteHauler', 1300, { haulPos: { x: 43, y: 17, roomName: 'W37S38'}})
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


    // ==============================
    // 5. TEST MARKET
    // ==============================
    // if (Game.time % 20 === 0) {
    // const marketcpu = getCpu();
    //     const fromRoom = "W36S38";
    //     const resourceType = RESOURCE_ENERGY;
    //     const amount = 1000;

    //     // ==============================
    //     // 1. BEST SELL ORDER (BUY ENERGY)
    //     // ==============================
    //     const sellOrders = Game.market.getAllOrders(o =>
    //         o.type === ORDER_SELL &&
    //         o.resourceType === resourceType
    //     );

    //     const bestSell = _.min(sellOrders, o => {

    //         const qty = Math.min(amount, o.remainingAmount);

    //         const transferCost = Game.market.calcTransactionCost(qty, fromRoom, o.roomName);

    //         const cost = (o.price * qty) + transferCost;

    //         return cost;
    //     });

    //     // énergie réellement obtenue après coût
    //     let effectiveEnergy = 0;
    //     let buyCost = 0;

    //     if (bestSell) {
    //         const qty = Math.min(amount, bestSell.remainingAmount);

    //         buyCost = (bestSell.price * qty)
    //             + Game.market.calcTransactionCost(qty, fromRoom, bestSell.roomName);

    //         effectiveEnergy = qty - Game.market.calcTransactionCost(qty, fromRoom, bestSell.roomName);
    //     }

    //     // ==============================
    //     // 2. BEST BUY ORDER (SELL ENERGY)
    //     // ==============================
    //     const buyOrders = Game.market.getAllOrders(o =>
    //         o.type === ORDER_BUY &&
    //         o.resourceType === resourceType
    //     );

    //     const bestBuy = _.max(buyOrders, o => {

    //         const qty = Math.min(effectiveEnergy, o.remainingAmount);

    //         const transferCost = Game.market.calcTransactionCost(qty, fromRoom, o.roomName);

    //         const revenue = (o.price * qty) - transferCost;

    //         return revenue;
    //     });

    //     // ==============================
    //     // 3. FINAL PROFIT
    //     // ==============================
    //     if (bestSell && bestBuy) {

    //         const sellQty = Math.min(amount, bestSell.remainingAmount);
    //         const buyQty = Math.min(effectiveEnergy, bestBuy.remainingAmount);

    //         const finalSellRevenue =
    //             (bestBuy.price * buyQty)
    //             - Game.market.calcTransactionCost(buyQty, fromRoom, bestBuy.roomName);

    //         const initialCost =
    //             (bestSell.price * sellQty)
    //             + Game.market.calcTransactionCost(sellQty, fromRoom, bestSell.roomName);

    //         const profit = finalSellRevenue - initialCost;

    //         console.log(
    //     `MARKET ARBITRAGE
    //     BUY ENERGY FROM SELL ORDER:
    //     id:${bestSell.id}
    //     cost:${initialCost}
    //     energy:${effectiveEnergy}

    //     SELL ENERGY TO BUY ORDER:
    //     id:${bestBuy.id}
    //     revenue:${finalSellRevenue}

    //     PROFIT:${profit}`
    //         );
    //     }
    // console.log(`Marker took ${Game.cpu.getUsed() - marketcpu} cpu`)
    // }

    // ==============================
    // 6. CE BOT NE CONSOMME PAS ASSEZ DE CPU. AIDONS-LE UN PEU
    // ==============================

    if (Game.cpu.generatePixel && Game.cpu.bucket >= 10000) {
        console.log('generating a pixel');
        Game.cpu.generatePixel();
    }
}