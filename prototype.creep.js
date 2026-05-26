if (!Creep.prototype._moveTo) {

    Creep.prototype._moveTo = Creep.prototype.moveTo;

    Creep.prototype.moveTo = function (...args) {

        // ==============================
        // ROLE-BASED reusePath injection
        // ==============================

        const role = this.memory.role;

        const reuseByRole = {
            remoteBuilder: 15,
            remoteMiner: 30,
            remoteHauler: 30,
            hauler: 20,
            harvester: 10,
            upgrader: 15,
            drainer: 3,
            drainerHealer: 20,
            attacker: 2,
            healer: 2,
            scout: 30
        };

        const lastArg = args[args.length - 1];
        const reusePath = reuseByRole[role] ?? 10
        if (typeof lastArg === 'object' && args.length > 1) {
            lastArg.reusePath = reusePath;
        } else {
            args.push({ reusePath });
        }

        // ==============================
        // CALL ORIGINAL
        // ==============================
        return this._moveTo(...args);
    };
}

Creep.prototype.toggleWorkingState = function () {
    this.memory.working ??= false;

    if (this.memory.working && this.store[RESOURCE_ENERGY] === 0) {
        this.memory.working = false;
    }

    if (!this.memory.working && this.store.getFreeCapacity() === 0) {
        this.memory.working = true;
    }
}

Creep.prototype.myHarvest = function (source) {

    const result = this.harvest(source);

    if (result === ERR_NOT_IN_RANGE) {
        this.moveTo(source);
    }

    if ( result === ERR_NO_BODYPART ) {
        this.say(`I can't 🏭`);   
    }

    return result;
}

Creep.prototype.myBuild = function (x) {
    if (this.build(x) === ERR_NOT_IN_RANGE) {
        this.moveTo(x);
    }
}

Creep.prototype.myPickup = function (x) {
    if (this.pickup(x) === ERR_NOT_IN_RANGE) {
        this.moveTo(x);
    }
}

Creep.prototype.myWithdraw = function (x, y) {
    y ??= RESOURCE_ENERGY;
    if (this.withdraw(x, y) === ERR_NOT_IN_RANGE) {
        this.moveTo(x);
    }
}

Creep.prototype.myHeal = function (x) {
    if (this.heal(x) === ERR_NOT_IN_RANGE) {
        this.moveTo(x);
    }
}
Creep.prototype.myRepair = function (x) {
    if (this.repair(x) === ERR_NOT_IN_RANGE) {
        this.moveTo(x);
    }
    // console.log('Repairing ' + x + ', return: ' + this.repair(x));
}

Creep.prototype.myTransfer = function (x, y) {

    y ??= RESOURCE_ENERGY;

    const result = this.transfer(x, y) 
    
    if ( result === ERR_NOT_IN_RANGE) {
        this.moveTo(x);
    }

    return result
}

Creep.prototype.myUpgrade = function (x) {
    if (this.upgradeController(x) === ERR_NOT_IN_RANGE) {
        this.moveTo(x);
    }
}

Creep.prototype.dumpNonEnergy = function (range) {

    if (!this.room.controller?.my) 
        return ERR_NOT_OWNER;

    let storage = this.room.getCached("structure", STRUCTURE_STORAGE);
    if (!storage) storage = this.room.getCached("structure", STRUCTURE_TERMINAL);

    if (!storage)
        return ERR_NOT_FOUND;

    const dist = this.pos.getRangeTo(storage);
    if (dist > range)
        return ERR_INVALID_TARGET;


    for (const resourceType in this.store) {

        if (resourceType === RESOURCE_ENERGY) continue;
        if (this.store[resourceType] <= 0) continue;

        return this.myTransfer(storage, resourceType);
    }

    return ERR_NOT_FOUND;
}

Creep.prototype.run = function () {

    if ( this.ticksToLive > 1470 ) {
        this.say('im fresh!');
    }

    const energy = this.store[RESOURCE_ENERGY] || 0;
    const used = this.store.getUsedCapacity();

    const hasRareResources = used > energy;

    if (hasRareResources) {
        if (this.dumpNonEnergy(5) === OK) return;
    }

    const JOB_ROLES = new Set([
        'harvester',
        'hauler',
        'builder',
        'upgrader',
        'manager'
    ]);

    let job = this.room.memory.jobs[this.memory.jobId];

    if (JOB_ROLES.has(this.memory.role) && !job) {
        if (this.room.requestJob(this)) {
            job = this.room.memory.jobs[this.memory.jobId];
        }
    }

    if (job) {
        
        const jobHandlers = require('handlers.job');
        const handler = jobHandlers[this.memory.role]
        
        handler.run(this, job);
    } else {
        this.memory.jobId = null;
        const handlers = require('handlers.role');
        const handler = handlers[this.memory.role];
            
        handler.run(this); 
    }
}

