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
      sass: '<%= project.public %>/vcdn.io/assets/sass',
      css: [
        '<%= project.public %>/vcdn.io/assets/css/style.scss'
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
     * Sass configuration for vcdn.io
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
            cwd: 'public/vcdn.io/assets/sass',
            src: ['**/index.scss'],
            dest: 'public/vcdn.io/assets/css',
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
            cwd: 'public/vcdn.io/assets/sass',
            src: ['**/index.scss'],
            dest: 'public/vcdn.io/assets/css',
            ext: '.css'
          }
        ]
      }
    },

    /**
     * Concatenate frontend JavaScript files into a build file.
     */
    concat: {
      options: {
        separator: ''
      },
      dist: {
        src: [
          'src/lib/socket/socket.js',
          'src/lib/global/global.js',
          'src/lib/util/util.js',
          'src/lib/log/log.js',
          'src/lib/cache/cache.js',
          'src/lib/serve/serve.js',
          'src/lib/p2ps/p2ps.js',
          'src/lib/p2pc/p2pc.js',
          'src/init.js'
        ],
        dest: 'dist/vcdn.js'
      }
    },

    /**
     * Minify frontend JavaScript build file
     */
    uglify: {
      vcdn: {
        options: {
          banner:
          '/*!\n' +
          ' * <%= pkg.name %> - v<%= pkg.version %>\n' +
          ' * <%= pkg.copyright %> <%= grunt.template.today("yyyy") %>\n' +
          ' */\n',
          mangle: {
            except: ['vcdn']
          },
          beautify: {
            width: 80,
            beautify: false
          }
        },
        files: {
          'dist/vcdn.js': ['dist/vcdn.js']
        }
      }
    },

    /**
     * Watch for file changes and respond
     */
    watch: {
      options: {
        livereload: true
      },
      js: {
        files: [
          'src/app/*.js',
          'src/lib/**/*.js'
        ],
        options: {
          spawn: false
        },
        tasks: ['concat', 'uglify']
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
        files: 'public/vcdn.io/assets/sass/*.{scss,sass}',
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
    'concat',
    'uglify',
    'sass:dev',
    'watch'
  ]);
};
