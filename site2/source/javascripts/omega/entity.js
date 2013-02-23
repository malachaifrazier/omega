/* Omega Entity Tracker
 *
 * Copyright (C) 2012 Mohammed Morsi <mo@morsi.org>
 *  Licensed under the AGPLv3+ http://www.gnu.org/licenses/agpl.txt
 */

require('javascripts/vendor/jquery.timer.js');
require('javascripts/vendor/persist-min.js');
require('javascripts/vendor/three.js');
require('javascripts/vendor/helvetiker_font/helvetiker_regular.typeface.js');
require('javascripts/omega/client.js');
require('javascripts/omega/renderer.js');
require('javascripts/omega/commands.js');

/////////////////////////////////////// Helper Methods

/* Round number to specified number of places
 */
function roundTo(number, places){
  return Math.round(number * Math.pow(10,places)) / Math.pow(10,places);
}

/* Encapsulate result returned from server in its corresponding
 * client object class
 */
function convert_entity(entity){

  if(entity.json_class == "Cosmos::Galaxy"){
    if(!entity.id) entity.id = entity.name;
    entity.location = new OmegaLocation(entity.location);
    for(var solar_system in entity.solar_systems)
      entity.solar_systems[solar_system] = convert_entity(entity.solar_systems[solar_system]);
    entity = new OmegaGalaxy(entity);

  }else if(entity.json_class == "Cosmos::SolarSystem"){
    // cache omega planet movement
    if(entity.planets.length > 0)
      OmegaPlanet.cache_movement();

    if(!entity.id) entity.id = entity.name;
    entity.location = new OmegaLocation(entity.location);

    if(!entity.star.id) entity.star.id = entity.star.name;
    entity.star.location = new OmegaLocation(entity.star.location);
    entity.star = new OmegaStar(entity.star);

    for(var planet in entity.planets)
      entity.planets[planet] = convert_entity(entity.planets[planet]);

    for(var jump_gate in entity.jump_gates)
      entity.jump_gates[jump_gate] = convert_entity(entity.jump_gates[jump_gate]);

    for(var asteroid in entity.asteroids){
      var ast = entity.asteroids[asteroid];
      ast.id = ast.name;
      ast.location = new OmegaLocation(ast.location);
      entity.asteroids[asteroid] = new OmegaAsteroid(ast);
    }

    entity = new OmegaSolarSystem(entity);


  }else if(entity.json_class == "Cosmos::Planet"){
    if(!entity.id) entity.id = entity.name;
    entity.location = new OmegaLocation(entity.location);
    //for(var moon in pla.moons)
      //pla.moons[moon] = new OmegaMoon(pla.moons[moon]);
    entity = new OmegaPlanet(entity);

  }else if(entity.json_class == "Cosmos::JumpGate"){
    entity.id = entity.solar_system + "-" + entity.endpoint;
    entity.location = new OmegaLocation(entity.location);
    entity = new OmegaJumpGate(entity);

  }else if(entity.json_class == "Manufactured::Ship"){
    entity.location = new OmegaLocation(entity.location);
    entity = new OmegaShip(entity);

  }else if(entity.json_class == "Manufactured::Station"){
    entity.location = new OmegaLocation(entity.location);
    entity = new OmegaStation(entity);

  }else if(entity.json_class == "Users::Session"){
    entity.user = convert_entity(entity.user);

  }else if(entity.json_class == "Users::User"){
    entity = new OmegaUser(entity);

  }

  var oentity = $omega_registry.get(entity.id);
  if(oentity != null){
    oentity.update(entity);
    entity = oentity;

  // limit what we store in registry for performance reasons
  }else if(entity.registerable){
    $omega_registry.add(entity);
  }

  // XXX hacky way to refresh entity container
  if(typeof $omega_scene !== "undefined"){
    var selected = $omega_scene.selection.selected();
    if(selected) $omega_registry.get(selected).clicked();
  }


  return entity;
}

/////////////////////////////////////// Omega Timer

/* Initialize new Omega Timer
 */
function OmegaTimer(time, callback){
  /////////////////////////////////////// private data

  var timer  = $.timer(callback);

  /////////////////////////////////////// public methods

  /* Stop internal timer */
  this.stop = function(){
    timer.stop();
  }

  /////////////////////////////////////// initialization

  timer.set({time : time, autostart : true });
}


/////////////////////////////////////// Omega Registry

/* Initialize new Omega Registry
 */
