/*global window, require, module */
'use strict';

var Utils = require('./utils'),
    raf = require('./raf').requestAnimationFrame,
    console = require('./console'),
    Events = require('./events'),
    Scroller = require('./scroller'),
    GestureDetector = require('./gesture_detector');

function ViewPager(elem, options) {
  options = options || {};
  var ANIM_DURATION_MAX = options.anim_duration !== undefined ? options.anim_duration : 200,
      PAGES = options.pages !== undefined ? options.pages : false,
      PREVENT_ALL_NATIVE_SCROLLING = options.prevent_all_native_scrolling !== undefined ? options.prevent_all_native_scrolling : false,
      DIRECTION_HORIZONTAL = !options.vertical,
      TIPPING_POINT = options.tipping_point !== undefined ? options.tipping_point : 0.5,

      MIN_DISTANCE_FOR_FLING_MS = 25, // px
      MIN_FLING_VELOCITY_PX_PER_MS = 0.4, // px / ms

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
    if (Math.abs(deltaPx) > MIN_DISTANCE_FOR_FLING_MS && 
        Math.abs(velocity) > MIN_FLING_VELOCITY_PX_PER_MS) {
      targetPage = velocity > 0 ? pi.activePage : pi.activePage + 1;
    } else {
      // TODO fix tipping point other direction
      targetPage = (pi.pageOffset > TIPPING_POINT) ?
        pi.activePage + 1 : pi.activePage;
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
      position = scroller.getCurrX();

      handleOnScroll(position);

      if (is_animating) {
        raf(update);
      } else {
        handleAnimEnd();
      }
    }
  }

  return {
    /**
     * Go to next page.
     *
     * @param {Number|boolean} duration Animation duration 0 or false
     * for no animation.
     */
    next : function (duration) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX;
      var page = positionInfo(position).activePage + 1;
      if (PAGES) {
        page = Utils.clamp(page, 0, PAGES - 1);
      }
      
      scroller.startScroll(position, 0,
                           deltaToPage(page), 0,
                           t);
      animate();
    },

    /**
     * Go to previous page.
     *
     * @param {Number|boolean} duration Animation duration 0 or false
     * for no animation.
     */
    previous : function(duration) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX;
      var page = positionInfo(position).activePage - 1;
      if (PAGES) {
        page = Utils.clamp(page, 0, PAGES - 1);
      }
      scroller.startScroll(position, 0,
                           deltaToPage(page), 0,
                           t);
      animate();
    },

    /**
     * @param {Number} page index of page
     * @param {Number|boolean} duration Animation duration 0 or false
     * for no animation.
     */
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
