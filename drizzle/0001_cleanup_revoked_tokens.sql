-- Revoked MCP credentials can never authenticate again and do not need to be
-- retained in the user's token list or in long-term application storage.
DELETE FROM `api_tokens` WHERE `revoked_at` IS NOT NULL;
