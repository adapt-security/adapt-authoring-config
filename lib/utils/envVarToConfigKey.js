/**
 * Parses an environment variable key into a format expected by ConfigModule
 * @param {String} envVar
 * @return {String} The formatted key
 * @memberof config
 */
export function envVarToConfigKey (envVar) {
  if (envVar.startsWith('ADAPT_AUTHORING_')) {
    const [modPrefix, key] = envVar.split('__')
    return `${modPrefix.replace(/_/g, '-').toLowerCase()}.${key}`
  }
  return `env.${envVar}`
}
