"""Authentication handlers for student email/password and Google Sign-In."""

import os
import re
from typing import Optional

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.core.validators import validate_email
from pydantic import BaseModel, Field
from rest_framework.response import Response

from api.common import endpoint

SIGNER = TimestampSigner(salt="scholarship-student-auth")
TOKEN_MAX_AGE_SECONDS = 86400 * 30  # 30 days


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=1)


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None  # Google ID token if sent via GSI
    access_token: Optional[str] = None  # Google OAuth2 Access Token
    email: Optional[str] = None
    name: Optional[str] = None
    avatar: Optional[str] = None


class AuthConfigUpdateRequest(BaseModel):
    google_client_id: str = Field(..., min_length=3, max_length=256)


def generate_token(user: User, provider: str = "password", avatar: str = "") -> str:
    payload = {
        "user_id": user.id,
        "email": user.email,
        "name": user.first_name or user.username,
        "provider": provider,
        "avatar": avatar,
    }
    return SIGNER.sign_object(payload)


def decode_token(token: str) -> Optional[dict]:
    try:
        return SIGNER.unsign_object(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None


def get_token_from_request(request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return request.headers.get("X-Auth-Token")


@endpoint("POST", RegisterRequest)
def register(request, payload):
    email = payload.email.lower().strip()
    try:
        validate_email(email)
    except ValidationError:
        return Response(
            {"error": {"code": "INVALID_EMAIL", "message": "Please enter a valid email address."}},
            status=400,
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {
                "error": {
                    "code": "EMAIL_EXISTS",
                    "message": "An account with this email already exists. Please sign in instead.",
                }
            },
            status=400,
        )

    username = email[:150]
    if User.objects.filter(username=username).exists():
        username = f"{email[:130]}_{User.objects.count() + 1}"

    user = User.objects.create_user(
        username=username,
        email=email,
        password=payload.password,
        first_name=payload.name.strip(),
    )

    token = generate_token(user, provider="password")
    return Response(
        {
            "status": "success",
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.first_name,
                "provider": "password",
                "avatar": "",
            },
        },
        status=201,
    )


@endpoint("POST", LoginRequest)
def login(request, payload):
    email = payload.email.lower().strip()
    user = User.objects.filter(email__iexact=email).first()
    if not user or not user.check_password(payload.password):
        return Response(
            {
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email address or password. Please check your credentials.",
                }
            },
            status=401,
        )

    token = generate_token(user, provider="password")
    return Response(
        {
            "status": "success",
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.first_name or user.username,
                "provider": "password",
                "avatar": "",
            },
        }
    )


@endpoint("POST", GoogleAuthRequest)
def google_auth(request, payload):
    email = ""
    name = ""
    avatar = ""

    # If an actual Google JWT ID token was supplied, verify it
    if payload.credential:
        try:
            import httpx

            resp = httpx.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": payload.credential},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                email = data.get("email", "").lower().strip()
                name = data.get("name") or data.get("given_name") or email.split("@")[0]
                avatar = data.get("picture", "")
            else:
                return Response(
                    {"error": {"code": "INVALID_GOOGLE_TOKEN", "message": "Failed to verify Google ID token."}},
                    status=401,
                )
        except Exception as e:
            return Response(
                {"error": {"code": "GOOGLE_VERIFY_ERROR", "message": f"Google verification error: {str(e)}"}},
                status=400,
            )
    elif payload.access_token:
        try:
            import httpx

            resp = httpx.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.access_token}"},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                email = data.get("email", "").lower().strip()
                name = data.get("name") or data.get("given_name") or email.split("@")[0]
                avatar = data.get("picture", "")
            else:
                return Response(
                    {"error": {"code": "INVALID_GOOGLE_TOKEN", "message": "Failed to verify Google access token."}},
                    status=401,
                )
        except Exception as e:
            return Response(
                {"error": {"code": "GOOGLE_VERIFY_ERROR", "message": f"Google verification error: {str(e)}"}},
                status=400,
            )
    elif payload.email:
        email = payload.email.lower().strip()
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"error": {"code": "INVALID_EMAIL", "message": "Please enter a valid Google email address."}},
                status=400,
            )
        name = payload.name.strip() if payload.name else email.split("@")[0].title()
        avatar = payload.avatar or ""
    else:
        return Response(
            {"error": {"code": "MISSING_INFO", "message": "Either credential, access_token, or email is required for Google Sign-In."}},
            status=400,
        )

    if not email:
        return Response(
            {"error": {"code": "INVALID_EMAIL", "message": "No valid email received from Google."}},
            status=400,
        )

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        username = email[:150]
        if User.objects.filter(username=username).exists():
            username = f"{email[:130]}_{User.objects.count() + 1}"
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=name,
        )
        user.set_unusable_password()
        user.save()
    elif name and not user.first_name:
        user.first_name = name
        user.save(update_fields=["first_name"])

    token = generate_token(user, provider="google", avatar=avatar)
    return Response(
        {
            "status": "success",
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.first_name or user.username,
                "provider": "google",
                "avatar": avatar,
            },
        }
    )


@endpoint("GET")
def me(request, payload=None):
    token = get_token_from_request(request)
    if not token:
        return Response({"authenticated": False, "user": None})

    data = decode_token(token)
    if not data:
        return Response({"authenticated": False, "user": None}, status=401)

    try:
        user = User.objects.get(pk=data["user_id"])
    except User.DoesNotExist:
        return Response({"authenticated": False, "user": None}, status=401)

    return Response(
        {
            "authenticated": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.first_name or user.username,
                "provider": data.get("provider", "password"),
                "avatar": data.get("avatar", ""),
            },
        }
    )


@endpoint("GET")
def auth_config(request, payload=None):
    return Response(
        {
            "google_client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "providers": ["password", "google"],
        }
    )


@endpoint("POST", AuthConfigUpdateRequest)
def update_auth_config(request, payload):
    client_id = payload.google_client_id.strip()
    os.environ["GOOGLE_CLIENT_ID"] = client_id

    env_path = os.path.join(settings.BASE_DIR.parent, ".env")
    if not os.path.exists(env_path):
        env_path = os.path.join(settings.BASE_DIR, ".env")

    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                content = f.read()
            if "GOOGLE_CLIENT_ID=" in content:
                content = re.sub(r"GOOGLE_CLIENT_ID=.*", f"GOOGLE_CLIENT_ID={client_id}", content)
            else:
                content = content.rstrip() + f"\nGOOGLE_CLIENT_ID={client_id}\n"
            with open(env_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
        except Exception:
            pass

    return Response(
        {
            "status": "success",
            "google_client_id": client_id,
            "providers": ["password", "google"],
        }
    )
