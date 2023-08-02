import chalk from 'chalk';
import dedent from 'ts-dedent';

export const errors = {
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
    noselectable: chalk.red(
        '[select prompt] No selectable choices. All choices are disabled.'
    ),
};
