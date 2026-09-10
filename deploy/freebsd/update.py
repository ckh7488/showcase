"""Publish a validated Git snapshot using an atomic current symlink (FreeBSD/POSIX)."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid

DEFAULT_REPO = 'https://github.com/ckh7488/showcase.git'
DEFAULT_ROOT = '/usr/local/www/showcase'

def run(args, cwd=None):
    env = os.environ.copy()
    env['GIT_TERMINAL_PROMPT'] = '0'
    return subprocess.run(args, cwd=cwd, env=env, check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180)

@contextmanager
def locked(root):
    import fcntl
    # Keep this file: unlinking a flock file can allow two simultaneous lock holders.
    with (root / '.update.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('Another update is running. Try again when it finishes.')
        yield

def release_at(root, name):
    link = root / name
    if not link.is_symlink():
        if link.exists():
            raise RuntimeError(f'{link} exists but is not a managed symlink; refusing to replace it.')
        return None
    target = link.resolve(strict=True)
    if target.parent != root / 'releases' or not (target / '.deployment.json').is_file():
        raise RuntimeError(f'{link} does not point to a managed release.')
    return target

def point_to(root, name, target):
    temporary = root / ('.' + name + '-' + uuid.uuid4().hex)
    try:
        temporary.symlink_to(target.relative_to(root), target_is_directory=True)
        os.replace(temporary, root / name)
    finally:
        temporary.unlink(missing_ok=True)

def activate(root, release):
    current = release_at(root, 'current')
    release_at(root, 'previous')
    if current == release:
        return
    if current:
        point_to(root, 'previous', current)
    point_to(root, 'current', release)

def metadata(release):
    return json.loads((release / '.deployment.json').read_text(encoding='utf-8'))

def publish(root, repository, branch):
    current = release_at(root, 'current')
    release_at(root, 'previous')
    print(f'Fetching {branch}...', flush=True)
    with tempfile.TemporaryDirectory(prefix='.stage-', dir=root) as stage:
        source = Path(stage) / 'source'
        run(['git', 'clone', '--quiet', '--depth', '1', '--single-branch', '--branch',
             branch, '--', repository, str(source)])
        commit = run(['git', 'rev-parse', 'HEAD'], cwd=source).stdout.strip()
        if current and metadata(current).get('commit') == commit:
            print(f'Already current: {commit[:12]}')
            return
        print(f'Validating and building {commit[:12]}...', flush=True)
        result = run([sys.executable, 'scripts/build.py'], cwd=source)
        print(result.stdout.strip())
        site = source / '_site'
        if not (site / 'index.html').is_file() or not (site / 'reports.json').is_file():
            raise RuntimeError('Build did not produce index.html and reports.json.')
        if any(p.is_symlink() for p in site.rglob('*')):
            raise RuntimeError('Published content must not contain symlinks.')
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        (site / '.deployment.json').write_text(json.dumps({
            'commit': commit, 'branch': branch, 'published_utc': stamp
        }, indent=2) + '\n', encoding='utf-8')
        # A root/deploy-user umask of 077 must not hide files from the web worker.
        for path in [site, *site.rglob('*')]:
            path.chmod(0o755 if path.is_dir() else 0o644)
        releases = root / 'releases'
        releases.mkdir(exist_ok=True)
        releases.chmod(0o755)
        release = releases / (stamp + '-' + commit[:12] + '-' + uuid.uuid4().hex[:8])
        os.replace(site, release)
        activate(root, release)
        print(f'Published: {commit[:12]}\nWeb root: {root / "current"}')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default=DEFAULT_ROOT, help='Managed deployment directory')
    parser.add_argument('--repo', default=DEFAULT_REPO, help='Repository URL or local path')
    parser.add_argument('--branch', default='main', help='Branch to publish')
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--rollback', action='store_true', help='Swap current and previous releases')
    action.add_argument('--status', action='store_true', help='Show published commits without fetching')
    args = parser.parse_args()
    if os.name != 'posix':
        parser.error('Run this updater inside a FreeBSD jail or another POSIX system.')
    root = Path(args.root).expanduser().resolve()
    if root == Path(root.anchor):
        parser.error('--root must be a dedicated site directory, not the filesystem root')
    if not root.exists():
        root.mkdir(parents=True, mode=0o755)
        root.chmod(0o755)
    try:
        with locked(root):
            if args.status:
                for name in ('current', 'previous'):
                    release = release_at(root, name)
                    print(name + ': ' + (json.dumps(metadata(release)) if release else '(none)'))
            elif args.rollback:
                previous = release_at(root, 'previous')
                if not previous:
                    raise RuntimeError('No previous release is available.')
                activate(root, previous)
                print('Rolled back to: ' + metadata(previous)['commit'][:12])
            else:
                publish(root, args.repo, args.branch)
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        print('Update failed: ' + str(error), file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError):
            print(error.stdout or '', file=sys.stderr)
            print(error.stderr or '', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
