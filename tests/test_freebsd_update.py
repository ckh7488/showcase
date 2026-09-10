"""Exercise deployment and failure recovery against real temporary Git repositories."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[1]
UPDATER = PROJECT / 'deploy/freebsd/update.py'

@unittest.skipUnless(os.name == 'posix', 'FreeBSD/POSIX integration tests')
class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.repo = self.base / 'repo'
        self.repo.mkdir()
        self.root = self.base / 'web'
        self.git('init', '-b', 'main')
        self.git('config', 'user.name', 'Deployment test')
        self.git('config', 'user.email', 'test@example.invalid')
        shutil.copytree(PROJECT / 'scripts', self.repo / 'scripts', ignore=shutil.ignore_patterns('__pycache__'))
        (self.repo / 'assets').mkdir()
        (self.repo / 'assets/site.css').write_text('body { margin: 0; }', encoding='utf-8')
        report = self.repo / 'reports/demo'
        report.mkdir(parents=True)
        (report / 'index.html').write_text('<h1>Report</h1>', encoding='utf-8')
        (report / 'cover.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg"/>', encoding='utf-8')
        (self.repo / 'index.html').write_text('<a href="reports/demo/">Version 1</a>', encoding='utf-8')
        (self.repo / '.nojekyll').touch()
        (self.repo / 'reports.json').write_text(json.dumps({'version':1,'reports':[{
            'id':'demo','title':'Demo','summary':'Summary','category':'Test','date':'2026-09-10',
            'path':'reports/demo/','cover':'reports/demo/cover.svg','coverAlt':'Demo','tags':[]
        }]}), encoding='utf-8')
        self.first = self.commit()

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.repo, check=True, capture_output=True, text=True).stdout.strip()

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-m', 'Test snapshot')
        return self.git('rev-parse', 'HEAD')

    def update(self, *args, success=True):
        result = subprocess.run([sys.executable, str(UPDATER), '--root', str(self.root),
                                 '--repo', str(self.repo), *args], capture_output=True, text=True)
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def current_commit(self):
        return json.loads((self.root / 'current/.deployment.json').read_text())['commit']

    def test_publish_noop_update_and_rollback(self):
        self.update()
        self.assertEqual(self.current_commit(), self.first)
        self.assertFalse((self.root / 'current/scripts').exists())
        self.assertEqual((self.root / 'current/index.html').stat().st_mode & 0o777, 0o644)
        original = (self.root / 'current').resolve()
        self.assertIn('Already current', self.update().stdout)
        self.assertEqual(len(list((self.root / 'releases').iterdir())), 1)
        (self.repo / 'index.html').write_text('<h1>Version 2</h1>', encoding='utf-8')
        second = self.commit()
        self.update()
        self.assertEqual(self.current_commit(), second)
        self.assertEqual((self.root / 'previous').resolve(), original)
        self.update('--rollback')
        self.assertEqual(self.current_commit(), self.first)
        self.assertIn(self.first, self.update('--status').stdout)
        self.update('--rollback')
        self.assertEqual(self.current_commit(), second)

    def test_broken_asset_keeps_published_site(self):
        self.update()
        original = (self.root / 'current').resolve()
        (self.repo / 'index.html').write_text('<img src="missing.png">', encoding='utf-8')
        self.commit()
        result = self.update(success=False)
        self.assertIn('missing file', result.stderr)
        self.assertEqual((self.root / 'current').resolve(), original)
        self.assertFalse(list(self.root.glob('.stage-*')))

    def test_missing_branch_keeps_published_site(self):
        self.update()
        self.update('--branch', 'does-not-exist', success=False)
        self.assertEqual(self.current_commit(), self.first)

    def test_lock_released_when_process_exits(self):
        import fcntl
        self.root.mkdir()
        with (self.root / '.update.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertIn('Another update', self.update(success=False).stderr)
        self.update()

    def test_refuses_unmanaged_current(self):
        (self.root / 'current').mkdir(parents=True)
        sentinel = self.root / 'current/keep.txt'
        sentinel.write_text('keep')
        self.update(success=False)
        self.assertEqual(sentinel.read_text(), 'keep')

    def test_failed_switch_keeps_current(self):
        self.update()
        original = (self.root / 'current').resolve()
        spec = importlib.util.spec_from_file_location('updater', UPDATER)
        updater = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(updater)
        from unittest.mock import patch
        with patch.object(updater.os, 'replace', side_effect=OSError('simulated rename failure')):
            with self.assertRaises(OSError):
                updater.point_to(self.root, 'current', original)
        self.assertEqual((self.root / 'current').resolve(), original)
        self.assertFalse(list(self.root.glob('.current-*')))

if __name__ == '__main__':
    unittest.main()
