/* eslint no-console: 0 */
import { AbstractModule } from 'adapt-authoring-core';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
/**
 * Module to expose config API
 * @extends {AbstractModule}
 */
class ConfigModule extends AbstractModule {
  /** @override */
  constructor(app, pkg) {
    super(app, pkg, { autoInit: false });
    this.app.config = this;
    /** @ignore */ this._config = {};
    /**
     * Path to the user configuration file
     * @type {String}
     */
    this.configFilePath = path.join(this.app.rootDir, 'conf', `${process.env.NODE_ENV}.config.js`);
    /**
     * The keys for all attributes marked as public
     * @type {Array<String>}
     */
    this.publicAttributes = [];
    this.init();
  }
  /** @override */
  async init() {
    try {
      await this.storeEnvSettings();
      await this.storeUserSettings();
      await this.storeSchemaSettings();

      this.log('info', `using config at ${this.configFilePath}`);

      this.setReady();
      this.initRouter();

    } catch(e) {
      console.log(`\n${chalk.red(`Config failed to initialise for environment '${process.env.NODE_ENV}'. See above for details.`)}\n`);
    }
  }
  /**
   * Adds routing functionality
   * @return {Promise}
   */
  async initRouter() {
    const [auth, server] = await this.app.waitForModule('auth', 'server');
    const router = server.api.createChildRouter('config');
    router.addRoute({
      route: '/',
      handlers: { get: (req, res) => res.json(this.getPublicConfig()) }
    });
    auth.unsecureRoute(router.path, 'get');
  }
  /**
   * Copy env values to config
   * @return {Promise}
   */
  async storeEnvSettings() {
    Object.entries(process.env).forEach(([key, val]) => {
      this.set(this.envVarToConfigKey(key), val);
    });
  }
  /**
   * Parses an environment variable key into a format expected by this module
   * @param {String} envVar
   * @return {String} The formatted key
   */
  envVarToConfigKey(envVar) {
    if(envVar.startsWith('ADAPT_AUTHORING_')) {
      const [modPrefix,key] = envVar.split('__');
      return `${modPrefix.replace(/_/g, '-').toLowerCase()}.${key}`;
    }
    return `env.${envVar}`;
  }
  /**
   * Loads the relevant config file into memory
   * @return {Promise}
   */
  async storeUserSettings() {
    let c;
    try {
      c = (await import(pathToFileURL(this.configFilePath))).default;
    } catch(e) {
      if(e.code !== 'ENOENT' && e.code !== 'ERR_MODULE_NOT_FOUND') {
        console.trace(e);
        throw e;
      }
    }
    if(!c) {
      console.log(chalk.yellow(`No config file found at '${this.configFilePath}', attempting to run with defaults\n`));
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
    let hasErrored = false;
    (await Promise.allSettled(promises)).forEach(r => {
      if(r.status === 'rejected') {
        hasErrored = true;
        if(r.reason?.data?.errors) {
          console.log(`${r.reason.modName}: ${r.reason.data.errors}`);
        } else {
          console.log(r.reason);
        }
      }
    });
    if(hasErrored) throw new Error();
  }
  /**
   * Processes and validates a single module config schema (checks the user config specifies any required fields, and that they are the expected type)
   * @param {Object} pkg Package.json data
   * @param {JsonSchemaModule} validator Module instance for validation
   * @return {Promise}
   */
  async processModuleSchema(pkg, validator) {
    if(!pkg.name || !pkg.rootDir) return;

    const schemaPath = path.resolve(pkg.rootDir, 'conf/config.schema.json');
    let schema;
    try {
      schema = JSON.parse(await fs.readFile(schemaPath));
    } catch(e) {
      if(e.name === 'SyntaxError')
        throw this.app.errors.FILE_SYNTAX_ERROR
          .setData({ filepath: schemaPath, message: e.message });
      if(e.code !== 'ENOENT' && e.code !== 'ERR_MODULE_NOT_FOUND')
        throw e;
    }
    if(!schema) return;
    // validate user config data
    let data = Object.entries(schema.properties).reduce((m,[k,v]) => {
      m[k] = this.get(`${pkg.name}.${k}`);
      if(v?._adapt?.isPublic) this.publicAttributes.push(`${pkg.name}.${k}`);
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

export default ConfigModule;