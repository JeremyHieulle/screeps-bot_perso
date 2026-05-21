function update(room) {

    const mem = room.memory;

    if (!mem.jobs) return;

    for (const jobId in mem.jobs) {

        // ==============================
        // 1. INITIALISATION OU CLEAR DU JOB
        // ==============================

        const job = mem.jobs[jobId];
        const obj = Game.getObjectById(job.originId);

        if (!job || !obj) {
            delete mem.jobs[jobId];
            continue;
        }


        // ==============================
        // 2. LOGIQUE METIER
        // ==============================

        if (job.type === 'pickup') {
            if ( obj.amount > 0 ) job.amount = obj.amount;
            else delete mem.jobs[jobId];
        }

        // --- new
        if (job.type === 'refill') {
            const amount = obj.store.getFreeCapacity(RESOURCE_ENERGY);
            if (amount > 0) job.amount = amount;
            else delete mem.jobs[jobId];
        }

        // --- legacy
        if (job.type === 'haul') {
            const amount = obj.store.getFreeCapacity(RESOURCE_ENERGY);
            if (amount > 0) job.amount = amount;
            else delete mem.jobs[jobId];
        }

        if (job.type === 'repair') {
            const damage = obj.hitsMax - obj.hits;
            if (damage > 0) job.amount = damage;
            else delete mem.jobs[jobId];
        }

        // --- legacy
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
        }


        // ==============================
        // 3. MAJ DES ASSIGNATIONS
        // ==============================

        const creep = Game.creeps[job.assigned];

        if (!creep || job.id !== creep.memory.jobId) {
            job.assigned = null;
        }

    }
}

function createJob(room, type, originId, opts) {

    const mem = room.memory;

    const jobId = `${type}_${originId}`

    if (!mem.jobs[jobId]) {

        mem.jobs[jobId] = {
            id: jobId,
            type: type,
            originId: originId,
            assigned: null,
            ...opts
        };
    }
}

module.exports = {

    run: function(room) {

        const mem = room.memory;
        mem.jobs ??= {};

        update(room);


        // ==============================
        // 1. JOB SOURCE/CONTROLLER/MINERAL
        // ==============================

        for ( const spatialJob of mem.plan.spatialJob) {

            let type = null;
            switch ( spatialJob.tag ) {
                case "source": type = "harvestSource";
                case "controller": type = "upgrade";
                case "mineral": type = "harvestMineral"; 
            }

            if ( type === 'harvestMineral' && !mem.cache.structures.extractor ) continue

            const originId = spatialJob.targetId;
            const opts = { workPos: spatialJob.stand }

            createJob(room, type, originId, opts);
        }


        // ==============================
        // 2. JOB CONTAINERS
        // ==============================

        const cached = mem.cache.structures.containers

        for ( const c of cached) {

            const container = Game.getObjectById(c.id);

            if (container) {
                if ( c.tag === 'controller' ) {
                    createJob(room, 'transfer', c.id, { priority: 1 })
                };

                if ( c.tag === 'source' ) {

                    const resourceType = RESOURCE_ENERGY
                    const amount = container.store[RESOURCE_ENERGY]

                    if ( container && amount > 0 ) {
                        createJob(room, 'withdraw', container.id, {
                            resourceType,
                            amount 
                        });
                    }
                };

                if ( c.tag === 'mineral' ) {

                    const resourceType = c.mineral
                    const amount = container.store[resourceType]

                    if ( container && amount > 0 ) {
                        createJob(room, 'withdraw', container.id, {
                            resourceType,
                            amount 
                        });
                    }
                };
            }
        }


        // ==============================
        // 2. REFILL SPAWN + EXTENSIONS
        // ==============================

        for ( const spawnId in mem.cache.structures.spawns ) {

            const spawn = Game.getObjectById(spawnId);

            if ( spawn && spawn.store.getFreeCapacity() > 0 )
                const type = 'haul'
                const amount = spawn.store.getFreeCapacity()
                createJob(room, type, spawnId, { amount })
        }

        for ( const extensionId in mem.cache.structures.extensions ) {

            const extension = Game.getObjectById(extensionId);

            if ( extension && extension.store.getFreeCapacity() > 0 ) {
                const type = 'haul'
                const amount = 0
                createJob(room, type, extensionId, { amount })
            }

        }
        

        // ==============================
        // 3. OTHER STRUCTURES
        // ==============================

        for ( const linkId in mem.cache.structures.links ) {

            const link = Game.getObjectById(linkId);
            if ( link && mem.cache.structures.links[link.id].tag === 'hub' ) {
                for ( const resourceType in link.store ) {

                    const amount = link.store[resourceType]

                    if ( link.store[resourceType] > 0 ) {
                        createJob(room, 'withdraw', link.id, {
                            resourceType: resourceType,
                            amount: link[resourceType]
                        }); 
                    }
                }
            }
        }


        const tombstones = room.find(FIND_TOMBSTONES);

        for (const tomb of tombstones) {
            for ( const resourceType in tomb.store ) {
                if ( tomb[resourceType] > 0 ) {

                    createJob(room, 'withdraw', tomb.id, {
                        resourceType: resourceType,
                        amount: tomb[resourceType]
                    });
                }
            }
        }


        const drops = room.find(FIND_DROPPED_RESOURCES);
        
        for (const drop of drops) {
            createJob(room, 'pickup', drop.id, {
                amount: drop.amount
            });
        }

        const builds = room.find(FIND_CONSTRUCTION_SITES);

        for (const build of builds) {
            createJob(room, 'build', build.id, {
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
            createJob(room, 'repair', repair.id, {
                amount: repair.hitsMax - repair.hits
            });
        }
    }
}