function OmegaRegistry(){
  /////////////////////////////////////// private data

  var registry               = {};

  var timers                 = {};

  var registration_callbacks = [];

  var registry_store         = new Persist.Store('omega-registry');

  /////////////////////////////////////// public methods
  
  this.clear_callbacks = function(){
    registration_callbacks = [];
  }

  /* Register method to be invoked whenever a entity is
   * registered with the tracker
   */
  this.on_registration = function(callback){
    registration_callbacks.push(callback);
  }

  /* Remove all entities from the registry
   */
  this.clear = function(){
    registry_store.remove('omega-registry');
    registry = {};
  }

  /* Save registry to persistent cache
   */
  this.save = function(){
    // write persistent registry entities to cookie
    var pregistry = [];
    for(var re in registry)
      if(registry[re].persistent)
        pregistry.push(registry[re]);

    var registrys = $.toJSON(pregistry);
    registry_store.set('omega-registry', registrys);
  }

  /* Restore the registry from the persistent cache
   */
  this.load = function(){
    // load registry from presistent cache if set
    // TODO expire data eventually, support manual clearing via ui, handle case if server side data changes / local is no longer valid
    registry_store.get('omega-registry', function(ok, val){
      if(ok){
        var registrys = JRObject.from_json_array(val);
        for(var re in registrys){
          $omega_registry.add(convert_entity(registrys[re]));
        }
      }
    });
  }

  /* Adds entity to registry
   */
  this.add = function(entity){
    //this.entities[entity_id].update(entity); if existing ?
    registry[entity.id] = entity;

    for(var cb in registration_callbacks)
      registration_callbacks[cb](entity);
  }

  /* Return entity w/ specified id
   */
  this.get = function(entity_id){
    return registry[entity_id];
  }

  /* Return all entities
   */
  this.entities = function(){
    return registry;
  }

  /* Return entities matching specified criteria.
   * Filters should be an array of callbacks to invoke with
   * each entity, all of which must return true for an entity
   * to include it in the return results.
   */
  this.select = function(filters){
    var ret = [];

    for(var entity in registry){
      entity = registry[entity];
      var matched = true;
      for(var filter in filters){
        filter = filters[filter];
        if(!filter(entity)){
          matched = false;
          break;
        }
      }

      if(matched)
        ret.push(entity);
    }

    return ret;
  }

  /* Retrieve and store local copy of server side entity
   * Takes method to perform retrieval and method to invoke w/
   * entity when found
   */
  this.cached = function(entity_id, retrieval, retrieved){
    if(typeof registry[entity_id] !== "undefined"){
      if(retrieved != null)
        retrieved(registry[entity_id]);
      return registry[entity_id];
    }

    // XXX hack create a placeholder to skip subsequent queries while we're waiting for response
    registry[entity_id] = null;

    retrieval(entity_id, retrieved);
    return null;
  }

  /* Add new timer to registry
   */
  this.add_timer = function(id, time, callback){
    timers[id] = new OmegaTimer(time, callback);
  }

  /* Delete specified timer
   */
  this.delete_timer = function(id){
    if(!timers[id]) return;
    timers[id].stop();
    delete timers[id];
  }

  /* Clear all timers
   */
  this.clear_timers = function(){
    for(var timer in timers){
      timers[timer].stop();
      delete timers[timer];
    }
    timers = [];
  }

  /////////////////////////////////////// initialization

}

/////////////////////////////////////// Omega Entity

/* Initialize new Omega Entity
 */
function OmegaEntity(entity){

  // XXX had to mark the private data and methods below
  //     as public for things to work properly

  /////////////////////////////////////// private data

  // scene properties
  this.clickable_obj     = null;

  this.scene_objs        = [];

  // copy all attributes from entity to self
  for(var attr in entity)
    this[attr] = entity[attr];

  // boolean indicating if entity should be stored in local registry
  this.registerable      = false;

  // boolean indicating if entity should be saved/restored in local persistent cache
  this.persistent        = false;

  /////////////////////////////////////// private methods

  // callbacks (should be set in subclasses)

  this.on_load           = null;

  this.on_clicked        = null;

  this.on_movement       = null;

  this.added_to_scene    = null;

  /////////////////////////////////////// public methods

  /* Copy all attributes of specified entity to self
   */
  this.update = function(entity){
    for(var attr in entity)
      // XXX hack do not update scene_objs
      if(attr != "scene_objs")
        this[attr] = entity[attr];
  }

  /* Load the local entity's representation, invoked
   * when the entity is retrieved from the server.
   *
   * Invoked on_load callback if set.
   */
  this.load = function(){
    if(this.on_load) this.on_load();
  }

  /* Called when local entity's representation was clicked.
   *
   * Invoked on_clicked callback if set.
   */
  this.clicked = function(){
    if(this.on_clicked) this.on_clicked();
  }

  /* Called when a location moved.
   *
   * Invoked on_movement callback if set.
   */
  this.moved = function(){
    if(this.on_movement) this.on_movement();
  }

  /* Return boolean indicating if entity's json_class
   * is equal to the specified type
   */
  this.is_a = function(type){
    return this.json_class == type;
  };

  /* Return boolean indicating if entity's user_id
   * is equal to the specified one.
   *
   * Make sure 'user_id' is an attribute of the local
   * entity before invoking
   */
  this.belongs_to_user = function(user_id){
    return this.user_id == user_id;
  };

}

