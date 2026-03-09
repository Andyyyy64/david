"""Entry point for `python -m life`."""

from dotenv import load_dotenv

load_dotenv()

from daemon.cli import cli  # noqa: E402

if __name__ == "__main__":
    cli()
