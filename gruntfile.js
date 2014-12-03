"use strict";

module.exports = function(grunt) {
  grunt.initConfig ({

    /**
     * Import project information
     */
    pkg: grunt.file.readJSON('package.json'),

    /**
     * Project details
     */
    project: {
      public: '/public',
      sass: '<%= project.public %>/assets/sass',
      css: [
        '<%= project.public %>/assets/scss/style.scss'
      ],
      js: [
        '<%= project.public %>/js/*.js'
      ]
    },

    /**
     * Set project banner
     */
    tag: {
      banner: '/*!\n' +
      ' * <%= pkg.name %>\n' +
      ' * <%= pkg.title %>\n' +
      ' * @author <%= pkg.author %>\n' +
      ' * @version <%= pkg.version %>\n' +
      ' * Copyright <%= pkg.copyright %>. <%= pkg.license %> licensed.\n' +
      ' */\n'
    },

    /**
     * Sass configuration
     */
    sass: {
      dev: {
        options: {
          style: 'expanded',
          banner: '<%= tag.banner %>',
          compass: true
        },
        files: [
          {
            expand: true,
            cwd: 'public/assets/sass',
            src: ['**/index.scss'],
            dest: 'public/assets/css',
            ext: '.css'
          }
        ]
      },
      dist: {
        options: {
          style: 'compressed',
          compass: true
        },
        files: [
          {
            expand: true,
            cwd: 'public/assets/sass',
            src: ['**/index.scss'],
            dest: 'public/assets/css',
            ext: '.css'
          }
        ]
      }
    },

    /**
     * Watch
     */
    watch: {
      options: {
        livereload: true
      },
      js: {
        files: [
          'index.js',
          'public/js/**/*.js'
        ],
        options: {
          spawn: false
        }
      },
      html: {
        files: [
          '**/*.html'
        ],
        options: {
          spawn: false
        }
      },
      sass: {
        files: 'public/assets/sass/*.{scss,sass}',
        tasks: ['sass:dev']
      }
    }
  });

  /**
   * Load grunt plugins
   */
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  /**
   * Default task
   * Run `grunt` on the command line
   */
  grunt.registerTask('default', [
    'sass:dev',
    'watch'
  ]);
};