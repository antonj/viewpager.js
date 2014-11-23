/*global window, require, module */
'use strict';
// Threshold for determining that a pointer has stopped moving.
// Some input devices do not send ACTION_MOVE events in the case where a pointer has
// stopped.  We need to detect this case so that we can accurately predict the
// velocity after the pointer starts moving again.
var ASSUME_POINTER_STOPPED_TIME_MS = 40;

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

function vectorToString(a) {
    return "[" + a.join(",") + "]";
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

function VelocityTracker() {
    var last_timestamp_ms = 0;

    var HISTORY_SIZE = 20;
    var HORIZON_MS = 200;

    var positions = new Array(HISTORY_SIZE);
    var mIndex = 0;

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
        // #if DEBUG_STRATEGY
        console.log("solveLeastSquares: ",
                    "m => ", m,
                    "n => ", n,
                    "x => ", x,
                    "y => ", y,
                    "w => ", w,
                    "outB =>", outB,
                    "outDet =>", outDet);
        // #endif

        // Expand the X vector to a matrix A, pre-multiplied by the weights.
        // float a[n][m]; // column-major order
        var a = createTwoDimArray(n, m);
        for (var h = 0; h < m; h++) {
            a[0][h] = w[h];
            for (var i = 1; i < n; i++) {
                a[i][h] = a[i - 1][h] * x[h];
            }
        }
        // #if DEBUG_STRATEGY
        // ALOGD("  - a=%s", matrixToString(&a[0][0], m, n, false /*rowMajor*/).string());
        // console.log("  - a", a);
        log({a : a});
        // #endif

        // Apply the Gram-Schmidt process to A to obtain its QR decomposition.
        // float q[n][m]; // orthonormal basis, column-major order
        var q = createTwoDimArray(n, m);
        // float r[n][n]; // upper triangular matrix, row-major order
        var r = createTwoDimArray(n, n);
        console.log('looping', n, m);
        for (var j = 0; j < n; j++) {
            for (var h = 0; h < m; h++) {
                q[j][h] = a[j][h];
            }
            for (var i = 0; i < j; i++) {
                var dot = vectorDot(q[j], q[i]);
                console.log('dot', q[j], q[i], m);
                for (var h = 0; h < m; h++) {
                    q[j][h] -= dot * q[i][h];
                }
            }

            log({q : q});
            var norm = vectorNorm(q[j], m);
            console.log('norm', norm, m, q[j][0]);
            if (norm < 0.000001) {
                // vectors are linearly dependent or zero so no solution
                // #if DEBUG_STRATEGY
                console.log("  - no solution, norm=%f", norm);
                // #endif
                return false;
            }

            var invNorm = 1.0 / norm;
            for (var h = 0; h < m; h++) {
                q[j][h] *= invNorm;
            }
            for (var i = 0; i < n; i++) {
                r[j][i] = i < j ? 0 : vectorDot(q[j], a[i]);
            }
            log({r : r});
        }
        // #if DEBUG_STRATEGY
        console.log("  - q=> ", q[0][0]);
        console.log("  - r=> ", r[0][0]);

        // calculate QR, if we factored A correctly then QR should equal A
        var qr = createTwoDimArray(n, m);
        for (var h = 0; h < m; h++) {
            for (var i = 0; i < n; i++) {
                qr[i][h] = 0;
                for (var j = 0; j < n; j++) {
                    qr[i][h] += q[j][h] * r[j][i];
                }
            }
        }
        console.log("  - qr=%s",qr[0][0]);
        // #endif

        // Solve R B = Qt W Y to find B.  This is easy because R is upper triangular.
        // We just work from bottom-right to top-left calculating B's coefficients.
        var wy = new Array(m);
        for (var h = 0; h < m; h++) {
            wy[h] = y[h] * w[h];
        }
        for (var i = n; i-- != 0; ) {
            outB[i] = vectorDot(q[i], wy, m);
            for (var j = n - 1; j > i; j--) {
                outB[i] -= r[i][j] * outB[j];
            }
            outB[i] /= r[i][i];
        }
        // #if DEBUG_STRATEGY
        console.log("  - b=%s", outB);
        // #endif

        // Calculate the coefficient of determination as 1 - (SSerr / SStot) where
        // SSerr is the residual sum of squares (variance of the error),
        // and SStot is the total sum of squares (variance of the data) where each
        // has been weighted.
        var ymean = 0;
        for (var h = 0; h < m; h++) {
            ymean += y[h];
        }
        ymean /= m;

        var sserr = 0;
        var sstot = 0;
        for (var h = 0; h < m; h++) {
            var err = y[h] - outB[0];
            var term = 1;
            for (var i = 1; i < n; i++) {
                term *= x[h];
                err -= term * outB[i];
            }
            sserr += w[h] * w[h] * err * err;
            var vari = y[h] - ymean;
            sstot += w[h] * w[h] * vari * vari;
        }
        outDet.confidence = sstot > 0.000001 ? 1.0 - (sserr / sstot) : 1;
        // #if DEBUG_STRATEGY
        console.log(
            "  - sserr => ", sserr,
            "  - sstot => ", sstot,
            "  - det => ", outDet
        );
        // #endif
        return true;
    }

    function chooseWeight(index) {
        // TODO
        return 1;
    }

    /**
     * @param degree Order use 2...
     */
    function getEstimator(outEstimator, degree) {
        outEstimator.clear();
        
        // Iterate over movement samples in reverse time order and collect samples.
        var x = new Array(HISTORY_SIZE);
        var y = new Array(HISTORY_SIZE);
        var w = new Array(HISTORY_SIZE);
        var time = new Array(HISTORY_SIZE);
        var m = 0;
        var index = mIndex;
        var newestMovement = positions[mIndex];
        do {
            var movement = positions[index];
            console.log('movement', movement);
            // if (!movement.idBits.hasBit(id)) {
            //     break;
            // }

            var age = newestMovement.timestamp - movement.timestamp;
            if (age > HORIZON_MS) {
                console.log('old data');
                break; // Old
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
            if (solveLeastSquares(time, x, w, m, n, outEstimator.xCoeff, xdet)
                && solveLeastSquares(time, y, w, m, n, outEstimator.yCoeff, ydet)) {
                outEstimator.time = newestMovement.eventTime;
                outEstimator.degree = degree;
                outEstimator.confidence = xdet.confidence * ydet.confidence;
                // #if DEBUG_STRATEGY
                console.log("Estimate: ",
                            "degree", outEstimator.degree,
                            "xCoeff", outEstimator.xCoeff,
                            "yCoeff", outEstimator.yCoeff,
                            "confidence", outEstimator.confidence);
                // #endif
                return true;
            }
        }

        // No velocity data available for this pointer, but we do have its current position.
        console.log("velocity data available for this pointer, but we do have its current position.");
        outEstimator.xCoeff[0] = x[0];
        outEstimator.yCoeff[0] = y[0];
        outEstimator.time = newestMovement.eventTime;
        outEstimator.degree = 0;
        outEstimator.confidence = 1;
        return true;
    }

    return {
        getVelocity : function getVelocity() {
            var estimator = new Estimator();
            // 2 polynomial estimatorn
            if (getEstimator(estimator, 2) && estimator.degree >= 1) {
                return {
                    outVx : estimator.xCoeff[1],
                    outVy : estimator.yCoeff[1]
                };
            }
            return estimator;
        },
        
        getPositions : function () {
            return positions;
        },

        /**
         Only add move movements
         * @param pos = {x, y, timestamp_ms}
         */
        addMovement : function addMovement(pos) {
            if (pos.timestamp_ms >= last_timestamp_ms + ASSUME_POINTER_STOPPED_TIME_MS) {
                // We have not received any movements for too long.  Assume that all pointers
                // have stopped.
                console.log('no movements assume stop');
                // TODO strategy clear
            }
            last_timestamp_ms = pos.timestamp_ms;

            // strategy add
            if (++mIndex === HISTORY_SIZE) {
                mIndex = 0;
            }

            positions[mIndex] = pos;
        }
    };
}
