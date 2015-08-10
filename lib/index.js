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
  tag:   'latest',
  mongo: {
    taggedImage: 'mongo:latest'
  }
};

function start(options, cb) {
  docker.pull(options.taggedImage, function(err, stream) {
    if (err) { throw err; }
    console.log('Pulling ' + options.taggedImage);

    docker.modem.followProgress(stream, function(err) {
      if (err) { throw err; }

      var containerOpts = {
        Image: options.taggedImage,
        name: options.name,
        HostConfig: {}
      };

      if (options.host) {
        containerOpts.Hostname = options.host;
      }

      if (options.mongo) {
        containerOpts.HostConfig.Links = [
          options.mongo.name + ':mongo'
        ];
        containerOpts.Cmd = '-Dmongodb_host=' + options.mongo.name + ' -Ddelta_store_type=mongodb';
      }
      
      if (options.port) {
        containerOpts.HostConfig.PortBindings = {
          '9898/tcp': [{
            HostIp:   '0.0.0.0',
            HostPort: options.port
          }]
        };
      }

      docker.createContainer(containerOpts, function(err, container) {
        if (err) { throw err; }

        console.log('Creating: ' + containerOpts.name);

        container.start(function(err, data) {
          if (err) { throw err; }

          console.log('Starting ' + containerOpts.name);
          console.log(data);
          
          if (cb) { cb(); }
        });
      });
    });
  });
}

function check(options, cb) {
  docker.listContainers({ all: true }, function(err, containers) {
    if (err) {
      if (err.code === 'EACCES') {
        console.error('Error: Cannot access docker. You probably need to add your user to the docker group');
        console.error('Error: Try: sudo adduser <your_user> docker and restart your computer');

        throw err;
      }
    }

    for (var i in containers) {
      var c = containers[i],
          present = false;

      for (var j in c.Names) {
        if (c.Names[j] === '/' + options.name) {
          present = true;
        }
      }

      if (present) {
        console.log('Container ' + options.name + ' exists');

        if (c.Image === options.taggedImage && /^Up/.test(c.Status)) {
          console.log(options.name + ' already running');

          if (cb) { cb(); }
        } else {
          console.log(options.name + ' is other version');

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
    console.log(options.name + ' does not exist');
    start(options, cb);
  });
}

function gulpDockerSwellrt(options, cb) {
  var mergedOpts = {};

  for (var attr in defaultOpts) {
    if (options[attr]) {
      mergedOpts[attr] = options[attr];
    } else {
      mergedOpts[attr] = defaultOpts[attr];
    }
  }

  if (options.mongo) {
    for (var attrm in defaultOpts.mongo) {
      if (options.mongo[attrm]) {
        mergedOpts.mongo[attrm] = options.mongo[attrm];
      } else {
        mergedOpts.mongo[attrm] = defaultOpts.mongo[attrm];
      }
    }
  }

  mergedOpts.taggedImage = mergedOpts.image + ':' + mergedOpts.tag;

  if (!mergedOpts.mongo.name) {
    mergedOpts.mongo.name = mergedOpts.name + '-mongo';
  }

  check(mergedOpts.mongo, function() {
    check(mergedOpts, cb);
  });
}

module.exports = gulpDockerSwellrt;
