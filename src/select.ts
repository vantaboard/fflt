import {
    createPrompt,
    useState,
    useKeypress,
    usePrefix,
    usePagination,
    useRef,
    isEnterKey,
    isUpKey,
    isDownKey,
    Separator,
    AsyncPromptConfig,
} from '@inquirer/core';
import type {} from '@inquirer/type';
import chalk, { ChalkInstance } from 'chalk';
import figures from 'figures';
import ansiEscapes from 'ansi-escapes';
import { extendedMatch, Fzf } from 'fzf';
import zip from './zip.js';
import { highlightChars } from './highlight.js';

export type FZFSelectChoice<Value> = Pick<
    SelectChoice<Value>,
    'value' | 'name'
>;

type BrightColors = keyof Pick<
    ChalkInstance,
    | 'blackBright'
    | 'redBright'
    | 'greenBright'
    | 'yellowBright'
    | 'blueBright'
    | 'magentaBright'
    | 'cyanBright'
    | 'whiteBright'
>;

export type SelectChoice<Value> = {
    value: Value;
    name?: string;
    description?: string;
    color?: keyof Pick<
        ChalkInstance,
        | 'black'
        | 'red'
        | 'green'
        | 'yellow'
        | 'blue'
        | 'magenta'
        | 'cyan'
        | 'white'
    >;
    disabled?: boolean | string;
    type?: never;
};

export type SelectConfig<Value> = AsyncPromptConfig & {
    choices: ReadonlyArray<SelectChoice<Value> | Separator>;
    pageSize?: number;
};

function isSelectableSelectChoice<T>(
    choice: undefined | Separator | SelectChoice<T>
): choice is SelectChoice<T> {
    return choice != null && !Separator.isSeparator(choice) && !choice.disabled;
}

export const select = createPrompt(
    <Value extends string>(
        config: SelectConfig<Value>,
        done: (value: Value) => void
    ): string => {
        const { choices } = config;
        const firstRender = useRef(true);
        const [value, setValue] = useState<string>('');
        const prefix = usePrefix();
        const [status, setStatus] = useState('pending');

        const fzfChoices = config.choices.reduce((acc, choice) => {
            if (Separator.isSeparator(choice)) {
                return acc;
            }

            return [
                ...acc,
                {
                    name: choice.name,
                    value: choice.value,
                },
            ];
        }, [] as FZFSelectChoice<Value>[]);

        const fzf = new Fzf(fzfChoices, {
            match: extendedMatch,
            selector: item => `${item.name} ${item.value}`,
            tiebreakers: [
                (a, b, selector) => {
                    return (
                        selector(a.item).trim().length -
                        selector(b.item).trim().length
                    );
                },
            ],
        });

        const entries = fzf.find(value);

        const filteredChoices = choices.filter(choice => {
            if (Separator.isSeparator(choice)) {
                return false;
            }

            for (const entry of entries) {
                for (const value of Object.values(entry.item)) {
                    if (value === choice.name || value === choice.value) {
                        return true;
                    }
                }
            }
        });

        const filteredChoicesWithEntries = zip(filteredChoices, entries);

        const [cursorPosition, setCursorPos] = useState(() => {
            const startIndex = filteredChoices.findIndex(
                isSelectableSelectChoice
            );
            if (startIndex < 0) {
                throw new Error(
                    '[select prompt] No selectable choices. All choices are disabled.'
                );
            }

            return startIndex;
        });

        const choice = filteredChoices[cursorPosition] as SelectChoice<Value>;

        useKeypress((key, rl) => {
            ['SIGINT', 'SIGTERM', 'SIGQUIT', 'exit'].forEach(eventType => {
                process.on(eventType, () => {
                    process.stdout.write(ansiEscapes.cursorShow);
                });
            });

            if (rl.line !== value) {
                setValue(rl.line);
            }

            if (isEnterKey(key) && choice) {
                setStatus('done');
                done(choice.value);

                return;
            }

            if (
                key.name !== 'i' &&
                key.name !== 'j' &&
                (isUpKey(key) || isDownKey(key))
            ) {
                let newCursorPosition = cursorPosition;
                const offset = isUpKey(key) ? -1 : 1;
                let selectedOption;

                while (!isSelectableSelectChoice(selectedOption)) {
                    newCursorPosition =
                        (newCursorPosition + offset + filteredChoices.length) %
                        filteredChoices.length;
                    selectedOption = filteredChoices[newCursorPosition];
                }

                setCursorPos(newCursorPosition);
                return;
            }
        });

        let message: string = chalk.bold(config.message);
        if (firstRender.current) {
            message += chalk.dim(' (Use arrow keys)');
            firstRender.current = false;
        }

        const allChoices = filteredChoicesWithEntries
            .map(([choice, entry], index): string => {
                if (Separator.isSeparator(choice)) {
                    return ` ${choice.separator}`;
                }

                const color = choice.color;
                const brightColor =
                    color && color + 'Bright' in chalk
                        ? ((color + 'Bright') as BrightColors)
                        : undefined;

                const unhighlightedLine = (
                    choice.name || choice.value
                ).normalize();
                const maybeColoredLine = color
                    ? chalk[color](unhighlightedLine)
                    : unhighlightedLine;
                const line = highlightChars(maybeColoredLine, entry.positions);

                if (choice.disabled) {
                    const disabledLabel =
                        typeof choice.disabled === 'string'
                            ? choice.disabled
                            : '(disabled)';
                    return chalk.dim(`- ${line} ${disabledLabel}`);
                }

                if (index === cursorPosition) {
                    return `${figures.pointer} ${chalk[brightColor ?? 'cyan'](
                        line
                    )}`;
                }

                return `  ${line}`;
            })
            .join('\n');

        const windowedChoices = allChoices.length
            ? usePagination(allChoices, {
                  active: cursorPosition,
                  pageSize: config.pageSize,
              })
            : `  ${chalk.red('No matches found')}`;

        if (status === 'done') {
            return `${prefix} ${message} ${chalk.cyan(
                choice.name || choice.value
            )}`;
        }

        const choiceDescription =
            choice?.description && filteredChoices.length
                ? chalk.blue(`\n${choice.description}`)
                : '';

        return `${prefix} ${message} ${value}\n${windowedChoices}${choiceDescription}${ansiEscapes.cursorHide}`;
    }
);
