/* eslint no-console: 0 */
import { AbstractModule } from 'adapt-authoring-core'
import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'
/**
 * Module to expose config API
 * @memberof config
 * @extends {AbstractModule}
 */
class ConfigModule extends AbstractModule {
  /** @override */
  async init () {
    // set references to module on main App instance
    this.app.config = this

    /** @ignore */
    this._config = {}
    /**
     * Path to the user configuration file
     * @type {String}
     */
    this.configFilePath = path.join(this.app.rootDir, 'conf', `${process.env.NODE_ENV}.config.js`)
    /**
     * The keys for all attributes which can be modified during runtime
     * @type {Array<String>}
     */
    this.mutableAttributes = []
    /**
     * The keys for all attributes marked as public
     * @type {Array<String>}
     */
    this.publicAttributes = []

    try {
      // need to wait for errors to ensure correct logging
      await this.app.waitForModule('errors')

      await this.storeUserSettings()
      await this.storeEnvSettings()
      await this.storeSchemaSettings()

      this.log('info', `using config at ${this.configFilePath}`)
    } catch (e) {
      console.log(e)
      console.log(`\n${chalk.red(`Config failed to initialise for environment '${process.env.NODE_ENV}'. See above for details.`)}\n`)
      throw this.app.errors.LOAD_ERROR
    }
    /*
    * Note: we wait until after the ready signal before initialising router because ConfigModule needs to be
    * available straight away (and not wait for server etc.)
    */
    this.onReady().then(() => this.initRouter())
  }

  /**
   * Adds routing functionality
   * @return {Promise}
   */
  async initRouter () {
    const [auth, server] = await this.app.waitForModule('auth', 'server')
    const router = server.api.createChildRouter('config')
    router.addRoute({
      route: '/',
      handlers: { get: (req, res) => res.json(this.getPublicConfig(req.params.mutable)) },
      meta: {
        get: {
          summary: 'Retrieve public config data',
          responses: {
            200: {
              description: 'The public config item data',
              content: { 'application/json': { schema: { type: 'object' } } }
            }
          }
        }
      }
    })
    auth.unsecureRoute(router.path, 'get')
  }

  /**
   * Copy env values to config
   * @return {Promise}
   */
  async storeEnvSettings () {
    Object.entries(process.env).forEach(([key, val]) => {
      try { // try to parse to allow for non-string values
        val = JSON.parse(val)
      } catch {} // ignore errors
      this.set(this.envVarToConfigKey(key), val)
    })
  }

  /**
   * Parses an environment variable key into a format expected by this module
   * @param {String} envVar
   * @return {String} The formatted key
   */
  envVarToConfigKey (envVar) {
    if (envVar.startsWith('ADAPT_AUTHORING_')) {
      const [modPrefix, key] = envVar.split('__')
      return `${modPrefix.replace(/_/g, '-').toLowerCase()}.${key}`
    }
    return `env.${envVar}`
  }

  /**
   * Loads the relevant config file into memory
   * @return {Promise}
   */
  async storeUserSettings () {
    let configError
    let config
    try {
      await fs.readFile(this.configFilePath)
    } catch (e) {
      if (e.code === 'ENOENT') configError = `No config file found at '${this.configFilePath}'`
    }
    try {
      if (!configError) config = (await import(this.configFilePath)).default
    } catch (e) {
      configError = e.toString()
    }
    if (configError) {
      console.log(chalk.yellow(`Failed to load config at ${this.configFilePath}:\n\n${configError}\n\nWill attempt to run with defaults.\n`))
      return
    }
    Object.entries(config).forEach(([name, c]) => {
      Object.entries(c).forEach(([key, val]) => {
        this.set(`${name}.${key}`, val)
      })
    })
  }

  /**
   * Processes all module config schema files
   * @return {Promise}
   */
  async storeSchemaSettings () {
    const jsonschema = await this.app.waitForModule('jsonschema')
    const deps = Object.values(this.app.dependencies)
    // run core first as other modules may use its config values
    await this.processModuleSchema(deps.find(d => d.name === this.app.name), jsonschema)
    const promises = deps.map(d => this.processModuleSchema(d, jsonschema))
    let hasErrored = false;

    (await Promise.allSettled(promises)).forEach(r => {
      if (r.status === 'rejected') {
        hasErrored = true
        if (r.reason?.data?.errors) {
          console.log(`${r.reason.modName}: ${r.reason.data.errors}`)
        } else {
          console.log(r.reason)
        }
      }
    })
    if (hasErrored) throw new Error()
  }

  /**
   * Processes and validates a single module config schema (checks the user config specifies any required fields, and that they are the expected type)
   * @param {Object} pkg Package.json data
   * @param {JsonSchemaModule} jsonschema Module instance for validation
   * @return {Promise}
   */
  async processModuleSchema (pkg, jsonschema) {
    if (!pkg.name || !pkg.rootDir) return

    const schemaPath = path.resolve(pkg.rootDir, 'conf/config.schema.json')
    let schema
    try {
      schema = await (await jsonschema.createSchema(schemaPath)).build()
    } catch (e) {
      return
    }
    // validate user config data
    let data = Object.entries(schema.raw.properties).reduce((m, [k, v]) => {
      if (v?._adapt?.isMutable) this.mutableAttributes.push(`${pkg.name}.${k}`)
      if (v?._adapt?.isPublic) this.publicAttributes.push(`${pkg.name}.${k}`)
      return { ...m, [k]: this.get(`${pkg.name}.${k}`) }
    }, {})
    try {
      data = await schema.validate(data)
    } catch (e) {
      e.modName = pkg.name
      throw e
    }
    // apply validated config settings
    Object.entries(data).forEach(([key, val]) => this.set(`${pkg.name}.${key}`, val, { force: true }))
  }

  /**
   * Determines whether an attribute has a set value
   * @param {String} attr Attribute key name
   * @return {Boolean} Whether the value exists
   */
  has (attr) {
    return Object.hasOwn(this._config, attr)
  }

  /**
   * Returns a value for a given attribute
   * @param {String} attr Attribute key name
   * @return {*} The attribute's value
   */
  get (attr) {
    return this._config[attr]
  }

  /**
   * Stores a value for the passed attribute
   * @param {String} attr Attribute key name
   * @param {*} val Value to set
   * @param {objeect} options Custom options
   * @param {objeect} options.force Whether to force an update
   */
  set (attr, val, options = {}) {
    if (this.has(attr) && !this.mutableAttributes.includes(attr) && options.force !== true) {
      return
    }
    this._config[attr] = val
  }

  /**
   * Retrieves all config options marked as 'public'
   * @param {Boolean} isMutable Whether options should also be mutable
   * @return {Object}
   */
  getPublicConfig (isMutable) {
    return this.publicAttributes.reduce((m, a) => {
      if (!isMutable || (isMutable && this.mutableAttributes.includes(a))) {
        m[a] = this.get(a)
      }
      return m
    }, {})
  }
}

export default ConfigModule
