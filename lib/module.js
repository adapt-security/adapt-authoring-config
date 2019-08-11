const { AbstractModule, Responder } = require('adapt-authoring-core');
/**
* Module to expose config API
* @extends {AbstractModule}
*/
class ConfigModule extends AbstractModule {
  /** @override */
  preload(app, resolve, reject) {
    app.getModule('server').api.createChildRouter('config').addRoute({
      route: '/',
      handlers: { get: (req, res) => new Responder(res).success(this.app.config.getPublicConfig()) }
    });
    app.auth.secureRoute('/api/config', 'get', ['read:config']);
    resolve();
  }
}

module.exports = ConfigModule;
