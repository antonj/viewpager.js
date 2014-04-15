/*global window, console, require, module */
'use strict';

var utils = require('./utils');
var raf = require('./raf').requestAnimationFrame;
var Events = require('./events');
var debounce = require('./debounce');

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
      m_move_x = 0,
      m_move_y = 0,
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
        // console.log('resize outer');


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

      m_move_x = p.pageX;
      m_move_y = p.pageY;

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
  Events.add(window, 'resize', debounce(function () {
    elem_size = elem.offsetWidth;
    console.log('resize');
    onSizeChanged(elem.offsetWidth, elem.offsetHeight);
  }, 100));
  Events.add(window, 'mousewheel', debounce(function (e) {
    // events
    console.log('scroll ', e.wheelDelta < 0 ? 'up' : 'down');
  }, 50));

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
window.ViewPager = ViewPager;