//OmegaEntity.prototype.__noSuchMethod__ = function(id, args) {
//  this.apply(id, args);
//}

/////////////////////////////////////// Omega Location

/* Initialize new Omega Location
 */
function OmegaLocation(loc){

  $.extend(this, new OmegaEntity(loc));

  /////////////////////////////////////// public methods

  /* Return distance location is from the specified x,y,z
   * coordinates
   */
  this.distance_from = function(x, y, z){
    return Math.sqrt(Math.pow(this.x - x, 2) +
                     Math.pow(this.y - y, 2) +
                     Math.pow(this.z - z, 2));
  };

  /* Return boolean indicating if location is less than the
   * specified distance from the specified location
   */
  this.is_within = function(distance, loc){
    if(this.parent_id != loc.parent_id)
      return false 
    return  this.distance_from(loc.x, loc.y, loc.z) < distance;
  };

  /* Convert location to short, human readable string
   */
  this.to_s = function(){
    return roundTo(this.x, 2) + "/" +
           roundTo(this.y, 2) + "/" +
           roundTo(this.z, 2);
  }

  /* Create a new location, copy local location attributes, and return it
   */
  this.clone = function(){
    var nloc = { id                : this.id,
                 x                 : this.x ,
                 y                 : this.y ,
                 z                 : this.z,
                 parent_id         : this.parent_id,
                 movement_strategy : this.movement_strategy };

    return new OmegaLocation(nloc);
  };

  this.toJSON = function(){
    return new JRObject("Motel::Location", this,
       ["toJSON", "json_class", "entity", "notifications",
        "movement_callbacks", "proximity_callbacks"]).toJSON();
  };

}

/////////////////////////////////////// Omega Galaxy

/* Initialize new Omega Galaxy
 */
function OmegaGalaxy(galaxy){

  $.extend(this, new OmegaEntity(galaxy));

  this.registerable = true;
  this.persistent   = true;

  /////////////////////////////////////// public methods

  /* Returns array of all children of galaxy
   */
  this.children = function(){
    return this.solar_systems;
  }

}

/* Helper class method to return cached galaxy specified by name
 * or to retrieve galaxy from server if it does not exist clientside
 */
OmegaGalaxy.cached = function(name, retrieved){
  var retrieval = function(name, retrieved){
    OmegaQuery.galaxy_with_name(name, retrieved);
  };
  $omega_registry.cached(name, retrieval, retrieved);
}

/////////////////////////////////////// Omega SolarSystem

/* Initialize new Omega SolarSystem
 */
function OmegaSolarSystem(system){

  $.extend(this, new OmegaEntity(system));

  this.registerable = true;
  this.persistent   = true;

  /////////////////////////////////////// public methods

  /* Returns array of all children of solar system
   */
  this.children = function(){
    var system   = this;
    var entities = $omega_registry.select([function(e){ return e.system_name  == system.name &&
                                                               (e.json_class  == "Manufactured::Ship" ||
                                                                e.json_class  == "Manufactured::Station" )}]);

    return [this.star].
            concat(this.planets).
            concat(this.asteroids).
            concat(this.jump_gates).
            concat(entities);
  }

  /////////////////////////////////////// private methods


  /* on_load callback, invoked whenever system is loaded
   * from the server.
   *
   * Instantiates three.js scene objects and adds them to global scene
   */
  this.on_load = function(){
    for(var j=0; j<this.jump_gates.length;++j){
      var system = this;
      var jg = this.jump_gates[j];
      OmegaSolarSystem.cached(jg.endpoint, function(sys){
        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(system.location.x,
                                                 system.location.y,
                                                 system.location.z));

        geometry.vertices.push(new THREE.Vector3(sys.location.x, sys.location.y, sys.location.z));
        var line = new THREE.Line(geometry, $omega_scene.materials['line']);

        system.scene_objs.push(line);
        $omega_scene.add(line);
      });
    }
    
    // draw sphere representing system
    var radius   = 100, segments = 32, rings = 32;
    var geometry = new THREE.SphereGeometry(radius, segments, rings);
    var sphere   = new THREE.Mesh(geometry, $omega_scene.materials['system_sphere']);
    sphere.position.x = this.location.x;
    sphere.position.y = this.location.y;
    sphere.position.z = this.location.z ;
    sphere.omega_id   = this.name + '-sphere';
    this.clickable_obj = sphere;
    this.scene_objs.push(sphere);
    $omega_scene.add(sphere);

    var geometry = new THREE.PlaneGeometry(100, 100);
    var plane = new THREE.Mesh(geometry, $omega_scene.materials['system_plane']);
    plane.position.x = this.location.x;
    plane.position.y = this.location.y;
    plane.position.z = this.location.z;
    plane.rotation.x = 0.785;
    plane.lookAt($omega_camera.position()); // XXX dependency on omega_camera
    this.scene_objs.push(plane);
    $omega_scene.add(plane);

    // draw label
    var text3d = new THREE.TextGeometry( system.name, {height: 12, width: 5, curveSegments: 2, font: 'helvetiker', size: 64});
    var text   = new THREE.Mesh( text3d, $omega_scene.materials['system_label'] );
    text.position.x = this.location.x;
    text.position.y = this.location.y;
    text.position.z = this.location.z + 50;
    text.omega_id = this.name + "-text";
    this.scene_objs.push(text);
    $omega_scene.add(text);
  }

  /* on_clicked callback, invoked when system sphere is clicked on canvas
   *
   * Sets scene root entity to clicked system
   */
  this.on_clicked = function(){
    $omega_scene.set_root($omega_registry.get(this.id));
  }
}

