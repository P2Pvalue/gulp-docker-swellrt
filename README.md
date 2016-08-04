## gulp-docker-swellrt
#### Run Docker SwellRT instance from Gulp

### Installation
```bash
npm install gulp-docker-swellrt
```

### Gulpfile

```
var dockerSwellrt  = require('gulp-docker-swellrt');

var options = {
  tag: '0.2.0-alpha',
  name: 'myproject-swellrt'
}

gulp.task('docker:swellrt', function(done) {
  dockerSwellrt(options, done);
});

```

### Options
* `image` - Docker SwellRT to run. Defaults to `p2pvalue/swellrt`
* `tag`   - Tag for image. Defaults to `latest`
* `host`  - Hostname for SwellRT image. Defaults to `swellrt`
* `name`  - Name of the running container. Use this to run different instances. Defaults to `gulp-swellrt`
* `port`  - Port for the mapping of SwellRT listenig port. Default to `9898` 
* `links`  - Object with images that will be run and linked to swellrt container. Defaults to [a mongo db instance](https://github.com/P2Pvalue/gulp-docker-swellrt/blob/master/lib/index.js#L19)
