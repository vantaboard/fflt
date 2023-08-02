import { cosmiconfigSync } from 'cosmiconfig';
import confirm from '@inquirer/confirm';
import { select } from './select.js';
import { checkbox } from './checkbox.js';
import { getBranches } from './git.js';
import fs from 'fs';
import path from 'path';
import { extensions, notExistsOrStrArr, stringifiers } from './utilities.js';
import { pkgJson, root } from './package.js';

const explorer = cosmiconfigSync('fflt');
const defaultCommands = ['eslint', 'prettier', 'tsc'];
const defaultScripts = ['lint', 'fix', 'format', 'tsc', 'typecheck'];

function writeConfig(
    root: string,
    type: 'js' | 'mjs' | 'cjs' | 'json' | 'yml'
) {
    fs.writeFileSync(
        path.join(path.parse(root).dir, `.ffltrc${extensions[type]}`),
        stringifiers[type](config),
        'utf8'
    );
}

export interface FFLTConfig {
    commands: string[];
    scripts: string[];
    default_branch: string;
    ignore_pattern: string;
    include_cached: boolean;
    package_manager: string;
}

const defaultConfig = {
    commands: [...defaultCommands],
    scripts: [...defaultScripts],
    default_branch: 'main',
    ignore_pattern: 'yarn\\.lock|package-lock\\.json',
    include_cached: true,
    package_manager: 'npm',
} satisfies FFLTConfig;

const depCommandMap = {
    eslint: 'eslint',
    prettier: 'prettier',
    tsc: 'typescript',
};

const explorerResult = explorer.search();

function formatConfig(config: FFLTConfig) {
    const deps = [
        ...Object.keys(pkgJson?.dependencies || {}),
        ...Object.keys(pkgJson?.devDependencies || {}),
    ];

    config.commands = config.commands.filter(command =>
        deps.includes(depCommandMap[command as keyof typeof depCommandMap])
    );

    const scripts = [...Object.keys(pkgJson?.scripts || {})];

    config.scripts = scripts.filter(script =>
        config.scripts.some(s => script.startsWith(s))
    );

    return config;
}

function getConfig(config?: Record<string, unknown>): FFLTConfig {
    if (
        config &&
        Object.keys(config).some(key =>
            ['commands', 'scripts', 'default_branch'].includes(key)
        ) &&
        notExistsOrStrArr(config.commands) &&
        notExistsOrStrArr(config.scripts)
    ) {
        return formatConfig(
            Object.entries(defaultConfig).reduce<FFLTConfig>(
                (acc, [key, value]) => ({
                    ...acc,
                    [key]: config[key] !== undefined ? config[key] : value,
                }),
                {} as FFLTConfig
            )
        );
    }

    return formatConfig(defaultConfig);
}

export const config = getConfig(explorerResult?.config);
export const configExists = Boolean(explorerResult);

export async function handleCreateConfig(): Promise<void> {
    const confirmConfig =
        !configExists &&
        (await confirm({
            message: 'Do you want to create a config file?',
        }));

    const configFileType =
        confirmConfig &&
        (await select({
            message: 'Which config file do you want to create?',
            choices: [
                {
                    name: 'JSON',
                    value: 'json',
                    description: 'Create a JSON config file',
                },
                {
                    name: 'YAML',
                    value: 'yml',
                    description: 'Create a YAML config file',
                },
                {
                    name: 'JavaScript',
                    value: 'js',
                    description: 'Create a JavaScript config file (.js)',
                },
                {
                    name: 'JavaScript (Module)',
                    value: 'mjs',
                    description: 'Create a JavaScript config file (.mjs)',
                },
                {
                    name: 'JavaScript (Common)',
                    value: 'cjs',
                    description: 'Create a JavaScript config file (.cjs)',
                },
            ],
        }));

    const packageManager =
        confirmConfig &&
        (await select({
            message: 'Which package manager do you want to use?',
            choices: [
                {
                    name: 'npm',
                    value: 'npm',
                    description: 'Use npm',
                },
                {
                    name: 'yarn',
                    value: 'yarn',
                    description: 'Use yarn',
                },
                {
                    name: 'pnpm',
                    value: 'pnpm',
                    description: 'Use pnpm',
                },
            ],
        }));

    const defaultBranch =
        confirmConfig &&
        (await select({
            message: 'Which branch do you want to use as the default?',
            choices: getBranches().map(branch => ({
                name: branch,
                value: branch,
                description: `Use ${branch} as the default branch`,
            })),
        }));

    const includeCached = confirmConfig
        ? await confirm({
              message: 'Do you want to include staged files?',
          })
        : undefined;

    const scripts =
        confirmConfig &&
        (await checkbox({
            message: 'Which scripts do you want to run?',
            choices: Object.entries(pkgJson?.scripts || {}).map(
                ([name, script]) => {
                    return {
                        name,
                        value: name,
                        checked: config.scripts.includes(name),
                        description: script,
                    };
                },
                []
            ),
        }));

    config.package_manager = packageManager || config.package_manager;
    config.default_branch = defaultBranch || config.default_branch;
    config.include_cached = includeCached ?? config.include_cached;
    config.scripts = scripts || config.scripts;

    switch (configFileType) {
        case 'json':
            writeConfig(root, 'json');
            break;
        case 'yml':
            writeConfig(root, 'yml');
            break;
        case 'js':
            writeConfig(root, 'js');
            break;
        case 'mjs':
            writeConfig(root, 'mjs');
            break;
        case 'cjs':
            writeConfig(root, 'cjs');
            break;
        default:
            break;
    }
}
