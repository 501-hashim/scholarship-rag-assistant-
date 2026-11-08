import socket

from config.settings import *  # noqa: F403

# When running pytest without an active MySQL daemon on localhost, use in-memory SQLite for the test runner.
_s = socket.socket()
_s.settimeout(0.2)
try:
    _host = DATABASES["default"].get("HOST", "127.0.0.1")  # noqa: F405
    _port = int(DATABASES["default"].get("PORT", 3306) or 3306)  # noqa: F405
    _s.connect((_host, _port))
    _s.close()
except OSError:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }
