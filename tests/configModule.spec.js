import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import ConfigModule from '../lib/ConfigModule.js'

describe('ConfigModule', () => {
  let instance

  before(() => {
    // Create a minimal mock app instance for testing
    const mockApp = {
      config: null,
      rootDir: '/test',
      name: 'test-app',
      dependencies: {},
      waitForModule: async () => { throw new Error('Test mode') }
    }

    // Create instance and catch initialization error
    try {
      instance = new ConfigModule(mockApp, {})
    } catch (e) {
      // Initialization error is expected in test mode
    }

    // Ensure internal state is initialized for testing
    if (!instance._config) instance._config = {}
    if (!instance.mutableAttributes) instance.mutableAttributes = []
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

  describe('#set()', () => {
    it('should store a value', () => {
      instance.set('test.newkey', 'newvalue')
      assert.equal(instance.get('test.newkey'), 'newvalue')
    })

    it('should not overwrite immutable values without force option', () => {
      instance._config = {}
      instance.mutableAttributes = []
      instance.set('test.immutable', 'first')
      instance.set('test.immutable', 'second')
      assert.equal(instance.get('test.immutable'), 'first')
    })

    it('should overwrite mutable values', () => {
      instance._config = {}
      instance.mutableAttributes = ['test.mutable']
      instance.set('test.mutable', 'first')
      instance.set('test.mutable', 'second')
      assert.equal(instance.get('test.mutable'), 'second')
    })

    it('should overwrite any value when force option is true', () => {
      instance._config = {}
      instance.mutableAttributes = []
      instance.set('test.forced', 'first')
      instance.set('test.forced', 'second', { force: true })
      assert.equal(instance.get('test.forced'), 'second')
    })

    it('should store different data types', () => {
      instance.set('test.string', 'text', { force: true })
      instance.set('test.number', 123, { force: true })
      instance.set('test.boolean', false, { force: true })
      instance.set('test.array', [1, 2, 3], { force: true })

      assert.equal(instance.get('test.string'), 'text')
      assert.equal(instance.get('test.number'), 123)
      assert.equal(instance.get('test.boolean'), false)
      assert.deepEqual(instance.get('test.array'), [1, 2, 3])
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

    it('should filter by mutable when isMutable is true', () => {
      instance._config = {
        'module.publicMutable': 'value1',
        'module.publicImmutable': 'value2'
      }
      instance.publicAttributes = ['module.publicMutable', 'module.publicImmutable']
      instance.mutableAttributes = ['module.publicMutable']

      const config = instance.getPublicConfig(true)
      assert.deepEqual(config, {
        'module.publicMutable': 'value1'
      })
    })

    it('should return all public attributes when isMutable is false', () => {
      instance._config = {
        'module.publicMutable': 'value1',
        'module.publicImmutable': 'value2'
      }
      instance.publicAttributes = ['module.publicMutable', 'module.publicImmutable']
      instance.mutableAttributes = ['module.publicMutable']

      const config = instance.getPublicConfig(false)
      assert.deepEqual(config, {
        'module.publicMutable': 'value1',
        'module.publicImmutable': 'value2'
      })
    })
  })
})
