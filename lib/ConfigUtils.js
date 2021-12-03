import fs from 'fs/promises';
import path from 'path';
/**
 * Utility functions for the config module
 */
export default class ConfigUtils {
  /**
   * Loads a file for a module path
   * @param {String} filepath Path to the file
   * @return {Promise} Resolves with the file contents
   */
  static async loadConfigFile(filepath) {
    try {
      return import(filepath);
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
    try {
      return JSON.parse(await fs.readFile(path.resolve(modulePath, 'conf/config.schema.json')));
    } catch(e) {
      if(e.code !== 'ENOENT' && e.code !== 'MODULE_NOT_FOUND') throw e;
    }
  }
}