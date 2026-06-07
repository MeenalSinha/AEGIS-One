-- AEGIS One database initialization
-- Enables pgvector extension for semantic search

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Ensure tables exist (Alembic / SQLAlchemy handles the rest)
