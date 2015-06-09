/*global console, window, require, module */
'use strict';

/**
 * onFling function
 * @name GestureDetector~onFling
 * @function
 * @param {String} p - Information about the error.
 * @param {Number} velocity - An integer of joy.
 * @return undefined
 */

/**
 * @param options Options to use.
 * @param options.onFling Fling callback.
 * @param options.onDrag Drag callback.
 * @param options.onUp Mouse/Touch up callback.
 * @param options.onDown Mouse/Touch down callback.
 * @param options.onFirstDrag First drag event callback. Useful for
 *                            canceling default browser behaviour.
 */
function GestureDetector(elem, options) {
  var Events = require('./events'),
      VelocityTracker = require('./velocity_tracker');

  var hasTouch = 'ontouchstart' in window,
      evStartName = hasTouch ? 'touchstart' : 'mousedown',
      evMoveName = hasTouch ? 'touchmove' : 'mousemove',
      evEndName = hasTouch ? ['touchend', 'touchcancel'] : ['mouseup', 'mousecancel'],

      vtracker = new VelocityTracker(),
      container = window,

      mDownPoint,
      mPrevPoint,

      dragging = false,
      isFirstDrag = false,

      noop = function () {},
      onDownCb = options.onUp || noop,
      onUpCb = options.onUp || noop,
      onDragCb = options.onDrag || noop,
      onFirstDragCb = options.onFirstDrag || noop,
      onFlingCb = options.onFling || noop;

  function getPoint (e) {
    if (hasTouch) {
      var t = (e.touches.length) ? e.touches : e.changedTouches;
      return { x: t[0].pageX,
               y: t[0].pageY,
               timestamp: e.timeStamp,
               e: e};
    } else {
      return { x: e.pageX,
               y: e.pageY,
               timestamp: e.timeStamp,
               e: e};
    }
  }

  function getDragData (point) {
    return { x: point.x,
             y: point.y,
             dx: point.x - mPrevPoint.x,
             dy: point.y - mPrevPoint.y,
             totaldx: point.x - mDownPoint.x,
             totaldy: point.y - mDownPoint.y,
             timestamp: point.timestamp,
             downPoint: mDownPoint,
             mPrevPoint: mPrevPoint,
             event: point.e
           };
  }

  var eventHandler = {
    handleEvent: function handleEvent(event) {
      switch (event.type) {
       case 'mousedown':
       case 'touchstart':
        this.onDown(event);
        break;
       case 'mousemove':
       case 'touchmove':
        this.onMove(event);
        break;
       case 'mouseup':
       case 'touchend':
        this.onUp(event);
        break;
      }
    },

    onDown: function onDown(e) {
      dragging = true;
      isFirstDrag = true;

      var p = getPoint(e);
      mDownPoint = p;
      mPrevPoint = p;
      vtracker.clear();
      vtracker.addMovement(p);
      onDownCb(e);
    },

    onMove: function onMove(e) {
      if (dragging) {
        var p = getPoint(e);
        vtracker.addMovement(p);
        var dragData = getDragData(p);

        if (isFirstDrag) {
          onFirstDragCb(dragData);
          isFirstDrag = false;
        }
        onDragCb(dragData);

        mPrevPoint = p;
      }

      return false;
    },

    onUp: function onUp(e) {
      if (!dragging) { return; }
      var p = getPoint(e);
      var dragData = getDragData(p);
      if (dragging) {
        dragging = false;
        mPrevPoint = undefined;
        var velo = vtracker.getVelocity();
        onFlingCb(dragData, velo);
      }
      onUpCb();
    }
  };

  Events.add(elem, evStartName, eventHandler);
  Events.add(container, evMoveName, eventHandler);
  Events.add(container, evEndName, eventHandler);

  return {
    destroy: function destroy() {
      Events.remove(elem, evStartName, eventHandler);
      Events.remove(container, evMoveName, eventHandler);
      Events.remove(container, evEndName, eventHandler);
    },

    isDragging: function isDragging() {
      return dragging;
    },

    getVelocityTracker: function getVelocityTracker() {
      return vtracker;
    }
  };
}

module.exports = GestureDetector;
