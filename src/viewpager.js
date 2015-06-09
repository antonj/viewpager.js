/*global require, module, window */
'use strict';

var Utils = require('./utils'),
    Raf = require('./raf'),
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
      /** Default interpolator, undefined is ok */
      INTERPOLATOR = options.interpolator,

      MIN_DISTANCE_FOR_FLING_MS = 25, // px
      MIN_FLING_VELOCITY_PX_PER_MS = 0.4, // px / ms

      elemSize = options.dragSize || undefined,
      elemSizeOnChange = function () { invalidateElemSize(); },
      noop = function () {},
      onPageScroll = options.onPageScroll || noop,
      onPageChange = options.onPageChange || noop,

      active = false,
      animationId,
      scroller = new Scroller(),

      position = 0;

  function invalidateElemSize() {
    var rect = elem.getBoundingClientRect();
    var updatedSize = DIRECTION_HORIZONTAL ? rect.width : rect.height;
    if (elemSize) {
      var ratio = position === 0 ? 0 : position / elemSize;
      position = ratio * updatedSize;
      elemSize = updatedSize;
    } else {
      elemSize = updatedSize;
    }
    return elemSize;
  }

  function deltaToPage(pageIndex) {
    return (-position) - (pageIndex * elemSize);
  }

  /**
   * @return targetPage {Number} Page to scroll to
   */
  function determineTargetPage(pos, deltaPx, velocity) {
    var pi = positionInfo(pos),
        page = pi.page,
        pageOffset = pi.pageOffset,
        direction = Utils.sign(deltaPx),
        targetPage = page + Math.round(pageOffset);
    // FLING
    if (Math.abs(deltaPx) > MIN_DISTANCE_FOR_FLING_MS &&
        Math.abs(velocity) > MIN_FLING_VELOCITY_PX_PER_MS) {
      targetPage = velocity > 0 ? page : page + 1;
    } else { // NO FLING, check position
      var totalDelta = Math.abs(deltaPx / elemSize),
          pageDelta = totalDelta - Math.floor(totalDelta);
      if (Math.abs(pageDelta) > TIPPING_POINT) {
        targetPage = page + Math.ceil(pageDelta) * -direction;
        targetPage += (direction < 0) ? 0 : 1;
      }
    }
    if (PAGES) {
      targetPage = Utils.clamp(targetPage, 0, PAGES - 1);
    }
    return targetPage;
  }

  function positionInfo(pos) {
    var totalOffset = -pos / elemSize,
        page = Math.floor(totalOffset),
        pageOffset = totalOffset - page;
    return ({ page: page,
              pageOffset: pageOffset,
              totalOffset: totalOffset });
  }

  function handleOnScroll(pos) {
    var scrollInfo = positionInfo(pos);
    scrollInfo.animOffset = scroller.getProgress();
    onPageScroll(scrollInfo);
  }

  function handleAnimEnd() {
    onPageChange(-Math.round(position / elemSize));
  }

  function animate(interpolator) {
    function update () {
      var isAnimating = scroller.computeScrollOffset();
      if (interpolator !== undefined) {
        position = Utils.lerp(interpolator(scroller.getProgress()),
                              scroller.getStartX(), scroller.getFinalX());
      } else {
        position = scroller.getCurrX();
      }

      handleOnScroll(position);

      if (isAnimating) {
        animationId = Raf.requestAnimationFrame(update);
      } else {
        handleAnimEnd();
      }
    }
    Raf.cancelAnimationFrame(animationId);
    animationId = Raf.requestAnimationFrame(update);
  }

  var gestureDetector = new GestureDetector(elem, {
    onFirstDrag: function onFirstDrag(p) {
      // prevent default scroll if we move in paging direction
      active = PREVENT_ALL_NATIVE_SCROLLING || (DIRECTION_HORIZONTAL ? Math.abs(p.dx) > Math.abs(p.dy) : Math.abs(p.dx) < Math.abs(p.dy));
      if (active) {
        p.event.preventDefault();
      }
    },
    onDrag: function onDrag(p) {
      if (!active) { return; }
      var change = DIRECTION_HORIZONTAL ? p.dx : p.dy;
      var tmpPos = -(change + position);
      if (PAGES && (tmpPos < 0 || tmpPos > ((PAGES - 1) * elemSize))) {
        change = change / 3;
      }
      position += change;
      scroller.forceFinished(true);
      handleOnScroll(position);
    },

    onFling: function onFling(p, v) {
      if (!active) { return; }
      var velo = DIRECTION_HORIZONTAL ? v.vx : v.vy,
          deltaPx = DIRECTION_HORIZONTAL ? p.totaldx : p.totaldy,
          deltaOffset = deltaToPage(determineTargetPage(position, deltaPx, velo));
      scroller.startScroll(position, 0,
                           deltaOffset, 0,
                           ANIM_DURATION_MAX);
      animate(INTERPOLATOR);
    }
  });

  if (!elemSize) {
    invalidateElemSize();
    Events.add(window, 'resize', elemSizeOnChange);
  }

  return {
    /** Remove listeners */
    destroy: function destroy() {
      gestureDetector.destroy();
      Events.remove(window, 'resize', elemSizeOnChange);
    },

    /**
     * Go to next page.
     *
     * @param {Number|boolean} duration Animation duration 0 or false
     * for no animation.
     * @param {function} interpolator a function that interpolates a number [0-1]
     */
    next: function next(duration, interpolator) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX,
          page = -((scroller.isFinished() ? position : (scroller.getFinalX())) / elemSize) + 1;
      if (PAGES) {
        page = Utils.clamp(page, 0, PAGES - 1);
      }

      scroller.startScroll(position, 0,
                           deltaToPage(page), 0,
                           t);
      animate(interpolator);
    },

    /**
     * Go to previous page.
     *
     * @param {Number|boolean} duration Animation duration 0 or false
     * for no animation.
     * @param {function} interpolator a function that interpolates a number [0-1]
     */
    previous: function previous(duration, interpolator) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX,
          page = -((scroller.isFinished() ? position : (scroller.getFinalX())) / elemSize) - 1;

      if (PAGES) {
        page = Utils.clamp(page, 0, PAGES - 1);
      }
      scroller.startScroll(position, 0,
                           deltaToPage(page), 0,
                           t);
      animate(interpolator);
    },

    /**
     * @param {Number} page index of page
     * @param {Number|boolean} duration Animation duration 0 or false
     * for no animation.
     * @param {function} interpolator a function that interpolates a number [0-1]
     */
    goToIndex: function goToIndex(page, duration, interpolator) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX;
      if (PAGES) {
        page = Utils.clamp(page, 0, PAGES - 1);
      }
      var delta = deltaToPage(page);

      scroller.startScroll(position, 0,
                           delta, 0,
                           t);
      animate(interpolator);
    }
  };
}

module.exports = ViewPager;
