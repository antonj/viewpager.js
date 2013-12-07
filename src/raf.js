/*global module, clearTimeout, window*/
'use strict';

/** http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/ */
var lastTime = 0;
var vendors = ['webkit', 'moz'];
var x;

for (x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
  window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
  window.cancelAnimationFrame =
    window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = function (callback) {
    var currTime = new Date().getTime(),
        timeToCall = Math.max(0, 16 - (currTime - lastTime)),
        id = window.setTimeout(function () {
          callback(currTime + timeToCall);
        }, timeToCall);
    lastTime = currTime + timeToCall;
    return id;
  };
}

if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function (id) {
    clearTimeout(id);
  };
}

module.exports.requestAnimationFrame = window.requestAnimationFrame;
module.exports.cancelAnimationFrame = window.cancelAnimationFrame;
