"""Validate collection membership without requiring the production report assets."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('catalog_validation', PROJECT / 'scripts/validate.py')
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)


class CollectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        old_root = validation.ROOT
        self.addCleanup(setattr, validation, 'ROOT', old_root)
        validation.ROOT = self.root
        (self.root / 'assets').mkdir()
        (self.root / 'assets/theme.v1.css').write_text('', encoding='utf-8')
        (self.root / 'index.html').write_text('', encoding='utf-8')
        report = self.root / 'reports/demo'
        report.mkdir(parents=True)
        (report / 'index.html').write_text('<link rel="stylesheet" href="../../assets/theme.v1.css">', encoding='utf-8')
        (report / 'cover.png').write_bytes(b'fixture')
        self.report = {'id':'demo','title':'Demo','summary':'Example','category':'Test','date':'2026-09-12','path':'reports/demo/','cover':'reports/demo/cover.png','coverAlt':'Example','tags':[]}
        self.manifest = {'version':1,'reports':[self.report]}

    def check(self):
        (self.root / 'reports.json').write_text(json.dumps(self.manifest), encoding='utf-8')
        with contextlib.redirect_stdout(io.StringIO()) as output:
            valid = validation.validate()
        return valid, output.getvalue()

    def test_legacy_reports_need_no_collection(self):
        self.assertTrue(self.check()[0])

    def test_registered_collection_and_ungrouped_reports_coexist(self):
        self.manifest['collections'] = [{'id':'emc','title':'EMC','summary':'Learning'}]
        self.assertTrue(self.check()[0])
        self.report['collection'] = 'emc'
        self.assertTrue(self.check()[0])

    def test_unknown_membership_is_rejected_instead_of_hiding_report(self):
        self.report['collection'] = 'missing'
        valid, output = self.check()
        self.assertFalse(valid)
        self.assertIn('unknown collection', output)

    def test_duplicate_reserved_and_malformed_ids_are_rejected(self):
        for ids in [('emc','emc'), ('other',), ('../emc',)]:
            with self.subTest(ids=ids):
                self.manifest['collections'] = [{'id':value,'title':'EMC','summary':'Learning'} for value in ids]
                self.assertFalse(self.check()[0])

    def test_invalid_membership_type_is_a_validation_error(self):
        self.report['collection'] = ['emc']
        self.assertFalse(self.check()[0])


if __name__ == '__main__':
    unittest.main()
