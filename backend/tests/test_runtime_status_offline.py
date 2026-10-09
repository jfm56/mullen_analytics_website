"""Offline regression checks for misleading storage health reports."""
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location(
    "runtime_status", Path(__file__).parents[1] / "app/services/runtime_status.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RuntimeStatusTests(unittest.TestCase):
    def settings(self, root, **overrides):
        values = dict(environment="production", storage_backend="s3",
                      data_uploads_root=root, data_storage_root=root,
                      aws_s3_bucket="synthetic-bucket", aws_region="us-east-2")
        values.update(overrides)
        return SimpleNamespace(**values)

    def test_metadata_uses_runtime_bucket(self):
        self.assertEqual(module.storage_metadata(self.settings("/missing"))["s3_bucket"],
                         "synthetic-bucket")

    def test_s3_reachable_with_persistent_paths(self):
        client = SimpleNamespace(head_bucket=lambda **kwargs: {})
        with TemporaryDirectory() as root:
            result = module.check_storage(self.settings(root), client)
        self.assertEqual(result["storage"], "ok")
        self.assertEqual(result["storage_checks"]["s3"], "reachable")

    def test_s3_does_not_mask_missing_legacy_paths(self):
        client = SimpleNamespace(head_bucket=lambda **kwargs: {})
        result = module.check_storage(self.settings("/does-not-exist-synthetic"), client)
        self.assertEqual(result["storage"], "warning")

    def test_sdk_error_is_redacted(self):
        def fail(**kwargs):
            raise RuntimeError("synthetic-secret-must-not-escape")
        result = module.check_storage(self.settings("/missing"),
                                      SimpleNamespace(head_bucket=fail))
        self.assertEqual(result["storage_checks"]["s3"], "error")
        self.assertNotIn("synthetic-secret", str(result))

    def test_local_requires_both_directories(self):
        with TemporaryDirectory() as root:
            settings = self.settings(root, storage_backend="local",
                                     data_storage_root=str(Path(root) / "missing"))
            self.assertEqual(module.check_storage(settings)["storage"], "warning")

    def test_missing_bucket_is_not_healthy(self):
        with TemporaryDirectory() as root:
            result = module.check_storage(self.settings(root, aws_s3_bucket=""))
        self.assertEqual(result["storage_checks"]["s3"], "not_configured")


if __name__ == "__main__":
    unittest.main()
