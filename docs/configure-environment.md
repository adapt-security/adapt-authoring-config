# Configuring your environment
> For a list of all supported configuration options, see [this page](configuration).

The authoring tool has been built to allow for multiple configurations for different system environments (e.g. testing, production, development).

## Set up your environment

To configure your tool for a specific environment, you must create a config file in `/conf` named according to the env value your system will be using (e.g. `dev.config.js`, `production.config.js`, `helloworld.config.js`). We recommend sticking to something short like `dev`, or `test`, but it's up to you what you name these; just make sure to set the environment variable to the same.

> The `NODE_ENV` environment variable is used to determine the current environment, so make sure that this is set appropriately when running the application:

Express.js has a number of [performance enhancing features](https://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production) which are only enabled when the NODE_ENV is set to `production`, so we strongly recommend you use this for your production env name.

### Creating your config

Each config file is a JavaScript file which exports a single Object (i.e. `module.exports = {}`). Within this file, settings are grouped by module.

```Javascript
module.exports = {
  'modulename': {
    // settings
  }
};
```

See [this page](configuration) for a complete list of all configuration options.

#### 
For convenience, we've bundled a script which will generate a new config file for you automatically. 

You can do this by running the following:
```bash
npx aat-confgen [NODE_ENV]
```

> If you choose to include the default settings in your configuration, please be aware that once set, these values will not be updated if the defaults change in the future. It is advised therefore that you leave out any settings that you don't wish to change.

See the [Bin scripts](binscripts#aat-confgen) page for more information, included supported flags.

### Setting your 'env'

You can do this temporarily using the following:

**Bash**:
```bash
$ NODE_ENV=dev npm start
```
**Powershell**:
```bash
> set NODE_ENV=dev && npm start
```

Please see the documentation for your own operating system for instructions on how to set environment variables correctly.