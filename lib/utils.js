const fs = require('fs-extra');
const path = require('path');
/**
* Utility functions for the config module
*/
class Utils {
  /**
  * Loads a file for a module path
  * @param {String} filepath Path to the file
  * @return {Object}
  */
  static async loadConfigFile(filepath) {
    try {
      return require(filepath);
    } catch(e) {}
  }
  /**
  * Loads a config schema for a module path
  * @param {String} modulePath Path to the module root dir
  * @return {Object}
  */
  static async loadConfigSchema(modulePath) {
    try {
      const f = await fs.readJson(path.join(modulePath, 'conf', 'config.schema.json'));
      return f;
    } catch(e) {}
  }
}

module.exports = Utils;
