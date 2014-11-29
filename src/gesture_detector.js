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
      
      m_down_x = 0,
      m_down_y = 0,
      m_dx = 0,
      m_dy = 0,
      m_down_timestamp = 0,
      
      is_dragging = false,
      
      noop = function () {},
      onDown = options.onUp || noop,
      onUp = options.onUp || noop,
      onDrag = options.onDrag || noop,
      onFling = options.onFling || noop;

  function getPoint (e) {
    return has_touch ?
      {x : e.touches[0].pageX,
       y : e.touches[0].pageY,
       timestamp : e.timeStamp} :
    {x : e.pageX,
     y : e.pageY,
     timestamp : e.timeStamp};
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
      console.log('mouse down');
      
      var p = getPoint(e);

      m_down_x = p.x;
      m_down_y = p.y;

      m_down_timestamp = p.timestamp;
      onDown(e);
    },

    onMove : function (e) {
      var p = getPoint(e);

      if (is_dragging) {
        m_dx = p.x - m_down_x;
        m_dy = p.y - m_down_y;
        p.dx = m_dx;
        p.dy = m_dy;
        vtracker.addMovement(p);
        onDrag(p);
      }

      return false;
    },

    onUp : function (e) {
      is_dragging = false;
      var p = getPoint(e);
      
      var duration = Date.now() - m_down_timestamp;
      m_dx = m_down_x - p.pageX;
      m_dy = m_down_y - p.pageY;
      var velo = vtracker.getVelocity();
      console.log('velo', velo);
      onFling(p, velo);
      
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
