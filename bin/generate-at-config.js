#!/usr/bin/env node
/**
 * Generates a template config file which can be populated with required values.
 * @param {String} [environment] The enviroment to write the config for
 * @param {String} --defaults Will include default values
 * @param {String} --replace Will override any existing values
 * @param {String} --update Will update existing configuration with any missing values
 */
import fs from 'fs/promises';
import glob from 'glob';
import path from 'path';
import util from 'util';
import { Utils } from 'adapt-authoring-core';

const { 
  defaults: useDefaults, 
  params: [env],
  replace: replaceExisting,
  update: updateExisting
} = Utils.getArgs();
const NODE_ENV = env || process.env.NODE_ENV;
const confDir = path.resolve(path.join(process.cwd(), 'conf'));
const outpath = path.join(confDir, `${NODE_ENV}.config.js`);
const configJson = {};
const requiredAttrs = [];

async function init() {
  if(!NODE_ENV) {
    return console.log(`ERROR: NODE_ENV must be specified\n`);
  }
  if(replaceExisting && updateExisting) {
    return console.log('ERROR: --update and --replace cannot both be specified, please choose one and run the utility again');
  }
  if(useDefaults) {
    return console.log('Default values will be included');
  }
  try {
    Object.assign(configJson, require(outpath));
    let msg = `Config already exists for NODE_ENV '${NODE_ENV}'. `;
    if(replaceExisting) {
      console.log(`${msg}All existing values will be replaced.`);
    } else if(updateExisting) {
      console.log(`${msg}Any missing values will be added.`);
    } else {
      return console.log(`${msg}Must specified --replace or --update to make changes.`);
    }
  } catch(e) {
    console.log(`No config found for NODE_ENV '${NODE_ENV}'. File will be written to ${outpath}\n`);
  }
  try {
    await processDeps();
    try {
      await fs.mkdir(confDir, { recursive: true });
    } catch(e) {
      if(e.code !== 'EEXIST') throw e;
    }
    await fs.writeFile(outpath, `module.exports = ${JSON.stringify(configJson, null, 2)};`);

    console.log(`Config file written successfully to ${outpath}.\n`);
    if(requiredAttrs.length) {
      console.log('Note: the following required attributes have been given a value of null and must be set for the application to run:');
      requiredAttrs.forEach(a => console.log(`- ${a}`));
      console.log('');
    }
  } catch(e) {
    console.log(`ERROR: Failed to write ${outpath}\n${e}`);
  }
}

async function getDeps() {
  try {
    const depRoot = `${process.cwd()}/node_modules/`;
    return (await util.promisify(glob)(`${depRoot}**/adapt-authoring.json`)).map(f => {
      const dirname = path.dirname(f);
      return [dirname.replace(depRoot, ''), dirname];
    });
  } catch(e) {
    console.log(`Failed to load package`, e);
  }
}

async function processDeps() {
  const deps = await getDeps();
  const promises = deps.map(async ([name, dir]) => {
    const schema = await ConfigUtils.loadConfigSchema(dir);
    if(!schema) {
      return;
    }
    const generated = Object.entries(schema.properties).reduce((memo, [attr, config]) => {
      config.required = schema.required && schema.required.includes(attr);
      if(useDefaults || config.required) {
        memo[attr] = getValueForAttr(attr, config);
        if(config.required) requiredAttrs.push(`${name}.${attr}`);
      }
      return memo;
    }, {});
    Object.entries(generated).reduce((m,[k,v]) => {
      if(!m[name]) m[name] = { [k]: v };
      else if(!m[name].hasOwnProperty(k)) m[name][k] = v;
      return m;
    }, configJson);
  });
  await Promise.all(promises);
}

function getValueForAttr(attr, config) {
  if(config.required) return null;
  if(config.default) return config.default;
}

init();
 