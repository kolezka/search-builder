FROM postgres:16-alpine
# Bake constants — Coolify's env UI won't mirror these
ENV POSTGRES_USER=search_builder
ENV POSTGRES_DB=search_builder
