/*global require, module */
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
    // public void fling(int startX, int startY, int velocityX, int velocityY,
    //                   int minX, int maxX, int minY, int maxY) {
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
