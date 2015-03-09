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
/*global window, require, console, module */
'use strict';

var Utils = _dereq_('./utils');
var raf = _dereq_('./raf').requestAnimationFrame;
var Events = _dereq_('./events');
var Scroller = _dereq_('./scroller');
var GestureDetector = _dereq_('./gesture_detector');

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

      var targetPage = determineTargetPage(position, deltaPx, velo);
      var targetOffsetPx = targetPage * elem_size;
      var deltaOffset = (-position) - targetOffsetPx;

      console.log('show anim to page', targetPage, 'atOffset', targetOffsetPx, 'detla', deltaOffset);

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
    }
  };
}

module.exports = ViewPager;

},{"./events":1,"./gesture_detector":3,"./raf":4,"./scroller":5,"./utils":6}],3:[function(_dereq_,module,exports){
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
      
      Events = _dereq_('./events'),
      vtracker = new (_dereq_('./velocity_tracker'))(),
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

},{"./events":1,"./velocity_tracker":7}],4:[function(_dereq_,module,exports){
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

},{}],5:[function(_dereq_,module,exports){
/*global require, module, console */
'use strict';


/*
 * Port of Android Scroller http://developer.android.com/reference/android/widget/Scroller.html
 *
 * Copyright (C) 2006 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// package android.widget;

// import android.content.Context;
// import android.hardware.SensorManager;
// import android.os.Build;
// import android.util.FloatMath;
// import android.view.ViewConfiguration;
// import android.view.animation.AnimationUtils;
// import android.view.animation.Interpolator;


/**
 * <p>This class encapsulates scrolling. You can use scrollers ({@link Scroller}
 * or {@link OverScroller}) to collect the data you need to produce a scrolling
 * animation&mdash;for example, in response to a fling gesture. Scrollers track
 * scroll offsets for you over time, but they don't automatically apply those
 * positions to your view. It's your responsibility to get and apply new
 * coordinates at a rate that will make the scrolling animation look smooth.</p>
 *
 * <p>Here is a simple example:</p>
 *
 * <pre> private Scroller mScroller = new Scroller(context);
 * ...
 * public void zoomIn() {
 *     // Revert any animation currently in progress
 *     mScroller.forceFinished(true);
 *     // Start scrolling by providing a starting point and
 *     // the distance to travel
 *     mScroller.startScroll(0, 0, 100, 0);
 *     // Invalidate to request a redraw
 *     invalidate();
 * }</pre>
 *
 * <p>To track the changing positions of the x/y coordinates, use
 * {@link #computeScrollOffset}. The method returns a boolean to indicate
 * whether the scroller is finished. If it isn't, it means that a fling or
 * programmatic pan operation is still in progress. You can use this method to
 * find the current offsets of the x and y coordinates, for example:</p>
 *
 * <pre>if (mScroller.computeScrollOffset()) {
 *     // Get current x and y positions
 *     int currX = mScroller.getCurrX();
 *     int currY = mScroller.getCurrY();
 *    ...
 * }</pre>
 */
function Scroller(interpolator, flywheel) {

  var GRAVITY_EARTH = 9.80665;
  
  function currentAnimationTimeMillis() {
    return Date.now();
  }

  function signum(num) {
    return num ? num < 0 ? -1 : 1 :0;
  }

  /** private int */
  var mMode;

  /** private int */
  var mStartX;
  /** private int */
  var mStartY;
  /** private int */
  var mFinalX;
  /** private int */
  var mFinalY;

  /** private int */
  var mMinX;
  /** private int */
  var mMaxX;
  /** private int */
  var mMinY;
  /** private int */
  var mMaxY;

  /** private int */
  var mCurrX;
  /** private int */
  var mCurrY;
  /** private long */
  var mStartTime;
  /** private int */
  var mDuration;
  /** private float */
  var mDurationReciprocal;
  /** private float */
  var mDeltaX;
  /** private float */
  var mDeltaY;
  /** private boolean */
  var mFinished;
  /** private Interpolator */
  var mInterpolator;
  /** private boolean */
  var mFlywheel;

  /** private float */
  var mVelocity;
  /** private float */
  var mCurrVelocity;
  /** private int */
  var mDistance;

  /** private float */
  var mFlingFriction = 0.015; //ViewConfiguration.getScrollFriction();

  /** private static final int */
  var DEFAULT_DURATION = 250;
  /** private static final int */
  var SCROLL_MODE = 0;
  /** private static final int */
  var FLING_MODE = 1;

  /** private static float */
  var DECELERATION_RATE = (Math.log(0.78) / Math.log(0.9));
  /** private static final float */
  var INFLEXION = 0.35; // Tension lines cross at (INFLEXION, 1)
  /** private static final float */
  var START_TENSION = 0.5;
  /** private static final float */
  var END_TENSION = 1.0;
  /** private static final float */
  var P1 = START_TENSION * INFLEXION;
  /** private static final float */
  var P2 = 1.0 - END_TENSION * (1.0 - INFLEXION);

  /** private static final int */
  var NB_SAMPLES = 100;
  /** private static final float[] */
  var SPLINE_POSITION = new Array(NB_SAMPLES + 1);
  /** private static final float[] */
  var SPLINE_TIME = new Array(NB_SAMPLES + 1);

  /** private float */
  var mDeceleration;
  /** private final float */
  var mPpi;

  /** A context-specific coefficient adjusted to physical values.
   private float */
  var mPhysicalCoeff;

  /** private static float */
  var sViscousFluidScale;
  /** private static float */
  var sViscousFluidNormalize;

  (function() {
    var x_min = 0.0;
    var y_min = 0.0;
    for (var i = 0; i < NB_SAMPLES; i++) {
      //final float
      var alpha = (i / NB_SAMPLES);

      var x_max = 1.0;
      var x, tx, coef;
      while (true) {
        x = x_min + (x_max - x_min) / 2.0;
        coef = 3.0 * x * (1.0 - x);
        tx = coef * ((1.0 - x) * P1 + x * P2) + x * x * x;
        if (Math.abs(tx - alpha) < 1E-5) break;
        if (tx > alpha) x_max = x;
        else x_min = x;
      }
      SPLINE_POSITION[i] = coef * ((1.0 - x) * START_TENSION + x) + x * x * x;

      var y_max = 1.0;
      var y, dy;
      while (true) {
        y = y_min + (y_max - y_min) / 2.0;
        coef = 3.0 * y * (1.0 - y);
        dy = coef * ((1.0 - y) * START_TENSION + y) + y * y * y;
        if (Math.abs(dy - alpha) < 1E-5) break;
        if (dy > alpha) y_max = y;
        else y_min = y;
      }
      SPLINE_TIME[i] = coef * ((1.0 - y) * P1 + y * P2) + y * y * y;
    }
    SPLINE_POSITION[NB_SAMPLES] = SPLINE_TIME[NB_SAMPLES] = 1.0;

    // This controls the viscous fluid effect (how much of it)
    sViscousFluidScale = 8.0;
    // must be set to 1.0 (used in viscousFluid())
    sViscousFluidNormalize = 1.0;
    sViscousFluidNormalize = 1.0 / viscousFluid(1.0);

  })();


  /**
   * Create a Scroller with the specified interpolator. If the interpolator is
   * null, the default (viscous) interpolator will be used. Specify whether or
   * not to support progressive "flywheel" behavior in flinging.
   */
  // public Scroller(Context context, Interpolator interpolator, boolean flywheel) {
  {
    mFinished = true;
    mInterpolator = interpolator;
    // mPpi = context.getResources().getDisplayMetrics().density * 160.0f;
    mPpi = 1 * 160;
    mDeceleration = computeDeceleration(mFlingFriction);
    mFlywheel = true; //flywheel; NOTE always flywheel

    mPhysicalCoeff = computeDeceleration(0.84); // look and feel tuning
  }
  // }

  // private float computeDeceleration(float friction) {
  function computeDeceleration(friction) {
    return (GRAVITY_EARTH * // g (m/s^2)
            39.37 *         // inch/meter
            mPpi *          // pixels per inch
            friction);
  }

  // private double getSplineDeceleration(float velocity) {
  function getSplineDeceleration(velocity) {
    return Math.log(INFLEXION * Math.abs(velocity) / (mFlingFriction * mPhysicalCoeff));
  }

  // private int getSplineFlingDuration(float velocity) {
  function getSplineFlingDuration(velocity) {
    var l = getSplineDeceleration(velocity);
    var decelMinusOne = DECELERATION_RATE - 1.0;
    // NOTE (int) cast
    return Math.floor(1000.0 * Math.exp(l / decelMinusOne));
  }

  // private double getSplineFlingDistance(float velocity) {
  function getSplineFlingDistance(velocity) {
    var l = getSplineDeceleration(velocity);
    var decelMinusOne = DECELERATION_RATE - 1.0;
    return mFlingFriction * mPhysicalCoeff * Math.exp(DECELERATION_RATE / decelMinusOne * l);
  }

  /** static float viscousFluid(float x) */
  function viscousFluid(x) {
    x *= sViscousFluidScale;
    if (x < 1.0) {
      x -= (1.0 - Math.exp(-x));
    } else {
      var start = 0.36787944117;   // 1/e === exp(-1)
      x = 1.0 - Math.exp(1.0 - x);
      x = start + x * (1.0 - start);
    }
    x *= sViscousFluidNormalize;
    return x;
  }


  
  /**
   * Returns the current velocity.
   *
   * @return The original velocity less the deceleration. Result may be
   * negative.
   */
  // public float getCurrVelocity() {
  function getCurrVelocity() {
    return mMode === FLING_MODE ?
      mCurrVelocity : mVelocity - mDeceleration * timePassed() / 2000.0;
  }

  /**
   * Returns the time elapsed since the beginning of the scrolling.
   *
   * @return The elapsed time in milliseconds.
   */
  // public int timePassed() {
  function timePassed() {
    return currentAnimationTimeMillis() - mStartTime;
  }
  
  return {
    /**
     *
     * Returns whether the scroller has finished scrolling.
     *
     * @return True if the scroller has finished scrolling, false otherwise.
     */
    // public final boolean isFinished() {
    isFinished : function isFinished() {
      return mFinished;
    },
    

    /**
     * The amount of friction applied to flings. The default value
     * is {@link ViewConfiguration#getScrollFriction}.
     *
     * @param friction A scalar dimension-less value representing the coefficient of
     *         friction.
     */
    // public final void setFriction(float friction) {
    setFriction : function setFriction(friction) {
      mDeceleration = computeDeceleration(friction);
      mFlingFriction = friction;
    },

    /**
     * Force the finished field to a particular value.
     *
     * @param finished The new finished value.
     */
    // public final void forceFinished(boolean finished) {
    forceFinished : function forceFinished(finished) {
      mFinished = finished;
    },

    /**
     * Returns how long the scroll event will take, in milliseconds.
     *
     * @return The duration of the scroll in milliseconds.
     */
    // public final int getDuration() {
    getDuration : function getDuration() {
      return mDuration;
    },

    /**
     * Returns the current X offset in the scroll.
     *
     * @return The new X offset as an absolute distance from the origin.
     // public final int getCurrX() {
     */
    getCurrX : function getCurrX() {
      return mCurrX;
    },

    /**
     * Returns the current Y offset in the scroll.
     *
     * @return The new Y offset as an absolute distance from the origin.
     */
    // public final int getCurrY() {
    getCurrY : function getCurrY() {
      return mCurrY;
    },

    /**
     * Returns the current velocity.
     *
     * @return The original velocity less the deceleration. Result may be
     * negative.
     */
    getCurrVelocity : getCurrVelocity,

    /**
     * Returns the start X offset in the scroll.
     *
     * @return The start X offset as an absolute distance from the origin.
     */
    // public final int getStartX() {
    getStartX : function getStartX() {
      return mStartX;
    },

    /**
     * Returns the start Y offset in the scroll.
     *
     * @return The start Y offset as an absolute distance from the origin.
     */
    // public final int getStartY() {
    getStartY : function getStartY() {
      return mStartY;
    },

    /**
     * Returns where the scroll will end. Valid only for "fling" scrolls.
     *
     * @return The final X offset as an absolute distance from the origin.
     */
    // public final int getFinalX() {
    getFinalX : function getFinalX() {
      return mFinalX;
    },

    /**
     * Returns where the scroll will end. Valid only for "fling" scrolls.
     *
     * @return The final Y offset as an absolute distance from the origin.
     */
    // public final int getFinalY() {
    getFinalY : function getFinalY() {
      return mFinalY;
    },

    /**
     * Call this when you want to know the new location.  If it returns true,
     * the animation is not yet finished.
     */
    // public boolean computeScrollOffset() {
    computeScrollOffset : function computeScrollOffset() {
      if (mFinished) {
        return false;
      }

      var timePassed = currentAnimationTimeMillis() - mStartTime;

      // NOTE never let time run out?
      if (true || timePassed < mDuration) {
        switch (mMode) {
        case SCROLL_MODE:
          var x = timePassed * mDurationReciprocal;

          if (mInterpolator === undefined) {
            x = viscousFluid(x);
          } else {
            x = mInterpolator.getInterpolation(x);
          }

          mCurrX = mStartX + Math.round(x * mDeltaX);
          mCurrY = mStartY + Math.round(x * mDeltaY);

          // TODO fix decimal done checks, remove round
          if (Math.round(mCurrX) === Math.round(mFinalX) && Math.round(mCurrY) === Math.round(mFinalY)) {
            mFinished = true;
          }
          break;
        case FLING_MODE:
          // final float t = (float) timePassed / mDuration;
          var t = timePassed / mDuration;
          // final int index = (int) (NB_SAMPLES * t);
          var index = Math.floor(NB_SAMPLES * t);
          // float distanceCoef = 1.f;
          var distanceCoef = 1.0;
          // float velocityCoef = 0.f;
          var velocityCoef = 0.0;
          if (index < NB_SAMPLES) {
            // final float t_inf = (float) index / NB_SAMPLES;
            var t_inf = index / NB_SAMPLES;
            // final float t_sup = (float) (index + 1) / NB_SAMPLES;
            var t_sup = (index + 1) / NB_SAMPLES;
            // final float d_inf = SPLINE_POSITION[index];
            var d_inf = SPLINE_POSITION[index];
            // final float d_sup = SPLINE_POSITION[index + 1];
            var d_sup = SPLINE_POSITION[index + 1];

            velocityCoef = (d_sup - d_inf) / (t_sup - t_inf);
            distanceCoef = d_inf + (t - t_inf) * velocityCoef;
          }

          mCurrVelocity = velocityCoef * mDistance / mDuration * 1000.0;

          mCurrX = mStartX + Math.round(distanceCoef * (mFinalX - mStartX));
          // Pin to mMinX <= mCurrX <= mMaxX
          mCurrX = Math.min(mCurrX, mMaxX);
          mCurrX = Math.max(mCurrX, mMinX);

          mCurrY = mStartY + Math.round(distanceCoef * (mFinalY - mStartY));
          // Pin to mMinY <= mCurrY <= mMaxY
          mCurrY = Math.min(mCurrY, mMaxY);
          mCurrY = Math.max(mCurrY, mMinY);

          // TODO fix decimal done checks, remove round
          if (Math.round(mCurrX) === Math.round(mFinalX) && Math.round(mCurrY) === Math.round(mFinalY)) {
            mFinished = true;
          }

          break;
        }
      } else {
        console.log('SCROLLER time ran out');
        mCurrX = mFinalX;
        mCurrY = mFinalY;
        mFinished = true;
      }
      return true;
    },

    /**
     * Start scrolling by providing a starting point, the distance to travel,
     * and the duration of the scroll.
     *
     * @param startX Starting horizontal scroll offset in pixels. Positive
     *        numbers will scroll the content to the left.
     * @param startY Starting vertical scroll offset in pixels. Positive numbers
     *        will scroll the content up.
     * @param dx Horizontal distance to travel. Positive numbers will scroll the
     *        content to the left.
     * @param dy Vertical distance to travel. Positive numbers will scroll the
     *        content up.
     * @param duration Duration of the scroll in milliseconds.
     */
    // public void startScroll(int startX, int startY, int dx, int dy, int duration) {
    startScroll : function startScroll(startX, startY, dx, dy, duration) {
      mMode = SCROLL_MODE;
      mFinished = false;
      mDuration = duration === undefined ? DEFAULT_DURATION : duration;
      mStartTime = currentAnimationTimeMillis();
      mStartX = startX;
      mStartY = startY;
      mFinalX = startX + dx;
      mFinalY = startY + dy;
      mDeltaX = dx;
      mDeltaY = dy;
      mDurationReciprocal = 1.0 / mDuration;
    },

    /**
     * Start scrolling based on a fling gesture. The distance travelled will
     * depend on the initial velocity of the fling.
     *
     * @param startX Starting point of the scroll (X)
     * @param startY Starting point of the scroll (Y)
     * @param velocityX Initial velocity of the fling (X) measured in pixels per
     *        second.
     * @param velocityY Initial velocity of the fling (Y) measured in pixels per
     *        second
     * @param minX Minimum X value. The scroller will not scroll past this
     *        point.
     * @param maxX Maximum X value. The scroller will not scroll past this
     *        point.
     * @param minY Minimum Y value. The scroller will not scroll past this
     *        point.
     * @param maxY Maximum Y value. The scroller will not scroll past this
     *        point.
     */
    fling : function fling(startX, startY, velocityX, velocityY,
                           minX, maxX, minY, maxY) {
      minX = (minX === undefined) ? -Number.MAX_VALUE : minX;
      minY = (minY === undefined) ? -Number.MAX_VALUE : minY;
      maxX = (maxX === undefined) ? Number.MAX_VALUE : maxX;
      maxY = (maxY === undefined) ? Number.MAX_VALUE : maxY;

      // Continue a scroll or fling in progress
      if (mFlywheel && !mFinished) {
        var oldVel = getCurrVelocity();

        var dx = (mFinalX - mStartX);
        var dy = (mFinalY - mStartY);
        var hyp = Math.sqrt(dx * dx + dy * dy);

        var ndx = dx / hyp;
        var ndy = dy / hyp;

        var oldVelocityX = ndx * oldVel;
        var oldVelocityY = ndy * oldVel;
        if (signum(velocityX) === signum(oldVelocityX) &&
            signum(velocityY) === signum(oldVelocityY)) {
          velocityX += oldVelocityX;
          velocityY += oldVelocityY;
        }
      }

      mMode = FLING_MODE;
      mFinished = false;

      var velocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

      mVelocity = velocity;
      mDuration = getSplineFlingDuration(velocity);
      mStartTime = currentAnimationTimeMillis();
      mStartX = startX;
      mStartY = startY;

      var coeffX = velocity === 0 ? 1.0 : velocityX / velocity;
      var coeffY = velocity === 0 ? 1.0 : velocityY / velocity;

      var totalDistance = getSplineFlingDistance(velocity);
      // NOTE (int) cast
      mDistance = Math.floor(totalDistance * signum(velocity));

      mMinX = minX;
      mMaxX = maxX;
      mMinY = minY;
      mMaxY = maxY;

      mFinalX = startX + Math.round(totalDistance * coeffX);
      // Pin to mMinX <= mFinalX <= mMaxX
      mFinalX = Math.min(mFinalX, mMaxX);
      mFinalX = Math.max(mFinalX, mMinX);

      mFinalY = startY + Math.round(totalDistance * coeffY);
      // Pin to mMinY <= mFinalY <= mMaxY
      mFinalY = Math.min(mFinalY, mMaxY);
      mFinalY = Math.max(mFinalY, mMinY);
    },

    /**
     * Stops the animation. Contrary to {@link #forceFinished(boolean)},
     * aborting the animating cause the scroller to move to the final x and y
     * position
     *
     * @see #forceFinished(boolean)
     */
    // public void abortAnimation() {
    abortAnimation : function abortAnimation() {
      mCurrX = mFinalX;
      mCurrY = mFinalY;
      mFinished = true;
    },

    /**
     * Extend the scroll animation. This allows a running animation to scroll
     * further and longer, when used with {@link #setFinalX(int)} or {@link #setFinalY(int)}.
     *
     * @param extend Additional time to scroll in milliseconds.
     * @see #setFinalX(int)
     * @see #setFinalY(int)
     */
    // public void extendDuration(int extend) {
    extendDuration : function extendDuration(extend) {
      var passed = timePassed();
      mDuration = passed + extend;
      mDurationReciprocal = 1.0 / mDuration;
      mFinished = false;
    },

    /**
     * Returns the time elapsed since the beginning of the scrolling.
     *
     * @return The elapsed time in milliseconds.
     */
    // public int timePassed() {
    timePassed : timePassed,

    /**
     * Sets the final position (X) for this scroller.
     *
     * @param newX The new X offset as an absolute distance from the origin.
     * @see #extendDuration(int)
     * @see #setFinalY(int)
     */
    // public void setFinalX(int newX) {
    setFinalX : function setFinalX(newX) {
      mFinalX = newX;
      mDeltaX = mFinalX - mStartX;
      mFinished = false;
    },

    /**
     * Sets the final position (Y) for this scroller.
     *
     * @param newY The new Y offset as an absolute distance from the origin.
     * @see #extendDuration(int)
     * @see #setFinalX(int)
     */
    // public void setFinalY(int newY) {
    setFinalY : function setFinalY(newY) {
      mFinalY = newY;
      mDeltaY = mFinalY - mStartY;
      mFinished = false;
    },

    /**
     * @hide
     */
    // public boolean isScrollingInDirection(float xvel, float yvel) {
    isScrollingInDirection : function isScrollingInDirection(xvel, yvel) {
      return !mFinished && signum(xvel) === signum(mFinalX - mStartX) &&
        signum(yvel) === signum(mFinalY - mStartY);
    }
  };
}

module.exports = Scroller;

},{}],6:[function(_dereq_,module,exports){
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
  },

  sign : function (num) {
    return num ? (num < 0) ? -1 : 1 : 0;
  }
};

},{}],7:[function(_dereq_,module,exports){
/*global require, module, console */
'use strict';

/*
 * Port of the Android VelocityTracker: http://code.metager.de/source/xref/android/4.4/frameworks/native/libs/input/VelocityTracker.cpp
 *
 * Original Licence
 * 
 * Copyright (C) 2012 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function VelocityTracker() {
    var last_timestamp = 0;

    /** Movement points to do calcs on */
    var positions = new Array(HISTORY_SIZE);

    /** Index of latest added points in positions */
    var mIndex = 0;

    /** Estimator used */
    var estimator = new Estimator();

    /**
     * Threshold for determining that a pointer has stopped moving.
     * Some input devices do not send ACTION_MOVE events in the case where a pointer has
     * stopped.  We need to detect this case so that we can accurately predict the
     * velocity after the pointer starts moving again.
     */
    var ASSUME_POINTER_STOPPED_TIME_MS = 40;

    /** Max number of points to use in calculations */
    var HISTORY_SIZE = 5;
    
    /** If points are old don't use in calculations */
    var HORIZON_MS = 200;

    var DEBUG = false;

    function Estimator() {
        return {
            MAX_DEGREE : 4,
            // Estimator time base.
            time : 0,

            // Polynomial coefficients describing motion in X and Y.
            xCoeff : new Array(4 + 1), // MAX_DEGREE + 1
            yCoeff : new Array(4 + 1),

            // Polynomial degree (number of coefficients), or zero if no information is
            // available.
            degree : 2,

            // Confidence (coefficient of determination), between 0 (no fit) and 1 (perfect fit).
            confidence : 0,

            clear : function clear() {
                this.time = 0;
                this.degree = 0;
                this.confidence = 0;
                for (var i = 0; i <= this.MAX_DEGREE; i++) {
                    this.xCoeff[i] = 0;
                    this.yCoeff[i] = 0;
                }
            }
        };
    }

    function log(x) {
        console.log(
            JSON.stringify(x));
    }

    function vectorDot(va, vb) {
        var r = 0;
        var l = va.length;
        while (l--) {
            r += va[l] * vb[l];
        }
        return r;
    }

    function vectorNorm(va) {
        var r = 0;
        var i = va.length;
        while (i--) {
            r += va[i] * va[i];
        }
        return Math.sqrt(r);
    }

    function createTwoDimArray(m, n) {
        var x = new Array(m);
        for (var i = 0; i < m; i++) {
            x[i] = new Array(n);
        }
        return x;
    }

    function clear() {
        mIndex = 0;
        positions[0] = undefined;
    }

    /**
     * Solves a linear least squares problem to obtain a N degree polynomial that fits
     * the specified input data as nearly as possible.
     *
     * Returns true if a solution is found, false otherwise.
     *
     * The input consists of two vectors of data points X and Y with indices 0..m-1
     * along with a weight vector W of the same size.
     *
     * The output is a vector B with indices 0..n that describes a polynomial
     * that fits the data, such the sum of W[i] * W[i] * abs(Y[i] - (B[0] + B[1] X[i]
     * + B[2] X[i]^2 ... B[n] X[i]^n)) for all i between 0 and m-1 is minimized.
     *
     * Accordingly, the weight vector W should be initialized by the caller with the
     * reciprocal square root of the variance of the error in each input data point.
     * In other words, an ideal choice for W would be W[i] = 1 / var(Y[i]) = 1 / stddev(Y[i]).
     * The weights express the relative importance of each data point.  If the weights are
     * all 1, then the data points are considered to be of equal importance when fitting
     * the polynomial.  It is a good idea to choose weights that diminish the importance
     * of data points that may have higher than usual error margins.
     *
     * Errors among data points are assumed to be independent.  W is represented here
     * as a vector although in the literature it is typically taken to be a diagonal matrix.
     *
     * That is to say, the function that generated the input data can be approximated
     * by y(x) ~= B[0] + B[1] x + B[2] x^2 + ... + B[n] x^n.
     *
     * The coefficient of determination (R^2) is also returned to describe the goodness
     * of fit of the model for the given data.  It is a value between 0 and 1, where 1
     * indicates perfect correspondence.
     *
     * This function first expands the X vector to a m by n matrix A such that
     * A[i][0] = 1, A[i][1] = X[i], A[i][2] = X[i]^2, ..., A[i][n] = X[i]^n, then
     * multiplies it by w[i]./
     *
     * Then it calculates the QR decomposition of A yielding an m by m orthonormal matrix Q
     * and an m by n upper triangular matrix R.  Because R is upper triangular (lower
     * part is all zeroes), we can simplify the decomposition into an m by n matrix
     * Q1 and a n by n matrix R1 such that A = Q1 R1.
     *
     * Finally we solve the system of linear equations given by R1 B = (Qtranspose W Y)
     * to find B.
     *
     * For efficiency, we lay out A and Q column-wise in memory because we frequently
     * operate on the column vectors.  Conversely, we lay out R row-wise.
     *
     * http://en.wikipedia.org/wiki/Numerical_methods_for_linear_least_squares
     * http://en.wikipedia.org/wiki/Gram-Schmidt
     */
    function solveLeastSquares(x, y, w,
                               m,  n, outB, outDet) {
        // indexes
        var h, i, j;
        
        if (DEBUG) {
            console.log("solveLeastSquares: ",
                        "m => ", m,
                        "n => ", n,
                        "x => ", x,
                        "y => ", y,
                        "w => ", w,
                        "outB =>", outB,
                        "outDet =>", outDet);
        }

        // Expand the X vector to a matrix A, pre-multiplied by the weights.
        // float a[n][m]; // column-major order
        var a = createTwoDimArray(n, m);
        for (h = 0; h < m; h++) {
            a[0][h] = w[h];
            for (i = 1; i < n; i++) {
                a[i][h] = a[i - 1][h] * x[h];
            }
        }
        if (DEBUG) {
            log({a : a});
        }

        // Apply the Gram-Schmidt process to A to obtain its QR decomposition.
        // float q[n][m]; // orthonormal basis, column-major order
        var q = createTwoDimArray(n, m);
        // float r[n][n]; // upper triangular matrix, row-major order
        var r = createTwoDimArray(n, n);
        for (j = 0; j < n; j++) {
            for (h = 0; h < m; h++) {
                q[j][h] = a[j][h];
            }
            for (i = 0; i < j; i++) {
                var dot = vectorDot(q[j], q[i]);
                for (h = 0; h < m; h++) {
                    q[j][h] -= dot * q[i][h];
                }
            }

            var norm = vectorNorm(q[j], m);
            if (DEBUG) {
                log({q : q});
                console.log('norm', norm, m, q[j][0]);
            }
            if (norm < 0.000001) {
                // vectors are linearly dependent or zero so no solution
                if (DEBUG) {
                    console.log("  - no solution, norm=%f", norm);
                }
                return false;
            }

            var invNorm = 1.0 / norm;
            for (h = 0; h < m; h++) {
                q[j][h] *= invNorm;
            }
            for (i = 0; i < n; i++) {
                r[j][i] = i < j ? 0 : vectorDot(q[j], a[i]);
            }
        }
        
        if (DEBUG) {
            console.log("  - q=> ", q[0][0]);
            console.log("  - r=> ", r[0][0]);
            
            // calculate QR, if we factored A correctly then QR should equal A
            var qr = createTwoDimArray(n, m);
            for (h = 0; h < m; h++) {
                for (i = 0; i < n; i++) {
                    qr[i][h] = 0;
                    for (j = 0; j < n; j++) {
                        qr[i][h] += q[j][h] * r[j][i];
                    }
                }
            }
            console.log("  - qr=%s",qr[0][0]);
        } // End DEBUG

        // Solve R B = Qt W Y to find B.  This is easy because R is upper triangular.
        // We just work from bottom-right to top-left calculating B's coefficients.
        var wy = new Array(m);
        for (h = 0; h < m; h++) {
            wy[h] = y[h] * w[h];
        }
        for (i = n; i-- !== 0; ) {
            outB[i] = vectorDot(q[i], wy, m);
            for (j = n - 1; j > i; j--) {
                outB[i] -= r[i][j] * outB[j];
            }
            outB[i] /= r[i][i];
        }
        
        if (DEBUG) {
            console.log("  - b=%s", outB);
        }

        // Calculate the coefficient of determination as 1 - (SSerr / SStot) where
        // SSerr is the residual sum of squares (variance of the error),
        // and SStot is the total sum of squares (variance of the data) where each
        // has been weighted.
        var ymean = 0;
        for (h = 0; h < m; h++) {
            ymean += y[h];
        }
        ymean /= m;

        var sserr = 0;
        var sstot = 0;
        for (h = 0; h < m; h++) {
            var err = y[h] - outB[0];
            var term = 1;
            for (i = 1; i < n; i++) {
                term *= x[h];
                err -= term * outB[i];
            }
            sserr += w[h] * w[h] * err * err;
            var vari = y[h] - ymean;
            sstot += w[h] * w[h] * vari * vari;
        }
        outDet.confidence = sstot > 0.000001 ? 1.0 - (sserr / sstot) : 1;
        
        if (DEBUG) {
            console.log(
                "  - sserr => ", sserr,
                "  - sstot => ", sstot,
                "  - det => ", outDet
            );
        }
        return true;
    }

    function chooseWeight(index) {
        // TODO
        return 1;
    }

    /**
     * @param degree Order use 2...
     */
    function prepareEstimator(degree) {
        estimator.clear();
        
        // Iterate over movement samples in reverse time order and collect samples.
        var x = new Array(HISTORY_SIZE);
        var y = new Array(HISTORY_SIZE);
        var w = new Array(HISTORY_SIZE);
        var time = new Array(HISTORY_SIZE);
        var m = 0;
        var index = mIndex;
        var newestMovement = positions[mIndex];
        if (newestMovement === undefined) {
            return false;
        }
        do {
            var movement = positions[index];
            if (!movement) {
                break;
            }

            var age = newestMovement.timestamp - movement.timestamp;
            if (age > HORIZON_MS) {
                break; // Old points don't use
            }

            x[m] = movement.x;
            y[m] = movement.y;
            w[m] = chooseWeight(index);
            time[m] = -age;
            index = (index === 0 ? HISTORY_SIZE : index) - 1;
        } while (++m < HISTORY_SIZE);

        if (m === 0) {
            console.log('no data to estimate');
            return false; // no data
        }

        // Calculate a least squares polynomial fit.
        if (degree > m - 1) {
            degree = m - 1;
        }
        if (degree >= 1) {
            // TODO change xdet, ydet to be returned from function
            var xdet = {confidence : 0};
            var ydet = {confidence : 0};
            var n = degree + 1;
            if (solveLeastSquares(time, x, w, m, n, estimator.xCoeff, xdet) &&
                solveLeastSquares(time, y, w, m, n, estimator.yCoeff, ydet)) {
                estimator.time = newestMovement.timestamp;
                estimator.degree = degree;
                estimator.confidence = xdet.confidence * ydet.confidence;
                
                if (DEBUG) {
                    console.log("Estimate: ",
                                "degree", estimator.degree,
                                "xCoeff", estimator.xCoeff,
                                "yCoeff", estimator.yCoeff,
                                "confidence", estimator.confidence);
                }
                return true;
            }
        }

        // No velocity data available for this pointer, but we do have its current position.
        if (DEBUG) {
            console.log("velocity data available for this pointer, but we do have its current position.");
        }
        estimator.xCoeff[0] = x[0];
        estimator.yCoeff[0] = y[0];
        estimator.time = newestMovement.timestamp;
        estimator.degree = 0;
        estimator.confidence = 1;
        return true;
    }

    return {
        clear : clear,
      
        getVelocity : function getVelocity() {
            // 2 polynomial estimator
            if (prepareEstimator(2) && estimator.degree >= 1) {
                return {
                    unit : "px / ms",
                    vx : estimator.xCoeff[1],
                    vy : estimator.yCoeff[1]
                };
            }
          return {
            info : 'no velo',
            unit : "px / ms",
            vx : 0,
            vy : 0
          };
        },
        
      getPositions : function () {
        var m = 0;
        var index = mIndex;
        var r = [];
        do {
          var movement = positions[index];
          if (!movement) {
            break;
          }
          r.push(movement);
          index = (index === 0 ? HISTORY_SIZE : index) - 1;
        } while (++m < HISTORY_SIZE);
        
        return r;
      },

        /**
         * @param pos = {x, y, timestamp_ms}
         */
        addMovement : function addMovement(pos) {
            if (pos.timestamp >= last_timestamp + ASSUME_POINTER_STOPPED_TIME_MS) {
                // We have not received any movements for too long.  Assume that all pointers
                // have stopped.
                if (DEBUG) {
                    console.log('no movements assume stop');
                }
                clear();
            }
            last_timestamp = pos.timestamp;

            // strategy add
            if (++mIndex === HISTORY_SIZE) {
                mIndex = 0;
            }

            positions[mIndex] = pos;
        }
    };
}

module.exports = VelocityTracker;

},{}]},{},[2])
(2)
});