module.exports = {
    run: function(room) {

        const mem = room.memory;

        const DEFAULT_PAD = 8;

        mem.defense.state ??= 0;
        mem.defense.padding ??= DEFAULT_PAD;

        const BORDER_RIGHT = 49;
        const BORDER_LEFT = 0;
        const BORDER_TOP = 0;
        const BORDER_BOTTOM = 49;
        const PAD = mem.defense.padding;

        const hostiles = room.find(FIND_HOSTILE_CREEPS, {
            filter: c =>
                !isAlly(c.owner.username) &&
                c.pos.x < BORDER_RIGHT - PAD &&
                c.pos.x > BORDER_LEFT + PAD &&
                c.pos.y < BORDER_BOTTOM - PAD &&
                c.pos.y > BORDER_TOP + PAD
        });

        mem.defense.state = hostiles.length > 0 ? 1 : 0;
        mem.defense.padding = mem.defense.state ? 0 : 3;

        const towers = room.getCached("structure", STRUCTURE_TOWER)

        if ( hostiles.length === 0 ) {
            const repairs = room.find(FIND_STRUCTURES, {
                filter: s => 
                (
                    (
                    s.structureType === STRUCTURE_ROAD ||
                    s.structureType === STRUCTURE_CONTAINER 
                    ) &&
                    s.hits < 0.75 * s.hitsMax
                ) || (
                    (
                        s.structureType === STRUCTURE_WALL ||
                        s.structureType === STRUCTURE_RAMPART
                    ) &&
                    s.hits < 5000000
                )
            })

            if ( repairs.length > 0 ) {
                const structure = repairs[0];
                const tower = structure.pos.findClosestByRange(towers);
                if ( tower ) {
                    tower.repair(structure);
                }
            }
        }

        for (const tower of towers) {

            const target = tower.pos.findClosestByRange(hostiles);

            if( target ) {
                tower.attack(target);
                continue;
            } 
            
            const heal = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: c => c.hits < c.hitsMax
            });

            if ( heal ) {
                tower.heal(heal);
                continue
            }
        }


    }
}