const Config = require('../lib/utility');
const path = require('path');
const should = require('should');

describe('Config utility', function() {
  before(function() {
    this.config = new Config(global.ADAPT.app, {});
    this.configJson = require(path.join(process.cwd(), 'conf', 'testing.config.js'));
  });
  describe('#initialise()', function() {
    it('should error on missing required attribute', runConfigInitialise('required'));
    it('should error on incorrect attribute type', runConfigInitialise('incorrecttype'));
    it('should error on validator fail', runConfigInitialise('invalid'));
  });
  describe('#has()', function() {
    it('should be able to verify a value exists', function() {
      const exists = this.config.has('adapt-authoring-testing.test');
      exists.should.be.true;
    });
    it('should be able to verify a value doesn\'t exist', function() {
      const exists = this.config.has('adapt-authoring-testing.nonono');
      exists.should.not.be.true;
    });
  });
  describe('#get()', function() {
    it('should be able to retrieve a value', function() {
      const actualValue = this.config.get('adapt-authoring-testing.test');
      const expectedValue = this.configJson['adapt-authoring-testing'].test;
      actualValue.should.equal(expectedValue);
    });
  });
  describe('#set()', function() {
    it('should be able to set a value', function() {
      const newValue = 'newtestvalue';
      this.config.set('adapt-authoring-testing.test', newValue);
      const actualValue = this.config.get('adapt-authoring-testing.test');
      actualValue.should.equal(newValue);
    });
  });
  describe('#getPublicConfig()', function() {
    it('should be able to retrieve values marked as public', function() {
      this.config.app.dependencies = [{ name: 'adapt-authoring-testing', dir: path.join(__dirname, 'data') }];
      this.config.initialise();
      const config = this.config.getPublicConfig();
      const value = config['adapt-authoring-testing.one'];
      config.should.be.an.Object();
      value.should.equal('default');
    });
  });
});

function runConfigInitialise(dirname) {
  return function() {
    const l = this.config.errors.length;
    this.config.app.dependencies = [{ name: 'adapt-authoring-testing', dir: path.join(__dirname, 'data', dirname) }];
    this.config.initialise();
    const errorCount = this.config.errors.length;
    errorCount.should.be.exactly(l+1);
  }
}
