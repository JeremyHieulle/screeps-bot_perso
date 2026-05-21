module.exports = {
    run: function(room) {
        
        const haulers = room.find(FIND_MY_CREEPS, {
            filter: c =>
                c.memory.role === 'hauler' &&
                c.ticksToLive > 50
        });

        room.memory.logistics = {
            hasHauler: haulers.length > 0
        };

        const storage = room.findStorage();
            if (!storage || storage === ERR_NOT_FOUND) return;

        room.memory.requested ??= {};
        room.memory.requested.upgrader ??= 1;

        const HIGH = 500000;
        const LOW  = 300000;
        const energy = storage.store[RESOURCE_ENERGY];

        if (energy > HIGH && room.memory.requested.upgrader < 2) {
            room.memory.requested.upgrader = 2;
        }
        else if (energy < LOW && room.memory.requested.upgrader > 1) {
            room.memory.requested.upgrader = 1;
        }
    }
}