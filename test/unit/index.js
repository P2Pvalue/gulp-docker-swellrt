var test = require('tap').test,
    gulp\-docker\-swellrt = require(__dirname + '/../../lib/index.js');

gulp\-docker\-swellrt(function (err) {
    test('unit', function (t) {
        t.equal(err, null, 'error object is null');
        t.end();
    });
});