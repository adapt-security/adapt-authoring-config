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
  static loadFile(filepath) {
    try {
      return require(filepath);
    } catch(e) {}
  }
  /**
  * Loads a config schema for a module path
  * @param {String} modulePath Path to the module root dir
  * @return {Object}
  */
  static loadConfigSchema(modulePath) {
    return this.loadFile(path.join(modulePath, 'conf', 'config.schema.js'));
  }
}


module.exports = Utils;
