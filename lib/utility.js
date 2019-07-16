const async = require('async');
const ConfigUtils = require('./utils');
const fs = require('fs-extra');
const path = require('path');
const { DataValidationError, Utils } = require('adapt-authoring-core');
/**
* Handles the application configuration
*/
class Config {
  constructor(app, pkg) {
    this.app = app;
    this.app.config = this;
    this.pkg = pkg;
    this.publicAttributes = [];
  }

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
  * @throws {DataValidationError}
  */
  storeSchemaSettings() {
    const mods = Object.values(this.app.dependencyloader.modules);
    const utils = Object.values(this.app.dependencyloader.utilities);
    const errors = [];

    [this.app, ...utils, ...mods].forEach(d => errors.push(...this.processModuleSchema(d.pkg)));

    if(errors.length) {
      throw new DataValidationError('Errors in config file', errors);
    }
  }

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
          errors.push(`'${key}' should be ${config.type} (got ${typeof val})`);
          return;
        }
        if(!isValid) {
          errors.push(`Config value '${key}' failed validation (${val})`);
          return;
        }
      }
      if(config.hasOwnProperty('default')) {
        this.set(key, config.default);
        return;
      }
      if(config.required) errors.push(`Missing required value '${key}' (${config.type})`);
    });
    return errors;
  }

  getPublicConfig() {
    return this.publicAttributes.reduce((m,a) => {
      m[a] = this.get(a);
      return m;
    }, {});
  }
}

module.exports = Config;
