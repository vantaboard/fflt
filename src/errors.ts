import dedent from 'ts-dedent';

export const errors = {
    ignore: (pattern: string): Error => {
        return new Error(dedent`
            The ignore pattern ${pattern} must not start with a slash and/or
            end with a slash followed by flags.
        `);
    },
    gitinstall: new Error('Git is not installed'),
    missingroot: new Error(
        'Could not find root. Root must have a package.json.'
    ),
    defbranchflags: new Error(
        'You cannot use the --default and --branch flags at the same time.'
    ),
    subcommand: (subcommand: string): Error => {
        return new Error(`Subcommand ${subcommand} does not exist.`);
    },
    noselectable: new Error(
        '[select prompt] No selectable choices. All choices are disabled.'
    ),
};
