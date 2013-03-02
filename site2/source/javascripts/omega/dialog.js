/* Omega Dialog Operations
 *
 * Copyright (C) 2012 Mohammed Morsi <mo@morsi.org>
 *  Licensed under the AGPLv3+ http://www.gnu.org/licenses/agpl.txt
 */

require('javascripts/vendor/jquery-ui-1.7.1.min.js');

/////////////////////////////////////// Omega Dialog Container

/* Initialize new Omega Dialog Container
 */
function OmegaDialogContainer(){

  /////////////////////////////////////// private data

  var dialog_element = null;

  /////////////////////////////////////// private methods

  /* Return the dialog container element
   */
  var get_dialog = function(){
    if(dialog_element == null) dialog_element = $('#omega_dialog');
    return dialog_element;
  }

  /////////////////////////////////////// public methods

  /* Show the dialog with the specified title,
   * containing the content from the specified select,
   * with additional specified text
   *
   * @param {String} title title to give the dialog
   * @param {String} selector optional css selector of div to populate dialog with
   * @param {String} text optional additional text to add to div
   */
  this.show = function(title, selector, text){
    var content = $(selector).html();
    if(content == null) content = "";
    if(text == null) text = "";
    get_dialog().html(content + text).dialog({title: title, width: '450px'}).
                                      dialog('option', 'title', title).
                                      dialog('open');
  };

  /* Hide omega dialog
   */
  this.hide = function(){
    get_dialog().dialog('close');
  };

  /* Append text to dialog
   *
   * @param {String} text text to append to dialog
   */
  this.append = function(text){
    var dialog = get_dialog();
    dialog.html(dialog.html() + text);
  }
}

$(document).ready(function(){
  $omega_dialog = new OmegaDialogContainer();
});
