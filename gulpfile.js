'use strict';

const http         = require('http');
const gulp         = require('gulp');
const babel        = require('gulp-babel');
const gulpif       = require('gulp-if');
const imagemin     = require('gulp-imagemin');
const minifyCss    = require('gulp-minify-css');
const postcss      = require('gulp-postcss');
const sass         = require('gulp-sass');
const sourcemaps   = require('gulp-sourcemaps');
const swig         = require('gulp-swig');
const uglify       = require('gulp-uglify');
const autoprefixer = require('autoprefixer');
const del          = require('del').sync;
const highlight    = require('highlight.js').highlight;
const marked       = require('marked');

const VERSION = 'master';

gulp.task('default', ['clean', 'html', 'sass', 'img', 'js']);

gulp.task('clean', function() {
    del(__dirname + '/*.html');
    del(__dirname + '/static');
});

gulp.task('html', ['clean'], function(done) {

    const readmeUrl = 'http://rawgit.com/arguseyes/argus-eyes/' + VERSION + '/readme.md';

    getRequest(readmeUrl, markdown => {
        const readme = getReadmeSections(markdown);
        gulp.src(__dirname + '/src/pages/**/!(_)*.html')
            .pipe(swig({
                defaults: { cache: false },
                data: {
                    readme,
                    headers: getSectionHeaders(readme),
                    markdown: createMarkdownRenderer()
                }}))
            .pipe(gulp.dest(__dirname + '/'))
            .on('end', done);
    });
});

gulp.task('sass', ['clean'], function() {
    return gulp.src(__dirname + '/src/static/scss/**/!(_)*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(postcss([autoprefixer({ browsers: ['last 1 version', '> 5%'] })]))
        .pipe(minifyCss())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(__dirname + '/static/css'));
});

gulp.task('img', ['clean'], function() {
    return gulp.src(__dirname + '/src/static/img/**/*.{svg,png,jpg,ico,webp,json}')
        .pipe(imagemin())
        .pipe(gulp.dest(__dirname + '/static/img'));
});

gulp.task('js', ['clean'], function() {
    return gulp.src([__dirname + '/src/static/js/**/*.js', './src/components/**/*.js'])
        .pipe(sourcemaps.init())
        .pipe(gulpif(file => !/vendor/.test(file.path), babel()))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(__dirname + '/static/js'));
});

function getRequest(url, cb) {
    http.get(url, res => {
        let body = '';
        res.on('data', data => body += data);
        res.on('end', () => cb(body));
    });
}

function getReadmeSections(markdown) {
    const parts = markdown.match(/<!-- start -->(?:(?!<!-- end -->)[\s\S])*<!-- end -->/g);
    return {
        overview: parts[0],
        introduction: parts[1],
        guide: parts[2],
        reference: parts[3]
    };
}

function getSectionHeaders(readme) {

    const getParts = str => getAllMatchesAndCaptureGroups(/(#{1,6}) (.+)/g, str);
    const getHeader = part => ({
        lvl: part[1].length,
        title: part[2],
        slug: githubSlug(part[2])
    });

    return {
        guide: getParts(readme.guide).map(getHeader),
        reference: getParts(readme.reference).map(getHeader)
    };
}

function createMarkdownRenderer() {

    var renderer = new marked.Renderer();
    marked.setOptions({
        highlight: (code, lang) => highlight(lang, code).value
    });

    return function(markdown) {
        return marked(markdown, { renderer: renderer });
    };
}

function getAllMatchesAndCaptureGroups(re, str) {
    var results = [], result;
    while ((result = re.exec(str)) !== null) {
        results.push(Array.from(result));
    }
    return results;
}

function githubSlug(str) {
    return str.toLowerCase()
        .replace(/[^\w-]+/g, '-')
        .replace(/-+/g, '-');
}
