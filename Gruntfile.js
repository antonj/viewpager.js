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
        tasks: ['browserify', 'uglify'],
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

  grunt.registerTask('default', ['dist', 'watch']);
  grunt.registerTask('dist',  ['browserify', 'jshint', 'uglify']);
  grunt.registerTask('all',  ['dist']);
  
};
