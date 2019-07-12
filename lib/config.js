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
    this.__config = {};
  }
  initialise() {
    // copy env values to config
    Object.entries(process.env).forEach(([key, val]) => this.__config[`env.${key}`] = val);

    this.storeUserSettings();
    this.storeSchemaSettings();
  }

  storeUserSettings() {
    const c = ConfigUtils.loadFile(path.join(process.cwd(), 'conf', `${this.get('env.NODE_ENV')}.json`));
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
    const errors = [];
    [this.app, ...this.app.dependencyloader.instances].forEach(d => {
      errors.push(...this.processModuleSchema(d.pkg) || []);
    });
    if(errors.length) {
      throw new DataValidationError('Errors in config file', errors);
    }
  }

  processModuleSchema(pkg) {
    if(!pkg.name || !pkg.dir) {
      return;
    }
    const errors = [];
    const schema = ConfigUtils.loadConfigSchema(pkg.dir);

    if(!schema || !schema.definition) return errors;

    Object.entries(schema.definition).forEach(([attr, config]) => {
      const key = `${pkg.name}.${attr}`;
      const val = this.get(key);

      if(val !== undefined) {
        if(typeof Utils[`is${config.type}`] === 'function' && !Utils[`is${config.type}`](val)) {
          errors.push(`'${key}' should be ${config.type} (got ${typeof val})`);
        }
        return;
      }
      if(config.hasOwnProperty('default')) {
        this.set(key, config.default);
        return;
      }
      if(config.required) errors.push(`Missing required value '${key}' (${config.type})`);
    });
    return errors;
  }

  has(attr) {
    return this.__config.hasOwnProperty(attr);
  }

  get(attr) {
    return this.__config[attr];
  }

  set(attr, val) {
    this.__config[attr] = val;
  }
}

module.exports = Config;
