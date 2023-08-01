import {
    createPrompt,
    useState,
    useKeypress,
    usePrefix,
    usePagination,
    isEnterKey,
    isUpKey,
    isDownKey,
    Separator,
    isSpaceKey,
} from '@inquirer/core';
import type {} from '@inquirer/type';
import chalk from 'chalk';
import figures from 'figures';
import ansiEscapes from 'ansi-escapes';
import { extendedMatch, Fzf } from 'fzf';
import { highlightChars } from './highlight.js';

export type FZFCheckboxChoice<Value> = Pick<
    CheckboxChoice<Value>,
    'value' | 'description'
>;

export type CheckboxChoice<Value> = {
    name?: string;
    index?: number;
    value: Value;
    description?: string;
    disabled?: boolean | string;
    checked?: boolean;
    type?: never;
};

type CheckboxConfig<Value> = {
    prefix?: string;
    pageSize?: number;
    instructions?: string | boolean;
    message: string;
    choices: ReadonlyArray<CheckboxChoice<Value> | Separator>;
};

function isSelectableCheckboxChoice<T>(
    choice: undefined | Separator | CheckboxChoice<T>
): choice is CheckboxChoice<T> {
    return choice != null && !Separator.isSeparator(choice) && !choice.disabled;
}

export const checkbox = createPrompt(
    <Value extends unknown>(
        config: CheckboxConfig<Value>,
        done: (value: Array<Value>) => void
    ): string => {
        const { prefix = usePrefix(), instructions } = config;
        const [value, setValue] = useState<string>('');
        const [status, setStatus] = useState('pending');
        const [cursorPosition, setCursorPosition] = useState(0);
        const [finding, setFinding] = useState(false);
        const [checked, setChecked] = useState<boolean[]>(
            config.choices.map(choice => {
                if (Separator.isSeparator(choice)) {
                    return false;
                }

                return choice.checked ?? false;
            })
        );

        const fzfChoices = config.choices.reduce((acc, choice) => {
            if (Separator.isSeparator(choice)) {
                return acc;
            }

            return [
                ...acc,
                {
                    value: choice.value,
                    description: choice.description,
                },
            ];
        }, [] as FZFCheckboxChoice<Value>[]);

        const fzf = new Fzf(fzfChoices, {
            match: extendedMatch,
            selector: item => `${item.value} ${item.description}`,
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

        const filteredChoices = config.choices
            .map((choice, index) => ({ ...choice, index }))
            .filter(choice => {
                if (Separator.isSeparator(choice)) {
                    return false;
                }

                for (const entry of entries) {
                    for (const value of Object.values(entry.item)) {
                        if (
                            value === choice.description ||
                            value === choice.value
                        ) {
                            return true;
                        }
                    }
                }
            });

        const allChoices = filteredChoices
            .map((choice, index) => {
                if (Separator.isSeparator(choice)) {
                    return ` ${choice.separator}`;
                }

                const entry = entries.find(
                    entry =>
                        entry.item.value === choice.value ||
                        entry.item.description === choice.description
                );

                if (!entry) {
                    return;
                }

                const line = highlightChars(
                    (entry.item.value as string).normalize(),
                    entry.positions
                );

                if (choice.disabled) {
                    const disabledLabel =
                        typeof choice.disabled === 'string'
                            ? choice.disabled
                            : '(disabled)';
                    return chalk.dim(`- ${line} ${disabledLabel}`);
                }

                if (choice.index === undefined) {
                    return;
                }

                const checkbox = checked[choice.index]
                    ? chalk.green(figures.circleFilled)
                    : chalk.gray(figures.circleFilled);
                if (index === cursorPosition) {
                    return chalk.cyan(`${figures.pointer} ${checkbox} ${line}`);
                }

                return `  ${checkbox} ${line}`;
            })
            .join('\n');

        const windowedChoices = usePagination(allChoices, {
            active: cursorPosition,
            pageSize: config.pageSize,
        });

        useKeypress((key, rl) => {
            if (isSpaceKey(key) && !finding) {
                try {
                    setChecked(
                        checked.map((c, i) =>
                            i === filteredChoices[cursorPosition].index ? !c : c
                        )
                    );
                } catch (e) {
                    console.log({ filteredChoices, cursorPosition, checked });
                    throw e;
                }

                return;
            }

            if (!isEnterKey(key) && rl.line !== value && finding) {
                setCursorPosition(0);
                setValue(rl.line);
            }

            let newCursorPosition = cursorPosition;
            if (isEnterKey(key) && finding) {
                setFinding(false);
                return;
            }

            if (key.name === 'f' && !finding) {
                rl.clearLine(0);
                setFinding(true);
                return;
            }

            if (key.name === 'r' && !finding) {
                rl.clearLine(0);
                setValue('');
                return;
            }

            if (isEnterKey(key) && !finding) {
                setStatus('done');
                done(
                    config.choices
                        .filter(
                            choice =>
                                isSelectableCheckboxChoice(choice) &&
                                choice.checked
                        )
                        .map(choice => (choice as CheckboxChoice<Value>).value)
                );

                return;
            }

            if (!finding && (isUpKey(key) || isDownKey(key))) {
                const offset = isUpKey(key) ? -1 : 1;

                const selectableChoices = filteredChoices.filter(choice =>
                    isSelectableCheckboxChoice(choice)
                );

                if (selectableChoices.length === 0) {
                    return;
                }

                newCursorPosition = cursorPosition + offset;
                if (newCursorPosition < 0) {
                    newCursorPosition = selectableChoices.length - 1;
                }

                if (newCursorPosition >= selectableChoices.length) {
                    newCursorPosition = 0;
                }
                setCursorPosition(newCursorPosition);

                return;
            }
        });

        const message = chalk.bold(config.message);

        if (status === 'done') {
            const selection = filteredChoices
                .filter(
                    choice =>
                        isSelectableCheckboxChoice(choice) && choice.checked
                )
                .map(
                    choice =>
                        (choice as CheckboxChoice<Value>).name ||
                        (choice as CheckboxChoice<Value>).value
                );
            return `${prefix} ${message} ${chalk.cyan(selection.join(', '))}`;
        }

        let helpTip = '';
        if (typeof instructions === 'string') {
            helpTip = instructions;
        } else {
            const keys = [
                `${chalk.cyan.bold('<space>')} to select`,
                `and ${chalk.cyan.bold('<enter>')} to proceed`,
                `and ${chalk.cyan.bold('<f>')} to find`,
                `and ${chalk.cyan.bold('<r>')} to clear`,
            ];
            helpTip = ` (Press ${keys.join(', ')})`;
        }

        const choice = filteredChoices[cursorPosition] as CheckboxChoice<Value>;

        const choiceDescription =
            choice?.description && filteredChoices.length
                ? `\n${choice.description}`
                : '';

        return `${prefix} ${message}${
            !finding ? helpTip : ''
        } \n${windowedChoices}${choiceDescription}\n\n${chalk.magenta(
            value
                ? `\uD83D\uDD0D ${finding ? 'Finding' : 'Found'}: ${value}`
                : finding
                ? '\uD83D\uDD0D ...'
                : ''
        )}${ansiEscapes.cursorHide}`;
    }
);
