/*global module*/
'use strict';

module.exports = {
  /**
   * Clamp val between min and max
   */
  clamp: function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  },

  /**
   * lerp a value [0-1] to new range [start-stop]
   */
  lerp: function lerp(value, start, stop) {
    return start + (stop - start) * value;
  },

  /**
   * map value in range [istart-istop] to range [ostart-ostop]
   * map(5, 0, 10, 0, 100) -> 50
   */
  map: function map(value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  },

  /**
   * map value in range [istart-istop] to range [ostart-ostop], clamp values between [ostart-ostop]
   * map(11, 0, 10, 0, 100) -> 100
   */
  mapClamp: function mapClamp(value, istart, istop, ostart, ostop) {
    return this.clamp(this.map(value, istart, istop, ostart, ostop),
                      ostart < ostop ? ostart : ostop, ostart < ostop ? ostop : ostart);
  },

  /**
   * roundTo(4, 10) -> 0
   * roundTo(5, 10) -> 10
   * roundTo(6, 10) -> 10
   * @param i {Number}
   * @param v {Number}
   * @return {Number}
   */
  roundTo: function roundTo(i, v) {
    return Math.round(i / v) * v;
  },

  /**
   * roundDownTo(13, 10) -> 10
   * roundDownTo(199, 100) -> 100
   * roundDownTo(99, 100) -> 0
   *
   * @param i {Number} value to round down
   * @param v {Number} round value down to closest even v
   * @return {Number}
   */
  roundDownTo: function roundDownTo(i, v) {
    return Math.floor(i / v) * v;
  },

  /**
   * roundUpTo(13, 10) -> 20
   * roundUpTo(199, 100) -> 200
   * roundUpTo(99, 100) -> 10
   * roundUpTo(-14, 10) -> -10
   *
   * @param i {Number} Value to round
   * @param v {Number} Round i up to closest even v
   * @return
   */
  roundUpTo: function roundUpTo(i, v) {
    return Math.ceil(i / v) * v;
  },

  /**
   * @param num {Number}
   * @return {Number} -1 if negative, 1 if positive, 0 otherwise
   */
  sign: function sign (num) {
    return num ? (num < 0) ? -1 : 1 : 0;
  }
};
