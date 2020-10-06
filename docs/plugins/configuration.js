const fs = require('fs-extra');
const path = require('path');
const { App } = require('adapt-authoring-core');

const schemas = [];

class Plugin {
  onHandleConfig() {
    this.loadSchemas();
    this.writeFile({
      'CODE_EXAMPLE': this.generateCodeExample(),
      'LIST': this.generateList()
    });
  }
  loadSchemas() {
    Object.values(App.instance.dependencies).forEach(c => {
      const confDir = path.join(c.rootDir, 'conf');
      try {
        schemas[c.name] = require(path.join(confDir, 'config.schema.json'));
      } catch(e) {}
    });
  }
  generateCodeExample() {
    let output = '\`\`\`javascript\nmodule.exports = {\n';
    Object.entries(schemas).forEach(([dep, schema]) => {
      output += `  '${dep}': {\n`;
      Object.entries(schema.properties).forEach(([attr, config]) => {
        const required = schema.required && schema.required.includes(attr);
        if(config.description) output += `    // ${config.description}\n`;
        output += `    ${attr}: ${this.defaultToMd(config)} // ${config.type}, ${required ? 'required' : 'optional'}\n`;
      });
      output += `  }\n`;
    });
    output += `};\n\`\`\``;

    return output;
  }
  generateList() {
    let output = '';

    Object.entries(schemas).forEach(([dep, schema]) => {
      output += `<h3 class="dep">${dep}</h3>\n\n`;
      Object.entries(schema.properties).forEach(([attr, config]) => {
        const required = schema.required && schema.required.includes(attr);
        output += '<div class="attribute">';
        output += `<div class="title"><span>${attr}</span> (${config.type || ''}, ${required ? 'required' : 'optional'})</div>`;
        output += `<div class="item">${config.description}</div>`;
        if(!required) {
          output += `<div class="item small">Default: <pre>${this.defaultToMd(config)}</pre></div>`;
        }
        output += '</div>';
      });
      output += `\n\n`;
    });

    return output;
  }
  /**
   * Returns a string formatted nicely for markdown
   */
  defaultToMd(config) {
    return JSON.stringify(config.default);
  }
  writeFile(data) {
    let file = fs.readFileSync(path.join(__dirname, 'configuration.md')).toString();
    Object.entries(data).forEach(([key,value]) => file = file.replace(`{{{${key}}}}`, value));
    fs.writeFileSync(path.join(__dirname, '..', 'temp-configuration.md'), file);
  }
}

module.exports = new Plugin();
