import chalk from 'chalk';

export function highlightChars(str: string, indices: Set<number>): string {
    const chars = str.split('');

    return chars
        .map((char, i) => {
            if (indices.has(i)) {
                return chalk.bold(chalk.yellow(char));
            }

            return char;
        })
        .join('');
}
