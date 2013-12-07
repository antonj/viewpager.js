/*global require, module */
module.exports = function (grunt) {
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      ignore_warning: {
        options: {
          '-W015' : true,
          'globalstrict' : true
        },
        src: ['src/**/*.js']
      }
    },

    uglify: {
      build: {
        files: {
          'dist/viewpager.min.js': ['dist/viewpager.js']
        }
      }
    },

    browserify: {
      js: {
        src: 'src/viewpager.js',
        dest: 'dist/viewpager.js'
      }
    },

    qunit: {
      all: ['tests/**/*.html']
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
  grunt.registerTask('dist',  ['browserify', 'uglify']);
};
