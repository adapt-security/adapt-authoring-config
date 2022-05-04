import fs from 'fs';
import path from 'path';

export default class Configuration {
  constructor(app, config) {
    this.app = app;
    this.outputDir = config.outputDir;
    this.customFiles = [];
    this.schemas = {};

    this.loadSchemas();
    this.writeFile({
      'TABLE_OF_CONTENTS': this.generateTOC(),
      'CODE_EXAMPLE': this.generateCodeExample(),
      'LIST': this.generateList()
    });
  }
  loadSchemas() {
    Object.values(this.app.dependencies).forEach(c => {
      const confDir = path.join(c.rootDir, 'conf');
      try {
        this.schemas[c.name] = JSON.parse(fs.readFileSync(path.join(confDir, 'config.schema.json')));
      } catch(e) {}
    });
  }
  generateTOC() {
    let output = '';
    Object.keys(this.schemas).forEach((dep) => output += `- [${dep}](#${dep})\n`);
    output += '\n';
    return output;
  }
  generateCodeExample() {
    let output = '\`\`\`javascript\nexport default {\n';
    Object.entries(this.schemas).forEach(([dep, schema]) => {
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

    Object.entries(this.schemas).forEach(([dep, schema]) => {
      output += `<h3 id="${dep}" class="dep">${dep}</h3>\n\n`;
      output += `<div class="options">\n`;
      Object.entries(schema.properties).forEach(([attr, config]) => {
        const required = schema.required && schema.required.includes(attr);
        output += `<div class="attribute">\n`;
        output += `<div class="title"><span class="main">${attr}</span> (${config.type || ''}, ${required ? 'required' : 'optional'})</div>\n`;
        output += `<div class="inner">\n`;
        output += `<div class="description">${config.description}</div>\n`;
        if(!required) {
          output += `<div class="default"><span class="label">Default</span>: <pre>${this.defaultToMd(config)}</pre></div>\n`;
        }
        output += `</div>\n`;
        output += `</div>\n`;
      });
      output += `</div>`;
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
    let file = fs.readFileSync(new URL('configuration.md', import.meta.url)).toString();
    const outputPath = path.join(this.outputDir, 'configuration.md');
    Object.entries(data).forEach(([key,value]) => file = file.replace(`{{{${key}}}}`, value));
    fs.writeFileSync(outputPath, file);
    this.customFiles.push(outputPath);
  }
}
