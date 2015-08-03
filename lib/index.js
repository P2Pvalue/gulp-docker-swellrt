'use strict';

var docker = require('dockerode')();

/**
 * Run Docker SwellRT instances from Gulp
 *
 * @package gulp-docker-swellrt
 * @author P2Pvalue UCM team <p2pv@ucm.es>
 */

var defaultOpts = {
  image: 'p2pvalue/swellrt',
  host:  'swellrt',
  name:  'gulp-swellrt',
  port:  '9898',
  tag:   'latest'
};

var start = function start(options, cb) {
  docker.pull(options.taggedImage, function(err, stream) {
    if (err) { throw err; }

    docker.modem.followProgress(stream, function(err) {
      if (err) { throw err; }

      var containerOpts = {
        Image: options.taggedImage,
        Hostname: options.host,
        name: options.name,
        HostConfig: {
          PortBindings: {
            '9898/tcp': [{
              HostIp:   '0.0.0.0',
              HostPort: options.port
            }]
          }
        }
      };

      docker.createContainer(containerOpts, function(err, container) {
        if (err) { throw err; }

        container.start(function(err, data) {
          if (err) { throw err; }

          console.log(data);
          
          if (cb) { cb(); }
        });
      });
    });
  });
};

var check = function(options, cb) {
  docker.listContainers({ all: true }, function(err, containers) {
    if (err) {
      if (err.code === 'EACCES') {
        console.error('Error: Cannot access docker. You probably need to add your user to the docker group');
        console.error('Error: Try: sudo adduser <your_user> docker and restart your computer');

        throw err;
      }
    }

    for (var i in containers) {
      var c = containers[i];

      if (c.Names[0] === '/' + options.name) {
        if (c.Image === options.taggedImage && /^Up/.test(c.Status)) {
          // Image already running
          if (cb) { cb(); }
        } else {
          // Stop and start image
          docker.getContainer(c.Id).remove({ force: true }, function(err, data) {
            if (err) { throw err; }

            console.log(data);

            start(options, cb);
          });
        }

        // Don't look other containers, we already found the named one
        return;
      }
    }

    // We couldn't found the container
    start(options, cb);
  });
};

var gulpDockerSwellrt = function gulpDockerSwellrt(options, cb) {
  var mergedOpts = {};

  for (var attr in defaultOpts) {
    if (options[attr]) {
      mergedOpts[attr] = options[attr];
    } else {
      mergedOpts[attr] = defaultOpts[attr];
    }
  }

  mergedOpts.taggedImage = mergedOpts.image + ':' + mergedOpts.tag;

  check(mergedOpts, cb);
};

module.exports = gulpDockerSwellrt;
