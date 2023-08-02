import chalk from 'chalk';
import spawn from 'cross-spawn';
import { SpawnSyncReturns } from 'node:child_process';

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

                process.stdout.write(`${command} `);
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

                process.stdout.write(`${command} `);
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

                process.stdout.write(`${command} `);
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

                process.stdout.write(`${command} `);
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
