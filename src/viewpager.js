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

      /** Internal state */
      position = 0;
  
  function positionInfo(position) { 
    var p = -position;
    var totalOffset = p / elem_size;
    var activePage = Math.floor(totalOffset);
    return {
      totalOffset : totalOffset,
      activePage : activePage,
      pageOffset : (totalOffset - activePage)
    };
  }

  function deltaToPage(pageIndex) {
    return(-position) - (pageIndex * elem_size);
  }

  /**
   * @return targetPage {Number} Page to scroll to
   */
  function determineTargetPage(position, deltaPx, velocity) {
    console.log('determineTargetPage', position, deltaPx, velocity);
    var pi = positionInfo(position);
    var targetPage;
    console.log('detltaX', deltaPx, 'velocity', velocity);
    if (Math.abs(deltaPx) > MIN_DISTANCE_FOR_FLING && 
        Math.abs(velocity) > MIN_FLING_VELOCITY) {
      targetPage = velocity > 0 ? pi.activePage : pi.activePage + 1;
      console.log('fling target:', targetPage, 'velo', velocity, 'activePage', pi.activePage);
    } else {
      // TODO fix tipping point other direction
      // console.log(pi.pageOffset);
      targetPage = (pi.pageOffset > TIPPING_POINT) ?
        pi.activePage + 1 : pi.activePage;
      console.log('target', targetPage);
    }
    if (PAGES) {
      targetPage = Utils.clamp(targetPage, 0, PAGES - 1);
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
      if (active || PREVENT_ALL_NATIVE_SCROLLING) {
        p.event.preventDefault();
      }
    },

    onDrag : function (p) {
      if (!active) return;
      console.log(p);
      position += DIRECTION_HORIZONTAL ? p.dx : p.dy;
      scroller.forceFinished(true);
      handleOnScroll(position);
    },
        
    onFling : function (p, v) {
      if (!active) return;
      console.log('fling', p, v.vx);
      var velo = DIRECTION_HORIZONTAL ? v.vx : v.vy;
      var deltaPx = DIRECTION_HORIZONTAL ? p.totaldx : p.totaldy;
      
      var deltaOffset = deltaToPage(determineTargetPage(position, deltaPx, velo));
      
      scroller.startScroll(position, 0,
                           deltaOffset, 0,
                           ANIM_DURATION_MAX);
      animate();
    }
  });

  function handleAnimEnd() {
    console.log('anim end');
  }

  function animate() {
    raf(update);
    function update () {
      var is_animating = scroller.computeScrollOffset();
      var scrollX = scroller.getCurrX();
      
      // Check done
      if (scrollX === 0 || scrollX === elem_size) {
        scroller.forceFinished(true);
      }
      
      position = scrollX;

      handleOnScroll(position);

      if (is_animating) {
        raf(update);
      } else {
        handleAnimEnd();
      }
    }
  }

  return {
    next : function (duration) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX;
      scroller.startScroll(position, 0,
                           -elem_size, 0,
                           t);
      animate();
    },
    previous : function(duration) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX;
      scroller.startScroll(position, 0,
                           elem_size, 0,
                           t);
      animate();
    },

    goToIndex : function (page, duration) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX;
      if (PAGES) {
        page = Utils.clamp(page, 0, PAGES - 1);
      }
      var delta = deltaToPage(page);
      
      scroller.startScroll(position, 0,
                           delta, 0,
                           t);
      animate();
    }
  };
}

module.exports = ViewPager;
