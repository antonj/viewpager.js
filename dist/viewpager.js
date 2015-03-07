!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ViewPager=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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

},{}],2:[function(_dereq_,module,exports){
/*global window, require, module */
'use strict';

var utils = _dereq_('./utils');
var raf = _dereq_('./raf').requestAnimationFrame;
var Events = _dereq_('./events');

function ViewPager(elem, options) {
  options = options || {};
  var ANIM_DURATION_MAX = options.anim_duration !== undefined ? options.anim_duration : 200,
      PAGES = options.pages !== undefined ? options.pages : false,
      PREVENT_ALL_NATIVE_SCROLLING = options.prevent_all_native_scrolling !== undefined ? options.prevent_all_native_scrolling : false,
      DIRECTION_HORIZONTAL = !options.vertical,
      TIPPING_POINT = options.tipping_point !== undefined ? options.tipping_point : 0.5,
      container = window,
      elem_size = DIRECTION_HORIZONTAL ? elem.offsetWidth : elem.offsetHeight,
      m_down_x = 0,
      m_down_y = 0,
      m_down_timestamp = 0,
      is_animating = false,
      is_dragging = false,
      is_changing_page = false,
      anim_start_time,
      anim_end_time,
      anim_to_offset,
      anim_from_offset,
      anim_direction,
      is_active,
      move_diff_px = 0,
      move_offset = 0,
      active_page = 0,
      has_touch = 'ontouchstart' in window,
      ev_start_name = has_touch ? 'touchstart' : 'mousedown',
      ev_move_name = has_touch ? 'touchmove' : 'mousemove',
      ev_end_name = has_touch ? ['touchend', 'touchcancel'] : ['mouseup', 'mousecancel'],
      noop = function () {},
      onPageScroll = options.onPageScroll || noop,
      onPageChange = options.onPageChange || noop,
      onSizeChanged = options.onSizeChanged || noop;

  function isMovingOutOfBounds() {
    return PAGES &&
      ((move_diff_px < 0) && (active_page === 0)) ||
      ((move_diff_px > 0) && ((active_page + 1) === PAGES));
  }

  function getPoint (event) {
    return has_touch ? event.touches[0] : event;
  }

  var events = {
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
       case 'resize':
        elem_size = elem.offsetWidth;
        onSizeChanged(elem.offsetWidth, elem.offsetHeight);
        break;
      }
    },

    onDown : function (e) {
      // e.preventDefault();
      is_dragging = true;

      // If animating, we handle it by making proper calls. Animation gets cancelled when is_dragging = true.
      if (is_animating) {
        handleAnimEnd();
      }
      
      var p = getPoint(e);

      m_down_x = p.pageX;
      m_down_y = p.pageY;

      m_down_timestamp = Date.now();

      Events.remove(elem, ev_start_name, this);
      Events.add(container, ev_move_name, this);
      Events.add(container, ev_end_name, this);

      is_active = undefined;

      return false;
    },

    onMove : function (e) {
      var p = getPoint(e);

      if (is_active === undefined) { // On time activation check
        // Check if moved X more than Y
        is_active = (Math.abs(m_down_x - p.pageX) > Math.abs(m_down_y - p.pageY));
        if (!DIRECTION_HORIZONTAL) {
          is_active = !is_active;
        }
      }

      if (!is_active && !PREVENT_ALL_NATIVE_SCROLLING) {
        is_dragging = false;
        Events.add(elem, ev_start_name, this);
        Events.remove(container, ev_move_name, this);
        Events.remove(container, ev_end_name, this);
        return false;
      }
      e.preventDefault(); // Scrolling in right direction prevent default scroll

      is_animating = false; // Stop animations

      move_diff_px = DIRECTION_HORIZONTAL ? m_down_x - p.pageX : m_down_y - p.pageY;
      move_offset = (move_diff_px / elem_size);

      if (isMovingOutOfBounds()) {
        move_offset /= 3; // Slow down
      }

      onPageScroll(move_offset, active_page, true);

      return false;
    },

    onUp : function (e) {

      var duration = Date.now() - m_down_timestamp;

      // TODO check speed the last 250 ms ?
      var shouldChange = (Number(duration) < 250 &&
                          Math.abs(move_diff_px) > 20) ||
            Math.abs(move_diff_px) > elem_size * TIPPING_POINT;
      shouldChange &= !isMovingOutOfBounds();
      // TODO Direction?
      // TODO Did cancel animation should not go back to 0,
      // it should go back to direction of fling
      animate(shouldChange);

      // Reset
      move_diff_px = 0;

      Events.add(elem, ev_start_name, this);
      Events.remove(container, ev_move_name, this);
      Events.remove(container, ev_end_name, this);
      is_dragging = false;

      return false;
    }
  };

  function handleAnimEnd() {
    if (is_animating) {
      move_offset = 0;
    }

    onPageScroll(anim_to_offset * anim_direction, active_page);
    if (is_animating && is_changing_page) { // Could be aborted by drag
      active_page += anim_to_offset * anim_direction;
      onPageChange(active_page);
    }

    is_animating = false;
    is_changing_page = false;
  }

  function animate(should_change_page, duration, backwards) {
    duration = duration || ANIM_DURATION_MAX;
    is_animating = true;
    is_changing_page = should_change_page;
    
    anim_start_time = Date.now();
    anim_end_time = anim_start_time + duration;
    
    // Animate from 0 -> 1
    anim_from_offset = Math.abs(move_offset);
    anim_to_offset = (is_changing_page) ? 1 : 0;
    
    // Direction of animation -1 or 1
    anim_direction = ((move_offset >= 0) && !backwards) ? 1 : -1;

    // Animate more to closest page
    if (anim_from_offset > 1) {
      anim_to_offset = Math.round(anim_from_offset);
    }

    function update () {
      var changed_page = false;
      move_offset = utils.mapClamp(Date.now(), anim_start_time, anim_end_time,
                                   anim_from_offset, anim_to_offset);

      if (is_dragging) {
        is_animating = false;
        return;
      }

      if (is_animating &&
          ((should_change_page &&
            (move_offset >= anim_from_offset) &&
            (move_offset < anim_to_offset)) ||
           (!should_change_page && move_offset !== 0))) {
        onPageScroll(move_offset * anim_direction, active_page);
        raf(update);
      } else {
        handleAnimEnd();
      }
    }

    raf(update);
  }

  Events.add(elem, ev_start_name, events);
  Events.add(window, 'resize', events);

  /** move_diff_pxe API */
  return {
    next : function () {
      animate(true, 500);
    },
    previous : function() {
      animate(true, 500, true);
    }
  };
}

module.exports = ViewPager;

},{"./events":1,"./raf":3,"./utils":4}],3:[function(_dereq_,module,exports){
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

},{}],4:[function(_dereq_,module,exports){
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
  },

  roundTo : function (i, v) {
    return Math.round(i / v) * v;
  },

  roundDownTo : function(i, v) {
    return Math.floor(i / v) * v;
  },

  roundUpTo : function(i, v) {
    return Math.ceil(i / v) * v;
  }
};

},{}]},{},[2])
(2)
});