module.exports = {

    run: function(creep, job) {
        if(!job) {
            creep.say('👓');
            let target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { 
                filter: function(object) {
                    return object.getActiveBodyparts(ATTACK) > 0 && 
                        !isAlly(object.owner.username);
                }
            });
            if (!target)
                target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS).filter(c => !isAlly(c.owner.username));
            if ( target && creep.pos.getRangeTo(target) < 50) {
                if(creep.attack(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
                return;
            } else {
                creep.moveTo(Game.flags.sos);
            }
        } else {
            creep.say('⁉scoutjob?')
        }
    }
}