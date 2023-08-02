import meow from 'meow';
import { error } from './errors.js';
import { config, handleCreateConfig } from './config.js';
import { handleCommands } from './commands.js';

function isValidIgnorePattern(pattern: string): boolean {
    const regex = new RegExp(
        `(^\\/)|((\\/(([gmiyvsdu]?)${Array.from({ length: 7 })
            .map((_, i) => `((?!\\${i * 2 + 5})([gmiyvsdu]?))?`)
            .join('')})?)$)`,
        'g'
    );
    return !regex.test(pattern);
}

const cli = meow(
    `
	Usage
	  $ fflt init

	Options
	  --version, -v  Show version
      --cached, -c   Include cached files
      --default, -d  Use default branch
      --branch, -b   Name of branch to use
      --root, -r     Use git root
      --ignore, -i   Ignore pattern (regex)
`,
    {
        importMeta: import.meta,
        flags: {
            cached: {
                type: 'boolean',
                shortFlag: 'c',
                default: config.include_cached,
            },
            default: {
                type: 'boolean',
                shortFlag: 'd',
            },
            branch: {
                type: 'string',
                shortFlag: 'b',
            },
            root: {
                type: 'boolean',
                shortFlag: 'r',
            },
            ignore: {
                type: 'string',
                shortFlag: 'i',
                default: config.ignore_pattern,
            },
        },
    }
);

const fftl = async (flags: typeof cli.flags, ...args: string[]) => {
    const [base] = args;

    if (base === 'init') {
        await handleCreateConfig();
    }

    if (base === 'command') {
        await handleCommands<typeof cli.flags>(args.slice(1), flags, config);
    }
};

void (async () => {
    if (!cli.input.length) {
        console.log(cli.showHelp());
        return 0;
    }

    if (!isValidIgnorePattern(cli.flags.ignore)) {
        error('ignore', cli.flags.ignore);
        process.exit(1);
    }

    if (cli.flags.default && cli.flags.branch !== undefined) {
        error('defbranchflags');
        process.exit(1);
    }

    await fftl(cli.flags, ...cli.input);
})();
