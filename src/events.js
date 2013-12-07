/*global module*/
'use strict';

module.exports = {
  add : function (el, type, fn, capture) {
    var i, l;
    if (!(type instanceof Array)) {
      type = [type];
    }
    for (i = 0, l = type.length; i < l; i += 1) {
      el.addEventListener(type[i], fn, !!capture);
    }
  },

  remove : function (el, type, fn, capture) {
    var i, l;
    if (!(type instanceof Array)) {
      type = [type];
    }
    for (i = 0, l = type.length; i < l; i += 1) {
      el.removeEventListener(type[i], fn, !!capture);
    }
  }
};
