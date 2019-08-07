const async = require('async');
const ConfigUtils = require('./utils');
const fs = require('fs-extra');
const path = require('path');
const { DataValidationError, Utils } = require('adapt-authoring-core');
/**
* Handles the application configuration
*/
class ConfigUtility {
  constructor(app, pkg) {
    this.app = app;
    this.app.config = this;
    this.pkg = pkg;
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
    const errors = [];
    const pkgs = Object.values(this.app.dependencies);

    [...pkgs].forEach(d => errors.push(...this.processModuleSchema(d)));

    if(errors.length) {
      throw new DataValidationError(this.app.lang.t('error.configfile'), errors);
    }
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
    const errors = [];
    const schema = ConfigUtils.loadConfigSchema(pkg.dir);

    if(!schema || !schema.definition) return errors;

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
          errors.push(this.app.lang.t('error.incorrectconfigtype', { attr: key, expectedType: config.type, actualType: typeof val }));
          return;
        }
        if(!isValid) {
          errors.push(this.app.lang.t('error.configvalidation', { attr: key, val: val }));
          return;
        }
      }
      if(config.hasOwnProperty('default')) {
        this.set(key, config.default);
        return;
      }
      if(config.required) errors.push(this.app.lang.t('error.missingconfigval', { attr: key, type: config.type }));
    });
    return errors;
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
