// room.metrics.js

const SNAPSHOT_INTERVAL = 25;

function accumulateEvents(room) {

    global._metricsAccum ??= {};
    global._metricsAccum[room.name] ??= {
        harvest: 0,
        harvestRemote: 0,
        build: 0,
        upgrade: 0,
        attack: 0,
        ticks: 0
    };

    const accum = global._metricsAccum[room.name];

    // events locaux
    for (const e of room.getEventLog()) {
        switch (e.event) {
            case EVENT_HARVEST:            accum.harvest  += e.data.amount      || 0; break;
            case EVENT_BUILD:              accum.build    += e.data.energySpent || 0; break;
            case EVENT_UPGRADE_CONTROLLER: accum.upgrade  += e.data.energySpent || 0; break;
            case EVENT_ATTACK:             accum.attack   += e.data.damage      || 0; break;
        }
    }

    // events remotes visibles
    const remotes = Object.entries(Memory.remotes || {})
        .filter(([, r]) => r.owner === room.name)
        .map(([name]) => name);

    for (const remoteName of remotes) {
        const remoteRoom = Game.rooms[remoteName];
        if (!remoteRoom) continue;
        for (const e of remoteRoom.getEventLog()) {
            if (e.event === EVENT_HARVEST) {
                accum.harvestRemote += e.data.amount || 0;
            }
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
    metrics.harvestLocalPerTick  = +(accum.harvest                          / ticks).toFixed(2);
    metrics.harvestRemotePerTick = +(accum.harvestRemote                    / ticks).toFixed(2);
    metrics.harvestPerTick       = +((accum.harvest + accum.harvestRemote)  / ticks).toFixed(2);
    metrics.consumedPerTick      = +((accum.build   + accum.upgrade)        / ticks).toFixed(2);
    metrics.netFlux              = +(metrics.harvestPerTick - metrics.consumedPerTick).toFixed(2);

    // =========================================
    // SPAWN
    // =========================================
    const allCreeps = Object.values(Game.creeps).filter(c =>
        Game.spawns[c.memory.bornIn]?.room.name === room.name
    );

    let spawnLoadLocal  = 0;
    let spawnLoadRemote = 0;

    const REMOTE_ROLES = new Set([
        'remoteMiner', 'remoteHauler', 'remoteReserver',
        'remoteDefender', 'coreKiller'
    ]);

    for (const creep of allCreeps) {
        const load = (creep.body.length * 3) / CREEP_LIFE_TIME;
        if (REMOTE_ROLES.has(creep.memory.role)) spawnLoadRemote += load;
        else spawnLoadLocal += load;
    }

    for (const queued of (room.memory.spawnQueue || [])) {
        spawnLoadLocal += (queued.body.length * 3) / CREEP_LIFE_TIME;
    }

    metrics.spawnLoadLocal  = +spawnLoadLocal.toFixed(3);
    metrics.spawnLoadRemote = +spawnLoadRemote.toFixed(3);
    metrics.spawnLoad       = +(spawnLoadLocal + spawnLoadRemote).toFixed(3);

    metrics.spawnQueue  = (room.memory.spawnQueue || []).length;
    metrics.creepCount  = allCreeps.length;

    metrics.roles = {};
    for (const creep of allCreeps) {
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

    const haulers = allCreeps.filter(c => c.memory.role === 'hauler');
    const haulerCapacity = haulers.reduce((sum, c) => sum + c.store.getCapacity(), 0);
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
        for (const creep of allCreeps) {
            if (!REMOTE_ROLES.has(creep.memory.role)) continue;
            if (creep.memory.targetRoom !== remoteName) continue;
            spawnCost += (creep.body.length * 3) / CREEP_LIFE_TIME;
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
        harvestRemote: 0,
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