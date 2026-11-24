"""Select optional organizer-built dependencies from the validated entry."""
import os
import subprocess
import tempfile
from pathlib import Path

from judge.entry import REFERENCES, from_git
from judge.score import SCORING_OPEN

def intake_base(organizer, head):
    """Allow intervening ledger updates while requiring the same protected rules."""
    base = subprocess.check_output(["git", "merge-base", organizer, head], text=True).strip()
    if subprocess.run(["git", "diff", "--quiet", base, organizer, "--", ".",
                       ":(exclude)submissions/**", ":(exclude)docs/scores.json"]).returncode:
        raise ValueError("The organizer rules changed. Rebase the entry onto current main and resubmit.")
    return base


if __name__ == "__main__":
    organizer, head = os.environ["BASE"], os.environ["HEAD"]
    base = intake_base(organizer, head)
    with tempfile.TemporaryDirectory() as directory:
        claim = from_git(base, head, Path(directory))
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        print("base=" + base, file=output)
        print("organizer=" + organizer, file=output)
        print("scoring=" + str(SCORING_OPEN).lower(), file=output)
        print("grscc=" + str(claim.get("reference") == "grs-cc-v1").lower(), file=output)
        print("fors=" + str(claim.get("reference", "").startswith("fors-")).lower(), file=output)
        module, _ = REFERENCES.get(claim.get("reference"), ("", ""))
        print("pors=" + str(module == "PORS.Literal").lower(), file=output)
