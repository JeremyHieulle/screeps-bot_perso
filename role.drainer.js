module.exports = {

    run: function(creep, job) {

        const drainPos = new RoomPosition(48, 5, 'W38S38');
        const healPos  = new RoomPosition(3, 5, 'W37S38');

        if ( creep.memory.state === undefined || creep.memory.state === 'afk') creep.memory.state = 'draining'

        // transition states (hysteresis propre)
        if (creep.memory.state === 'draining' && creep.hits < creep.hitsMax * 0.3) {
            creep.memory.state = 'healing';
        }

        if (creep.memory.state === 'healing' && creep.hits === creep.hitsMax) {
            creep.memory.state = 'draining';
        }

        // actions
        if (creep.memory.state === 'draining') {
            creep.moveTo(drainPos);
        } else {
            creep.moveTo(healPos);
        }
    }
}