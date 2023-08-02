import chalk from 'chalk';
import spawn from 'cross-spawn';
import { SpawnSyncReturns } from 'node:child_process';
import { FFLTConfig } from './config.js';
import { error } from './errors.js';
import { getBranches, getDiffFiles } from './git.js';
import { select, SelectChoice } from './select.js';

interface Command {
    name: string;
    run: (files: string[]) => SpawnSyncReturns<string>;
    description: string;
}

type CommandMap = Record<string, Command[]>;

class SpawnCommand {
    public exec: string;
    public args: string[];

    constructor(exec: string, args: string[]) {
        this.exec = exec;
        this.args = args;
    }

    toString(): string {
        return `${chalk.magenta(this.exec)} ${this.args
            .map(arg =>
                arg.startsWith('-') ? chalk.gray(arg) : chalk.cyan(arg)
            )
            .join(' ')}`;
    }
}

export const commandMap: CommandMap = {
    eslint: [
        {
            run: (files: string[]) => {
                const command = new SpawnCommand('eslint', [
                    '--no-error-on-unmatched-pattern',
                    ...files,
                ]);

                console.log(`${command} `);
                const eslint = spawn.sync(command.exec, command.args, {
                    encoding: 'utf8',
                });

                if (eslint.error) {
                    throw eslint.error;
                }

                return eslint;
            },
            name: 'lint',
            description: 'Lint files using selected Git branch',
        },
        {
            run: (files: string[]) => {
                const command = new SpawnCommand('eslint', [
                    '--no-error-on-unmatched-pattern',
                    '--fix',
                    ...files,
                ]);

                console.log(`${command} `);
                const eslint = spawn.sync(command.exec, command.args, {
                    encoding: 'utf8',
                });

                if (eslint.error) {
                    throw eslint.error;
                }

                return eslint;
            },
            name: 'fix',
            description: 'Fix files using selected Git branch',
        },
    ],
    prettier: [
        {
            run: (files: string[]) => {
                const command = new SpawnCommand('prettier', [
                    '--ignore-unknown',
                    '--write',
                    ...files,
                ]);

                console.log(`${command} `);
                const prettier = spawn.sync(command.exec, command.args, {
                    encoding: 'utf8',
                });

                if (prettier.error) {
                    throw prettier.error;
                }

                return prettier;
            },
            name: 'format',
            description: 'Format files using selected Git branch',
        },
    ],
    tsc: [
        {
            run: () => {
                const command = new SpawnCommand('tsc', ['--noEmit']);

                console.log(`${command} `);
                const tsc = spawn.sync('tsc', ['--noEmit'], {
                    encoding: 'utf8',
                });

                if (tsc.error) {
                    throw tsc.error;
                }

                return tsc;
            },
            name: 'typecheck',
            description: 'Typecheck using selected Git branch',
        },
    ],
} satisfies CommandMap;

export async function handleCommands<TFlags extends Record<string, any>>(
    args: string[],
    flags: TFlags,
    config: FFLTConfig
): Promise<void> {
    let [command, subcommand] = args;
    if (!config.commands.includes(command)) {
        command = await select({
            message: 'Which command do you want to run?',
            choices: config.commands.map(command => {
                return {
                    name: command,
                    value: command,
                    description: `Run ${command}`,
                };
            }),
        });
    }

    const subcommands = commandMap[command];

    subcommand = subcommand ?? subcommands[0].name;

    if (!args[2] && subcommands.length > 1) {
        subcommand = await select({
            message: 'Which subcommand do you want to run?',
            choices: subcommands.map(command => {
                const { name, description } = command;

                return {
                    name,
                    value: name,
                    description,
                };
            }),
        });
    }

    const subcommandRunner = [...subcommands].find(
        command => command.name === subcommand
    );

    if (!subcommandRunner) {
        error('subcommand', subcommand);
        process.exit(1);
    }

    let branch = config.default_branch;

    if (flags.branch) {
        branch = flags.branch;
    }

    const branches = getBranches();
    const initialBranchChoice = branches.includes(config.default_branch)
        ? [
              {
                  name: config.default_branch,
                  value: config.default_branch,
                  color: 'green',
              } as SelectChoice<string>,
          ]
        : [];

    if (!flags.default) {
        branch = await select({
            message: 'Which branch do you want to run against?',
            choices: branches
                .filter(branch => branch !== config.default_branch)
                .reduce((acc, branch) => {
                    acc.push({
                        name: branch,
                        value: branch,
                        description: `Run ${subcommand} against ${branch}`,
                    });

                    return acc;
                }, initialBranchChoice),
        });
    }

    const files = getDiffFiles({
        branch,
        includeCached: flags.cached,
        ignorePattern: config.ignore_pattern,
        fromRoot: flags.root,
    });

    if (!files.length) {
        console.warn(
            chalk.yellow(`No files to run ${chalk.magenta(command)} on.`)
        );
        return;
    }

    process.stdout.write(subcommandRunner.run(files).stdout);
}
