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
        // 2. SPECIFIC LINK CORE
        // ==============================

        if (obj.structureType === STRUCTURE_LINK && job.area === 'core') {

            const TARGET = 400;
            const energy = obj.store.getUsedCapacity(RESOURCE_ENERGY);
            const delta = TARGET - energy;

            const creep = Game.creeps[job.assigned];

            if (!creep || job.id !== creep.memory.jobId) {
                job.assigned = null;
            }

            // trop proche de l'équilibre → suppression job
            if (Math.abs(delta) < 50) {
                delete mem.jobs[jobId];
                continue;
            }

            job.amount = Math.abs(delta);

            // optionnel mais recommandé : indiquer direction
            job.type = delta > 0 ? 'haul' : 'withdraw';
            continue
        }


        // ==============================
        // 3. LOGIQUE METIER
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
        
            const targetHits = Math.min(obj.hitsMax, 5000000);
        
            const damage = targetHits - obj.hits;
        
            if (damage > 0) {
                job.amount = damage;
            } else {
                delete mem.jobs[jobId];
            }
        }

        if (job.type === 'withdraw') {

            const hasResources = Object.values(obj.store)
                .some(amount => amount >= 10);

            if (!hasResources) {
                delete mem.jobs[jobId];
            }
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

    const obj = Game.getObjectById(originId)
    const jobId = `${type}_${originId}`

    if (!mem.jobs[jobId]) {

        mem.jobs[jobId] = {
            id: jobId,
            type: type,
            originId: originId,
            assigned: null,
            ...opts
        };
        return OK
    } else {
        return ERR_BUSY
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
            if ( spatialJob.tag === "controller" ) {
                type = "upgrade"
            } else {
                continue
            }

            const originId = spatialJob.targetId;
            const opts = { workPos: spatialJob.workPos }

            createJob(room, type, originId, opts);
        }


        // ==============================
        // 2. JOB CONTAINERS
        // ==============================

        const cachedContainers = room.getCached("structure", STRUCTURE_CONTAINER);

        for (const container of cachedContainers) {

            const meta = room.getStructureMeta(container.id);
            if (!meta) continue;

            const store = container.store;

            if (meta.tag === 'controller' && store[RESOURCE_ENERGY] < 1000) {

                createJob(room, 'haul', container.id, {
                    priority: 50
                });
            }


            if (meta.tag === 'source') {

                const amount = store[RESOURCE_ENERGY];

                if (amount > 50) {
                    createJob(room, 'withdraw', container.id, {
                        resourceType: RESOURCE_ENERGY,
                        amount
                    });
                }
            }


            if (meta.tag === 'mineral') {

                const resourceType = meta.mineral;
                const amount = store[resourceType];

                if (amount > 500) {
                    createJob(room, 'withdraw', container.id, {
                        resourceType,
                        amount
                    });
                }
            }
        }


        // ==============================
        // 2. REFILL SPAWN + EXTENSIONS
        // ==============================

        const cachedSpawns = room.getCached("structure", STRUCTURE_SPAWN);

        for ( const spawn of cachedSpawns ) {

            const meta = room.getStructureMeta(spawn.id);

            if ( spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0 ) {

                const type = 'haul'
                const amount = spawn.store.getFreeCapacity(RESOURCE_ENERGY)
                const area = meta?.tag ?? 'global'
                createJob(room, type, spawn.id, { amount, priority: 100, area })
            }
        }

        const cachedExtensions = room.getCached("structure", STRUCTURE_EXTENSION);

        for ( const extension of cachedExtensions ) {

            if ( extension && extension.store.getFreeCapacity(RESOURCE_ENERGY) > 0 ) {
                const type = 'haul'
                const amount = extension.store.getFreeCapacity(RESOURCE_ENERGY)
                createJob(room, type, extension.id, { amount, priority: 100 })
            }

        }
        
        const cachedTowers = room.getCached("structure", STRUCTURE_TOWER);

        for ( const tower of cachedTowers ) {

            if ( tower && tower.store.getFreeCapacity(RESOURCE_ENERGY) > 100 ) {
                const type = 'haul'
                const amount = tower.store.getFreeCapacity(RESOURCE_ENERGY)
                createJob(room, type, tower.id, { amount, area: 'core' })
            }

        }
        
        const cachedCoreContainer = room.findByTag("core", STRUCTURE_CONTAINER)
        if (cachedCoreContainer && cachedCoreContainer.store.getFreeCapacity() > 1000) {
            const type = 'haul'
            const amount = cachedCoreContainer.store.getFreeCapacity(RESOURCE_ENERGY)
            createJob(room, type, cachedCoreContainer.id, { amount, area: 'core' })
        }

        // ==============================
        // 3. OTHER STRUCTURES
        // ==============================

        const cachedLinks = room.getCached("structure", STRUCTURE_LINK)

        for (const link of cachedLinks) {

            const meta = room.getStructureMeta(link.id);
            if (!meta || meta.tag !== 'core') continue;

            const energy = link.store.getUsedCapacity(RESOURCE_ENERGY);
            const free = link.store.getFreeCapacity(RESOURCE_ENERGY);

            // =========================
            // TROP VIDE → FILL
            // =========================
            if (energy < 300) {

                createJob(room, 'haul', link.id, {
                    resourceType: RESOURCE_ENERGY,
                    amount: 400 - energy,
                    area: 'core'
                });
            }

            // =========================
            // TROP PLEIN → DRAIN
            // =========================
            else if (free < 300) {

                createJob(room, 'withdraw', link.id, {
                    resourceType: RESOURCE_ENERGY,
                    amount: 400 - free,
                    area: 'core'
                });
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
					structure.hits < 3000000
                    //structure.structureType !== STRUCTURE_WALL;
				}
			});

        for (const repair of repairs) {
            createJob(room, 'repair', repair.id, {
                amount: repair.hitsMax - repair.hits
            });
        }
    }
}