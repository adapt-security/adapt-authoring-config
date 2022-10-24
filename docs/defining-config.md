# Defining module configuration

As a module developer, you will likely have a number of user-configurable attributes for adjusting the functionality of your module. This is great from a user perspective as it allows customisation, but can introduce various bugs as a result of bad user input (missing or unexpected values etc.)

The Adapt authoring tool's configuration module aims to pre-empt as many of these issues as possible through the use of configuration **schemas**, which can define the following:
- Required attributes
- Default values for optional attributes
- Expected type for values (e.g. number, string, array)
- Validation constraints (see JSON schema spec)

## Defining module configuration
_**Note**: it is not mandatory to include a config schema for your module, but it may help your general wellbeing/code neatness..._

All that's needed to enable this feature is to include a `config.schema.json` to a directory named `conf` in the root of your module.

This file must export a valid JSON object. See the JSON schema docs for more information.

### Example configuration schema
The below example shows a few common configuration use-cases:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "requiredAttribute": {
      "type": "Number",
      "description": "This option is required"
    },
    "optionalAttribute": {
      "type": "String",
      "default": "This will be the default value",
      "description": "An optional attribute with a default value"
    },
  },
  "required": ["requiredAttribute"]
}
```

## Directory paths

It may be necessary to define directory paths in your config schema (e.g. the assets module defines an `uploadDir` attribute). To make this simpler from a developer _and_ user perspective, you can make use of the special `isDirectory` JSON schema keyword which will automatically populate the value with a number of global directory paths.

If `isDirectory` is set in a config schema, the configuration module will look for the following keys and replace them with the corresponding `adapt-authoring-core` config values:

- `$ROOT` -> `adapt-authoring-core.rootDir`
- `$DATA` -> `adapt-authoring-core.dataDir`
- `$TEMP` -> `adapt-authoring-core.tempDir`

This allows the user to specify just the `dataDir` and `tempDir` attributes, and you can be safe in the knowledge that your config schema value will resolve to the correct location.

See the following JSON schema snippet as an example:

```json
{
  "uploadDir": {
    "type": "String",
    "description": "Temporary file upload directory for myplugin",
    "isDirectory": true,
    "default": "$TEMP/myfiles"
  },
}
```