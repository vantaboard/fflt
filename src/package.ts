import { readPackageUpSync } from 'read-pkg-up';
import { findUpSync } from 'find-up';
import { errors } from './errors.js';

export const root = findUpSync('package.json') ?? '';

if (!root || root === '') {
    console.log(errors.missingroot);
    process.exit(1);
}

export const pkgJson = readPackageUpSync({
    cwd: process.cwd(),
})?.packageJson;
