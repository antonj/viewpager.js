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
  var has_touch = 'ontouchstart' in window,
      ev_start_name = has_touch ? 'touchstart' : 'mousedown',
      ev_move_name = has_touch ? 'touchmove' : 'mousemove',
      ev_end_name = has_touch ? ['touchend', 'touchcancel'] : ['mouseup', 'mousecancel'],
      
      Events = require('./events'),
      vtracker = new (require('./velocity_tracker'))(),
      container = window,
      self = this,

      m_down_point,
      m_prev_point,
      
      is_dragging = false,
      is_first_drag = false,
      
      noop = function () {},
      onDown = options.onUp || noop,
      onUp = options.onUp || noop,
      onDrag = options.onDrag || noop,
      onFirstDrag = options.onFirstDrag || noop,
      onFling = options.onFling || noop;

  function getPoint (e) {
    if (has_touch) {
      var t = (e.touches.length) ? e.touches : e.changedTouches;
      return { x : t[0].pageX,
               y : t[0].pageY,
               timestamp : e.timeStamp,
               e: e};
    } else {
      return { x : e.pageX,
               y : e.pageY,
               timestamp : e.timeStamp,
               e: e};
    }
  }
  
  function getDragData (point, previousPoint) {
    return { x: point.x,
             y: point.y,
             dx: point.x - m_prev_point.x,
             dy: point.y - m_prev_point.y,
             totaldx: point.x - m_down_point.x,
             totaldy: point.y - m_down_point.y,
             timestamp: point.timestamp,
             down_point: m_down_point,
             m_prev_point :  m_prev_point,
             event: point.e 
           };
  }

  var eventHandler = {
    handleEvent : function (event) {
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

    onDown : function (e) {
      is_dragging = true;
      is_first_drag = true;
      
      var p = getPoint(e);
      m_down_point = p;
      m_prev_point = p;
      vtracker.clear();
      vtracker.addMovement(p);
      onDown(e);
    },

    onMove : function (e) {
      if (is_dragging) {
        var p = getPoint(e);
        vtracker.addMovement(p);
        var dragData = getDragData(p);

        if (is_first_drag) {
          onFirstDrag(dragData);
          is_first_drag = false;
        }
        onDrag(dragData);
        
        m_prev_point = p;
      }

      return false;
    },

    onUp : function (e) {
      if (!is_dragging) { return; }
      var p = getPoint(e);
      var dragData = getDragData(p);
      if (is_dragging) {
        is_dragging = false;
        m_prev_point = undefined;
        var velo = vtracker.getVelocity();
        onFling(dragData, velo);
      }
      onUp();
    }
  };

  Events.add(elem, ev_start_name, eventHandler);
  Events.add(container, ev_move_name, eventHandler);
  Events.add(container, ev_end_name, eventHandler);

  return {
    stop : function () {
      Events.remove(elem, ev_start_name, eventHandler);
      Events.remove(container, ev_move_name, eventHandler);
      Events.remove(container, ev_end_name, eventHandler);
    },

    isDragging : function isDragging() {
      return is_dragging;
    },

    getVelocityTracker : function () {
      return vtracker;
    }
  };
}

module.exports = GestureDetector;
