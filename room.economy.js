module.exports = {
    run: function(room) {
        
        room.memory.requested ??= {};
        room.memory.requested.upgrader ??= 1;

        const haulers = room.find(FIND_MY_CREEPS, {
            filter: c =>
                c.memory.role === 'hauler' &&
                c.ticksToLive > 50
        });

        room.memory.logistics = {
            hasHauler: haulers.length > 0
        };

        const storage = room.getCached("structure", STRUCTURE_STORAGE);
            if ( storage.length === 0 ) return;

        const HIGH = 500000;
        const LOW  = 300000;
        const energy = storage[0].store[RESOURCE_ENERGY];

        if (energy > HIGH && room.memory.requested.upgrader < 2) {
            room.memory.requested.upgrader = 2;
        }
        else if (energy < LOW && room.memory.requested.upgrader > 1) {
            room.memory.requested.upgrader = 1;
        }
    }
}