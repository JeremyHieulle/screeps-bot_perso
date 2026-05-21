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
    if (this.getActiveBodyparts(WORK) === 0) {
        this.say(`I can't 🏭`);   
        return;
    }

    const result = this.harvest(source);

    if (result === ERR_NOT_IN_RANGE) {
        this.moveTo(source);
    } else {
        return result;
    }
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
    if (this.transfer(x, y) === ERR_NOT_IN_RANGE) {
        this.moveTo(x);
    }
}

Creep.prototype.myUpgrade = function (x) {
    if (this.upgradeController(x) === ERR_NOT_IN_RANGE) {
        this.moveTo(x);
    }
}

Creep.prototype.dumpNonEnergy = function (range) {

    if (!this.room.controller?.my) 
        return ERR_NOT_OWNER;

    let storage = this.room.findStorage();
    if (!storage) storage = this.room.findTerminal();

    if (!storage)
        return ERR_NOT_FOUND;

    const dist = this.pos.getRangeTo(storage);
    if (dist > range)
        return ERR_INVALID_TARGET;


    for (const resourceType in this.store) {

        if (resourceType === RESOURCE_ENERGY) continue;
        if (this.store[resourceType] <= 0) continue;

        this.myTransfer(storage, resourceType);
        return OK;
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
        'upgrader'
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

        const handlers = require('handlers.role');
        const handler = handlers[this.memory.role];
            
        handler.run(this); 
    }
}

Creep.prototype.getEnergy = function (options = {}) {

    const links = this.room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_LINK
    });

    if ( this.memory.role === 'upgrader' ) {
        for ( const link of links ) {
            if ( this.pos.isNearTo(link) && 
                link.store[RESOURCE_ENERGY] >= this.store.getFreeCapacity()) {
                this.withdraw(link, RESOURCE_ENERGY);
                return;
            }
        }

        const upgradeContainer = this.room.findUpgradeContainer();

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

    const upgradeContainerSite = this.room.findUpgradeContainerSite();
    const upgradeContainer = this.room.findUpgradeContainer();
    const coreContainer = this.room.findCoreContainer();

    const containers = this.room.find(FIND_STRUCTURES, {
        filter: s => {
            if (excludeIds.includes(s.id)) return false;

            return (
            (s.structureType === STRUCTURE_CONTAINER ||
             s.structureType === STRUCTURE_STORAGE) &&
            s.store[RESOURCE_ENERGY] > 0
            );
        }
    });

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
        if ( upgradeContainer ) {
            if ( container.id === upgradeContainer.id &&
                (
                    this.memory.role === 'hauler' ||
                    this.memory.role === 'remoteHauler'
                )
            ) continue;
            if ( container.id === upgradeContainer.id && 
                 this.memory.role !== 'upgrader' && 
                 upgradeContainer.store.getFreeCapacity() > 1000
            ) continue;
        }
        if ( coreContainer ) {
            if ( container.id === coreContainer.id &&
                (
                    this.memory.role === 'hauler' ||
                    this.memory.role === 'remoteHauler'
                )
            ) continue;
        }
        targets.push({
            id: container.id,
            action: 'withdraw',
            type: 'container',
            free: container.store.getFreeCapacity(),
            pos: container.pos
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
            upgradeContainerSite && 
            drop.pos.isNearTo(upgradeContainerSite) &&
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
                    if (this.store[RESOURCE_LEMERGIUM] > 47) {
                        const storage = this.room.findStorage();
                        if (storage) {
                            this.myTransfer(storage, RESOURCE_LEMERGIUM);
                            return;
                        }
                        const terminal = Game.getObjectById('6a08600cf8541019a0216224')
                        if (terminal && this.room.name === 'W36S38') {
                            this.myTransfer(terminal, RESOURCE_LEMERGIUM);
                        }
                        return;
                    }

                        if (this.store[RESOURCE_UTRIUM] > 47) {
                        const storage = this.room.findStorage();
                        if (storage) {
                            this.myTransfer(storage, RESOURCE_UTRIUM);
                            return;
                        }
                        const terminal = Game.getObjectById('6a08600cf8541019a0216224')
                        if (terminal && this.room.name === 'W36S38') {
                            this.myTransfer(terminal, RESOURCE_UTRIUM);
                        }
                        return;
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