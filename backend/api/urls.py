from django.urls import path

from api import assistant, auth, health, views

urlpatterns = [
    # Auth endpoints
    path("auth/register", auth.register),
    path("auth/login", auth.login),
    path("auth/google", auth.google_auth),
    path("auth/me", auth.me),
    path("auth/config", auth.auth_config),

    # Assistant & RAG
    path("rag/query", assistant.rag_query),
    path("agent/query", assistant.agent_query),

    # Scholarships & Eligibility
    path("scholarships/search", views.scholarship_search),
    path("scholarships/<str:scheme_id>", views.scholarship_detail),
    path("eligibility/check", views.eligibility_check),
    path("scholarships/match", views.eligibility_check),

    # Sessions
    path("sessions", views.sessions_create),
    path("sessions/<str:session_id>", views.sessions_detail),

    # Health & Admin
    path("health", views.health),
    path("health/live", health.live),
    path("health/ready", health.ready),
    path("admin/ingest", views.admin_ingest),
    path("agent/usage", views.agent_usage),
]
