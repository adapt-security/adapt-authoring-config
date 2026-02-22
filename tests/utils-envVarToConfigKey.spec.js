import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { envVarToConfigKey } from '../lib/utils/envVarToConfigKey.js'

describe('envVarToConfigKey()', () => {
  it('should convert ADAPT_AUTHORING_ prefixed vars to dotted config keys', () => {
    assert.equal(envVarToConfigKey('ADAPT_AUTHORING_SERVER__port'), 'adapt-authoring-server.port')
  })

  it('should handle multi-word module names', () => {
    assert.equal(envVarToConfigKey('ADAPT_AUTHORING_AUTH_LOCAL__saltRounds'), 'adapt-authoring-auth-local.saltRounds')
  })

  it('should convert underscores to hyphens in module prefix', () => {
    assert.equal(envVarToConfigKey('ADAPT_AUTHORING_MONGODB__connectionUri'), 'adapt-authoring-mongodb.connectionUri')
  })

  it('should lowercase the module prefix', () => {
    const result = envVarToConfigKey('ADAPT_AUTHORING_CONFIG__enableCache')
    assert.ok(result.startsWith('adapt-authoring-config.'))
  })

  it('should prefix non-ADAPT_AUTHORING vars with "env."', () => {
    assert.equal(envVarToConfigKey('NODE_ENV'), 'env.NODE_ENV')
    assert.equal(envVarToConfigKey('PORT'), 'env.PORT')
    assert.equal(envVarToConfigKey('HOME'), 'env.HOME')
  })

  it('should handle vars starting with ADAPT_ but not ADAPT_AUTHORING_', () => {
    assert.equal(envVarToConfigKey('ADAPT_FOO'), 'env.ADAPT_FOO')
  })

  it('should handle empty string', () => {
    assert.equal(envVarToConfigKey(''), 'env.')
  })

  it('should preserve the key part after __', () => {
    assert.equal(envVarToConfigKey('ADAPT_AUTHORING_API__defaultPageSize'), 'adapt-authoring-api.defaultPageSize')
  })
})
