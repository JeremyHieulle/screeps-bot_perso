module.exports = {

    run: function(creep, job) {
        if (creep.hits < 1500 ) {
            creep.moveTo(new RoomPosition(48,19,'W36S38'))
            return
        }
        
        if (creep.memory.state === 'recycling') {
            if(creep.pos.isNearTo(Game.spawns['Spawn1'])) {
                Game.spawns['Spawn1'].recycleCreep(creep)
                return;
            }
            creep.moveTo(new RoomPosition(24,23,'W36S38'))
            return
        }
        
        const pos = new RoomPosition(33,8,'W35S38');
        
        if (creep.room.name === pos.roomName) {
            if (creep.memory.state === 'reserve') {
                if (creep.reserveController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller)
                }
                return
            }
            
            if ( creep.pos.x !== 0 && creep.pos.x !== 49 &&
                creep.pos.y !== 0 && creep.pos.y !== 49
            ) {
                const target = creep.room.controller
                
                const result = creep.attackController(target)
                    
                if (result === ERR_NOT_IN_RANGE) creep.moveTo(target);
                if (result === OK) {
                    const owner = creep.room.controller.owner?.username
                    if (owner && owner === 'Arta') {
                        creep.memory.state = 'recycling'
                    } else {
                        creep.memory.state = 'reserve'
                    }
                }
            } else {
                creep.moveTo(pos);
            }
            return;
        }
        
        creep.moveTo(pos);
    }
}