// const Role = require('role');

// class RoleLongHarvester extends Role {

//     run(creep) {
//         // Pour la sim on évite la source 2 avec un ennemi
//         if (creep.room.name === 'sim' && creep.memory.harvesterSourceIndex === 2) {
//             creep.memory.harvesterSourceIndex = 1;
//         }

//         // Pour les harvesters avec CARRY, on se déplace
//         this.toggleWorkingState(creep);
//         if(creep.memory.working) {
//             if (creep.room.name !== 'W36S38') {
//                 creep.moveTo(new RoomPosition(3, 27, 'W36S38'));
//                 return;
//             } else {
//                 this.depositEnergy(creep);
//             }
//         } else {
//             if (creep.room.name !== 'W37S38') {
//                 creep.moveTo(new RoomPosition(47, 21, 'W37S38'));
//                 return;
//             } else {
//                 var source = creep.room.find(FIND_SOURCES)[0];
//                 this.harvest(creep, source);
//             }
//         }
//     }

// }

// module.exports = new RoleLongHarvester();