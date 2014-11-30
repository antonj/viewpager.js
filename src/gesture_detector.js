/*global console, window, require, module */
'use strict';

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
      return {x : t[0].pageX,
              y : t[0].pageY,
              timestamp : e.timeStamp};
      } else {
        return {x : e.pageX,
                y : e.pageY,
                timestamp : e.timeStamp};
      }
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
      var p = getPoint(e);

      if (is_dragging) {
        vtracker.addMovement(p);

        var dragData = {x: p.x,
                        y: p.y,
                        dx: p.x - m_prev_point.x,
                        dy: p.y - m_prev_point.y,
                        timestamp: p.timestamp,
                        down_point: m_down_point,
                        m_prev_point :  m_prev_point,
                        event: e};

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
      var p = getPoint(e);
      if (is_dragging) {
        is_dragging = false;
        m_prev_point = undefined;
        var velo = vtracker.getVelocity();
        onFling(p, velo);
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

    getVelocityTracker : function () {
      return vtracker;
    }
  };
}

module.exports = GestureDetector;
