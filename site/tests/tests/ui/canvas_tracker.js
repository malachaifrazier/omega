// TODO test independently (currently testing through index page mixin)
pavlov.specify("Omega.UI.CanvasTracker", function(){
describe("Omega.UI.CanvasTracker", function(){
  describe("#_default_root_id", function(){
    var page, url, orig_config;
    before(function(){
      page = $.extend({config: Omega.Config}, Omega.UI.CanvasTracker);

      url = $.url(window.location);
      sinon.stub($, 'url').returns(url);
      orig_config = Omega.Config.default_root;
    });

    after(function(){
      $.url.restore();
      Omega.Config.default_root = orig_config;
    });

    it("returns url 'root' param", function(){
      sinon.stub(url, 'param').returns('custom');
      assert(page._default_root_id()).equals('custom');
    });

    it("returns config 'default_root'", function(){
      sinon.stub(url, 'param').returns(null);
      Omega.Config.default_root = 'custom';
      assert(page._default_root_id()).equals('custom');
    });

    describe("url root param and config default_root not set", function(){
      it("returns null", function(){
        sinon.stub(url, 'param').returns(null);
        Omega.Config.default_root = null;
        assert(page._default_root_id()).equals(null);
      });
    });
  });

  describe("#_default_root", function(){
    var page, sys1, sys2, gal1;
    before(function(){
      page = $.extend({}, Omega.UI.CanvasTracker,
                          new Omega.UI.Registry());
      sys1 = Omega.Gen.solar_system();
      sys2 = Omega.Gen.solar_system();
      gal1 = Omega.Gen.galaxy();
      sinon.stub(page, 'systems').returns([sys1, sys2])
      sinon.stub(page, 'galaxies').returns([gal1]);
    });

    describe("default root id is random", function(){
      it("returns random system or galaxy from entities registry", function(){
        sinon.stub(page, '_default_root_id').returns('random');
        assert([sys1, sys2, gal1]).includes(page._default_root());
      });
    });

    it("return entity with specified id from entities registry", function(){
      page.entity(sys1.id, sys1);
      sinon.stub(page, '_default_root_id').returns(sys1.id);
      assert(page._default_root()).equals(sys1);
    });

    it("return entity with specified name from entities registry", function(){
      sys1.name = 'name';
      page.entity(sys1.id, sys1);
      sinon.stub(page, '_default_root_id').returns(sys1.name);
      assert(page._default_root()).equals(sys1);
    });
  });

  describe("#_should_autoload_root", function(){
    var page;
    before(function(){
      page = $.extend({}, Omega.UI.CanvasTracker);
    });

    describe("already autoloaded", function(){
      it("returns false", function(){
        page.autoloaded = true;
        assert(page._should_autoload_root()).isFalse();
      });
    });

    describe("default root is null", function(){
      it("returns false", function(){
        page.autoloaded = false;
        sinon.stub(page, '_default_root').returns(null);
        assert(page._should_autoload_root()).isFalse();
      });
    });

    describe("not autoloaded and default root is set", function(){
      it("returns true", function(){
        page.autoloaded = false;
        sinon.stub(page, '_default_root').returns(Omega.Gen.solar_system());
        assert(page._should_autoload_root()).isTrue();
      })
    })
  });

  describe("#autoload_root", function(){
    var page, sys1;
    before(function(){
      page = $.extend({node : new Omega.Node(),
                       canvas : new Omega.UI.Canvas()},
                      Omega.UI.CanvasTracker, new Omega.UI.Registry());
      sys1 = Omega.Gen.solar_system();

      sinon.stub(page, '_default_root').returns(sys1);
      sinon.stub(sys1, 'refresh');
    });

    it("sets autoloaded to true", function(){
      page.autoload_root();
      assert(page.autoloaded).isTrue();
    });

    it("refreshes default root", function(){
      page.autoload_root();
      sinon.assert.calledWith(sys1.refresh, page.node, sinon.match.func);
    });

    it("sets scene root to default root", function(){
      sinon.stub(page.canvas, 'set_scene_root');
      page.autoload_root();
      sys1.refresh.omega_callback()();
      sinon.assert.calledWith(page.canvas.set_scene_root, sys1);
    });
  });

  describe("#scene_change", function(){
    var page, system, old_system, change, entity_map;
    var orig_page;

    before(function(){
      page = $.extend({canvas : Omega.Test.Canvas(),
                       config : Omega.Config}, Omega.UI.CanvasTracker);
      orig_page = page.canvas.page;
      page.canvas.page = page;

      system     = Omega.Gen.solar_system();
      old_system = Omega.Gen.solar_system();
      change     = {root: system, old_root: old_system}
      entity_map = {};

      sinon.stub(page, 'entity_map').returns(entity_map);
      sinon.stub(page, 'track_system_events');
      sinon.stub(page, 'track_scene_entities');
      sinon.stub(page, 'sync_scene_entities');
      sinon.stub(page, '_process_retrieved_scene_entities');
      sinon.stub(page, 'sync_scene_planets');

      sinon.stub(page.canvas, 'remove');
      sinon.stub(page.canvas, 'add');
      sinon.stub(page.canvas.skybox, 'set');
    });

    after(function(){
      page.canvas.page = orig_page;
      page.canvas.remove.restore();
      page.canvas.add.restore();
      page.canvas.skybox.set.restore();
    });

    it("starts tracking system events", function(){
      page.scene_change(change);
      sinon.assert.calledWith(page.track_system_events, change.root);
    });

    it("starts tracking scene entities", function(){
      page.scene_change(change)
      sinon.assert.calledWith(page.track_scene_entities,
                              change.root, entity_map);
    });

    it("syncs scene entities", function(){
      page.scene_change(change)
      sinon.assert.calledWith(page.sync_scene_entities,
                              change.root, entity_map);
    });

    it("processes sync'd scene entities", function(){
      var retrieved = {};
      page.scene_change(change)
      page.sync_scene_entities.omega_callback()(retrieved);
      sinon.assert.calledWith(page._process_retrieved_scene_entities,
                              retrieved, entity_map);
    });

    it("syncs scene planets", function(){
      page.scene_change(change);
      sinon.assert.calledWith(page.sync_scene_planets, change.root);
    });

    describe("changing scene from galaxy", function(){
      it("removes galaxy from scene entities", function(){
        change.old_root = new Omega.Galaxy();
        page.scene_change(change);
        sinon.assert.calledWith(page.canvas.remove, change.old_root);
      });
    });

    describe("changing scene to galaxy", function(){
      it("adds galaxy to scene entities", function(){
        change.root = new Omega.Galaxy();
        page.scene_change(change);
        sinon.assert.calledWith(page.canvas.add, change.root);
      });
    });

    it("sets scene skybox background", function(){
      page.scene_change(change);
      sinon.assert.calledWith(page.canvas.skybox.set, change.root.bg);
    });

    it("adds skybox to scene", function(){
      page.scene_change(change);
      sinon.assert.calledWith(page.canvas.add, page.canvas.skybox);
    });

    it("adds star dust to scene", function(){
      page.scene_change(change);
      sinon.assert.calledWith(page.canvas.add, page.canvas.star_dust);
    });
  });

  describe("#_process_retrieved_scene_entities", function(){
    before(function(){
      sinon.stub(Omega.UI.CanvasTracker, '_process_retrieved_scene_entity')
    });

    after(function(){
      Omega.UI.CanvasTracker._process_retrieved_scene_entity.restore();
    });

    it("processes each retrieved scene entity individually", function(){
      var entities = [Omega.Gen.ship(), Omega.Gen.station()];
      var entity_map = {};
      Omega.UI.CanvasTracker._process_retrieved_scene_entities(entities, entity_map)
      sinon.assert.calledWith(Omega.UI.CanvasTracker.
                                _process_retrieved_scene_entity,
                              entities[0], entity_map);
      sinon.assert.calledWith(Omega.UI.CanvasTracker.
                                _process_retrieved_scene_entity,
                              entities[1], entity_map);
    })
  });

  describe("#_process_retrieved_scene_entity", function(){
    var page, entity_map;

    before(function(){
      page = $.extend({config: Omega.Config,
                       node : new Omega.Node()},
                       new Omega.UI.Registry(), Omega.UI.CanvasTracker);
      page.canvas  = new Omega.UI.Canvas();
      page.canvas.page = page;
      page.session = new Omega.Session({user_id : 'user42'}); 
      entity_map   = {start_tracking : []};
    });

    it("sets entity solar system", function(){
      var system = Omega.Gen.solar_system();
      page.entity(system.id, system);
      var ship = Omega.Gen.ship({system_id : system.id});
      sinon.spy(ship, 'update_system');
      page._process_retrieved_scene_entity(ship, entity_map);
      sinon.assert.calledWith(ship.update_system, system);
    });

    describe("user owns entity", function(){
      it("skips entity", function(){
        var ship = Omega.Gen.ship({user_id : page.session.user_id});
        page._process_retrieved_scene_entity(ship, entity_map);
        assert(page.entity(ship.id)).isUndefined();
      })
    });

    it("stores entity", function(){
      var ship = Omega.Gen.ship();
      sinon.stub(page, '_store_entity');
      page._process_retrieved_scene_entity(ship, entity_map);
      sinon.assert.calledWith(page._store_entity, ship);
    });

    describe("entity is not alive", function(){
      var ship;

      before(function(){
        ship = Omega.Gen.ship();
        ship.hp = 0;
      });

      it("does not add to canvas", function(){
        sinon.stub(page.canvas, 'add');
        page._process_retrieved_scene_entity(ship, entity_map);
        sinon.assert.notCalled(page.canvas.add);
      });

      it("does not track entity", function(){
        sinon.stub(page, 'track_entity');
        page._process_retrieved_scene_entity(ship, entity_map);
        sinon.assert.notCalled(page.track_entity);
      });

      it("does not add to navigation", function(){
        sinon.stub(page, '_add_nav_entity');
        page._process_retrieved_scene_entity(ship, entity_map);
        sinon.assert.notCalled(page._add_nav_entity);
      });
    });

    describe("entity is alive", function(){
      var ship;

      before(function(){
        page.canvas.root = Omega.Gen.solar_system();
        ship = Omega.Gen.ship({system_id : page.canvas.root.id});
        sinon.stub(page.canvas, 'add');
        sinon.spy(page, 'track_entity');
        sinon.stub(page, '_add_nav_entity');
      });

      it("adds entity to scene", function(){
        page._process_retrieved_scene_entity(ship, entity_map);
        sinon.assert.calledWith(page.canvas.add, ship);
      })

      it("starts tracking entity", function(){
        page._process_retrieved_scene_entity(ship, entity_map);
        sinon.assert.calledWith(page.track_entity, ship);
      })

      it("adds entity to navigation", function(){
        page._process_retrieved_scene_entity(ship, entity_map);
        sinon.assert.calledWith(page._add_nav_entity, ship);
      });
    });
  });

  describe("#_add_nav_entity", function(){
    var page, ship;

    before(function(){
      page = $.extend({canvas : new Omega.UI.Canvas()}, Omega.UI.CanvasTracker);
      ship = Omega.Gen.ship();
    });

    it("adds entity to entities list", function(){
      page._add_nav_entity(ship);
      assert(page.canvas.controls.entities_list.has(ship.id)).isTrue();
      assert(page.canvas.controls.entities_list.list().length).equals(1);
    });

    describe("entities list already has entity", function(){
      it("does not add entity to list", function(){
        page._add_nav_entity(ship);
        page._add_nav_entity(ship);
        assert(page.canvas.controls.entities_list.list().length).equals(1);
      });
    })
  });

  describe("#_add_nav_system", function(){
    var page, system;

    before(function(){
      page = $.extend({canvas : new Omega.UI.Canvas()}, Omega.UI.CanvasTracker);
      system = Omega.Gen.solar_system();
    });

    it("adds system to locations list", function(){
      page._add_nav_system(system);
      assert(page.canvas.controls.locations_list.has(system.id)).isTrue();
      assert(page.canvas.controls.locations_list.list().length).equals(1);
    });

    describe("locations list already has system", function(){
      it("does not add system to list", function(){
        page._add_nav_system(system);
        page._add_nav_system(system);
        assert(page.canvas.controls.locations_list.list().length).equals(1);
      });
    });
  });

  describe("#_add_nav_galaxy", function(){
    var page, galaxy;

    before(function(){
      page = $.extend({canvas : new Omega.UI.Canvas()}, Omega.UI.CanvasTracker);
      galaxy = Omega.Gen.galaxy();
    });

    it("adds galaxy to locations list", function(){
      page._add_nav_system(galaxy);
      assert(page.canvas.controls.locations_list.has(galaxy.id)).isTrue();
      assert(page.canvas.controls.locations_list.list().length).equals(1);
    });

    describe("locations list already has galaxy", function(){
      it("does not add galaxy to list", function(){
        page._add_nav_system(galaxy);
        page._add_nav_system(galaxy);
        assert(page.canvas.controls.locations_list.list().length).equals(1);
      });
    });
  });

  describe("#_store_entity", function(){
    var page, entity;

    before(function(){
      page = $.extend({}, new Omega.UI.Registry(), Omega.UI.CanvasTracker);
      entity = Omega.Gen.ship();
    });

    describe("prexisting local entity", function(){
      it("copies gfx from local entity", function(){
        var local = Omega.Gen.ship();
        page.entity(entity.id, local);
        sinon.stub(entity, 'cp_gfx');
        page._store_entity(entity);
        sinon.assert.calledWith(entity.cp_gfx, local);
      });
    });

    it("stores local entity in registry", function(){
      page._store_entity(entity);
      assert(page.entity(entity.id)).equals(entity);
    });
  });

  describe("#process_entities", function(){
    var entities;

    before(function(){
      sinon.stub(Omega.UI.CanvasTracker, 'process_entity');
      entities = [Omega.Gen.ship(), Omega.Gen.ship()];
    });

    after(function(){
      Omega.UI.CanvasTracker.process_entity.restore();
    });

    it("invokes process_entity with each entity", function(){
      Omega.UI.CanvasTracker.process_entities(entities);
      sinon.assert.calledWith(Omega.UI.CanvasTracker.process_entity,
                              entities[0]);
      sinon.assert.calledWith(Omega.UI.CanvasTracker.process_entity,
                              entities[1]);
    });
  });
  
  describe("#_load_entity_system", function(){
    var ship;

    before(function(){
      ship = Omega.Gen.ship();
      sinon.stub(Omega.UI.CanvasTracker, 'process_system');
    });

    after(function(){
      Omega.UI.Loader.load_system.restore();
      Omega.UI.CanvasTracker.process_system.restore();
    });

    it("retrieves system entity is in", function(){
      sinon.stub(Omega.UI.Loader, 'load_system');
      Omega.UI.CanvasTracker._load_entity_system(ship);
      sinon.assert.calledWith(Omega.UI.Loader.load_system, ship.system_id,
                              Omega.UI.CanvasTracker, sinon.match.func);
    });

    describe("entity system already retrieved", function(){
      it("updates entity system", function(){
        var sys = Omega.Gen.solar_system();
        sinon.stub(Omega.UI.Loader, 'load_system').returns(sys);
        sinon.stub(ship, 'update_system');
        Omega.UI.CanvasTracker._load_entity_system(ship);
        sinon.assert.calledWith(ship.update_system, sys);
      });
    });

    describe("entity system loaded/retrieved", function(){
      it("processes system", function(){
        var sys = Omega.Gen.solar_system();
        sinon.stub(Omega.UI.Loader, 'load_system');
        Omega.UI.CanvasTracker._load_entity_system(ship);
        Omega.UI.Loader.load_system.omega_callback()(sys)
        sinon.assert.calledWith(Omega.UI.CanvasTracker.process_system, sys);
      });
    });
  });

  describe("#process_entity", function(){
    var entity;

    before(function(){
      entity = Omega.Gen.ship();
      sinon.stub(Omega.UI.CanvasTracker, '_store_entity');
      sinon.stub(Omega.UI.CanvasTracker, '_add_nav_entity');
      sinon.stub(Omega.UI.CanvasTracker, '_load_entity_system');
      sinon.stub(Omega.UI.CanvasTracker, 'track_entity');
    });

    after(function(){
      Omega.UI.CanvasTracker._store_entity.restore();
      Omega.UI.CanvasTracker._add_nav_entity.restore();
      Omega.UI.CanvasTracker._load_entity_system.restore();
      Omega.UI.CanvasTracker.track_entity.restore();
    });

    it("stores entity in registry", function(){
      Omega.UI.CanvasTracker.process_entity(entity);
      sinon.assert.calledWith(Omega.UI.CanvasTracker._store_entity, entity);
    });

    it("adds entities to entities_list", function(){
      Omega.UI.CanvasTracker.process_entity(entity);
      sinon.assert.calledWith(Omega.UI.CanvasTracker._add_nav_entity, entity);
    });

    it("retrieves systems entities are in", function(){
      Omega.UI.CanvasTracker.process_entity(entity);
      sinon.assert.calledWith(Omega.UI.CanvasTracker._load_entity_system, entity);
    });

    it("tracks entity", function(){
      Omega.UI.CanvasTracker.process_entity(entity);
      sinon.assert.calledWith(Omega.UI.CanvasTracker.track_entity, entity);
    });
  });

  describe("#_update_system_references", function(){
    var page, system;

    before(function(){
      page = $.extend({}, Omega.UI.CanvasTracker, new Omega.UI.Registry());
      system = Omega.Gen.solar_system();
    });

    it("updates system children w/ system", function(){
      var ship1 = Omega.Gen.ship({system_id : system.id});
      var ship2 = Omega.Gen.ship({system_id : Omega.Gen.solar_system().id});
      page.entity(ship1.id, ship1);
      page.entity(ship2.id, ship2);

      sinon.stub(ship1, 'update_system');
      sinon.stub(ship2, 'update_system');
      page._update_system_references(system);
      sinon.assert.calledWith(ship1.update_system, system);
      sinon.assert.notCalled(ship2.update_system);
    });

    it("updates all systems children from entities list", function(){
      var sys = Omega.Gen.solar_system();
      page.entity(sys.id, sys);

      var entities = [];
      sinon.stub(page, 'all_entities').returns(entities);

      sinon.stub(sys, 'update_children_from');
      page._update_system_references(system);
      sinon.assert.calledWith(sys.update_children_from, entities);
    });
  });

  describe("#_load_system_galaxy", function(){
    var page, system;

    before(function(){
      page = $.extend({node : new Omega.Node(),
                       canvas : new Omega.UI.Canvas()},
                       Omega.UI.CanvasTracker, new Omega.UI.Registry());
      system = Omega.Gen.solar_system();
    });

    after(function(){
      Omega.UI.Loader.load_galaxy.restore();
    });

    it("retrieves system galaxy", function(){
      sinon.stub(Omega.UI.Loader, 'load_galaxy');
      page._load_system_galaxy(system);
      sinon.assert.calledWith(Omega.UI.Loader.load_galaxy,
                              system.parent_id, page, sinon.match.func);
    });

    describe("system galaxy already retrieved", function(){
      it("updates all galaxy children from entities list", function(){
        var galaxy = Omega.Gen.galaxy();
        sinon.stub(Omega.UI.Loader, 'load_galaxy').returns(galaxy);
        var entities = [];
        sinon.stub(page, 'all_entities').returns(entities);
        sinon.stub(galaxy, 'set_children_from');
        page._load_system_galaxy(system);
        sinon.assert.calledWith(galaxy.set_children_from, entities);
      })
    });

    describe("system galaxy loaded/retrieved", function(){
      it("processes galaxy", function(){
        var galaxy = Omega.Gen.galaxy();
        sinon.stub(Omega.UI.Loader, 'load_galaxy');
        page._load_system_galaxy(system);
        sinon.stub(page, 'process_galaxy');
        Omega.UI.Loader.load_galaxy.omega_callback()(galaxy)
        sinon.assert.calledWith(page.process_galaxy, galaxy);
      })
    });
  });

  describe("#_load_system_interconns", function(){
    var system, gate1, gate2;

    before(function(){
      gate1  = Omega.Gen.jump_gate({endpoint_id : 'systemABC'});
      gate2  = Omega.Gen.jump_gate({endpoint_id : 'systemDEF'});
      system = Omega.Gen.solar_system({children : [gate1, gate2]});

      sinon.stub(Omega.UI.Loader, 'load_system');
      sinon.stub(Omega.UI.CanvasTracker, 'process_system');
    })

    after(function(){
      Omega.UI.Loader.load_system.restore();
      Omega.UI.CanvasTracker.process_system.restore();
    });

    it("loads system jump gate endpoints", function(){
      Omega.UI.CanvasTracker._load_system_interconns(system);
      sinon.assert.calledWith(Omega.UI.Loader.load_system, gate1.endpoint_id,
                              Omega.UI.CanvasTracker, sinon.match.func);
      sinon.assert.calledWith(Omega.UI.Loader.load_system, gate2.endpoint_id,
                              Omega.UI.CanvasTracker, sinon.match.func);
    });

    describe("endpoint system retreived", function(){
      it("processes system", function(){
        var retrieved = Omega.Gen.solar_system();
        Omega.UI.CanvasTracker._load_system_interconns(system);
        Omega.UI.Loader.load_system.omega_callback()(retrieved);
        sinon.assert.calledWith(Omega.UI.CanvasTracker.process_system, retrieved);
      });
    });
  });

  describe("#_process_system_on_refresh", function(){
    var system;

    before(function(){
      system = Omega.Gen.solar_system();
      sinon.stub(Omega.UI.CanvasTracker, 'process_system');
    });

    after(function(){
      Omega.UI.CanvasTracker.process_system.restore();
    });

    describe("system refresh callback already exists", function(){
      it("does nothing / just returns", function(){
        system._process_on_refresh = 'anything';
        Omega.UI.CanvasTracker._process_system_on_refresh(system);
        assert(system._process_on_refresh).equals('anything');
        assert(system).doesNotHandleEvent('refreshed');
      });
    });

    it("registers new system refresh event listener", function(){
      Omega.UI.CanvasTracker._process_system_on_refresh(system);
      assert(typeof(system._process_on_refresh)).equals("function");
      assert(system).handlesEvent('refreshed');
    })

    describe("on system refresh", function(){
      it("processes system", function(){
        Omega.UI.CanvasTracker._process_system_on_refresh(system);
        system.dispatchEvent({type : 'refreshed', data : system});
        sinon.assert.calledWith(Omega.UI.CanvasTracker.process_system, system);
      });
    })
  });

  describe("#process_system", function(){
    var page, system;

    before(function(){
      page = $.extend({}, Omega.UI.CanvasTracker, new Omega.UI.Registry());
      system = Omega.Gen.solar_system();

      sinon.stub(page, '_add_nav_system');
      sinon.stub(page, '_update_system_references');
      sinon.stub(page, '_load_system_galaxy');
      sinon.stub(page, '_load_system_interconns');
      sinon.stub(page, '_process_system_on_refresh');
    });

    it("adds system to nav", function(){
      page.process_system(system);
      sinon.assert.calledWith(page._add_nav_system, system);
    });

    it("updates system references", function(){
      page.process_system(system);
      sinon.assert.calledWith(page._update_system_references, system);
    });

    it("loads system galaxy", function(){
      page.process_system(system);
      sinon.assert.calledWith(page._load_system_galaxy, system);
    });

    it("loads system interconns", function(){
      page.process_system(system);
      sinon.assert.calledWith(page._load_system_interconns, system);
    });

    it("updates system references", function(){
      sinon.stub(system, 'update_children_from');
      page.process_system(system);
      sinon.assert.calledWith(system.update_children_from, page.all_entities());
    });

    it("wires up system refresh processing", function(){
      page.process_system(system);
      sinon.assert.calledWith(page._process_system_on_refresh, system);
    });
  });

  describe("#_process_galaxy_on_refresh", function(){
    var galaxy;

    before(function(){
      galaxy = Omega.Gen.galaxy();
      sinon.stub(Omega.UI.CanvasTracker, 'process_galaxy');
    });

    after(function(){
      Omega.UI.CanvasTracker.process_galaxy.restore();
    });

    describe("galaxy refresh callback already exists", function(){
      it("does nothing / just returns", function(){
        galaxy._process_on_refresh = 'anything';
        Omega.UI.CanvasTracker._process_galaxy_on_refresh(galaxy);
        assert(galaxy._process_on_refresh).equals('anything');
        assert(galaxy).doesNotHandleEvent('refreshed');
      });
    });

    it("registers new galaxy refresh event listener", function(){
      Omega.UI.CanvasTracker._process_galaxy_on_refresh(galaxy);
      assert(typeof(galaxy._process_on_refresh)).equals("function");
      assert(galaxy).handlesEvent('refreshed');
    })

    describe("on galaxy refresh", function(){
      it("processes galaxy", function(){
        Omega.UI.CanvasTracker._process_galaxy_on_refresh(galaxy);
        galaxy.dispatchEvent({type : 'refreshed', data : galaxy});
        sinon.assert.calledWith(Omega.UI.CanvasTracker.process_galaxy, galaxy);
      });
    })
  });

  describe("#_load_galaxy_interconns", function(){
    before(function(){
      sinon.stub(Omega.UI.Loader, 'load_interconnects');
    });

    after(function(){
      Omega.UI.Loader.load_interconnects.restore();
    });

    it("uses loaded to load_interconnects", function(){
      var galaxy = Omega.Gen.galaxy();
      Omega.UI.CanvasTracker._load_galaxy_interconns(galaxy);
      sinon.assert.calledWith(Omega.UI.Loader.load_interconnects, galaxy,
                              Omega.UI.CanvasTracker, sinon.match.func);
    });
  });

  describe("#process_galaxy", function(){
    var page, galaxy;

    before(function(){
      page = $.extend({}, Omega.UI.CanvasTracker, new Omega.UI.Registry());
      galaxy = Omega.Gen.galaxy();

      sinon.stub(page, '_add_nav_galaxy');
      sinon.stub(page, '_load_galaxy_interconns');
      sinon.stub(page, '_process_galaxy_on_refresh');
    });

    it("adds galaxy to nav", function(){
      page.process_galaxy(galaxy);
      sinon.assert.calledWith(page._add_nav_galaxy, galaxy);
    });

    it("updates galaxy references", function(){
      sinon.stub(galaxy, 'set_children_from');
      page.process_galaxy(galaxy);
      sinon.assert.calledWith(galaxy.set_children_from, page.all_entities());
    });

    it("loads galaxy interconns", function(){
      page.process_galaxy(galaxy);
      sinon.assert.calledWith(page._load_galaxy_interconns, galaxy);
    });

    it("wires up galaxy refresh processing", function(){
      page.process_galaxy(galaxy);
      sinon.assert.calledWith(page._process_galaxy_on_refresh, galaxy);
    });
  });
});});