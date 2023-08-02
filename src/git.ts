import spawn from 'cross-spawn';
import path from 'node:path';
import { errors } from './errors.js';

if (spawn.sync('git', ['--version']).error) {
    console.log(errors.gitinstall);
    process.exit(1);
}

export function getBranches(): string[] {
    const branches = spawn.sync('git', ['branch', '-a'], {
        encoding: 'utf8',
    }).stdout;

    const cleanBranches = branches.replace(
        /^[\\+\s\\*]\s(remotes\/.+\/)?/gm,
        ''
    );

    const uniqBranches = [...new Set(cleanBranches.split('\n'))].filter(
        branch => branch !== ''
    );
    const mainBranches = uniqBranches.filter(branch =>
        ['master', 'main', 'root', 'primary'].includes(branch)
    );
    const sortedBranches = uniqBranches
        .filter(
            branch => !['master', 'main', 'root', 'primary'].includes(branch)
        )
        .sort((a, b) => a.localeCompare(b));

    return [...mainBranches, ...sortedBranches];
}

interface GetDiffFilesOptions {
    branch: string;
    ignorePattern?: string;
    includeCached?: boolean;
    fromRoot?: boolean;
}

export function getDiffFiles(options: GetDiffFilesOptions): string[] {
    const {
        branch,
        ignorePattern = '',
        includeCached = true,
        fromRoot = false,
    } = options;
    const gitRoot = spawn
        .sync('git', ['rev-parse', '--show-toplevel'], {
            encoding: 'utf8',
        })
        .stdout.slice(0, -1);
    const cwd = `${process.cwd().replace(gitRoot, '').slice(1)}/`;

    const ignore = new RegExp(ignorePattern, 'ig');

    const diffFiles = spawn.sync(
        'git',
        ['diff', '--name-only', branch, '--diff-filter=ACMRTUB'].filter(
            Boolean
        ),
        {
            encoding: 'utf8',
        }
    ).stdout;

    const cachedDiffFiles = includeCached
        ? spawn.sync(
              'git',
              [
                  'diff',
                  '--name-only',
                  '--cached',
                  branch,
                  '--diff-filter=ACMRTUB',
              ].filter(Boolean),
              {
                  encoding: 'utf8',
              }
          ).stdout
        : '';

    const diffFilesArray = diffFiles.split('\n').filter(Boolean);
    const cachedDiffFilesArray = cachedDiffFiles.split('\n').filter(Boolean);

    const combinedDiffFilesArray = [...diffFilesArray, ...cachedDiffFilesArray];

    const ignoreDiffFiles = combinedDiffFilesArray.filter(
        file => !file.match(ignore)
    );

    const filteredDiffFiles = ignoreDiffFiles.filter(file =>
        fromRoot ? true : file.startsWith(cwd)
    );
    const cwdSlashCount = cwd.split('/').length - 1;
    const upDir = '../'.repeat(cwdSlashCount);
    const joinUpDir = (file: string) => path.join(upDir, file);

    const formattedDiffFiles = filteredDiffFiles.map(file =>
        fromRoot ? joinUpDir(file.replace(gitRoot, '')) : file.replace(cwd, '')
    );

    return [...new Set(formattedDiffFiles)];
}
