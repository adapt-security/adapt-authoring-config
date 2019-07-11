const async = require('async');
const ConfigUtils = require('./utils');
const fs = require('fs-extra');
const path = require('path');
const { DataValidationError, Utils } = require('adapt-authoring-core');
/**
* Handles the application configuration
*/
class Config {
  constructor(app) {
    this.app = app;
    this.app.config = this;
    this.schemas = [];
    this.__config = {};
    // copy env values to config
    Object.entries(process.env).forEach(([key, val]) => this.__config[`env.${key}`] = val);

    this.initialise();
  }

  initialise() {
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
    const mods = [[this.app.name, { pkg: this.app.pkg }], ...Object.entries(this.app.dependencyloader.modules)];
    const errors = mods.reduce((e,[name,data]) => {
      const e2 = this.processModuleSchema(name, data.pkg);
      e.push(...e2 || []);
      return e;
    }, []);
    if(errors.length) {
      throw new DataValidationError('Invalid config file', errors);
    }
  }

  processModuleSchema(name, pkg) {
    const errors = [];
    const schema = ConfigUtils.loadConfigSchema(pkg.dir);

    if(!schema || !schema.definition) return errors;

    Object.entries(schema.definition).forEach(([attr, config]) => {
      const key = `${name}.${attr}`;
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
