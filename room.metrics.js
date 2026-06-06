// room.metrics.js

const SNAPSHOT_INTERVAL = 25;

function accumulateEvents(room) {

    global._metricsAccum ??= {};
    global._metricsAccum[room.name] ??= {
        harvest: 0,
        build: 0,
        upgrade: 0,
        attack: 0,
        ticks: 0
    };

    const accum = global._metricsAccum[room.name];
    const events = room.getEventLog();

    for (const e of events) {
        switch (e.event) {
            case EVENT_HARVEST:
                accum.harvest += e.data.amount || 0;
                break;
            case EVENT_BUILD:
                accum.build += e.data.energySpent || 0;
                break;
            case EVENT_UPGRADE_CONTROLLER:
                accum.upgrade += e.data.energySpent || 0;
                break;
            case EVENT_ATTACK:
                accum.attack += e.data.damage || 0;
                break;
        }
    }

    accum.ticks++;
}

function snapshotMetrics(room) {

    global._metrics ??= {};
    global._metricsAccum ??= {};

    const accum = global._metricsAccum[room.name];
    if (!accum || accum.ticks === 0) return;

    const ticks = accum.ticks;
    const metrics = global._metrics[room.name] ??= {};

    metrics.lastUpdated = Game.time;

    // =========================================
    // FLUX ECONOMIQUE
    // =========================================
    metrics.harvestPerTick   = +(accum.harvest / ticks).toFixed(2);
    metrics.buildPerTick     = +(accum.build   / ticks).toFixed(2);
    metrics.upgradePerTick   = +(accum.upgrade / ticks).toFixed(2);
    metrics.consumedPerTick  = +((accum.build + accum.upgrade) / ticks).toFixed(2);
    metrics.netFlux          = +(metrics.harvestPerTick - metrics.consumedPerTick).toFixed(2);

    // =========================================
    // SPAWN
    // =========================================
    const creeps = room.find(FIND_MY_CREEPS);
    let spawnLoad = 0;

    for (const creep of creeps) {
        spawnLoad += (creep.body.length * 3) / CREEP_LIFE_TIME;
    }
    for (const queued of (room.memory.spawnQueue || [])) {
        spawnLoad += (queued.body.length * 3) / CREEP_LIFE_TIME;
    }

    metrics.spawnLoad    = +spawnLoad.toFixed(3);
    metrics.spawnQueue   = (room.memory.spawnQueue || []).length;
    metrics.creepCount   = creeps.length;

    // roles
    metrics.roles = {};
    for (const creep of creeps) {
        const role = creep.memory.role || 'unknown';
        metrics.roles[role] ??= 0;
        metrics.roles[role]++;
    }

    // =========================================
    // LOGISTIQUE
    // =========================================
    const dropped = room.find(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY
    });
    metrics.droppedEnergy = dropped.reduce((sum, r) => sum + r.amount, 0);

    const haulers = creeps.filter(c => c.memory.role === 'hauler');
    const haulerCapacity = haulers.reduce((sum, c) =>
        sum + c.store.getCapacity(), 0
    );
    metrics.haulerStress = haulerCapacity > 0
        ? +(metrics.droppedEnergy / haulerCapacity).toFixed(2)
        : 0;

    // =========================================
    // STORAGE / TERMINAL
    // =========================================
    metrics.storageEnergy  = room.storage?.store[RESOURCE_ENERGY]  || 0;
    metrics.terminalEnergy = room.terminal?.store[RESOURCE_ENERGY] || 0;

    // =========================================
    // REMOTES
    // =========================================
    const remoteIncome = {};
    const remotes = Object.entries(Memory.remotes || {})
        .filter(([, r]) => r.owner === room.name)
        .map(([name]) => name);

    for (const remoteName of remotes) {
        const remoteData = room.memory.remotes?.[remoteName];
        if (!remoteData?.sources) continue;

        let spawnCost = 0;
        const miners  = Object.values(Game.creeps).filter(c =>
            c.memory.role === 'remoteMiner' &&
            c.memory.targetRoom === remoteName
        );
        const haulers = Object.values(Game.creeps).filter(c =>
            c.memory.role === 'remoteHauler' &&
            c.memory.targetRoom === remoteName
        );

        for (const c of [...miners, ...haulers]) {
            spawnCost += (c.body.length * 3) / CREEP_LIFE_TIME;
        }

        remoteIncome[remoteName] = {
            spawnLoad: +spawnCost.toFixed(3)
        };
    }

    metrics.remotes = remoteIncome;

    // =========================================
    // RESET ACCUM
    // =========================================
    global._metricsAccum[room.name] = {
        harvest: 0,
        build: 0,
        upgrade: 0,
        attack: 0,
        ticks: 0
    };
}

module.exports = {
    run: function(room) {
        accumulateEvents(room);
        if (Game.time % SNAPSHOT_INTERVAL === 0) {
            snapshotMetrics(room);
        }
    }
};