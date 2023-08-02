import chalk from 'chalk';
import { SpawnSyncReturns } from 'child_process';
import spawn from 'cross-spawn';
import { FFLTConfig } from './config.js';
import { error } from './errors.js';
import { getBranches, getDiffFiles } from './git.js';
import { select, SelectChoice } from './select.js';

class SpawnCommand {
    public exec: string;
    public args: string[];
    public description?: string;

    constructor(exec: string, args: string[], description?: string) {
        this.exec = exec;
        this.args = args;
        this.description = description;
    }

    public readonly run = (): SpawnSyncReturns<string> => {
        console.log(`${this} `);
        const result = spawn.sync(this.exec, this.args, {
            encoding: 'utf8',
        });

        if (result.error) {
            throw result.error;
        }

        console.log(result.stdout);

        return result;
    };

    public readonly addArg = (arg: string): SpawnCommand => {
        this.args.push(arg);
        return this;
    };

    public readonly addArgs = (args: string[]): SpawnCommand => {
        this.args.push(...args);
        return this;
    };

    public readonly removeArg = (arg: string): SpawnCommand => {
        this.args = this.args.filter(a => a !== arg);
        return this;
    };

    public readonly removeArgs = (args: string[]): SpawnCommand => {
        this.args = this.args.filter(a => !args.includes(a));
        return this;
    };

    toString(): string {
        return `${chalk.magenta(this.exec)} ${this.args
            .map(arg =>
                arg.startsWith('-') ? chalk.gray(arg) : chalk.cyan(arg)
            )
            .join(' ')}`;
    }
}

export const commands: Record<string, Record<string, SpawnCommand>> = {
    eslint: {
        lint: new SpawnCommand(
            'eslint',
            ['--no-error-on-unmatched-pattern'],
            'Lint files using selected Git branch'
        ),
        fix: new SpawnCommand(
            'eslint',
            ['--no-error-on-unmatched-pattern', '--fix'],
            'Fix files using selected Git branch'
        ),
    },
    prettier: {
        format: new SpawnCommand(
            'prettier',
            ['--ignore-unknown', '--write'],
            'Format files using selected Git branch'
        ),
    },
    tsc: {
        typecheck: new SpawnCommand(
            'tsc',
            ['--noEmit'],
            'Typecheck using selected Git branch'
        ),
    },
};

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
                    description: `Run ${command} `,
                };
            }),
        });
    }

    const subcommands = commands[command];

    subcommand = subcommand ?? Object.keys(subcommands)[0];

    if (!args[2] && Object.keys(subcommands).length > 1) {
        subcommand = await select({
            message: 'Which subcommand do you want to run?',
            choices: Object.entries(subcommands).map(
                ([name, { description }]) => {
                    return {
                        name,
                        value: name,
                        description,
                    };
                }
            ),
        });
    }

    const spawnCommand = subcommands[subcommand];

    if (!spawnCommand) {
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
                        description: `Run ${subcommand} against ${branch} `,
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

    spawnCommand.addArgs(files).run();
}
