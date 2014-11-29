/*global require, module */
module.exports = function (grunt) {
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      options: {
        globalstrict : true,
        trailing: true
      },
      src: ['src/**/*.js']
    },

    uglify: {
      build: {
        files: {
          'dist/viewpager.min.js': ['dist/viewpager.js']
        }
      }
    },

    browserify: {
      viewpager: {
        options: {
          browserifyOptions : {
            standalone: 'ViewPager'
          }
        },
        src: 'src/viewpager.js',
        dest: 'dist/viewpager.js'
      },

      gesturedetector: {
        options: {
          browserifyOptions : {
            standalone: 'GestureDetector'
          }
        },
        src: 'src/gesture_detector.js',
        dest: 'dist/gesture_detector.js'
      },

      velocitytracker: {
        options: {
          browserifyOptions : {
            standalone: 'VelocityTracker'
          }
        },
        src: 'src/velocity_tracker.js',
        dest: 'dist/velocity_tracker.js'
      }
    },

    watch: {
      js: {
        files: ['src/**/*.js'],
        tasks: ['browserify'],
        options: {
          livereload: true
        }
      },
      
      lint: {
          files: ['src/**/*.js'],
          tasks: ['jshint']
      }
    }
  });

  grunt.registerTask('default', ['watch']);
  grunt.registerTask('dist',  ['browserify', 'jshint', 'uglify']);
  grunt.registerTask('all',  ['dist']);
  
};