Creep.prototype.getEnergy = function (options = {}) {

    const upgradeContainer = this.room.findByTag("controller", STRUCTURE_CONTAINER);
    const coreContainer = this.room.findByTag("core", STRUCTURE_CONTAINER);
    const links = this.room.getCached("structure", STRUCTURE_LINK)
    const storage = this.room.getCached("structure", STRUCTURE_STORAGE);
    const containers = this.room.getCached("structure", STRUCTURE_CONTAINER);

    if ( this.memory.role === 'upgrader' ) {
        for ( const link of links ) {
            if ( this.pos.isNearTo(link) && 
                link.store[RESOURCE_ENERGY] >= this.store.getFreeCapacity()) {
                this.withdraw(link, RESOURCE_ENERGY);
                return;
            }
        }

        if ( upgradeContainer && upgradeContainer.store[RESOURCE_ENERGY] > 0 ) {
            this.myWithdraw(upgradeContainer, RESOURCE_ENERGY);
            return;
        }
    }

    const sources = this.room.find(FIND_SOURCES, {
        filter: s => s.energy > 0
    })

    if (sources.length > 0 && this.memory.role === 'remoteBuilder' && this.getActiveBodyparts(WORK) > 0) {
        this.myHarvest(sources[0])
        return;
    }
    
    const defaultWeights = {
        storage: 2,
        container: 1.5,
        pickup: 0.8,
        tombstone: 1,
        ruin: 1,
        link : 1.2
    };

    const { excludeIds = [], weights = {} } = options;

    const targets = [];

    const tombstones = this.room.find(FIND_TOMBSTONES, {
        filter: t => t.store[RESOURCE_ENERGY] > 0
    });

    const ruins = this.room.find(FIND_RUINS, {
        filter: r => r.store[RESOURCE_ENERGY] > 0
    });
    
    const drops = this.room.find(FIND_DROPPED_RESOURCES);
    for (const link of links) {
        if ( link && link.store[RESOURCE_ENERGY] > 200 ) {
            targets.push({
                id: link.id,
                action: 'withdraw',
                type: 'link',
                free: link.store.getFreeCapacity(),
                pos: link.pos
            });
        }
    }

    for (const container of containers) {

        if (this.memory.jobId === `haul_${container.id}`) continue;

        const isUpgrade = upgradeContainer && container.id === upgradeContainer.id;
        const isCore = coreContainer && container.id === coreContainer.id;

        if (isUpgrade) {
            if (this.memory.role === 'hauler') continue
            if (this.memory.role !== 'upgrader' &&
                upgradeContainer.store.getFreeCapacity() > 1000) continue;
        }

        if (isCore) {
            if (this.memory.role === 'hauler') continue;
        }
        if (container.store[RESOURCE_ENERGY] <= 0) continue;

        targets.push({
            id: container.id,
            action: 'withdraw',
            type: 'container',
            free: container.store.getFreeCapacity(),
            pos: container.pos
        });
    }

    for (const s of storage) {
        if (this.memory.jobId === `haul_${s.id}`) continue;
        if (excludeIds.includes(s.id)) continue;
        if (s.store[RESOURCE_ENERGY] <= 0) continue;

        targets.push({
            id: s.id,
            action: 'withdraw',
            type: 'storage',
            free: s.store.getFreeCapacity(),
            pos: s.pos
        });
    }

    for (const tomb of tombstones) {
        targets.push({
            id: tomb.id,
            action: 'withdraw',
            type: 'tomb',
            pos: tomb.pos
        });
    }

    for (const ruin of ruins) {
        targets.push({
            id: ruin.id,
            action: 'withdraw',
            type: 'ruin',
            pos: ruin.pos
        });
    }

    for (const drop of drops) {
        if (drop.resourceType !== RESOURCE_ENERGY) continue
        if (
            drop.pos.isNearTo(this.room.memory.plan.corePos.x, this.room.memory.plan.corePos.y) &&
            this.memory.role !== 'upgrader' &&
            this.memory.role !== 'builder'
        ) { continue }

        targets.push({
            id: drop.id,
            action: 'pickup',
            type: 'drop',
            pos: drop.pos
        });
    }

    let best = null;
    let bestScore = Infinity;

    for (const t of targets) {
        const pos = t.pos;

        const dist = this.pos.getRangeTo(pos);

        const free = this.store.getFreeCapacity();
        const energy = t.action === 'pickup'
            ? Game.getObjectById(t.id)?.amount || 0
            : Game.getObjectById(t.id)?.store?.energy || 0;

        const benefit = Math.min(free, energy);
        const effectiveBenefit = ( benefit > 20 ) ? benefit : 20
        let weight =
            weights[t.type] ?? defaultWeights[t.type] ?? 1;

        const score = ( dist + 5 ) * weight / Math.log1p(effectiveBenefit / 20);

        if (score < bestScore) {
            bestScore = score;
            best = t;
        }
    }

    if (!best) {
        this.say('No energy');

        return;
    }

    this.pos.findPathTo(best.pos);

    const target = Game.getObjectById(best.id);

    if (!target) return;

    if (best.action === 'withdraw') {
        this.myWithdraw(target, RESOURCE_ENERGY);
    }

    if (best.action === 'pickup') {
        this.myPickup(target);
    }
};

