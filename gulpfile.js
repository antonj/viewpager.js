/*global require, exports, module*/

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    guglify = require('gulp-uglify'),
    grename = require('gulp-rename'),
    merge = require('merge-stream'),
    browserify = require('gulp-browserify'),
    jshint = require('gulp-jshint'),
    browserSync = require('browser-sync'),
    reload = browserSync.reload;


function out(src, standAloneName) {
  return gulp.src(src)
    .pipe(browserify({
      standalone: standAloneName
    }).on('error', gutil.log))
    .pipe(gulp.dest('./dist'));
}

gulp.task('js', function () {
  return merge(out('./src/viewpager.js', 'ViewPager'),
               out('./src/gesture_detector.js', 'GestureDetector'),
               out('./src/velocity_tracker.js', 'VelocityTracker'));
});

gulp.task('minjs', function () {
  return gulp.src(['./dist/*.js', '!./**/*.min.js'])
    .pipe(guglify())
    .pipe(grename({ extname: '.min.js'}))
    .pipe(gulp.dest('./dist'));
});

gulp.task('lint', function() {
  return gulp.src(['src/**/*.js'])
    .pipe(jshint({ globalstrict: true }))
    .pipe(jshint.reporter('default'));
});

gulp.task('browser-sync', function() {
  browserSync({ server: { baseDir: './' ,  directory: true } });
});

gulp.task('watch', function() {
  gulp.watch(['./src/**/*.js'], ['js']);
  gulp.watch(['./dist/*.js', '!./dist/*.min.js'], ['minjs', reload]);
  gulp.watch(['./examples/**/*.js',
              './examples/**/*.html',
              './examples/**/*.css'], reload);
});


gulp.task('dist', ['js', 'minjs']);
gulp.task('default', ['lint', 'js', 'watch', 'browser-sync']);
