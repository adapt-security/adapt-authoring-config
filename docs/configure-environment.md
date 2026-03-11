# Configuring your environment
> For a list of all supported configuration options, see [this page](configuration).

The authoring tool has been built to allow for multiple configurations for different system environments (e.g. testing, production, development).

## Set up your environment

To configure your tool for a specific environment, you must create a config file in `/conf` named according to the env value your system will be using (e.g. `dev.config.js`, `production.config.js`, `helloworld.config.js`). We recommend sticking to something short like `dev`, or `test`, but it's up to you what you name these; just make sure to set the environment variable to the same.

> The `NODE_ENV` environment variable is used to determine the current environment, so make sure that this is set appropriately when running the application:

Express.js has a number of [performance enhancing features](https://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production) which are only enabled when the NODE_ENV is set to `production`, so we strongly recommend you use this for your production env name.

### Creating your config

Each config file is a JavaScript file which exports a single object. Within this file, settings are grouped by module:

```Javascript
export default {
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
npx at-confgen [NODE_ENV]
```

> If you choose to include the default settings in your configuration, please be aware that once set, these values will not be updated if the defaults change in the future. It is advised therefore that you leave out any settings that you don't wish to change.

See the [Bin scripts](binscripts#at-confgen) page for more information, included supported flags.

### Setting your 'env'

You can do this temporarily using the following:

**Bash/Mac OS Terminal**:
```bash
$ NODE_ENV=dev npm start
```
**Windows Powershell/Command Prompt**:
```bash
> set NODE_ENV=dev | npm start
```

Please see the documentation for your own operating system for instructions on how to save environment variables in a more permanent way.

## Using environment variables for configuration

As an alternative to config files, any configuration option can be set via an environment variable using the following naming convention:

```
ADAPT_AUTHORING_<MODULE>__<property>
```

- The module name is converted to uppercase with underscores replacing hyphens (e.g. `adapt-authoring-server` becomes `ADAPT_AUTHORING_SERVER`)
- A double underscore (`__`) separates the module name from the property name
- The property name is kept in its original camelCase format

For example:

| Environment variable | Config equivalent |
| --- | --- |
| `ADAPT_AUTHORING_SERVER__host` | `adapt-authoring-server.host` |
| `ADAPT_AUTHORING_SERVER__port` | `adapt-authoring-server.port` |
| `ADAPT_AUTHORING_MONGODB__connectionUri` | `adapt-authoring-mongodb.connectionUri` |
| `ADAPT_AUTHORING_AUTH_LOCAL__saltRounds` | `adapt-authoring-auth-local.saltRounds` |

Values are parsed as JSON where possible, so non-string types like numbers and booleans can be set directly (e.g. `ADAPT_AUTHORING_SERVER__port=5678`).

Any environment variables that do not start with `ADAPT_AUTHORING_` are available under the `env` namespace (e.g. `NODE_ENV` becomes `env.NODE_ENV`).