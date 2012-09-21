var should = require('should'),
    $fh = {
      db: require('../lib/db.js')
    };

describe('$fh.db', function() {
    'use strict';
  
  /*----------------------------------------------------------------------------
  CREATE
  ----------------------------------------------------------------------------*/

  describe('Create:', function() {

      it('Saving single object should return the correct response format', function(done) {
          var expectedRes = {
              "fields": {
                  'firstName': 'John',
                  'secondName': 'Doe'
              },
              "type": "testEntity"
          },
              options = {
                  act: 'create',
                  type: 'testEntity',
                  fields: {
                      'firstName': 'John',
                      'secondName': 'Doe'
                  }
              };

          $fh.db(options, function(err, res) {
              res.should.include(expectedRes);
              res.guid.should.have.length(24);
              done();
          });
      });

      it('Saving multiple objects should return the correct response format', function(done) {
          var expectedRes = {
                  Status: 'OK',
                  Count: 2
              },
              options = {
                  act: 'create',
                  type: 'testCollection',
                  fields: [{
                      'firstName': 'John',
                      'secondName': 'Doe'
                  }, {
                      'firstName': 'Bob',
                      'secondName': 'Doe'
                  }]
              };

          $fh.db(options, function(err, res) {
              res.should.eql(expectedRes);
              done();
          });
      });
  });

  /*----------------------------------------------------------------------------
   READ
   ----------------------------------------------------------------------------*/

  describe('Read:', function() {
    var testGuid;

    before(function(done) {
      $fh.db({
        act: 'create',
        type: 'testType',
        fields: {
          'firstName': 'John',
          'secondName': 'Doe'
        }
      }, function(err, res) {
        if (err) throw new Error('The before method failed!');
        testGuid = res.guid;
        done();
      });
    });

    it('should give us back the exact object we\'re looking for', function(done) {
      $fh.db({
        act: 'read',
        type: 'testType',
        guid: testGuid
      }, function(err, res) {
        should.not.exist(err);
        res.should.eql({
          guid: testGuid,
          type: 'testType',
          fields: {
            'firstName': 'John',
            'secondName': 'Doe'
          }
        });
        done();
      });
    });

    it('should return empty response given an invalid GUID', function(done) {
      $fh.db({
        act: 'read',
        type: 'testType',
        guid: 'thisGuidDoesn\'tExist'
      }, function(err, res) {
        res.should.eql({});
        done();
      });
    });
  });

  /*----------------------------------------------------------------------------
   LIST
   ----------------------------------------------------------------------------*/
  
  describe('List:', function() {
    var type = 'testListEntity';

    before(function(done) {

      // Add some entries to the test db.
      $fh.db({
        act: 'create',
        type: type,
        fields: [{
          'firstName': 'John',
          'secondName': 'Doe'
        }, {
          'firstName': 'Bob',
          'secondName': 'Doe'
        }]
      }, function(err, res) {
        if (err) throw new Error('The before method failed!');
        done();
      });
    });

    it('should accept just a type', function(done) {
      $fh.db({
        act: 'list',
        type: type
      }, function(err, res) {
        should.not.exist(err);
        res.count.should.equal(2);
        res.should.have.property('list');
        done();
      });
    });

    it('should return error for invalid or non-existent type.', function(done) {
      $fh.db({
        act: 'list',
        type: 'doesntExist'
      }, function(err, res) {
        err.message.should.equal('Invalid or non-existent type value given, can\'t proceed.');
        done();
      });
    });
  });

  /*----------------------------------------------------------------------------
   UPDATE
   ----------------------------------------------------------------------------*/

  describe('Update:', function() {
    var type, guid, fields;

    before(function(done) {
      $fh.db({
        act: 'create',
        type: 'testUpdateType',
        fields: {
          firstName: 'Bob',
          secondName: 'Doe'
        }
      }, function(err, res) {
        if (err) throw new Error('The before method failed!');
        type = res.type;
        guid = res.guid;
        fields = res.fields;
        done();
      });
    });

    it('should function as a complete replacement (ie delete values not in update)', function(done) {
      var expectedRes = {
        fields: {
          firstName: 'Frank',
          age: 23
        },
        guid: guid,
        type: type
      };

      $fh.db({
        act: 'update',
        type: type,
        guid: guid,
        fields: {
          firstName: 'Frank',
          age: 23
        }
      }, function(err, res) {
        should.not.exist(err);
        res.should.eql(expectedRes);
        done();
      });
    });

    it('should return error when not given guid');
    it('should return error when not given type');
    it('should return error when not given fields');
    it('should return error when given any empty fields object/array (nested with valid data or not)');
  });

    describe('Delete', function() {
        var guid;

        before(function(done) {
            $fh.db({
                act: 'create',
                type: 'deleteTests',
                fields: {
                    name: 'John',
                    age: 27
                }
            }, function(err, data) {
                guid = data.guid;
                done();
            });
        });

        it('should return empty object when given erroneous reference.', function(done) {
            $fh.db({
                act: 'delete',
                type: 'doesntmatter',
                guid: '1800doesntexist'
            }, function(err, data) {
                data.should.eql({});
                done();
            });
        });

        it('should return object on successful deletion.', function(done) {
            $fh.db({
                act: 'delete',
                type: 'deleteTests',
                guid: guid
            }, function(err, data) {
                data.should.eql({
                    type: 'deleteTests',
                    guid: guid,
                    fields: {
                        name: 'John',
                        age: 27
                    }
                });
                done();
            });
        });
    });
});