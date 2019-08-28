const assert = require('assert');
const path = require('path');
const utils = require('../lib/utils');

describe('Config utils', function() {
  describe('#loadFile()', function() {
    it('should be able to load a valid file', function() {
      const filepath = path.join(__dirname, 'data', 'testfile.json');
      const contents = utils.loadFile(filepath);
      assert.deepEqual(contents, require(filepath));
    });
    it('should not error on a missing file', function() {
      const filepath = path.join('this', 'path', 'does', 'not', 'exist.xyz');
      const contents = utils.loadFile(filepath);
      assert.equal(contents, undefined);
    });
  });
  describe('#loadConfigSchema()', function() {
    it('should be able to load a valid schema file', function() {
      const dir = path.join(__dirname, 'data');
      const contents = utils.loadConfigSchema(dir);
      assert.deepEqual(contents, require(path.join(dir, 'conf', 'config.schema.js')));
    });
    it('should not error on a missing schema file', function() {
      const contents = utils.loadConfigSchema(path.join(__dirname, 'doesntexist'));
      assert.equal(contents, undefined);
    });
  });
});
