import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import ConfigModule from '../lib/ConfigModule.js'

describe('ConfigModule', () => {
  let instance

  before(async () => {
    const noopHook = { tap: () => {}, untap: () => {}, invoke: async () => {} }
    const noopRouter = { path: '/', createChildRouter: () => noopRouter }
    const mockApp = {
      config: null,
      rootDir: '/test',
      name: 'test-app',
      dependencies: {},
      dependencyloader: { moduleLoadedHook: noopHook },
      waitForModule: async (...names) => {
        const mocks = {
          errors: { LOAD_ERROR: new Error('load') },
          auth: { unsecureRoute: () => {} },
          server: { api: { createChildRouter: () => noopRouter } },
          jsonschema: { createSchema: async () => ({ build: async () => ({}) }) }
        }
        const results = names.map(n => mocks[n] || {})
        return results.length === 1 ? results[0] : results
      },
      errors: { LOAD_ERROR: new Error('load') }
    }

    instance = new ConfigModule(mockApp, {})

    // Wait for the async init to settle (it will error in test mode, which is fine)
    try { await instance.onReady() } catch (e) { /* expected */ }

    // Ensure internal state is initialized for testing
    if (!instance._config) instance._config = {}
    if (!instance.publicAttributes) instance.publicAttributes = []
  })

  describe('#envVarToConfigKey()', () => {
    it('should convert ADAPT_AUTHORING prefixed env vars to config keys', () => {
      const result = instance.envVarToConfigKey('ADAPT_AUTHORING_SERVER__PORT')
      assert.equal(result, 'adapt-authoring-server.PORT')
    })

    it('should convert underscores to hyphens in module prefix', () => {
      const result = instance.envVarToConfigKey('ADAPT_AUTHORING_MY_MODULE__KEY')
      assert.equal(result, 'adapt-authoring-my-module.KEY')
    })

    it('should prefix non-ADAPT_AUTHORING env vars with "env."', () => {
      const result = instance.envVarToConfigKey('NODE_ENV')
      assert.equal(result, 'env.NODE_ENV')
    })

    it('should handle env vars without double underscore', () => {
      // When no __ separator exists, key will be undefined
      // This documents the current behavior of the function
      const result = instance.envVarToConfigKey('ADAPT_AUTHORING_TEST')
      assert.equal(result, 'adapt-authoring-test.undefined')
    })
  })

  describe('#has()', () => {
    it('should return true for existing config values', () => {
      instance._config['test.key'] = 'value'
      const exists = instance.has('test.key')
      assert.equal(exists, true)
    })

    it('should return false for non-existent config values', () => {
      const exists = instance.has('nonexistent.key')
      assert.equal(exists, false)
    })
  })

  describe('#get()', () => {
    it('should retrieve a stored value', () => {
      instance._config['test.value'] = 'expected'
      const actual = instance.get('test.value')
      assert.equal(actual, 'expected')
    })

    it('should return undefined for non-existent keys', () => {
      const actual = instance.get('does.not.exist')
      assert.equal(actual, undefined)
    })

    it('should retrieve different data types', () => {
      instance._config['test.string'] = 'text'
      instance._config['test.number'] = 42
      instance._config['test.boolean'] = true
      instance._config['test.object'] = { key: 'value' }

      assert.equal(instance.get('test.string'), 'text')
      assert.equal(instance.get('test.number'), 42)
      assert.equal(instance.get('test.boolean'), true)
      assert.deepEqual(instance.get('test.object'), { key: 'value' })
    })
  })
  
  describe('#getPublicConfig()', () => {
    it('should return only public attributes', () => {
      instance._config = {
        'module.public1': 'value1',
        'module.public2': 'value2',
        'module.private': 'secret'
      }
      instance.publicAttributes = ['module.public1', 'module.public2']

      const config = instance.getPublicConfig()
      assert.deepEqual(config, {
        'module.public1': 'value1',
        'module.public2': 'value2'
      })
    })

    it('should return empty object when no public attributes exist', () => {
      instance._config = { 'module.private': 'secret' }
      instance.publicAttributes = []

      const config = instance.getPublicConfig()
      assert.deepEqual(config, {})
    })

    it('should handle undefined values for public attributes', () => {
      instance._config = {}
      instance.publicAttributes = ['module.missing']

      const config = instance.getPublicConfig()
      assert.deepEqual(config, {
        'module.missing': undefined
      })
    })
  })
})
