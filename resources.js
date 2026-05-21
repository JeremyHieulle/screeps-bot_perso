const spawn = Game.spawns['Spawn1'];

var resource = {
    getMax: function(creep) {
        var sources = creep.room.find(FIND_DROPPED_RESOURCES);
        if (sources.length == 0) {
            return null;
        }

        const max = sources.reduce((max, source) => source.amount > max.amount? source:max);
        return max;
    },

    cycleDropped: function(creep) {
        spawn.memory.cycleSource ??= 0;

        var sources = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: (r) => {
                return r.amount > 50;
            }
        });

        if (sources.length == 0) return null;

        let index = spawn.memory.cycleSource % sources.length;

        const target = sources[index];
        
        // prépare le prochain tick
        spawn.memory.cycleSource = ( index + 1 ) % sources.length;

        return target;
    },

    get: function(creep) {
        var sources = creep.room.find(FIND_DROPPED_RESOURCES);
        return sources[creep.memory.pickup % sources.length];
    }

}

module.exports = resource;