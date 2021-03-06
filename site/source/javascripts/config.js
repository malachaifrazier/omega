/* Omega Javascript Config
 *
 * Copyright (C) 2013 Mohammed Morsi <mo@morsi.org>
 *  Licensed under the AGPLv3 http://www.gnu.org/licenses/agpl.txt
 */

Omega.Config = {
  // uri & paths
  http_host         : 'localhost',
  http_path         : '/omega',
  ws_host           : 'localhost',
  ws_port           :  8080,

  url_prefix        :   '/womega',
  images_path       :   '/images',
  meshes_path       :   '/meshes',
  constraints       :   '/javascripts/constraints.json',

  // users
  anon_user         :      'anon',
  anon_pass         :      'nona',
  recaptcha_enabled :        true,
  recaptcha_pub     : 'change me',

  //autologin : ['user', 'pass'],

  // ui
  //canvas_width      :         900,
  //canvas_height     :         400,
  cam : {position : {'Cosmos::Entities::SolarSystem' : [ 25000,  25000,    25000],
                     'Cosmos::Entities::Galaxy'      : [    0,    5000,     5000]},
         target   : [0,    0,    0],
         restriction : {'default'                       : {max :  10000, min :   100},
                        'Cosmos::Entities::SolarSystem' : {max : 500000, min : 40000},
                        'Cosmos::Entities::Galaxy'      : {max :  25000, min :  1000},
                        'Cosmos::Entities::Planet'      : {max :  10000, min :  5000},
                        'Manufactured::Ship'            : {max :   5000, min :   250},
                        'Manufactured::Station'         : {max :  10000, min :  2000}},

         /// far & near distances represented as a proportion of max
         distance : {far : 0.65, near : 0.3}},

  //default_root      : 'random',

  // scale positions depending on scene root
  position_scales : {system : {far :   10000, max :   10000, min : 2500}},  /// position scale is divided
  entity_scales   : {system : {far :     0.5, max :  0.00001, min :    1}}, /// size scale is multiplied

  // event tracking
  ship_movement     :      10000000,
  ship_rotation     :          1.57,
  station_movement  :            50,

  //movement
  movement_offset   : {min : 5000000, max: 10000000},
  follow_distance   : 250000000,

  // stats
  stats             : [['num_of', 'users'], ['users_with_most', 'entities', 10]],

  // gfx
  resources    : {
    'solar_system' : { 'material' : '/solar_system1.png'},

    'star'         : { 'base_texture'  : '/textures/stars/sun-',
                       'extension' : 'jpg',
                       'surface_texture'    : '/textures/sun-grayscale2.png',
                       'halo_texture'       : '/textures/sun-halo3.png',
                       'halo_shift_texture' : '/textures/sun-halo-shift.png'},

    'jump_gate'    : { 'material' : '/meshes/wormhole_generator/generatormap.jpg',
                       'geometry' : '/meshes/wormhole_generator/wormhole_generator.json'},
    'planet0'      : { 'material' : '/textures/planet0.png' },
    'planet1'      : { 'material' : '/textures/planet1.png' },
    'planet2'      : { 'material' : '/textures/planet2.png' },
    'planet3'      : { 'material' : '/textures/planet3.png' },
    'planet4'      : { 'material' : '/textures/planet4.png' },
    'planet5'      : { 'material' : '/textures/planet5.png' },
    'planet6'      : { 'material' : '/textures/planet6.png' },
    'asteroid'     : { 'material' : '/textures/asteroid01.png',
                       'geometry' : ['/meshes/asteroids1.json',
                                     '/meshes/asteroids2.json',
                                     '/meshes/asteroids3.json',
                                     '/meshes/asteroids4.json',
                                     '/meshes/asteroids5.json']},

    'indicator'    : {'material' : '/textures/indicator.png'},

    'progress_bar' : {'material' : '/textures/progress-bar.png'},

    'missile'      : {'geometry' : '/meshes/missile.json'},
    'missile_bay'  : {'geometry' : '/meshes/missile-bay.json'},

    'ships'        : {
      'mining'       : { 'material' : '/textures/hull.png',
                         'geometry' : '/meshes/Agasicles/agasicles.json',
                         'trails'   : [[0,-5,-23]],
                         'lamps'    : [[5, 0x0000ff, [0,-5,3]],
                                       [3, 0x0000ff, [0,-7,25]],
                                       [3, 0x0000ff, [0,-9,-19]]]},

      'corvette'     : { 'material' : '/textures/hull.png',
                         'geometry' : '/meshes/Sickle/sickle.json',
                         'trails'   : [[7,0,-8], [-7,0,-8]],
                         'lamps'    : [[1, 0x0000ff, [0,  2, 41]],
                                       [2, 0x0000ff, [0,  4, 14]],
                                       [2, 0x0000ff, [0, -2, -9]]],
                         'artillery': [[50, 0, 0], [-50, 0, 0]]},

      'transport'    : { 'material' : '/textures/AeraHull.png',
                         'geometry' : '/meshes/Agesipolis/agesipolis.json',
                         'trails'   : [[0, 0, -125]]},

      'destroyer'    : { 'material' : '/textures/AeraHull.png',
                         'geometry' : '/meshes/Leonidas/yavok.json',
                         'missiles' : [[150, 10, -275], [-150, 10, -275]]},

      'escort'       : { 'material' : '/textures/nicander.png',
                         'geometry' : '/meshes/Nicander/Nicander.json' },
    },

    'stations'      : {
      'manufacturing' : { 'material' : '/meshes/research1.png',
                          'geometry' : '/meshes/research.json',
                          'lamps' : [[15, 0x0000ff, [0,   40, 0]],
                                     [15, 0x0000ff, [0, -300, 0]]]},
      'commerce' : { 'material' : '/meshes/medical.png',
                     'geometry' : '/meshes/medical.json',
                     'lamps' : [[15, 0x0000ff, [0,   90, 0]],
                                [15, 0x0000ff, [0,  -90, 0]]]},

      'mining' : { 'material' : '/meshes/mining.png',
                   'geometry' : '/meshes/mining.json'}
    }
  },

  audio : {
    'click'        : {'src' : 'effects_click_wav'},
    'command'      : {'src' : 'effects_command_wav'},
    'trigger'      : {'src' : 'effects_trigger_wav'},
    'confirmation' : {'src' : 'effects_confirmation_wav'},
    'system_hover' : {'src' : 'effects_system_hover_wav'},
    'system_click' : {'src' : 'effects_system_click_ogg'},
    'dock'         : {'src' : 'effects_dock_wav'},
    'destruction'  : {'src' : 'effects_destruction_wav'},
    'mining'       : {'src' : 'effects_mining_ogg'},
    'mining_completed'       : {'src' : 'effects_mining_completed_wav'},
    'construction_started'   : {'src' : 'effects_construct_start_ogg'},
    'construction_completed' : {'src' : 'effects_construct_complete_wav'},
    'start_attack'           : {'src' : 'effects_start_attack_wav'},
    'epic'                   : {'src' : 'effects_epic_wav'},
    'movement'               : {'src' : 'effects_movement_wav', 'loop' : true},

    'scenes' :
      {'intro' : { 'bg'     : {'src' : 'scenes_intro_bg_wav'},
                   'thud'   : {'src' : 'scenes_intro_thud2_wav'}},
       'tech1' : { 'bg'     : {'src' : 'scenes_tech1_bg_wav'}}},

    'backgrounds' : 5
  },

  locale : {
    'Cosmos::Entities::Galaxy'      : 'Galaxy',
    'Cosmos::Entities::SolarSystem' : 'System',
    'Cosmos::Entities::Star'        : 'Star',
    'Cosmos::Entities::Planet'      : 'Planet',
    'Cosmos::Entities::Asteroid'    : 'Asteroid',
    'Cosmos::Entities::JumpGate'    : 'Jump Gate'
  }
};
