#!/usr/bin/env python3
"""Add homepage-only scrollbar styling to the verified assembled homepage."""
from pathlib import Path
import hashlib

HOME = Path(__file__).resolve().parent.parent / 'soepgames' / 'index.html'
EXPECTED = 'c1a683d154afccdc72e1ad67924dc092656b20840a2dd72515576e893bcc175d'
STYLE = b'''    <style id="home-scrollbar-style">
        /* Keep native scrollbars for touch, high contrast and unsupported browsers. */
        @media (hover: hover) and (pointer: fine) and (forced-colors: none) {
            @supports selector(::-webkit-scrollbar) {
                html::-webkit-scrollbar { width: 16px; }
                html::-webkit-scrollbar-track { background: #101826; }
                html::-webkit-scrollbar-thumb {
                    background: #44c8ef;
                    border: 3px solid #101826;
                    border-radius: 999px;
                }
                html::-webkit-scrollbar-thumb:hover { background: #8ce6ff; }
                html::-webkit-scrollbar-thumb:active { background: #c7f5ff; }
            }
            @supports not selector(::-webkit-scrollbar) {
                html { scrollbar-color: #44c8ef #101826; scrollbar-width: auto; }
            }
        }
    </style>
'''


def main():
    raw = HOME.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED:
        raise RuntimeError('Unexpected assembled homepage; refusing scrollbar patch')
    if raw.count(b'</head>') != 1:
        raise RuntimeError('Homepage head anchor missing or ambiguous')
    HOME.write_bytes(raw.replace(b'</head>', STYLE + b'</head>', 1))
    print('Homepage scrollbar styling applied')


if __name__ == '__main__':
    main()
