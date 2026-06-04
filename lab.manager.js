// lab.manager.js

// =============================
// HELPERS
// =============================

function getInputs(resource) {
    for (const input1 in REACTIONS) {
        for (const input2 in REACTIONS[input1]) {
            if (REACTIONS[input1][input2] === resource) {
                return { input1, input2 };
            }
        }
    }
    return null;
}

function getLabRoles(room, resource) {

    const recipe = getInputs(resource);
    if (!recipe) return null;

    const { input1, input2 } = recipe;
    const labs = room.getCached(LOOK_STRUCTURES, STRUCTURE_LAB);

    // lab input1 : a déjà input1, ou est vide
    const labInput1 = labs.find(l =>
        l.mineralType === input1 || !l.mineralType
    );
    if (!labInput1) return null;

    // lab input2 : a déjà input2, ou est vide (et différent de input1)
    const labInput2 = labs.find(l =>
        l !== labInput1 &&
        (l.mineralType === input2 || !l.mineralType)
    );
    if (!labInput2) return null;

    const outputs = labs.filter(l => {
        if (l === labInput1 || l === labInput2) return false;
        if (l.mineralType && l.mineralType !== resource) return false;
        if (l.pos.getRangeTo(labInput1) > 2) return false;
        if (l.pos.getRangeTo(labInput2) > 2) return false;
        return true;
    });

    return { input1, input2, labInput1, labInput2, outputs };
}

// =============================
// REACTIONS
// =============================

function runReactions(room) {

    const order = room.memory.labOrder;
    if (!order) return;

    const roles = getLabRoles(room, order.resource);
    if (!roles) return;

    const { input1, input2, labInput1, labInput2, outputs } = roles;

    for (const output of outputs) {
        if (output.cooldown > 0) continue;
        if (output.store.getFreeCapacity(order.resource) === 0) continue;
        if ((labInput1.store[input1] || 0) < 5) continue;
        if ((labInput2.store[input2] || 0) < 5) continue;

        output.runReaction(labInput1, labInput2);
    }
}

// =============================
// SCIENTIST
// =============================

function runScientist(creep) {

    const room = Game.spawns[creep.memory.bornIn].room;
    const order = room.memory.labOrder;

    if (!order) {
        creep.say('idle');
        return;
    }

    const roles = getLabRoles(room, order.resource);
    if (!roles) {
        creep.say('no labs');
        return;
    }

    const { input1, input2, labInput1, labInput2, outputs } = roles;
    const storage = room.getCached('structure', STRUCTURE_STORAGE)[0];
    if (!storage) return;

    // =============================
    // VIDER RESIDUS DANS OUTPUTS
    // =============================
    for (const output of outputs) {
        if (!output.mineralType) continue;
        if (output.mineralType !== order.resource) {
            if (creep.pos.getRangeTo(output) > 1) {
                creep.moveTo(output, { reusePath: 20 });
                return;
            }
            creep.withdraw(output, output.mineralType);
            return;
        }
    }

    // =============================
    // VIDER OUTPUTS PLEINS → STORAGE
    // =============================
    if (creep.store[order.resource] > 0) {
        if (creep.pos.getRangeTo(storage) > 1) {
            creep.moveTo(storage, { reusePath: 20 });
            return;
        }
        creep.transfer(storage, order.resource);

        const totalProduced =
            (storage.store[order.resource] || 0) +
            creep.store[order.resource];

        if (totalProduced >= order.amount) {
            console.log(`${room} Lab order complete: ${order.resource}`);
            delete room.memory.labOrder;
        }
        return;
    }

    for (const output of outputs) {
        if (!output.mineralType) continue;
        if (output.store.getFreeCapacity(order.resource) === 0) {
            if (creep.store.getFreeCapacity() === 0) break;
            if (creep.pos.getRangeTo(output) > 1) {
                creep.moveTo(output, { reusePath: 20 });
                return;
            }
            creep.withdraw(output, order.resource);
            return;
        }
    }

    // =============================
    // REMPLIR LAB INPUT 1
    // =============================
    const free1 = labInput1.store.getFreeCapacity(input1);
    if (free1 > 0) {
        if (creep.store[input1] === 0) {
            const available = storage.store[input1] || 0;
            if (available === 0) {
                creep.say('no ' + input1);
                return;
            }
            if (creep.pos.getRangeTo(storage) > 1) {
                creep.moveTo(storage, { reusePath: 20 });
                return;
            }
            creep.withdraw(storage, input1,
                Math.min(creep.store.getFreeCapacity(), available, free1));
            return;
        }
        if (creep.pos.getRangeTo(labInput1) > 1) {
            creep.moveTo(labInput1, { reusePath: 20 });
            return;
        }
        creep.transfer(labInput1, input1);
        return;
    }

    // =============================
    // REMPLIR LAB INPUT 2
    // =============================
    const free2 = labInput2.store.getFreeCapacity(input2);
    if (free2 > 0) {
        if (creep.store[input2] === 0) {
            const available = storage.store[input2] || 0;
            if (available === 0) {
                creep.say('no ' + input2);
                return;
            }
            if (creep.pos.getRangeTo(storage) > 1) {
                creep.moveTo(storage, { reusePath: 20 });
                return;
            }
            creep.withdraw(storage, input2,
                Math.min(creep.store.getFreeCapacity(), available, free2));
            return;
        }
        if (creep.pos.getRangeTo(labInput2) > 1) {
            creep.moveTo(labInput2, { reusePath: 20 });
            return;
        }
        creep.transfer(labInput2, input2);
        return;
    }

    creep.say('⚗️');
}

// =============================
// SPAWN
// =============================

function manageScientistSpawn(room) {

    const order = room.memory.labOrder;
    if (!order) return;

    const scientists = Object.values(Game.creeps).filter(c =>
        c.memory.role === 'scientist' &&
        Game.spawns[c.memory.bornIn]?.room.name === room.name
    );

    if (scientists.length === 0) {
        room.spawnCreepForRole('scientist', room.energyCapacityAvailable);
    }
}

// =============================
// EXPORTS
// =============================

module.exports = {
    run: function(room) {
        runReactions(room);
        manageScientistSpawn(room);
    },
    runScientist
};