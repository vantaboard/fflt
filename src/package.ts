import { readPackageUpSync } from 'read-pkg-up';
import { findUpSync } from 'find-up';
import { error } from './errors.js';

export const root = findUpSync('package.json') ?? '';

if (!root || root === '') {
    error('missingroot');
    process.exit(1);
}

export const pkgJson = readPackageUpSync({
    cwd: process.cwd(),
})?.packageJson;
