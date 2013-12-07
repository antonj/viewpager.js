/*global module*/
'use strict';

module.exports = {
  clamp : function (val, min, max) {
    return Math.min(Math.max(val, min), max);
  },

  map : function (value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  },

  mapClamp : function (value, istart, istop, ostart, ostop) {
    return this.clamp(this.map(value, istart, istop, ostart, ostop),
                      ostart < ostop ? ostart : ostop, ostart < ostop ? ostop : ostart);
  }
};
