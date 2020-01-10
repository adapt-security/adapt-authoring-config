const { AbstractModule, Responder, Utils } = require('adapt-authoring-core');
const ConfigUtils = require('./utils');
const path = require('path');
/**
* Module to expose config API
* @extends {AbstractModule}
*/
class ConfigModule extends AbstractModule {
  constructor(app, pkg) {
    super(app, pkg);
    /** @ignore */ this._config = {};
    /**
    * Path to the user configuration file
    * @type {String}
    */
    this.configFilePath = path.join(process.cwd(), 'conf', `${process.env.NODE_ENV}.config.js`);
    /**
    * The keys for all attributes marked as public
    * @type {Array<*>}
    */
    this.publicAttributes = [];

    this.initialise();
  }
  /**
  * Initialises the utility
  * @return {Promise}
  */
  async initialise() {
    // copy env values to config
    Object.entries(process.env).forEach(([key, val]) => this.set(`env.${key}`, val));

    await this.storeUserSettings();
    await this.storeSchemaSettings();

    this.setReady();
    this.initRouter();
  }
  /**
  * Adds routing functionality
  * @return {Promise}
  */
  async initRouter() {
    try {
      const server = await this.app.waitForModule('server');
      server.api.createChildRouter('config').addRoute({
        route: '/',
        handlers: { get: (req, res) => new Responder(res).success(this.getPublicConfig()) }
      });
      // app.auth.secureRoute('/api/config', 'get', ['read:config']);
    } catch(e) {
      return this.log('error', e);
    }
  }
  /**
  * Loads the relevant config file into memory
  * @return {Promise}
  */
  async storeUserSettings() {
    const c = await ConfigUtils.loadConfigFile(this.configFilePath);
    if(!c) {
      return;
    }
    Object.entries(c).forEach(([name, config]) => {
      Object.entries(config).forEach(([key, val]) => {
        this.set(`${name}.${key}`, val);
      });
    });
  }
  /**
  * Processes all module config schema files
  * @return {Promise}
  */
  async storeSchemaSettings() {
    const jsonschema = await this.app.waitForModule('jsonschema');
    const depKeys = Object.values(this.app.dependencies);
    const promises = depKeys.map(d => this.processModuleSchema(d, jsonschema));
    const results = await Promise.allSettled(promises);
    results.forEach(r => {
      if(r.status !== 'rejected') return;
      console.log(r.reason);
    });
  }
  /**
  * Processes and validates a single module config schema (checks the user config specifies any required fields, and that they are the expected type)
  * @param {Object} pkg Package.json data
  * @param {JsonSchemaModule} validator Module instance for validation
  * @return {Promise}
  */
  async processModuleSchema(pkg, validator) {
    if(!pkg.name || !pkg.rootDir) return;

    const schema = await ConfigUtils.loadConfigSchema(pkg.rootDir);

    if(!schema) return;
    // validate user config data
    const data = Object.keys(schema.properties).reduce((m,k) => {
      m[k] = this.get(`${pkg.name}.${k}`);
      return m;
    }, {});
    try {
      await validator.validate(schema, data);
    } catch(e) {
      e.messagePrefix = `Failed to validate user config for ${pkg.name}`;
      e.filename = this.configFilePath;
      throw e;
    }
    // apply validated config settings
    Object.entries(data).forEach(([key,val]) => this.set(`${pkg.name}.${key}`, val));
  }
  /**
  * Determines whether an attribute has a set value
  * @param {String} attr Attribute key name
  * @return {Boolean} Whether the value exists
  */
  has(attr) {
    return this._config.hasOwnProperty(attr);
  }
  /**
  * Returns a value for a given attribute
  * @param {String} attr Attribute key name
  * @return {*} The attribute's value
  */
  get(attr) {
    return this._config[attr];
  }
  /**
  * Stores a value for the passed attribute
  * @param {String} attr Attribute key name
  * @param {*} val Value to set
  */
  set(attr, val) {
    this._config[attr] = val;
  }
  /**
  * Retrieves all config options marked as 'public'
  * @return {Object}
  */
  getPublicConfig() {
    return this.publicAttributes.reduce((m,a) => {
      m[a] = this.get(a);
      return m;
    }, {});
  }
}

module.exports = ConfigModule;