/* Helper class method to return cached solar system specified by name
 * or to retrieve solar system from server if it does not exist clientside
 */
OmegaSolarSystem.cached = function(name, retrieved){
  var retrieval = function(name, retrieved){
    OmegaQuery.system_with_name(name, retrieved);
  };
  $omega_registry.cached(name, retrieval, retrieved);
}


/////////////////////////////////////// Omega Star

/* Initialize new Omega Star
 */
function OmegaStar(star){

  $.extend(this, new OmegaEntity(star));

  /////////////////////////////////////// private methods

  /* on_load callback, invoked whenever star is loaded
   * from the server.
   *
   * Instantiates three.js scene objects and adds them to global scene
   */
  this.on_load = function(){
    var radius = this.size/4, segments = 32, rings = 32;

    if($omega_scene.materials['star' + this.color] == null)
      $omega_scene.materials['star' + this.color] =
        new THREE.MeshBasicMaterial({color: parseInt('0x' + this.color),
                                       map: $omega_scene.textures['star'],
                                       overdraw : true})

    var sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, rings),
                                $omega_scene.materials['star' + this.color]);

    sphere.position.x = this.location.x ;
    sphere.position.y = this.location.y ;
    sphere.position.z = this.location.z ;
    sphere.omega_id   = this.name + "-sphere";

    this.clickable_obj = sphere;
    this.scene_objs.push(sphere);
    $omega_scene.add(sphere);
  }
}

/////////////////////////////////////// Omega Planet

/* Initialize new Omega Planet
 */
