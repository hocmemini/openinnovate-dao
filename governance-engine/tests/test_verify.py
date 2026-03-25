#!/usr/bin/env python3
"""
Tests for verify.py — all verification types.

Run: python -m pytest governance-engine/tests/test_verify.py -v
  or: python governance-engine/tests/test_verify.py
"""

import json
import os
import sys
import tempfile
import unittest
from hashlib import sha3_256 as keccak256
from pathlib import Path

# Add parent to path so we can import verify module functions
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from verify import (
    VerificationResult,
    verify_file_exists,
    verify_hash_match,
    verify_content_header,
    verify_corpus_integrity,
    verify_execution_record,
    verify_decision_hash,
    classify_result,
    format_results_for_issue,
    ROOT,
    CORPUS_DIR,
    MANIFEST_FILE,
)


class TestVerificationResult(unittest.TestCase):
    def test_pass_str(self):
        r = VerificationResult("test_check", True, "all good")
        self.assertIn("[PASS]", str(r))
        self.assertIn("test_check", str(r))

    def test_fail_str(self):
        r = VerificationResult("test_check", False, "broken")
        self.assertIn("[FAIL]", str(r))

    def test_no_detail(self):
        r = VerificationResult("check", True)
        self.assertNotIn("—", str(r))


class TestFileExists(unittest.TestCase):
    def test_existing_file(self):
        r = verify_file_exists("CLAUDE.md")
        self.assertTrue(r.passed)

    def test_missing_file(self):
        r = verify_file_exists("nonexistent-file-xyz.txt")
        self.assertFalse(r.passed)
        self.assertIn("NOT FOUND", r.detail)


class TestHashMatch(unittest.TestCase):
    def setUp(self):
        self.tmpfile = tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False, dir=ROOT
        )
        self.tmpfile.write("test content for hashing")
        self.tmpfile.close()
        self.rel_path = os.path.relpath(self.tmpfile.name, ROOT)
        with open(self.tmpfile.name, "rb") as f:
            self.expected_hash = "0x" + keccak256(f.read()).hexdigest()

    def tearDown(self):
        os.unlink(self.tmpfile.name)

    def test_matching_hash(self):
        r = verify_hash_match(self.rel_path, self.expected_hash)
        self.assertTrue(r.passed)
        self.assertIn("hashes match", r.detail)

    def test_wrong_hash(self):
        r = verify_hash_match(self.rel_path, "0xdeadbeef" + "0" * 56)
        self.assertFalse(r.passed)
        self.assertIn("expected", r.detail)

    def test_missing_file(self):
        r = verify_hash_match("no-such-file.txt", "0x" + "0" * 64)
        self.assertFalse(r.passed)
        self.assertIn("file not found", r.detail)


