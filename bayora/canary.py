"""Chaos Canary: unique tokens planted in each side's material; scanner flags a
foreign canary on any surface the other side can see."""
import secrets


def new_canary(owner: str) -> str:
    return f"CANARY_{owner.upper()}_{secrets.token_hex(4)}"


def scan(surfaces: dict, canaries: dict) -> list:
    """surfaces: {name: (visible_to 'red'|'blue'|'both', text)}; canaries: {'red': tok, 'blue': tok}"""
    hits = []
    for name, (vis, text) in surfaces.items():
        for owner, tok in canaries.items():
            if tok in text and vis in (("both",) + (("red",) if owner == "blue" else ("blue",))):
                hits.append({"surface": name, "leaked": owner, "visible_to": vis})
    return hits
