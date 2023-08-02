import chalk from 'chalk';
import dedent from 'ts-dedent';

const errors = {
    ignore: (pattern: string): string => {
        return chalk.red(
            dedent`
            The ignore pattern ${pattern} must not start with a slash
            and/or end with a slash followed by flags.
        `.replace(/\n/g, ' ')
        );
    },
    gitinstall: chalk.red('Error: Git is not installed'),
    missingroot: chalk.red(
        'Could not find root. Root must have a package.json.'
    ),
    defbranchflags: chalk.red(
        'You cannot use the --default and --branch flags at the same time.'
    ),
    subcommand: (subcommand: string): string => {
        return chalk.red(`Subcommand ${subcommand} does not exist.`);
    },
};

type Errors = typeof errors;
type Error<T extends keyof Errors> = Errors[T];

type ErrorArgs<T extends keyof Errors> = Error<T> extends (
    ...args: infer A
) => string
    ? A[number]
    : never;

export class ErrorLogger {
    static log = (err: string): void => {
        console.log(err);
    };
}

export const error = <T extends keyof Errors>(
    ...args: ErrorArgs<T> extends never ? [T] : [T, ErrorArgs<T>]
): void => {
    const err = errors[args[0]];

    if (typeof err === 'function' && Array.isArray(args)) {
        ErrorLogger.log(err(args as any));
    }

    ErrorLogger.log(err as any);
};
