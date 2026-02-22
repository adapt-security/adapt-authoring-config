#!/usr/bin/env node
/**
 * Generates a template config file which can be populated with required values.
 * @param {String} [environment] The enviroment to write the config for
 * @param {String} --defaults Will include default values
 * @param {String} --replace Will override any existing values
 * @param {String} --update Will update existing configuration with any missing values
 */
import fs from 'fs/promises'
import { globSync } from 'glob'
import path from 'path'
import { pathToFileURL } from 'url'
import { getArgs } from 'adapt-authoring-core'

const {
  defaults: useDefaults,
  params: [env],
  replace: replaceExisting,
  update: updateExisting
} = getArgs()
const NODE_ENV = env || process.env.NODE_ENV
const confDir = path.resolve(path.join(process.cwd(), 'conf'))
const outpath = path.join(confDir, `${NODE_ENV}.config.js`)
const configJson = {}

async function init () {
  if (!NODE_ENV) {
    return console.log('ERROR: NODE_ENV must be specified\n')
  }
  if (replaceExisting && updateExisting) {
    return console.log('ERROR: --update and --replace cannot both be specified, please choose one and run the utility again')
  }
  if (useDefaults) {
    console.log('Default values will be included')
  }
  let isExistingConfig = false
  let existingConfig
  try {
    existingConfig = (await import(pathToFileURL(outpath))).default
    isExistingConfig = true
  } catch (e) {
    console.log(`No config found for NODE_ENV '${NODE_ENV}'. File will be written to ${outpath}\n`)
  }
  if (isExistingConfig) {
    const msg = `Config already exists for NODE_ENV '${NODE_ENV}'. `
    if (replaceExisting) {
      console.log(`${msg}All existing values will be replaced.`)
    } else if (updateExisting) {
      console.log(`${msg}Any missing values will be added.`)
      Object.assign(configJson, existingConfig)
    } else {
      return console.log(`${msg}Must specifiy --replace or --update to make changes.`)
    }
  }
  try {
    await generateConfig()
    try {
      await fs.mkdir(confDir, { recursive: true })
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
    }
    await fs.writeFile(outpath, `export default ${JSON.stringify(configJson, null, 2)};`)

    console.log(`Config file written successfully to ${outpath}.\n`)

    logRequired()
  } catch (e) {
    console.log(`ERROR: Failed to write ${outpath}\n${e}`)
  }
}

function logRequired () {
  const requiredAttrs = []
  Object.entries(configJson).forEach(([name, config]) => {
    Object.entries(config).forEach(([key, value]) => value === null && requiredAttrs.push(`${name}.${key}`))
  })
  if (requiredAttrs.length) {
    console.log('Note: the following required attributes have been given a value of null and must be set for the application to run:\n')
    console.log(requiredAttrs.join('\n'))
    console.log('')
  }
}

async function getDeps () {
  try {
    const depRoot = `${process.cwd()}/node_modules/`.replaceAll(path.sep, path.posix.sep)
    return globSync(`${depRoot}**/adapt-authoring.json`).map(f => {
      const dirname = path.dirname(f)
      return [dirname.replace(depRoot, ''), dirname]
    })
  } catch (e) {
    console.log('Failed to load package', e)
  }
}

async function generateConfig () {
  await Promise.all((await getDeps()).map(async ([name, dir]) => {
    let schema
    try {
      schema = schema = JSON.parse(await fs.readFile(path.resolve(dir, 'conf/config.schema.json')))
    } catch (e) {
      return
    }
    if (!configJson[name]) {
      configJson[name] = {}
    }
    storeDefaults(schema, configJson[name])
    // remove any empty objects
    Object.entries(configJson).forEach(([key, config]) => !Object.keys(config).length && delete configJson[key])
  }))
}
function storeDefaults (schema, defaults = {}) {
  return Object.entries(schema.properties).reduce((memo, [attr, config]) => {
    if (config.type === 'object' && config.properties) {
      return { ...memo, [attr]: storeDefaults(config, memo) }
    }
    config.required = schema?.required?.includes(attr) ?? false
    const shouldUpdate = replaceExisting || !Object.prototype.hasOwnProperty.call(memo, attr)
    const useDefault = useDefaults && Object.prototype.hasOwnProperty.call(config, 'default')
    if (shouldUpdate && (useDefault || config.required)) {
      memo[attr] = getValueForAttr(config)
    }
    return memo
  }, defaults)
}

function getValueForAttr (config) {
  if (config.required) return null
  if (Object.prototype.hasOwnProperty.call(config, 'default')) return config.default
}

init()