Creep.prototype.idle = function() {

    const target = this.memory.replaces
        ? Game.creeps[this.memory.replaces]
        : null;

    if (target) {
        this.moveTo(target);
        return;
    }

    this.say('idle ⁉');
};

Creep.prototype.doJob = function(job) {
    if ( job.type === 'harvest' ) {

        const target = Game.getObjectById(job.originId);
        
        if ( target ) {
            const container = target.pos.findInRange(
                FIND_STRUCTURES,
                1,
                { filter: s => s.structureType === STRUCTURE_CONTAINER }
            )[0];

            if (container) {           
                if (this.pos.isEqualTo(container.pos)) {
                    if ( this.myHarvest(target) === ERR_NOT_ENOUGH_RESOURCES && container.store[RESOURCE_ENERGY] > 0 ) {
                        this.myWithdraw(container)
                    }
                    return;
                } else {
                    if (this.pos.inRangeTo(container, 1)) {
                        const blockers = container.pos.lookFor(LOOK_CREEPS);

                        if (blockers.length === 0) {
                            this.moveTo(container, { range: 0 });
                            return;
                        }
                    }
                    else {
                        this.moveTo(container, { range: 1 })
                    }
                }
            } else {
                if ( target instanceof Mineral ) {
                    for ( const resourceType in this.store ) {
                        if (this.store[resourceType] > 47) {
                            const storage = this.room.getCached("structure", STRUCTURE_STORAGE);
                            if (storage.length > 0) {
                                this.myTransfer(storage[0], resourceType);
                                return;
                            }
                            const terminal = this.room.getCached("structure", STRUCTURE_TERMINAL);
                            if (terminal.length > 0) {
                                this.myTransfer(terminal[0], resourceType);
                            }
                            return;
                        }
                    }
                }
                this.myHarvest(target);
                return;
            }

        } else {
            this.say('harvest ❓');
            return;
        }
    }

    if ( job.type === 'pickup' ) {
        const target = Game.getObjectById(job.originId);
        if ( target ) {
            this.myPickup(target);
        } else {
            this.say('pickup ❓');
        }
    }

    if ( job.type === 'withdraw' ) {
        const target = Game.getObjectById(job.originId);
        if ( target ) {
            for (const resourceType in target.store)
                this.myWithdraw(target, resourceType);
        } else {
            this.say('pickup ❓');
        }
    }

    if ( job.type === 'haul' ) {
        const target = Game.getObjectById(job.originId);
        if ( target ) {
            this.myTransfer(target);
        } else {
            this.say('transfer ❓');
        }
    }

    if (job.type === 'build' ) {
        const target = Game.getObjectById(job.originId);
        if ( target ) {
            this.myBuild(target);
        } else {
            this.say('build ❓');
        }
    }

    if (job.type === 'upgrade' ) {
        const target = Game.getObjectById(job.originId);
        if ( target ) {
            this.myUpgrade(target);
        } else {
            this.say('upgrade ❓');
        }
    }

    if (job.type === 'repair' ) {
        const target = Game.getObjectById(job.originId);
        if ( target ) {
            this.myRepair(target);
        } else {
            this.say('repair ❓');
        }
    }
}