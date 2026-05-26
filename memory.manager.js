const CURRENT_VERSION = 6;

function handleDeath(name, mem) {

    if (mem.role === 'scout') {

        const lastRoom = mem.lastRoom;

        if (lastRoom) {

            Memory.intel[lastRoom] ??= {};
            Memory.intel.rooms[lastRoom].hostile = true; 
        }
    }
}

module.exports = {
    initRoomMemory: function(roomName) {
        const mem = Memory.rooms[roomName];

        if (mem.version === CURRENT_VERSION) return;
        
        if (!mem.requested) {
            mem.requested = {};
        }

        if (!mem.visualData) {
            mem.visualData = [];
        }

        if (!mem.jobs) {
            mem.jobs = {};
        }

        if (!mem.sitesToCreate) {
            mem.sitesToCreate = [];
        }

        if (!mem.upgradeContainerPos) {
            mem.upgradeContainerPos = null;
        }

        if (!mem.spawnQueue) {
            mem.spawnQueue = [];
        }

        if (!mem.jobsInitialized) {
            mem.jobsInitialized = false;
        }
        
        if (!mem.logistics) {
            mem.logistics = {};
        }

        if (!mem.defense) {
            mem.defense = {};
        }

        if (!mem.version) mem.version = 0;

        mem.version = CURRENT_VERSION;
    },

    run: function() {

        Memory.rooms ??= {};

        for (const roomName in Game.rooms) {
            if (!Memory.rooms[roomName]) {
                Memory.rooms[roomName] = {};
            }

            this.initRoomMemory(roomName);
        }

        for (const name in Memory.creeps) {
    
            if (!Game.creeps[name]) {
    
                const mem = Memory.creeps[name];
    
                // ici tu traites la mort
                handleDeath(name, mem);
    
                delete Memory.creeps[name];
            }
        }
        // Vidage mémoire des creeps
        for(var name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }
}