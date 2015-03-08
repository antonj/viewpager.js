!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.VelocityTracker=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}]},{},[1])
(1)
});