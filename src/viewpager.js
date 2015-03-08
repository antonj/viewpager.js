/*global window, require, console, module */
'use strict';

var Utils = require('./utils');
var raf = require('./raf').requestAnimationFrame;
var Events = require('./events');
var Scroller = require('./scroller');
var GestureDetector = require('./gesture_detector');

function ViewPager(elem, options) {
  options = options || {};
  var ANIM_DURATION_MAX = options.anim_duration !== undefined ? options.anim_duration : 200,
      PAGES = options.pages !== undefined ? options.pages : false,
      PREVENT_ALL_NATIVE_SCROLLING = options.prevent_all_native_scrolling !== undefined ? options.prevent_all_native_scrolling : false,
      DIRECTION_HORIZONTAL = !options.vertical,
      TIPPING_POINT = options.tipping_point !== undefined ? options.tipping_point : 0.5,

      MIN_DISTANCE_FOR_FLING = 25, // px
      MAX_SETTLE_DURATION = 600, // ms
      MIN_FLING_VELOCITY = 0.4, // px / ms

      elem_size = DIRECTION_HORIZONTAL ? elem.offsetWidth : elem.offsetHeight,
      noop = function () {},
      onPageScroll = options.onPageScroll || noop,
      onPageChange = options.onPageChange || noop,
      onSizeChanged = options.onSizeChanged || noop,

      active = false,
      scroller = new Scroller(),
      position = { x: 0, y: 0 };
  
  function positionInfo(position) { 
    var p = Math.abs(position);
    var totalOffset = p / elem_size;
    var activePage = Math.max(0, Math.floor(totalOffset));
    return {
      totalOffset : totalOffset,
      activePage : activePage,
      pageOffset : (totalOffset - activePage)
    };
  }

  /**
   * @return targetPage {Number} Page to scroll to
   */
  function determineTargetPage(position, deltaX, velocity) {
    console.log('determineTargetPage', position, deltaX, velocity);
    var pi = positionInfo(position);
    var targetPage;
    console.log('detltaX', deltaX, 'velocity', velocity);
    if (Math.abs(deltaX) > MIN_DISTANCE_FOR_FLING && 
        Math.abs(velocity) > MIN_FLING_VELOCITY) {
      targetPage = velocity > 0 ? pi.activePage : pi.activePage + 1;
      console.log('fling target:', targetPage, 'velo', velocity, 'activePage', pi.activePage);
    } else {
      targetPage = (pi.pageOffset > TIPPING_POINT) ?
        pi.activePage + 1 : pi.activePage;
      console.log('target', targetPage);
    }
    return targetPage;
  }

  function handleOnScroll(position) {
    var totalOffset = position / elem_size;
    var activePage = Math.max(0, Math.floor(totalOffset));
    var pageOffset = totalOffset - activePage;
    onPageScroll(totalOffset, activePage, pageOffset);
  }

  var gd = new GestureDetector(elem, {
    onFirstDrag : function (p) {
      // prevent default scroll if we move in paging direction
      active =  DIRECTION_HORIZONTAL ? Math.abs(p.dx) > Math.abs(p.dy) : Math.abs(p.dx) < Math.abs(p.dy);
      if (active) {
        p.event.preventDefault();
      }
    },

    onDrag : function (p) {
      if (!active) return;
      // console.log(p);
      position.x += p.dx;
      scroller.forceFinished(true);
      handleOnScroll(position.x);
    },
        
    onFling : function (p, v) {
      if (!active) return;
      console.log('fling', p, v.vx);
      var velo = DIRECTION_HORIZONTAL ? v.vx : v.vy;
      var deltaPx = DIRECTION_HORIZONTAL ? p.totaldx : p.totaldy;

      var targetPage = determineTargetPage(position.x, deltaPx, velo);
      var targetOffsetPx = targetPage * elem_size;
      // var deltaOffset = -targetOffsetPx - position.x;
      var deltaOffset = (-position.x) - targetOffsetPx;

      console.log('show anim to page', targetPage, 'atOffset', targetOffsetPx, 'detla', deltaOffset);

        scroller.startScroll(position.x, 0,
                             deltaOffset, 0,
                             200);
      animate();
    }
  });

  function handleAnimEnd() {
    console.log('anim end');
  }

  function animate(duration, backwards) {
    duration = duration || ANIM_DURATION_MAX;

    raf(update);
    function update () {
      var is_animating = scroller.computeScrollOffset();
      var scrollX = scroller.getCurrX();

      // No more than one page at a time
      // scrollX = Utils.clamp(scrollX, 0, elem_size);
      
      // Check done
      if (scrollX === 0 || scrollX === elem_size) {
        scroller.forceFinished(true);
      }
      
      position.x = scrollX;

      // console.log('animate', position.x);
      handleOnScroll(position.x);

      if (is_animating) {
        raf(update);
      } else {
        handleAnimEnd();
      }
    }
  }
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
