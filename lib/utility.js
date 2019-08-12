const async = require('async');
const ConfigUtils = require('./utils');
const fs = require('fs-extra');
const path = require('path');
const { AbstractUtility, DataValidationError, Utils } = require('adapt-authoring-core');
/**
* Handles the application configuration
*/
class ConfigUtility extends AbstractUtility {
  /**
  * @constructor
  * @param {App} app Main App instance
  * @param {Object} pkg Package.json data
  */
  constructor(app, pkg) {
    super(app, pkg);
    /**
    * @type {Array<>}
    */
    this.publicAttributes = [];

    this.initialise();
  }
  /**
  * Initialises the utility
  */
  initialise() {
    const config = {};

    this.has = (attr) => config.hasOwnProperty(attr);
    this.get = (attr) => config[attr];
    this.set = (attr, val) => config[attr] = val;
    // copy env values to config
    Object.entries(process.env).forEach(([key, val]) => this.set(`env.${key}`, val));

    this.storeUserSettings();
    this.storeSchemaSettings();
  }
  /**
  * Loads the relevant config file into memory
  */
  storeUserSettings() {
    const c = ConfigUtils.loadFile(path.join(process.cwd(), 'conf', `${this.get('env.NODE_ENV')}.config.js`));
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
  * @throws {DataValidationError}
  */
  storeSchemaSettings() {
    Object.values(this.app.dependencies).forEach(d => this.processModuleSchema(d));
  }
  /**
  * Processes and validates a single module config schema (checks user config
  * specifies any required fields, and that they are the expected type)
  * @param {Object} pkg Package.json data
  */
  processModuleSchema(pkg) {
    if(!pkg.name || !pkg.dir) {
      return [];
    }
    const schema = ConfigUtils.loadConfigSchema(pkg.dir);

    if(!schema || !schema.definition) return;

    Object.entries(schema.definition).forEach(([attr, config]) => {
      const key = `${pkg.name}.${attr}`;
      const val = this.get(key);

      if(config.public) {
        this.publicAttributes.push(key);
      }
      if(val !== undefined) {
        const validTypeFunc = Utils[`is${Utils.capitalise(config.type)}`];
        const isCorrectType = (typeof validTypeFunc === 'function') && validTypeFunc(val);
        const isValid = !config.hasOwnProperty('validator') || config.validator(val, this.app.config);

        if(isCorrectType && isValid) {
          return;
        }
        if(!isCorrectType) {
          this.handleError('error.incorrectconfigtype', { attr: key, expectedType: config.type, actualType: typeof val });
          return;
        }
        if(!isValid) {
          this.handleError('error.configvalidation', { attr: key, val: val });
          return;
        }
      }
      if(config.hasOwnProperty('default')) {
        this.set(key, config.default);
        return;
      }
      if(config.required) {
        this.handleError('error.missingconfigval', { attr: key, type: config.type });
      }
    });
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

module.exports = ConfigUtility;
