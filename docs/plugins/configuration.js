import fs from 'fs'
import path from 'path'

export default class Configuration {
  async run () {
    const schemas = this.loadSchemas()
    this.contents = Object.keys(schemas).sort()
    this.manualFile = 'configuration.md'
    this.replace = {
      CODE_EXAMPLE: this.generateCodeExample(schemas),
      LIST: this.generateList(schemas)
    }
  }

  loadSchemas () {
    const schemas = {}
    Object.values(this.app.dependencies).forEach(c => {
      const confDir = path.join(c.rootDir, 'conf')
      try {
        schemas[c.name] = JSON.parse(fs.readFileSync(path.join(confDir, 'config.schema.json')))
      } catch (e) {}
    })
    return schemas
  }

  generateCodeExample (schemas) {
    let output = '```javascript\nexport default {\n'
    this.contents.forEach((name) => {
      const schema = schemas[name]
      output += `  '${name}': {\n`
      Object.entries(schema.properties).forEach(([attr, config]) => {
        const required = schema.required && schema.required.includes(attr)
        if (config.description) output += `    // ${config.description}\n`
        output += `    ${attr}: ${this.defaultToMd(config)}, // ${config.type}, ${required ? 'required' : 'optional'}\n`
      })
      output += '  },\n'
    })
    output += '};\n```'
    return output
  }

  generateList (schemas) {
    let output = ''

    this.contents.forEach(dep => {
      const schema = schemas[dep]
      output += `<h3 id="${dep}" class="dep">${dep}</h3>\n\n`
      output += '<div class="options">\n'
      Object.entries(schema.properties).forEach(([attr, config]) => {
        const required = schema.required && schema.required.includes(attr)
        output += '<div class="attribute">\n'
        output += `<div class="title"><span class="main">${attr}</span> (${config.type || ''}, ${required ? 'required' : 'optional'})</div>\n`
        output += '<div class="inner">\n'
        output += `<div class="description">${config.description}</div>\n`
        if (!required) {
          output += `<div class="default"><span class="label">Default</span>: <pre>${this.defaultToMd(config)}</pre></div>\n`
        }
        output += '</div>\n'
        output += '</div>\n'
      })
      output += '</div>'
      output += '\n\n'
    })

    return output
  }

  /**
   * Returns a string formatted nicely for markdown
   */
  defaultToMd (config) {
    return JSON.stringify(config.default)
  }
}
