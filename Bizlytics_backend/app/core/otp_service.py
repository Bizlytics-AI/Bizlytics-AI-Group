import random
import logging

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    """Generate a random 6-digit OTP."""
    return f"{random.randint(100000, 999999)}"


def send_otp(email: str, otp_code: str) -> None:
    """
    Send OTP to email. Currently prints to console.
    Replace with real email service in production.
    """
    logger.info(
        "\n═══════════════════════════════════════════════════\n"
        "  📧 OTP for %s : %s\n"
        "═══════════════════════════════════════════════════",
        email,
        otp_code,
    )
