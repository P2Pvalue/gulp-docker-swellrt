'use strict';

var docker = require('dockerode')(),
    gutil  = require('gulp-util');

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
  links: {
    mongo: {
      taggedImage: 'mongo:latest',
      cmd: '--smallfiles'
    }
  }
};

function start(options, cb) {
  docker.pull(options.taggedImage, function(err, stream) {
    if (err) { throw err; }
    gutil.log(gutil.colors.yellow('Pulling ' + options.taggedImage));

    docker.modem.followProgress(stream, function(err) {
      if (err) { throw err; }

      var containerOpts = {
        Image: options.taggedImage,
        name: options.name,
        HostConfig: {},
        Cmd: ''
      };

      if (options.cmd) {
        containerOpts.Cmd += options.cmd;
      }

      if (options.host) {
        containerOpts.Hostname = options.host;
      }

      if (options.links) {
        let links = [];

        for (var l in options.links) {
          links.push(options.links[l].name + ':' + l);
        }

        containerOpts.HostConfig.Links = links;
      }

      if (options.links && options.links.mongo) {
        containerOpts.Cmd += '-Dcore.mongodb_host=' + options.links.mongo.name;
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

        gutil.log(gutil.colors.yellow('Creating: ' + containerOpts.name));

        container.start(function(err, data) {
          if (err) { throw err; }

          gutil.log(gutil.colors.green('Starting ' + containerOpts.name));
          gutil.log(gutil.colors.green(data));
          
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
        gutil.log(gutil.colors.red('Error: Cannot access docker. You probably need to add your user to the docker group'));
        gutil.log(gutil.colors.red('Error: Try: sudo adduser <your_user> docker and restart your computer'));

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
        gutil.log(gutil.colors.yellow('Container ' + options.name + ' exists'));

        if (c.Image === options.taggedImage) {
          if (/^Up/.test(c.Status)) {
            gutil.log(gutil.colors.green(options.name + ' already running'));

            if (cb) { cb(); }
          } else {
            gutil.log(gutil.colors.yellow('Container ' + options.name + ' is stopped'));

            docker.getContainer(c.Id).start(function(err, data) {
              if (err) { throw err; }

              gutil.log(gutil.colors.green('Starting ' + options.name));
              gutil.log(gutil.colors.green(data));
              
              if (cb) { cb(); }
            });
          }
        } else {
          gutil.log(gutil.colors.yellow(options.name + ' has other version'));

          // Stop and start image
          docker.getContainer(c.Id).remove({ force: true }, function(err, data) {
            if (err) { throw err; }

            gutil.log(gutil.colors.yellow(data));

            start(options, cb);
          });
        }

        // Don't look other containers, we already found the named one
        return;
      }
    }

    // We couldn't found the container
    gutil.log(gutil.colors.yellow(options.name + ' does not exist'));
    start(options, cb);
  });
}

/*
* Recursively collate properties of two objects 
* http://jsfiddle.net/jlowery2663/z8at6knn/4/
*/
function mergeObjects(obj1, obj2) {

  // Clone object
  var result = JSON.parse(JSON.stringify(obj1));

  for (var p in obj2) {

    if ( obj2[p].constructor === Object ) {

      if (result[p]) {

	result[p] = mergeObjects(result[p], obj2[p]);

	continue;
      }
    } 

    result[p] = obj2[p];
  }

  return result;
}



function gulpDockerSwellrt(options, cb) {

  var mergedOpts = mergeObjects(defaultOpts, options),
      linkPromises = [];

  mergedOpts.taggedImage = mergedOpts.image + ':' + mergedOpts.tag;

  for (var name in mergedOpts.links) {
    let linkOpts = mergedOpts.links[name],
        linkPromise = new Promise((resolve) => {

      if (! linkOpts.name) {
        linkOpts.name = mergedOpts.name + '-' + name;
      }

      check(linkOpts, () => { resolve(); });
    });

    linkPromises.push(linkPromise);
  }


  Promise.all(linkPromises).then(() => {
    check(mergedOpts, cb);
  });

}

module.exports = gulpDockerSwellrt;
