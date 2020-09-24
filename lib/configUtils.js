const path = require('path');
/**
 * Utility functions for the config module
 */
class ConfigUtils {
  /**
   * Loads a file for a module path
   * @param {String} filepath Path to the file
   * @return {Promise} Resolves with the file contents
   */
  static async loadConfigFile(filepath) {
    try { // note we can't use filestore here due to need of require
      return require(filepath);
    } catch(e) {
      if(e.code !== 'ENOENT' && e.code !== 'MODULE_NOT_FOUND') throw e;
    }
  }
  /**
   * Loads a config schema for a module path
   * @param {String} modulePath Path to the module root dir
   * @return {Promise} Resolves with the schema contents
   */
  static async loadConfigSchema(modulePath) {
    return this.loadConfigFile(path.join(modulePath, 'conf', 'config.schema.json'));
  }
}

module.exports = ConfigUtils;
