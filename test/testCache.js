var should = require('should'),
    $fh = { cache: require('../lib/cache') };

describe('$fh.cache', function () {

  // Only one test for save; it will literally never return an error.
  describe('save', function () {

    it('should return null for err and "OK" for res on successful save', function (done) {
      $fh.cache({
        act: 'save',
        key: 'test1',
        value: 'Test value 1'
      }, function (err, res) {
        should.not.exist(err);
        res.should.equal('OK');
        done();
      });
    });
  });

  describe('load', function () {

    it('should never return an error; only null when item doesn\'t exist', function (done) {
      $fh.cache({
        act: 'load',
        key: 'test2'
      }, function (err, res) {
        should.not.exist(err);
        should.not.exist(res);
        done();
      });
    });

    it('should always get toString() value as response; that\'s what was saved', function (done) {
      $fh.cache({
        act: 'save',
        key: 'test3',
        value: {
          name: 'Bob',
          toString: function () {
            return 'HELLO ' + this.name.toUpperCase() + '!';
          }
        }
      }, function (err, res) {
        should.not.exist(err);
        res.should.equal('OK');

        $fh.cache({
          act: 'load',
          key: 'test3'
        }, function (err, res) {
          should.not.exist(err);
          res.should.equal('HELLO BOB!');
          done();
        });
      });
    });
  });

  describe('remove', function () {

    it('should return no error, just a 0 for res when key doesn\'t exist', function (done) {

      $fh.cache({
        act: 'remove',
        key: 'test4'
      }, function (err, res) {
        should.not.exist(err);
        res.should.equal(0);
        done();
      });
    });
  });
});