function OmegaPlanet(planet){

  $.extend(this, new OmegaEntity(planet));

  /////////////////////////////////////// public methods

  /* Override OmegaEntity.update, preserve orbit/orbiti
   */
  this.update = function(entity){
    for(var attr in entity)
      // XXX hack do not update scene_objs
      if(attr != "scene_objs" &&
         attr != "orbit" &&
         attr != "orbiti")
        this[attr] = entity[attr];
  }


  /* Returns array of all children of planet
   */
  this.children = function(){
    return this.moons;
  }

  /////////////////////////////////////// private methods

  /* on_load callback, invoked whenever planet is loaded
   * from the server.
   *
   * Instantiates three.js scene objects and adds them to global scene
   */
  this.on_load = function(){
    // draw sphere representing planet
    var radius = this.size, segments = 32, rings = 32;
    if($omega_scene.geometries['planet' + radius] == null)
       $omega_scene.geometries['planet' + radius] =
         new THREE.SphereGeometry(radius, segments, rings);
    if($omega_scene.materials['planet' + this.color] == null)
       $omega_scene.materials['planet' + this.color] =
         new THREE.MeshBasicMaterial({color: parseInt('0x' + this.color)});

    var sphere = new THREE.Mesh($omega_scene.geometries['planet' + radius],
                                $omega_scene.materials[ 'planet' + this.color]);

    sphere.position.x = this.location.x;
    sphere.position.y = this.location.y;
    sphere.position.z = this.location.z;
    sphere.omega_id   = this.name + '-sphere';

    this.clickable_obj = sphere;
    this.scene_objs.push(sphere);
    $omega_scene.add(sphere);

    // draw orbit
    this.calc_orbit();
    var geometry = new THREE.Geometry();
    for(var o in this.orbit){
      if(o != 0 & (o % 10 == 0)){
        var orbit  = this.orbit[o];
        var porbit = this.orbit[o-1];
        geometry.vertices.push(new THREE.Vector3(orbit[0],  orbit[1],  orbit[2]));
        geometry.vertices.push(new THREE.Vector3(porbit[0], porbit[1], porbit[2]));
      }
    }
    var line = new THREE.Line(geometry, $omega_scene.materials['orbit']);
    this.scene_objs.push(line);
    this.scene_objs.push(geometry);
    // TODO make orbit rendering togglable
    $omega_scene.add(line);
    
    // draw moons
    for(var m=0; m<this.moons.length; ++m){
      var moon = this.moons[m];
      var sphere = new THREE.Mesh($omega_scene.geometries['moon'],
                                  $omega_scene.materials['moon']);

      sphere.position.x = this.location.x + moon.location.x;
      sphere.position.y = this.location.y + moon.location.y;
      sphere.position.z = this.location.z + moon.location.z;
      sphere.omega_id   = moon.name + '-sphere';

      this.scene_objs.push(sphere);
      $omega_scene.add(sphere);
    }
  }

  /* Calculate and cache the planet's orbit given its movement strategy.
   *
   * This doesn't change so can just be calculated and stored.
   */
  this.calc_orbit = function(){
    this.orbit = [];

    // intercepts
    var a = this.location.movement_strategy.semi_latus_rectum /
              (1 - Math.pow(this.location.movement_strategy.eccentricity, 2));

    var b = Math.sqrt(this.location.movement_strategy.semi_latus_rectum * a);

    // linear eccentricity
    var le = Math.sqrt(Math.pow(a, 2) - Math.pow(b, 2));

    // center (assumes planet's location's movement_strategy.relative to is set to foci
    var cx = -1 * this.location.movement_strategy.direction_major_x * le;
    var cy = -1 * this.location.movement_strategy.direction_major_y * le;
    var cz = -1 * this.location.movement_strategy.direction_major_z * le;

    // orbit
    this.orbiti = 0;
    for(var i = 0; i < 2 * Math.PI; i += (Math.PI / 180)){
      var ox = cx + a * Math.cos(i) * this.location.movement_strategy.direction_major_x +
                    b * Math.sin(i) * this.location.movement_strategy.direction_minor_x ;

      var oy = cy + a * Math.cos(i) * this.location.movement_strategy.direction_major_y +
                    b * Math.sin(i) * this.location.movement_strategy.direction_minor_y ;

      var oz = cz + a * Math.cos(i) * this.location.movement_strategy.direction_major_z +
                    b * Math.sin(i) * this.location.movement_strategy.direction_minor_z ;

      var absi = parseInt(i * 180 / Math.PI);

      if(absi == 0 ||
         this.location.distance_from(ox, oy, oz) <
         this.location.distance_from(this.orbit[absi-1][0],
                                     this.orbit[absi-1][1],
                                     this.orbit[absi-1][2]))
          this.orbiti = absi;
      this.orbit.push([ox, oy, oz]);
    }
  }

  /* on_movement callback, invoked whenever planet moves the tracked distance
   * along its orbit.
   *
   * Updates the three.js scene objects
   */
  this.on_movement = function(){
    // first scene obj is the planet's sphere

    var sphere = this.scene_objs[0];
    sphere.position.x = this.location.x;
    sphere.position.y = this.location.y;
    sphere.position.z = this.location.z;

    // next two scene objects belong to planet, rest are the
    // moon's spheres

    for(var m=0; m<this.moons.length; ++m){
      var moon = this.moons[m];
      sphere = this.scene_objs[3+m];

      sphere.position.x = this.location.x + moon.location.x;
      sphere.position.y = this.location.y + moon.location.y;
      sphere.position.z = this.location.z + moon.location.z;
    }

    // TODO performance hit, not needed until we track planet movement / resync
    // update orbit index
    //var di = this.location.distance_from.apply(this.location, this.orbit[this.orbiti]);
    //for(var i = 0; i < 2 * Math.PI; i += (Math.PI / 180)){
    //  var absi = parseInt(i * 180 / Math.PI);
    //  var tdi  = this.location.distance_from.apply(this.location, this.orbit[absi]);
    //  if(tdi < di){
    //      this.orbiti = absi; di = tdi;
    //  }
    //}
  }

  /* Manually move the planet, can be used to manually sync the planet
   * w/ its orbit inbetween on_movement updates subscribed to on the server.
   *
   * See 'cache_movement' below
   */
  this.move = function(){
    var now = (new Date()).getTime() / 1000;

    if(this.last_moved == null){
      this.last_moved = now;
      return;
    }

    var elapsed     = now - this.last_moved;
    var distance    = this.location.movement_strategy.speed * elapsed;
    this.last_moved = now;

    var absd     = parseInt(distance * 180 / Math.PI);
    this.orbiti += absd;
    if(this.orbiti > 360) this.orbiti -= 360;

    var nloc        = this.orbit[this.orbiti];
    this.location.x = nloc[0];
    this.location.y = nloc[1];
    this.location.z = nloc[2];

    this.moved();
  }

  /* added_to_scene callback, invoked when planet is added to omega_scene
   *
   * Updates the planet's location from the server side state, sets up tracking
   */
  this.added_to_scene = function(){
    var pl = this;

    OmegaQuery.location_with_id(pl.location.id, function(loc){
      pl.location.update(loc);
      $omega_scene.reload(pl);
    });
  }
}

