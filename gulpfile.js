'use strict'

const gulp        = require('gulp')
const log         = require('fancy-log')
const fatalLevel  = require('yargs').argv.fatal
const sass        = require('gulp-sass')
const prefixer    = require('gulp-autoprefixer')
const uglify      = require('gulp-uglify')
const concat      = require('gulp-concat')
const rename      = require('gulp-rename')
const handlebars  = require('gulp-compile-handlebars')
const browserSync = require('browser-sync')
const ghPages     = require('gulp-gh-pages')
const sassGlob    = require('gulp-sass-bulk-import')
const watch       = require('gulp-watch')
const babel       = require('gulp-babel')

const ERROR_LEVELS = ['error', 'warning']

function handleError(level, error) {
  log.error(error.message)
  if (isFatal(level)) {
     process.exit(1)
  }
}

function isFatal(level) {
  return ERROR_LEVELS.indexOf(level) <= ERROR_LEVELS.indexOf(fatalLevel || 'error')
}

function onError(error) {
  handleError.call(this, 'error', error)
}

function onWarning(error) {
  handleError.call(this, 'warning', error)
}

var paths = {
  src: { root: 'src' },
  dist: { root: 'dist' },
  init: function() {
    this.src.sass        = this.src.root + '/scss/main.scss'
    this.src.templates   = this.src.root + '/**/*.hbs'
    this.src.javascript  = this.src.root + '/js/**/*.js'
    this.src.images      = this.src.root + '/images/**/*.{jpg,jpeg,svg,png,gif}'
    this.src.files       = this.src.root + '/*.{html,txt}'

    this.dist.css        = this.dist.root + '/css'
    this.dist.images     = this.dist.root + '/images'
    this.dist.javascript = this.dist.root + '/js'

    return this
  },
}.init()

gulp.task('serve', () => {
  browserSync.init({
    server: paths.dist.root,
    open: false,
    notify: false,

    // Whether to listen on external
    online: false,
  })
})

gulp.task('styles', () => {
  gulp.src([paths.src.sass])
    .pipe(sassGlob())
    .on('error', onError)
    .pipe(sass({
      includePaths: ['src/scss'],
    }))
    .on('error', onError)
    .pipe(prefixer('last 2 versions'))
    .on('warning', onWarning)
    .pipe(gulp.dest(paths.dist.css))
    .pipe(browserSync.reload({stream: true}))
})

/*
* Compile handlebars/partials into html
*/
gulp.task('templates', () => {
  var opts = {
    ignorePartials: true,
    batch: ['src/partials'],
  }

  gulp.src([paths.src.root + '/*.hbs'])
    .pipe(handlebars(null, opts))
    .on('error', onError)
    .pipe(rename({
      extname: '.html',
    }))
    .on('error', onError)
    .pipe(gulp.dest(paths.dist.root))
    .pipe(browserSync.reload({stream: true}))
})

/*
* Bundle all javascript files
*/
gulp.task('scripts', () => {
  gulp.src(paths.src.javascript)
    .pipe(babel({
      presets: ['env'],
    }))
    .pipe(concat('bundle.js'))
    .on('error', onError)
    .pipe(uglify())
    .on('error', onError)
    .pipe(gulp.dest(paths.dist.javascript))
    .pipe(browserSync.reload({stream: true}))
})

gulp.task('images', () => {
  gulp.src([paths.src.images])
    .pipe(gulp.dest(paths.dist.images))
})

gulp.task('files', () => {
  gulp.src([paths.src.files])
    .pipe(gulp.dest(paths.dist.root))
})

watch(paths.src.images, () => {
  gulp.start('images')
})

watch(paths.src.files, () => {
  gulp.start('files')
})

gulp.task('watch', () => {
  gulp.watch('src/scss/**/*.scss', ['styles'])
  gulp.watch(paths.src.javascript, ['scripts'])
  gulp.watch(paths.src.templates, ['templates'])
})

gulp.task('deploy', () => {
  return gulp.src([paths.dist.root + '/**/*'])
    .pipe(ghPages())
})

gulp.task('default', ['watch', 'serve', 'images', 'files', 'styles', 'scripts', 'templates'])
