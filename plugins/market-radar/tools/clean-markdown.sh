#!/bin/bash
# INPUT:  Markdown file path (argument) or stdin
# OUTPUT: Cleaned markdown to stdout
# POS:    Preprocessing step for intel-distill pipeline — removes noise tokens before analysis

set -euo pipefail

# Read from file argument or stdin
if [ $# -ge 1 ] && [ -f "$1" ]; then
    input="$1"
else
    input="/dev/stdin"
fi

perl -0777 -pe '
    # Rule 1 & 2: Remove image lines including quote-prefixed ones
    # Handles: ![alt](url), [![alt](url)](url), > ![](url), > > ![](url)
    s/^(?:>[\s>]*)?[ \t]*\[?\s*\n?\s*!\[([^\]]*)\]\([^\)]*\)\s*\n?\s*\]?\s*(?:\([^\)]*\))?[ \t]*\n?/
        my $alt = $1;
        # Rule 5: preserve semantic alt text (non-empty, not just "Image" or "image")
        ($alt && $alt !~ m{^[Ii]mage$} && $alt !~ m{^https?:}) ? "$alt\n" : ""
    /gme;

    # Rule 3a: Remove social media profile image links (standalone lines with profile pic URLs)
    s/^\[?\s*!\[[^\]]*\]\(https:\/\/pbs\.twimg\.com\/profile_images\/[^\)]*\)\s*\n//gm;

    # Rule 3b: Remove Twitter/X handle lines: @username
    s/^@\w+\s*\n//gm;

    # Rule 3c: Remove "Post your reply" and similar platform UI residue
    s/^Post your reply\s*$//gm;

    # Rule 3d: Remove standalone social platform link lines (not inside quotes)
    # Only matches lines that are purely a link to a social profile/post
    s/^(?!>)\]\(https:\/\/x\.com\/[^\)]*\)\s*\n//gm;

    # Rule 4: Collapse 3+ consecutive blank lines to 1
    s/\n{3,}/\n\n/g;
' "$input"
