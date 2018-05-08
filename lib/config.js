const Module = require('adapt-authoring-core').DataTypes.Module;
const nconf = require('');

class Conf extends Module {
  constructor() {
    super();

    const configDir = path.join(process.cwd(), 'conf', 'config.json');
    nconf.argv().env().file({ file: configDir });

    Object.defineProperties(this, {
      get: { value: nconf.get.bind(this) },
      set: { value: nconf.set.bind(this) }
    });
  }

  preload(app, resolve, reject) {
    resolve();
  }
}

module.exports = Conf;
