"""Password hashing and JWT helpers. Scaffold stubs — logic lands in a later iteration."""


def hash_password(password: str) -> str:
    raise NotImplementedError


def verify_password(password: str, password_hash: str) -> bool:
    raise NotImplementedError


def create_access_token(subject: str) -> str:
    raise NotImplementedError


def create_refresh_token(subject: str) -> tuple[str, str]:
    """Return (raw_token, token_hash)."""
    raise NotImplementedError


def verify_access_token(token: str) -> str:
    """Return the subject (user id) or raise on invalid/expired token."""
    raise NotImplementedError