/* Planet movement loop global lock, see cache_movement below
 */
OmegaPlanet.movement_cached = false;

/* Track and manually planet movement inbetween on_movement callbacks.
 *
 * Automatically tracks all planets in a scene upon every scene change.
 */
OmegaPlanet.cache_movement  = function(){
  if(OmegaPlanet.movement_cached) return;
  OmegaPlanet.movement_cached = true;

  $omega_scene.on_scene_change('planet_movement', function(){
    $omega_registry.delete_timer('planet_movement');
    $omega_registry.add_timer('planet_movement', 2000, function(){
      var sroot = $omega_scene.get_root();

      if(sroot.json_class != "Cosmos::SolarSystem"){
        $omega_registry.delete_timer('planet_movement');
        return;
      }

      var planets = sroot.planets;

      for(var planet in planets){
        planets[planet].move();
      }

      if(planets.length > 0)
        $omega_scene.animate();
    });
  });
}

/////////////////////////////////////// Omega Asteroid

/* Initialize new Omega Asteroid
 */
function OmegaAsteroid(asteroid){

  $.extend(this, new OmegaEntity(asteroid));

  /////////////////////////////////////// private methods

  /* on_load callback, invoked whenever planet is loaded
   * from the server.
   *
   * Instantiates three.js scene objects and adds them to global scene
   */
  this.on_load = function(){
    var mesh = new THREE.Mesh($omega_scene.geometries['asteroid'],
                              $omega_scene.materials['asteroid']   );

    mesh.position.x = this.location.x;
    mesh.position.y = this.location.y;
    mesh.position.z = this.location.z;
    mesh.omega_id = this.name + '-mesh';
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 15;

    var sphere   = new THREE.Mesh($omega_scene.geometries['asteroid_container'],
                                  $omega_scene.materials['asteroid_container']);

    sphere.position.x = this.location.x;
    sphere.position.y = this.location.y;
    sphere.position.z = this.location.z;
    sphere.scale.x = sphere.scale.y = sphere.scale.z = 5;

    this.clickable_obj = sphere;
    this.scene_objs.push(mesh);
    this.scene_objs.push(sphere);
    $omega_scene.add(mesh);
    $omega_scene.add(sphere);
  }

  /* on_clicked callback, invoked when asteroid is clicked on canvas
   *
   * Pops up entity container w/ asteroid infromation, retreiving resource
   * sources from server
   */
  this.on_clicked = function(){
    var details = ['Asteroid: ' + this.name + "<br/>",
                   '@ ' + this.location.to_s() + '<br/>',
                   'Resources: <br/>'];
    $omega_entity_container.show(details);

    $omega_node.web_request('cosmos::get_resource_sources', this.name,
      function(resource_sources, error){
        if(error == null){
          var details = [];
          for(var r in resource_sources){
            var res = resource_sources[r];
            details.push(res.quantity + " of " + res.resource.name + " (" + res.resource.type + ")<br/>");
          }
          $omega_entity_container.append(details);
        }
      });
  }
}

/////////////////////////////////////// Omega JumpGate

/* Initialize new Omega JumpGate
 */
function OmegaJumpGate(jump_gate){

  $.extend(this, new OmegaEntity(jump_gate));

  this.registerable = true;

  /////////////////////////////////////// private methods

  /* on_load callback, invoked whenever system is loaded
   * from the server.
   *
   * Instantiates three.js scene objects and adds them to global scene.
   * If jump gate is selected draw sphere corresponding to the trigger
   * distance around the jump gate.
   */
  this.on_load = function(){
    //var geometry = new THREE.PlaneGeometry( 50, 50 );
    var geometry = $omega_scene.geometries['jump_gate'];
    var material = $omega_scene.materials['jump_gate']
    var mesh     = new THREE.Mesh(geometry, material);

    mesh.position.set( this.location.x, this.location.y, this.location.z );
    //mesh.omega_id = // TODO
    this.scene_objs.push(mesh);
    $omega_scene.add( mesh );

    // sphere to draw around jump gate when selected
    var radius    = this.trigger_distance, segments = 32, rings = 32;
    var sgeometry = new THREE.SphereGeometry(radius, segments, rings);
    var smaterial = $omega_scene.materials['jump_gate_selected'];
    var ssphere   = new THREE.Mesh(sgeometry, smaterial);
                                 
    ssphere.position.x = this.location.x ;
    ssphere.position.y = this.location.y ;
    ssphere.position.z = this.location.z ;
    this.scene_objs.push(ssphere);

    if($omega_scene.selection.is_selected(this.id)){
      $omega_scene.add(ssphere);
      this.clickable_obj = ssphere;
    }else{
      this.clickable_obj = mesh;
    }
  }

  /* on_unselected callback, invoked when entity_container is closed
   * when jump gate is selected
   */
  var on_unselected = function(){
    var selected_id = $omega_scene.selection.selected()
    $omega_scene.selection.unselect(selected_id);
    $omega_scene.reload($omega_registry.get(selected_id));
    $omega_entity_container.on_closed(null);
  }

  /* on_clicked callback, invoked when jump gate is clicked on canvas
   *
   */
  this.on_clicked = function(){
    var details = ['Jump Gate to ' + this.endpoint + '<br/>',
                   '@ ' + this.location.to_s() + "<br/><br/>",
                   "<div class='cmd_icon' id='ship_trigger_jg'>Trigger</div>"];
    $omega_entity_container.show(details);

    $omega_scene.selection.select(this.id);
    $omega_scene.reload(this);

    $omega_entity_container.on_closed(on_unselected);
  }

}


