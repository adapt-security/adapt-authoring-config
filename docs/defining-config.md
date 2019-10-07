# Defining module configuration

As a module developer, you will likely have a number of user-configurable attributes for adjusting the functionality of your module. This is great from a user perspective as it allows customisation, but can introduce various bugs as a result of bad user input (missing or unexpected values etc.)

The Adapt authoring tool's [configuration module](/identifiers.html#adapt-authoring-config-lib) aims to pre-empt as many of these issues as possible through the use of configuration **schemas**, which can define the following:
- Required attributes
- Default values for optional attributes
- Expected type of value (i.e. number, string, array etc.)
- Custom validation (`.js` function)

## Defining module configuration
_**Note**: it is not mandatory to include a schema for your module, but it may help your general wellbeing..._

All that's needed to enable this feature is to include a `config.js.schema` to a directory named `conf` in the root of your module.

This file must export a JS Object with a definition attribute, i.e.
```javascript
module.exports = { definition: {} }
```
It is then up to you to list the configuration values for your module.

Each item in your schema can define the following attributes:

| Attribute | Type | Description |
| --------- | ---- | ----------- |
| `type` | `String` | Accepted type of the attribute value |
| `required` | `Boolean` | Whether the user must specify a value for the attribute |
| `public` | `Boolean` | Whether the attribute is safe for public consumption (i.e. via the UI) |
| `default` | _Must match `type`_ | A default value for the attribute (doesn't work in conjunction with `required`) |
| `validator` | `Function` | A function to check the input value is valid (passes attribute value and a reference to the `Config` instance `(val, config) => {}`) |
| `description` | `String` | Description of the attribute (used in auto-generated documentation) |

### Example configuration schema
The below example shows a few common configuration use-cases:

```javascript
module.exports = {
  definition: {
    requiredAttribute: {
      type: 'Number',
      required: true,
      description: 'This option is required'
    },
    optionalAttribute: {
      type: 'String',
      default: 'This will be the default value',
      description: 'An optional attribute with a default value'
    },
    customValidationAttribute: {
      type: "String",
      validator: (val, config) => {
        /**
         * Function should return true (valid)/false (invalid).
         * Can use `config` param to get access to the Config module for
         * attributes which are dependent on other values
         * e.g. if(config.get('val1')) ...
         */
        return val > 5;
      };
      description: 'Attribute with a custom validator function'
    }
  }
};

```
