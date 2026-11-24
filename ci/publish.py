"""Publish author text from the exact Lean-verified commit to the public data branch."""
import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from judge.entry import ID, TRACKS
from judge.presentation import read_writeup

BRANCH = "verified-writeups"


def git(*args, data=None):
    return subprocess.check_output(["git", *args], input=data)


def record(receipt, pr, run):
    track, ident = receipt["track"], receipt["id"]
    if track not in TRACKS or not ID.fullmatch(ident):
        raise ValueError("invalid entry path")
    path = f"submissions/{track}/{ident}/ARGUMENT.md"
    public = read_writeup(git("show", receipt["head"] + ":" + path))
    fields = ("track", "id", "team", "bound_bytes", "head", "reference", "paper_url")
    return {**{k: receipt[k] for k in fields if k in receipt}, **public, "pr": pr, "run": run}


def update(rows, item):
    if any(r["pr"] == item["pr"] and r["run"] >= item["run"] for r in rows):
        return rows
    return sorted([r for r in rows if r["pr"] != item["pr"]] + [item], key=lambda r: r["run"])


def main():
    receipt = json.loads(os.environ["RECEIPT"])
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    pr = event["pull_request"]
    if receipt["head"] != pr["head"]["sha"] or receipt["base"] != pr["base"]["sha"] or pr["base"]["ref"] != "main":
        raise ValueError("judge receipt disagrees with event")
    git("fetch", "--no-tags", "origin", receipt["head"])
    item = record(receipt, int(pr["number"]), int(os.environ["GITHUB_RUN_ID"]))
    for _ in range(6):
        git("fetch", "--no-tags", "origin", "refs/heads/" + BRANCH)
        parent = git("rev-parse", "FETCH_HEAD").decode().strip()
        rows = json.loads(git("show", parent + ":writeups.json"))
        revised = update(rows, item)
        if revised == rows:
            return
        blob = git("hash-object", "-w", "--stdin", data=(json.dumps(revised, ensure_ascii=False, indent=2) + "\n").encode()).strip()
        tree = git("mktree", data=b"100644 blob " + blob + b"\twriteups.json\n").decode().strip()
        commit = git("-c", "user.name=Poisson challenge judge", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
                     "commit-tree", tree, "-p", parent, "-m", f"Publish write-up verified in PR #{item['pr']}").decode().strip()
        if subprocess.run(["git", "push", "origin", commit + ":refs/heads/" + BRANCH]).returncode == 0:
            return
    raise RuntimeError("concurrent publication updates; rerun this job")


if __name__ == "__main__":
    main()
