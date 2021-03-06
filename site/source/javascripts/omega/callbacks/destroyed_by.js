/* Omega JS Destroyed By Event Callback
 *
 * Methods here will get mixed into the CommandTracker module
 *
 * Copyright (C) 2014 Mohammed Morsi <mo@morsi.org>
 *  Licensed under the AGPLv3 http://www.gnu.org/licenses/agpl.txt
 */

Omega.Callbacks.destroyed_by = function(event, event_args){
  var _this    = this;
  var defender = event_args[1];
  var attacker = event_args[2];

  var pattacker = this.page.entity(attacker.id);
  var pdefender = this.page.entity(defender.id);
  if(pattacker == null || pdefender == null) return;

  pattacker.clear_attacking();
  pdefender.hp           = 0;
  pdefender.shield_level = 0;

  pattacker.update_attack_gfx();

  /// allow defender to tidy up gfx b4 removing from scene
  pdefender.update_defense_gfx();

  /// TODO issue request to update attacker ms to stopped (here or in attack cycle)

  if(this.page.canvas.is_root(pdefender.parent_id)){
    /// play destruction audio effect
    _this.page.audio_controls.play(pdefender.destruction_audio);

    /// start destruction sequence / register cb
    pdefender.trigger_destruction(function(){
      /// TODO instead of removing swap out mesh for a 'debris' mesh w/ loot
      /// remove after loot is collected and a certain amount of time passed
      _this.page.canvas.remove(pdefender);
    });
  }
};
