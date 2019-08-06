const { Module, Responder } = require('adapt-authoring-core');
/**
*
* @extends {Api}
*/
class ConfigModule extends Module {
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
