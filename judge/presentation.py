"""Read the public, author-supplied presentation. The Lean goal is independent."""
import re
from urllib.parse import urlsplit


def read_writeup(raw):
    try:
        text = raw.decode("utf-8-sig").strip()
    except UnicodeDecodeError as exc:
        raise ValueError("ARGUMENT.md must be UTF-8 text") from exc
    lines = text.splitlines()
    title = ""
    paragraph = []
    for line in lines:
        line = line.strip()
        heading = re.fullmatch(r"#{1,6}\s+(.+)", line)
        if heading or not line:
            if paragraph:
                break
            if heading and not title:
                title = heading[1]
        else:
            paragraph.append(line)
    summary = " ".join(paragraph)
    if not any(c.isalnum() for c in summary) or len(summary) > 1200:
        raise ValueError("Start ARGUMENT.md with a public summary of 1–1,200 characters after the optional title")
    if any(ord(c) < 32 for c in title + summary) or len(title) > 200:
        raise ValueError("Use a plain-text write-up title of at most 200 characters and a readable summary")
    return {"title": title, "summary": summary}


def validate_paper(value):
    if not isinstance(value, str) or len(value) > 2048 or any(c.isspace() or ord(c) < 32 for c in value):
        raise ValueError("paper_url must be a public HTTPS paper URL")
    url = urlsplit(value)
    if url.scheme != "https" or not url.hostname or url.username is not None or url.password is not None or "\\" in value:
        raise ValueError("paper_url must be a public HTTPS paper URL")
