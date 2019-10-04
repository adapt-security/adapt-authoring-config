const path = require('path');
const utils = require('../lib/utils');
const should = require('should');

describe('Config utils', function() {
  describe('#loadFile()', function() {
    it('should be able to load a valid file', function() {
      const filepath = path.join(__dirname, 'data', 'testfile.json');
      const actualContents = utils.loadFile(filepath);
      const expectedContents = require(filepath);
      actualContents.should.deepEqual(expectedContents);
    });
    it('should not error on a missing file', function() {
      should.doesNotThrow(function() {
        const contents = utils.loadFile(path.join('this', 'path', 'does', 'not', 'exist.xyz'));
        should(contents).equal(undefined);
      });
    });
  });
  describe('#loadConfigSchema()', function() {
    it('should be able to load a valid schema file', function() {
      const dir = path.join(__dirname, 'data');
      const actualContents = utils.loadConfigSchema(dir);
      const expectedContents = require(path.join(dir, 'conf', 'config.schema.js'));
      actualContents.should.deepEqual(expectedContents);
    });
    it('should not error on a missing schema file', function() {
      should.doesNotThrow(function() {
        const contents = utils.loadConfigSchema(path.join(__dirname, 'doesntexist'));
        should(contents).equal(undefined);
      });
    });
  });
});
