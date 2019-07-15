const { Module, Responder } = require('adapt-authoring-core');
/**
*
* @extends {Api}
*/
class Config extends Module {
  /** @override */
  preload(app, resolve, reject) {
    app.getModule('server').api.createChildRouter('config').addRoute({
      route: '/',
      handlers: { get: (req, res) => new Responder(res).success(this.app.config.getPublicConfig()) }
    });
    resolve();
  }
}

module.exports = Config;
