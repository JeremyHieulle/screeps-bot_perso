function run() {
    if (Game.time % 10 !== 0) return;

    Memory.diplomacy ??= {};

    const ALLIES = ["D3matt"];

    for (const name of ALLIES) {
        Memory.diplomacy[name] ??= {
            alliance: true,
            status: "safe",
            lastHit: 0,
            lastUpdate: 0
        };

        const e = Memory.diplomacy[name];

        if (e.alliance === true && e.status === "unsafe" && Game.time - e.lastHit > 5000) {
            e.status = "safe";
        }

        e.lastUpdate = Game.time;
    }
}

function registerHostileAction(name) {
    Memory.diplomacy ??= {};

    const e = Memory.diplomacy[name] ??= {
        alliance: false,
        status: "unsafe",
        lastHit: Game.time,
        lastUpdate: Game.time
    };

    e.status = "unsafe";
    e.lastHit = Game.time;
}

function damageDetector(room) {

    scanCreeps(room);
    scanStructures(room);
}

function scanCreeps(room) {
    room.memory._lastHits ??= {};
    const creeps = room.find(FIND_MY_CREEPS);
    const newCache = {};
    const oldCache = room.memory._lastHits.creeps ?? {};

    for (const creep of creeps) {
        const last = oldCache[creep.id];
        if (last !== undefined && creep.hits < last) {
            resolveFromEventLog(room, creep.id);
        }
        newCache[creep.id] = creep.hits;
    }
    room.memory._lastHits.creeps = newCache;
}

function scanStructures(room) {
    if (!room.controller?.my) return;
    room.memory._lastHits ??= {};
    room.memory._lastHits.structures ??= {};
    
    const cache = room.memory._lastHits.structures;

    const structures = room.find(FIND_STRUCTURES);

    for (const s of structures) {

        if (
            s.structureType === STRUCTURE_ROAD ||
            s.structureType === STRUCTURE_CONTAINER
        ) continue;

        const last = cache[s.id];

        if (last !== undefined && s.hits < last) {
            resolveFromEventLog(room, s.id);
        }

        cache[s.id] = s.hits;
    }
}

function resolveFromEventLog(room, targetId) {

    const events = room.getEventLog();

    for (let i = events.length - 1; i >= 0; i--) {

        const e = events[i];

        if ( e.event === EVENT_ATTACK ) {
            if (e.data.targetId !== targetId) continue;

            const attacker = Game.getObjectById(e.data.attackerId);

            if (attacker?.owner?.username) {
                registerHostileAction(attacker.owner.username);
                return;
            }
        }
    }
}

module.exports = {
    run,
    registerHostileAction,
    damageDetector
};