class TestContentHeader(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp(dir=CORPUS_DIR)
        self.tmpfile = Path(self.tmpdir) / "test-doc.txt"

    def tearDown(self):
        if self.tmpfile.exists():
            self.tmpfile.unlink()
        os.rmdir(self.tmpdir)

    def test_matching_header(self):
        self.tmpfile.write_text(
            "# Governance and Democracy Principles\n"
            "# Author: Test\n\n"
            "This document discusses governance and democracy in detail.\n"
            "The principles of governance are fundamental to democracy.\n"
        )
        rel = str(self.tmpfile.relative_to(CORPUS_DIR))
        r = verify_content_header(rel)
        self.assertTrue(r.passed)

    def test_no_header(self):
        self.tmpfile.write_text("Just some text with no header line.\n")
        rel = str(self.tmpfile.relative_to(CORPUS_DIR))
        r = verify_content_header(rel)
        self.assertFalse(r.passed)
        self.assertIn("no title header", r.detail)

    def test_missing_file(self):
        r = verify_content_header("nonexistent/path.txt")
        self.assertFalse(r.passed)


class TestCorpusIntegrity(unittest.TestCase):
    def test_runs_without_error(self):
        """Corpus integrity check should run against actual manifest."""
        if not MANIFEST_FILE.exists():
            self.skipTest("No manifest.json found")
        results = verify_corpus_integrity()
        self.assertGreater(len(results), 0)
        # At minimum, manifest hash should pass
        manifest_results = [r for r in results if "manifest_hash" in r.check_name]
        self.assertTrue(any(r.passed for r in manifest_results))

    def test_all_corpus_files_pass(self):
        """All corpus files should exist with correct hashes. Content header
        is a self-attestation heuristic — only fail on hash/existence checks."""
        if not MANIFEST_FILE.exists():
            self.skipTest("No manifest.json found")
        results = verify_corpus_integrity()
        # Only fail on deterministic checks (hash, existence), not content_header heuristics
        hard_failures = [
            r for r in results if not r.passed
            and classify_result(r) == "deterministic"
        ]
        self.assertEqual(
            len(hard_failures), 0,
            f"Deterministic check failures: {[str(r) for r in hard_failures]}"
        )


class TestExecutionRecord(unittest.TestCase):
    def test_valid_record(self):
        """Test verification of an actual execution record."""
        exec_dir = ROOT / "governance" / "executions"
        records = list(exec_dir.glob("*.json")) if exec_dir.exists() else []
        if not records:
            self.skipTest("No execution records found")
        results = verify_execution_record(str(records[0].relative_to(ROOT)))
        self.assertGreater(len(results), 0)
        # Should at least find the decision ID
        id_results = [r for r in results if "decision_id" in r.check_name]
        self.assertTrue(any(r.passed for r in id_results))

    def test_missing_record(self):
        results = verify_execution_record("governance/executions/nonexistent.json")
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0].passed)


class TestDecisionHash(unittest.TestCase):
    def test_valid_decision(self):
        """Test hash computation of an actual decision file."""
        dec_dir = ROOT / "governance" / "decisions"
        decisions = list(dec_dir.glob("*.json")) if dec_dir.exists() else []
        if not decisions:
            self.skipTest("No decision files found")
        results = verify_decision_hash(str(decisions[0].relative_to(ROOT)))
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0].passed)
        self.assertIn("keccak256:", results[0].detail)

    def test_missing_decision(self):
        results = verify_decision_hash("governance/decisions/nonexistent.json")
        self.assertFalse(results[0].passed)


class TestClassifyResult(unittest.TestCase):
    def test_deterministic(self):
        r = VerificationResult("file_exists: foo.txt", True)
        self.assertEqual(classify_result(r), "deterministic")

        r = VerificationResult("hash_match: foo.txt", True)
        self.assertEqual(classify_result(r), "deterministic")

        r = VerificationResult("corpus_hash: tier-1/doc.txt", True)
        self.assertEqual(classify_result(r), "deterministic")

    def test_self_attestation(self):
        r = VerificationResult("condition: must do X", True)
        self.assertEqual(classify_result(r), "self-attestation")

        r = VerificationResult("content_header: doc.txt", True)
        self.assertEqual(classify_result(r), "self-attestation")

    def test_other(self):
        r = VerificationResult("execution_has_decision_id", True)
        self.assertEqual(classify_result(r), "other")


class TestFormatResultsForIssue(unittest.TestCase):
    def test_all_pass(self):
        results = [
            VerificationResult("file_exists: a.txt", True, "found"),
            VerificationResult("hash_match: a.txt", True, "matches"),
        ]
        md = format_results_for_issue(results)
        self.assertIn("ALL PASSED", md)
        self.assertIn("Recommendation", md)
        self.assertIn("may close", md)

    def test_with_failures(self):
        results = [
            VerificationResult("file_exists: a.txt", True, "found"),
            VerificationResult("hash_match: a.txt", False, "mismatch"),
        ]
        md = format_results_for_issue(results)
        self.assertIn("1 FAILED", md)
        self.assertIn("Do NOT close", md)

    def test_separates_deterministic_and_attestation(self):
        results = [
            VerificationResult("hash_match: a.txt", True, "ok"),
            VerificationResult("condition: do X", True, "SATISFIED"),
        ]
        md = format_results_for_issue(results)
        self.assertIn("Deterministic Checks", md)
        self.assertIn("Self-Attestation Checks", md)


if __name__ == "__main__":
    unittest.main()