/////////////////////////////////////// Omega Ship

/* Initialize new Omega Ship
 */
function OmegaShip(ship){

  $.extend(this, new OmegaEntity(ship));

  this.registerable = true;

  /////////////////////////////////////// private methods

  /* on_load callback, invoked whenever ship is loaded
   * from the server.
   *
   * Instantiates three.js scene objects and adds them to global scene.
   * Ship appearance can vary depending on ship's attributes and actions
   */
  this.on_load = function(){
    // do not load if ship is destroyed
    if(this.hp <= 0) return;

    // draw crosshairs representing ship
    var color = '0x';
    if($omega_scene.selection.is_selected(this.id))
      color += "FFFF00";
    else if(this.docked_at)
      color += "99FFFF";
    else if(!this.belongs_to_user($user_id))
      color += "CC0000";
    else
      color += "00CC00";

    if($omega_scene.materials['ship' + color] == null)
       $omega_scene.materials['ship' + color] =
         new THREE.MeshBasicMaterial({color: parseInt(color), overdraw : true});

    var material = $omega_scene.materials['ship' + color];

    var mesh = new THREE.Mesh($omega_scene.geometries['ship'], material);

    mesh.position.set(this.location.x, this.location.y, this.location.z);
    mesh.rotation.x = mesh.rotation.y = mesh.rotation.z = 0;
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 10;
    //mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.scene_objs.push(mesh);
    $omega_scene.add(mesh);

    this.clickable_obj = mesh;

    // if ship is attacking another, draw line of attack
    if(this.attacking){
      material = $omega_scene.materials['ship_attacking'];
      geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(this.location.x,
                                               this.location.y,
                                               this.location.z));
      geometry.vertices.push(new THREE.Vector3(this.attacking.location.x,
                                               this.attacking.location.y + 25,
                                               this.attacking.location.z));

      line = new THREE.Line(geometry, material);
      this.scene_objs.push(line);
      this.scene_objs.push(geometry);
      $omega_scene.add(line);

    // if ship is mining, draw line to mining target
    }else if(this.mining){
      material = $omega_scene.materials['ship_mining']
      geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(this.location.x,
                                               this.location.y,
                                               this.location.z));
      geometry.vertices.push(new THREE.Vector3(this.mining.entity.location.x,
                                               this.mining.entity.location.y + 25,
                                               this.mining.entity.location.z));

      line = new THREE.Line(geometry, material);
      this.scene_objs.push(line);
      this.scene_objs.push(geometry);
      $omega_scene.add(line);
    }

    // handle events
    OmegaEvent.defended.subscribe(this.id);
  }

  /* on_unselected callback, invoked when entity_container is closed
   * when ship is selected
   */
  var on_unselected = function(){
    var selected_id = $omega_scene.selection.selected()
    $omega_scene.selection.unselect(selected_id);
    $omega_scene.reload($omega_registry.get(selected_id));
    $omega_entity_container.on_closed(null);
  }

  /* on_clicked callback, invoked when ship is clicked on canvas
   *
   * Pops up entity container w/ ship infromation and actions
   */
  this.on_clicked = function(){
    var rstxt = 'Resources: <br/>';
    for(var r in this.resources){
      rstxt += this.resources[r] + " of " + r + ", ";
    }

    var details = ['Ship: ' + this.id +"<br/>",
                   '@ ' + this.location.to_s() + '<br/>',
                   rstxt];

    if(this.belongs_to_user($user_id)){
      details.push("<div class='cmd_icon' id='ship_select_move'>move</div>"); // TODO only if not mining / attacking
      details.push("<div class='cmd_icon' id='ship_select_target'>attack</div>");
      details.push("<div class='cmd_icon' id='ship_select_dock'>dock</div>");
      details.push("<div class='cmd_icon' id='ship_undock'>undock</div>");
      details.push("<div class='cmd_icon' id='ship_select_transfer'>transfer</div>");
      details.push("<div class='cmd_icon' id='ship_select_mine'>mine</div>");
    }

    $omega_entity_container.show(details);

    if(!this.docked_at){
      $('#ship_select_dock').show();
      $('#ship_undock').hide();
      $('#ship_select_transfer').hide();
    }else{
      $('#ship_select_dock').hide();
      $('#ship_undock').show();
      $('#ship_select_transfer').show();
    }

    $omega_scene.selection.select(this.id);
    $omega_entity_container.on_closed(on_unselected);
    $omega_scene.reload(this);
  }

  /* on_movement callback, invoked whenever ship moves the tracked distance
   *
   * Updates the three.js scene objects
   */
  this.on_movement = function(){
    // TODO should do without the reload in 'clicked'
    if($omega_scene.selection.is_selected(this.id))
      this.clicked();

    // scene_objects 0 is the mesh
    this.scene_objs[0].position.x = this.location.x;
    this.scene_objs[0].position.y = this.location.y;
    this.scene_objs[0].position.z = this.location.z;

    // scene_object 1/2 is the attack / mining line and geometry (if applicable)
    if(this.scene_objs.length > 2){
      this.scene_objs[2].vertices[0].x = this.location.x;
      this.scene_objs[2].vertices[0].y = this.location.y;
      this.scene_objs[2].vertices[0].z = this.location.z;
    }
  }

  /* added_to_scene callback, invoked when ship is added to omega_scene
   *
   * Updates the ship from the server side state, sets up tracking
   */
  this.added_to_scene = function(){
    OmegaQuery.entity_with_id(this.id, function(sh){
      $omega_scene.reload(sh);

      // retrack ship movement
      OmegaEvent.movement.subscribe(sh.location.id, 20);
    });
  }

}

