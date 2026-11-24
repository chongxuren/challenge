import unittest

from ci.publish import update
from judge.presentation import read_writeup, validate_paper


class PublicWriteupTests(unittest.TestCase):
    def test_public_paragraph(self):
        raw = "# My construction\r\n\r\nFirst line\r\ncontinues here.\r\n\r\nProof details.".encode()
        self.assertEqual(read_writeup(raw), {"title": "My construction", "summary": "First line continues here."})
        self.assertEqual(read_writeup("长度下界为 99 字节。".encode())["title"], "")
        for raw in [b"# Heading only\n", b"\xff", b"x"*1201, b"text\x00here"]:
            with self.subTest(raw=raw[:20]), self.assertRaises(ValueError):
                read_writeup(raw)

    def test_paper(self):
        validate_paper("https://eprint.iacr.org/2026/2502")
        for url in ["javascript:alert(1)", "http://example.org/p", "https://a:b@x/p", None]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_paper(url)

    def test_retry_and_out_of_order_finish(self):
        a, b, c = ({"pr": 1, "run": 20}, {"pr": 2, "run": 30}, {"pr": 1, "run": 40})
        rows = update(update([], b), a)
        self.assertEqual(rows, [a,b])
        self.assertEqual(update(rows,a), rows)
        self.assertEqual(update(update(rows,c),a), [b,c])
