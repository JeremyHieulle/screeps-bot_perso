const handlers = {
    harvester: require('role.harvester'),
    hauler: require('role.hauler'),
    builder: require('role.builder'),
    upgrader: require('role.upgrader'),
    healer: require('role.healer'),
    drainer: require('role.drainer'),
    drainerHealer: require('role.drainerHealer'),
    remoteHauler: require('role.remote.hauler'),
    remoteBuilder: require('role.remote.builder'),
    remoteMiner: require('role.remote.miner'),
    remoteReserver: require('role.remote.reserver'),
    attacker: require('role.attacker'),
    manual: require('role.manual'),
    scout: require('role.scout'),
    manager: require('role.manager'),
    coreKiller: require('role.coreKiller'),
    remoteDefender: require('role.remote.defender'),
    scientist: { run: (creep) => require('lab.manager').runScientist(creep) },
    harvester: { run: (creep) => require('manage.sources').runHarvester(creep) },
    mineral: { run: (creep) => require('manage.minerals').runMineral(creep) }
};

module.exports = handlers;