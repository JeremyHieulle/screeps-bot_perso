// spawning.bodyBuilder.js
const patterns = {
    harvester: { base: [CARRY], pattern: [WORK, WORK, MOVE], max: 3 },
    hauler:    { pattern: [CARRY, CARRY, MOVE], max: 6 },
    manager: { pattern: [CARRY, CARRY, CARRY, CARRY, MOVE], max : 4 },
    builder:  { pattern: [WORK, CARRY, MOVE] },
    upgrader:  { base: [WORK, CARRY, MOVE], pattern: [WORK] },
    remoteBuilder:  { pattern: [WORK, CARRY, ATTACK, MOVE, MOVE] },
    remoteHauler:  { pattern: [CARRY, MOVE] },
    remoteMiner:  { pattern: [WORK, WORK, CARRY, MOVE], max: 3 },
    scout:  { base: [MOVE] },
    attacker:  { pattern: [ATTACK, MOVE] },
    healer:  { pattern: [HEAL, MOVE] },
    guard:  { pattern: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, ATTACK] },
    defender:  { pattern: [RANGED_ATTACK, MOVE] },
    reserver:  { pattern: [CLAIM, MOVE], max: 2 },
    drainer: { base: [TOUGH, MOVE], pattern: [TOUGH, MOVE] },
    drainerHealer: { pattern: [HEAL, HEAL, MOVE], max: 4},
    remoteReserver: { pattern: [CLAIM, MOVE], max: 2 },
    coreKiller:     { pattern: [ATTACK, MOVE], max: 5 },
    remoteDefender: { pattern: [RANGED_ATTACK, MOVE], max: 4, base: [HEAL, HEAL] },
    scientist: { pattern: [CARRY, CARRY, MOVE], max: 4 }
};

function getBodyCost(parts) {
    return _.sum(parts, part => BODYPART_COST[part]);
}

function buildFromPattern(patternObj, energy) {

    const base = patternObj.base || [];
    const pattern = patternObj.pattern || [];

    const baseCost = getBodyCost(base);
    const patternCost = getBodyCost(pattern);

    if (pattern.length === 0) return base;

    let remainingEnergy = energy - baseCost;
    if (remainingEnergy <= 0) return base;

    const maxByEnergy = Math.floor(remainingEnergy / patternCost);
    const maxBySize = Math.floor((50 - base.length) / pattern.length);

    const n = Math.min(
        patternObj.max ?? Infinity,
        maxByEnergy,
        maxBySize
    );

    return [
        ...base,
        ...Array(n).fill(pattern).flat()
    ];
}

module.exports.buildBody = function(role, energy) {

    const pattern = patterns[role];
    if (!pattern) return [];

    return buildFromPattern(pattern, energy);
};