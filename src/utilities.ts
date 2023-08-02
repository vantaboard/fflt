import { FFLTConfig } from './config.js';
import yaml from 'yaml';

export const extensions = {
    js: '.js',
    mjs: '.mjs',
    cjs: '.cjs',
    json: '',
    yml: '.yml',
};

export const stringifiers: Record<string, (config: FFLTConfig) => string> = {
    js: config => `module.exports = ${JSON.stringify(config, null, 2)}`,
    mjs: config => `export default ${JSON.stringify(config, null, 2)}`,
    cjs: config => `module.exports = ${JSON.stringify(config, null, 2)}`,
    json: config => JSON.stringify(config, null, 2),
    yml: config => yaml.stringify(config),
};
