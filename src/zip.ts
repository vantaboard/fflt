export type ZippedType<T, U> = [T, U][];

export default function zip<T, U>(a: T[], b: U[]): ZippedType<T, U> {
    return a.map((item, i) => [item, b[i]]);
}
