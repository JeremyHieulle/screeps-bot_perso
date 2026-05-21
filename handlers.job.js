const handlers = {
    //lecacy
    harvester: require('role.harvester'),
    hauler: require('role.hauler'),
    builder: require('role.builder'),
    upgrader: require('role.upgrader'),

    // new
    harvest: require('role.harvester'),
    haul: require('role.hauler'),
    pickup: require('role.hauler'),
    build: require('role.builder'),
    repair: require('role.builder'),
    upgrade: require('role.upgrader')
};

module.exports = handlers;