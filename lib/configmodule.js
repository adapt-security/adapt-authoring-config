const { AbstractModule, Responder, Utils } = require('adapt-authoring-core');
const ConfigUtils = require('./configUtils');
const path = require('path');
/**
* Module to expose config API
* @extends {AbstractModule}
*/
class ConfigModule extends AbstractModule {
  /** @override */
  constructor(app, pkg) {
    super(app, pkg);
    this.app.config = this;
    /** @ignore */ this._config = {};
    /**
    * Path to the user configuration file
    * @type {String}
    */
    this.configFilePath = path.join(process.cwd(), 'conf', `${process.env.NODE_ENV}.config.js`);
    /**
    * The keys for all attributes marked as public
    * @type {Array<String>}
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

    try {
      await this.storeUserSettings();
      await this.storeSchemaSettings();

      this.setReady();
      this.initRouter();

    } catch(e) {
      console.log(e);
    }
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
    const promises = Object.values(this.app.dependencies).map(d => this.processModuleSchema(d, jsonschema));
    const errors = [];
    (await Promise.allSettled(promises)).forEach(r => {
      if(r.status === 'rejected') {
        errors.push(`${r.reason.errors.map(e => ` - ${r.reason.modName} ${e}\n`).join('')}`);
      }
    });
    if(errors.length) {
      throw new Error(`Failed to validate ${this.configFilePath}:\n${errors.join('')}`);
    }
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
    let data = Object.keys(schema.properties).reduce((m,k) => {
      m[k] = this.get(`${pkg.name}.${k}`);
      return m;
    }, {});
    try {
      data = await validator.validate(schema, data);
    } catch(e) {
      e.modName = pkg.name;
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
