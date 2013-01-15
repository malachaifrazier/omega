require("javascripts/omega/user.js");
require("javascripts/omega/commands.js");

$(document).ready(function(){

  module("omega_commands");
  
  asyncTest("retrieving all entities", 7, function() {
    OmegaQuery.all_entities(function(entities){
      ok(entities.length >= 7);
      var ids = [];
      for(var entity in entities) ids.push(entity.id);
      ok(ids.indexOf('mmorsi-manufacturing-station1') != null);
      ok(ids.indexOf('mmorsi-mining-ship1') != null);
      ok(ids.indexOf('mmorsi-corvette-ship1') != null);
      ok(ids.indexOf('mmorsi-corvette-ship2') != null);
      ok(ids.indexOf('mmorsi-corvette-ship3') != null);
      ok(ids.indexOf('opponent-mining-ship2') != null);
      start();
    });
  });
  
  asyncTest("retrieving entities owned by a user", 4, function() {
    OmegaQuery.entities_owned_by('mmorsi', function(entities){
      ok(entities.length >= 6);
      var ids = [];
      for(var entity in entities) ids.push(entities[entity].id);
      ok(ids.indexOf('mmorsi-manufacturing-station1') != -1);
      ok(ids.indexOf('mmorsi-mining-ship1') != -1);
      ok(ids.indexOf('opponent-mining-ship2') == -1);
      start();
    });
  });
  
  asyncTest("retrieving entities under a system", 3, function() {
    OmegaQuery.entities_under('Aphrodite', function(entities){
      ok(entities.length >= 1);
      var ids = [];
      for(var entity in entities) ids.push(entities[entity].id);
      ok(ids.indexOf('opponent-mining-ship2') != -1);
      ok(ids.indexOf('mmorsi-manufacturing-station1') == -1);
      start();
    });
  });
  
  asyncTest("retrieve entity by id", 1, function() {
    OmegaQuery.entity_with_id('mmorsi-corvette-ship1', function(entity){
      equal('mmorsi-corvette-ship1', entity.id);
      start();
    });
  });
  
  asyncTest("retrieve all galaxies", 2, function() {
    OmegaQuery.all_galaxies(function(galaxies){
      equal(1, galaxies.length);
      equal('Zeus', galaxies[0].name);
      start();
    });
  });
  
  asyncTest("retrieve system by name", 1, function() {
    OmegaQuery.system_with_name('Athena', function(system){
      equal('Athena', system.name);
      start();
    });
  });
  
  asyncTest("retrieve resource sources", 1, function() {
    OmegaQuery.resource_sources('ast2', function(resource_sources){
      equal(1, resource_sources.length);
      start();
    });
  });
  
  asyncTest("retrieve all users", 1, function() {
    OmegaQuery.all_users(function(users){
      equal(1, users.length); // only have access to self
      start();
    });
  });
  
  
  
  asyncTest("triggering jump gate", 1, function() {
    // load ship to be pulled in via jg
    OmegaQuery.entity_with_id('mmorsi-corvette-ship1', null);
  
    var jg_loc = {parent_id : 2, x : -150, y : -150, z : -150};
    var jg     = {location  : jg_loc, endpoint : 'Aphrodite', trigger_distance: 100};
    OmegaCommand.trigger_jump_gate.exec(jg);
    OmegaQuery.entity_with_id('mmorsi-corvette-ship1', function(ship){
      equal("Aphrodite", ship.system_name);
      start();
    });
  });
  
  asyncTest("moving ship", 1, function() {
    OmegaQuery.entity_with_id('mmorsi-corvette-ship2', function(ship){
      OmegaCommand.move_ship.exec(ship, 5000, 5000, 5000);
      OmegaQuery.entity_with_id('mmorsi-corvette-ship2', function(ship){
        equal("Motel::MovementStrategies::Linear", ship.location.movement_strategy.json_class);
        start();
      });
    });
  });
  
  asyncTest("attacking", 1, function() {
    OmegaQuery.entity_with_id('mmorsi-corvette-ship3', function(ship){
      OmegaCommand.launch_attack.exec(ship, 'opponent-mining-ship1');
      OmegaQuery.entity_with_id('mmorsi-corvette-ship3', function(ship){
        // TODO how to test this succeeds? Need to return attacking target as part of ship
        equal(null, null);
        start();
      });
    });
  });
  
  asyncTest("docking and undocking ship", 2, function() {
    OmegaQuery.entity_with_id('mmorsi-corvette-ship3', function(ship){
      OmegaCommand.dock_ship.exec(ship, 'mmorsi-manufacturing-station1');
      OmegaQuery.entity_with_id('mmorsi-corvette-ship3', function(ship){
        equal("mmorsi-manufacturing-station1", ship.docked_at.id);
        start();
      });
      OmegaCommand.undock_ship.exec(ship);
      OmegaQuery.entity_with_id('mmorsi-corvette-ship3', function(ship){
        equal(null, ship.docked_at);
        start();
      });
    });
    stop();
  });
  
  asyncTest("mining", 2, function() {
    OmegaQuery.resource_sources('ast1', function(resource_sources){
      OmegaQuery.entity_with_id('mmorsi-mining-ship1', function(ship){
        OmegaCommand.start_mining.exec(ship, 'ast1_' + resource_sources[0].resource.id);
        OmegaQuery.entity_with_id('mmorsi-mining-ship1', function(ship){
          ok(ship.mining != null);
          if(ship.mining != null)
            equal(resource_sources[0].id, ship.mining.id);
          else ok(true); // XXX for assertion count
          start();
        });
      });
    });
  });
  
  asyncTest("transferring ship resources", 2, function() {
    OmegaQuery.entity_with_id('mmorsi-mining-ship1', function(ship){
      OmegaCommand.transfer_resources.exec(ship, 'mmorsi-manufacturing-station2');
      OmegaQuery.entity_with_id('mmorsi-mining-ship1', function(ship){
        equal(0, Object.keys(ship.resources).length);
        start();
      });
      OmegaQuery.entity_with_id('mmorsi-manufacturing-station2', function(station){
        // TODO verify specific resources before/after transfer
        ok(0 != station.resources.length);
        start();
      });
    });
    stop();
  });
  
  asyncTest("constructing entities", 0, function() {
    OmegaQuery.entity_with_id('mmorsi-manufacturing-station1', function(station){
      OmegaCommand.construct_entity.exec(station);
      // TODO verify new entity created
      start();
    });
  });

});