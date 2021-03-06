'use strict';

var through = require('through2');
var PluginError = require('gulp-util').PluginError;
var objectAssign = require('object-assign');
var esperanto = require('esperanto');
var path = require('path');
var applySourceMap = require('vinyl-sourcemaps-apply');

var formatToFunc = {
  amd: 'toAmd',
  cjs: 'toCjs'
};

function compile (file, opts) {
  if(opts.modulePrefix) {
    var name;
    if (opts.moduleRoot) {
      name = path.relative(opts.moduleRoot, file.path).slice(0, -path.extname(file.path).length);
    } else {
      name = file.relative;
    }
    name = name.split(path.sep).join('/');
    var prefix = opts.modulePrefix.indexOf('/') > -1 ? opts.modulePrefix : opts.modulePrefix + '/';
    opts.amdName = prefix + name;
  }

  var source = file.contents.toString();
  // https://github.com/esperantojs/esperanto/wiki/Sourcemaps
  var options = objectAssign({
    sourceMap: !!file.sourceMap,
    sourceMapSource: file.relative,
    sourceMapFile: file.relative
  }, opts);

  var res = esperanto[formatToFunc[opts.type || 'amd']](source, options);

  if (file.sourceMap && res.map) {
    applySourceMap(file, res.map);
  }

  return new Buffer(res.code);
}

module.exports = function (options) {
  options = options || {};

  function EsperantoRocks (file, enc, cb) {
    if (file.isNull()) {
      cb(null, file);  // return an empty file
      return;
    }

    // Do not do streams by gulp design
    if (file.isStream()) {
      cb(new PluginError('gulp-esperanto-rocks', 'Streaming not supported', {fileName: file.path}));
      return;
    }

    // `file.contents` type should always be the same going out as it was when it came in
    try {
      file.contents = compile(file, options);
      this.push(file);
    } catch (err) {
      this.emit('error', new PluginError('gulp-esperanto-rocks', err, {fileName: file.path}));
    }

    cb();
  }

  return through.obj(EsperantoRocks);
};
