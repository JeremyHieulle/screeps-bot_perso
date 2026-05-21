module.exports = {
    init: function(room) {

        const mem = room.memory;

        mem.jobs ??= {};

        const sources = room.find(FIND_SOURCES);

        for (const source of sources) {

            const jobId = "harvest_" + source.id;

            this.createJob(room, jobId, {
                type: "harvest",
                originId: source.id,
                pos: {
                    x: source.pos.x,
                    y: source.pos.y,
                    roomName: room.name
                }
            })
        }

        const controller = room.controller;

        const jobId = "upgrade_" + controller.id;

        this.createJob(room, jobId, {
            type: "upgrade",
            originId: controller.id,
            pos: {
                x: controller.pos.x,
                y: controller.pos.y,
                roomName: room.name
            }
        })

    },

    update(room) {

        const mem = room.memory;
        if (!mem.jobs) return;

        for (const jobId in mem.jobs) {


            const job = mem.jobs[jobId];
            const obj = Game.getObjectById(job.originId);

            if (!job || !obj) {
                delete mem.jobs[jobId];
                continue;
            }

            const creep = Game.creeps[job.assigned];



            // === logique métier ===
            if (job.type === 'pickup') {
                if ( obj.amount > 0 ) job.amount = obj.amount;
                else delete mem.jobs[jobId];
            }

            if (job.type === 'haul') {
                const amount = obj.store.getFreeCapacity(RESOURCE_ENERGY);
                if (amount > 0) job.amount = amount;
                else delete mem.jobs[jobId];
            }

            if (job.type === 'repair') {
                const damage = obj.hitsMax - obj.hits;
                // console.log('damage : ' + damage);
                if (damage > 0) job.amount = damage;
                else delete mem.jobs[jobId];
            }

            if (job.type === 'harvest' && obj instanceof Mineral) {
                const amount = obj.mineralAmount
                if (amount > 0) job.amount = amount
                else delete mem.jobs[jobId];
            }

            if (job.type === 'withdraw') {
                let type = 0;
                for (resourceType in obj.store) {
                    type++
                }
                if ( type === 0 ) delete mem.jobs[jobId]
                // const amount = obj.store
            }
            if (!creep || job.id !== creep.memory.jobId) {
                job.assigned = null;
            }
        }
    },

    run: function(room) {

        const mem = room.memory;

        this.update(room);
        mem.jobs ??= {};

        if (mem.hubLinkId) {
            const hub = Game.getObjectById(mem.hubLinkId);
    
            if ( hub && hub.store[RESOURCE_ENERGY] > 100) {
                const jobId = `withdraw_${hub.id}`;
    
                this.createJob(room, jobId, {
                    type: 'withdraw',
                    originId: hub.id,
                    pos: hub.pos,
                    amount: hub.store.getUsedCapacity(RESOURCE_ENERGY)
                });
            }
        } else {
            const hubLink = room.lookForAt(LOOK_STRUCTURES, mem.corePos.x, mem.corePos.y - 1, {
                filter: s => s.structureType === STRUCTURE_LINK
            });

            if (hubLink) mem.hubLinkId = hubLink[0].id
        }

        const tombstones = room.find(FIND_TOMBSTONES, {
            filter: (tomb) => {
                return tomb.store[RESOURCE_HYDROGEN] > 0 ||
                tomb.store[RESOURCE_OXYGEN] > 0 ||
                tomb.store[RESOURCE_UTRIUM] > 0 ||
                tomb.store[RESOURCE_LEMERGIUM] > 0 ||
                tomb.store[RESOURCE_KEANIUM] > 0 ||
                tomb.store[RESOURCE_ZYNTHIUM] > 0 ||
                tomb.store[RESOURCE_CATALYST] > 0 ||
                tomb.store[RESOURCE_GHODIUM] > 0 ||
                tomb.store[RESOURCE_SILICON] > 0 ||
                tomb.store[RESOURCE_METAL] > 0 ||
                tomb.store[RESOURCE_BIOMASS] > 0 ||
                tomb.store[RESOURCE_MIST] > 0 ||
                tomb.store[RESOURCE_HYDROXIDE] > 0 ||
                tomb.store[RESOURCE_ZYNTHIUM_KEANITE] > 0 ||
                tomb.store[RESOURCE_UTRIUM_LEMERGITE] > 0 ||
                tomb.store[RESOURCE_UTRIUM_HYDRIDE] > 0 ||
                tomb.store[RESOURCE_UTRIUM_OXIDE] > 0 ||
                tomb.store[RESOURCE_KEANIUM_HYDRIDE] > 0 ||
                tomb.store[RESOURCE_KEANIUM_OXIDE] > 0 ||
                tomb.store[RESOURCE_LEMERGIUM_HYDRIDE] > 0 ||
                tomb.store[RESOURCE_LEMERGIUM_OXIDE] > 0 ||
                tomb.store[RESOURCE_ZYNTHIUM_HYDRIDE] > 0 ||
                tomb.store[RESOURCE_ZYNTHIUM_OXIDE] > 0 ||
                tomb.store[RESOURCE_GHODIUM_HYDRIDE] > 0 ||
                tomb.store[RESOURCE_GHODIUM_OXIDE] > 0
            }
        });

        for (const tomb of tombstones) {
            const jobId = `withdraw_${tomb.id}`;

            this.createJob(room, jobId, {
                type: 'withdraw',
                originId: tomb.id,
                pos: tomb.pos,
            });
        }

        const hauls = room.find(FIND_STRUCTURES, {
            filter: s =>
                    
                (
                    s.structureType === STRUCTURE_SPAWN ||
                    s.structureType === STRUCTURE_EXTENSION
                ) &&  s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 ||
                (
                    s.structureType === STRUCTURE_TOWER ||
                    // s.structureType === STRUCTURE_STORAGE ||
                    (
                        s.structureType === STRUCTURE_CONTAINER &&
                        s.pos.x === room.memory.upgradeContainerPos.x &&
                        s.pos.y === room.memory.upgradeContainerPos.y
                    )
                ) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 300
        });

        for (const haul of hauls) {

            const jobId = `haul_${haul.id}`;

            this.createJob(room, jobId, {
                type: 'haul',
                originId: haul.id,
                pos: haul.pos,
                amount: haul.store.getFreeCapacity(RESOURCE_ENERGY)
            });
        }

        const withdrawMinerals = room.find(FIND_MINERALS)
        for (const mineral of withdrawMinerals) {
            const containers = mineral.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });

            for ( const container of containers ) {
                for ( const resourceType in container.store ) {
                    if (container.store[resourceType] > 500) {
                        const jobId = `withdraw_${resourceType}_${container.id}`

                        this.createJob(room, jobId, {
                            type: 'withdraw',
                            originId: container.id,
                            resourceType: resourceType,
                            pos: container.pos,
                            amount: container.store[resourceType]
                        });
                    }
                }
            }
        }

        const drops = room.find(FIND_DROPPED_RESOURCES);
        
        for (const drop of drops) {

            const jobId = `pickup_${drop.id}`;

            this.createJob(room, jobId, {
                type: 'pickup',
                originId: drop.id,
                pos: drop.pos,
                amount: drop.amount
            });
        }

        const builds = room.find(FIND_CONSTRUCTION_SITES);

        for (const build of builds) {

            const jobId = `build_${build.id}`;

            this.createJob(room, jobId, {
                type: 'build',
                originId: build.id,
                pos: build.pos,
                amount: build.progressTotal - build.progress
            });
        }

        const repairs = room.find(FIND_STRUCTURES, {
				filter: (structure) => {
					return structure.hits < structure.hitsMax / 2 &&
                    structure.structureType !== STRUCTURE_WALL;
				}
			});

        for (const repair of repairs) {

            const jobId = `repair_${repair.id}`;

            this.createJob(room, jobId, {
                type: 'repair',
                originId: repair.id,
                pos: repair.pos,
                amount: repair.hitsMax - repair.hits
            });
        }

        const minerals = room.find(FIND_MINERALS, {
                filter: (mineral) => {
                    return mineral.mineralAmount > 0
                }
            });

        for (const mineral of minerals) {
            if (room.hasExtractor(mineral)) {

                const jobId = `harvest_${mineral.id}`;

                this.createJob(room, jobId, {
                    type: 'harvest',
                    originId: mineral.id,
                    pos: mineral.pos,
                    amount: mineral.mineralAmount
                });
            }
        }
    },

    createJob(room, id, data) {
        const mem = room.memory;

        mem.jobs ??= {};

        if (!mem.jobs[id]) {
            mem.jobs[id] = {
                id,
                assigned: null,
                ...data
            };
        }
    }
}