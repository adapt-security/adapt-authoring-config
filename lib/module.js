const async = require('async');
const ConfigUtils = require('./utils');
const fs = require('fs-extra');
const path = require('path');
const { DataValidationError, Module, Utils } = require('adapt-authoring-core');

let instance;
/**
* Handles the application configuration
* @extends {Module}
*/
class Config extends Module {
  /**
  * Returns the singleton instance, or initialises it if there isn't one
  * @return {Config} The instance
  */
  static get instance() {
    if(!instance) {
      instance = new Config();
    }
    return instance;
  }

  constructor(app, pkg) {
    super(app, pkg);

    this.schemas = [];
    this.__config = {};
    // copy env values to config
    Object.entries(process.env).forEach(([key, val]) => this.__config[`env.${key}`] = val);

    app.config = this;

    this.app.moduleloader.on('initialised', this.initialise.bind(this));
  }

  initialise() {
    this.storeUserSettings();
    try {
      this.validate();
    } catch(e) {
      this.log('error', `Validation failed for config file at '/conf/${this.get('env.NODE_ENV')}.json'.`);
      this.log('error', `You must fix the following errors before continuing:`);
      e.errors.forEach(e2 => this.log('error', `- ${e2}`));
      process.exit(1);
    }
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

  validate() {
    const errors = [];

    [this.app, ...Object.values(this.app.moduleloader.modules)].forEach(m => {
      const schema = ConfigUtils.loadConfigSchema(m.pkg.dir);

      if(!schema) {
        return;
      }
      if(!schema.definition) {
        return this.log('warn', `definition attribute must be defined for ${m.name} config schema`);
      }
      Object.entries(schema.definition).forEach(([attr, config]) => {
        const key = `${m.name}.${attr}`;
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
        if(config.required) {
          errors.push(`Missing required value '${key}' (${config.type})`);
        }
      });
    });
    if(errors.length) {
      throw new DataValidationError('Invalid config file', errors);
    }
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