/////////////////////////////////////// Omega Station

/* Initialize new Omega Station
 */
function OmegaStation(station){

  $.extend(this, new OmegaEntity(station));

  this.registerable = true;

  /////////////////////////////////////// private methods

  /* on_load callback, invoked whenever ship is loaded
   * from the server.
   *
   * Instantiates three.js scene objects and adds them to global scene.
   * Station's appearance can vary depending on station's attributes and actions
   */
  this.on_load = function(){
    var color = '0x';
    if($omega_scene.selection.is_selected(this.id))
      color += "FFFF00";
    else if(!this.belongs_to_user($user_id))
      color += "CC0011";
    else
      color += "0000CC";

    if($omega_scene.materials['station' + color] == null)
      $omega_scene.materials['station' + color] =
        new THREE.MeshBasicMaterial({color: parseInt(color)});
    var material = $omega_scene.materials['station'+color];

    var mesh = new THREE.Mesh($omega_scene.geometries['station'], material);

    mesh.position.set(this.location.x, this.location.y, this.location.z);
    mesh.rotation.x = mesh.rotation.y = mesh.rotation.z = 0;
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 5;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.scene_objs.push(mesh);
    $omega_scene.add(mesh);

    this.clickable_obj = mesh;
  }

  /* on_unselected callback, invoked when entity_container is closed
   * when station is selected
   */
  var on_unselected = function(){
    var selected_id = $omega_scene.selection.selected()
    $omega_scene.selection.unselect(selected_id);
    $omega_scene.reload($omega_registry.get(selected_id));
    $omega_entity_container.on_closed(null);
  }

  /* on_clicked callback, invoked when station is clicked on canvas
   *
   * Pops up entity container w/ station infromation and actions
   */
  this.on_clicked = function(){
    var rstxt = 'Resources: <br/>';
    for(var r in this.resources){
      rstxt += this.resources[r] + " of " + r + ", ";
    }

    var details = ['Station: ' + this.id + "<br/>",
                   '@' + this.location.to_s() + '<br/>',
                   rstxt];

    if(this.belongs_to_user($user_id)){
      details.push("<div class='cmd_icon' id='station_select_construction'>construct</div>");
    }

    $omega_entity_container.show(details);

    $omega_scene.selection.select(this.id);
    $omega_entity_container.on_closed(on_unselected)
    $omega_scene.reload(this);
  }

  /* added_to_scene callback, invoked when station is added to omega_scene
   *
   * Updates the station from the server side state, to get resources
   */
  this.added_to_scene = function(){
    OmegaQuery.entity_with_id(this.id, function(st){
      $omega_scene.reload(st);
    });
  }
}
