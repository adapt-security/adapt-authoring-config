const assert = require('assert');
const Config = require('../lib/utility');
const path = require('path');
/*
TODO:
- Check module config loaded
- Check config.schema validation: type & validator
*/
describe('Config utility', function() {
  before(function() {
    this.config = new Config({ dependencies: [], lang: { t: k => k } }, {});
    this.configJson = require(path.join(process.cwd(), 'conf', 'testing.config.js'));
  });
  describe('#initialise()', function() {
    it('should error on missing required attribute', runConfigInitialise('required'));
    it('should error on incorrect attribute type', runConfigInitialise('incorrecttype'));
    it('should error on validator fail', runConfigInitialise('invalid'));
  });
  describe('#has()', function() {
    it('should be able to verify a value exists', function() {
      assert(this.config.has('adapt-authoring-testing.test'));
    });
    it('should be able to verify a value doesn\'t exist', function() {
      assert(!this.config.has('adapt-authoring-testing.nonono'));
    });
  });
  describe('#get()', function() {
    it('should be able to retrieve a value', function() {
      assert.equal(
        this.config.get('adapt-authoring-testing.test'),
        this.configJson['adapt-authoring-testing'].test
      );
    });
  });
  describe('#set()', function() {
    it('should be able to set a value', function() {
      const newValue = 'newtestvalue';
      this.config.set('adapt-authoring-testing.test', newValue);
      assert.equal(this.config.get('adapt-authoring-testing.test'), newValue);
    });
  });
  describe('#getPublicConfig()', function() {
    it('should be able to retrieve values marked as public', function() {
      this.config.app.dependencies = [{ name: 'adapt-authoring-testing', dir: path.join(__dirname, 'data') }];
      this.config.initialise();
      const c = this.config.getPublicConfig();
      assert(typeof c === 'object' && c['adapt-authoring-testing.one'] === 'default');
    });
  });
});

function runConfigInitialise(dirname) {
  return function() {
    const l = this.config.errors.length;
    this.config.app.dependencies = [{ name: 'adapt-authoring-testing', dir: path.join(__dirname, 'data', dirname) }];
    this.config.initialise();
    assert(this.config.errors.length === l+1);
  }
}
