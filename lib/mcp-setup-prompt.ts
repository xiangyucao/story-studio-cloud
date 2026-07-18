export function buildCodexMcpSetupPrompt(endpoint: string, token: string) {
  return `Please configure the following remote Streamable HTTP MCP server for my local Codex installation.

Server name: story_studio
Server URL: ${endpoint}
Bearer token: ${token}

Security requirements:
- Treat the bearer token as a secret.
- Store it as a user-level environment variable named STORY_STUDIO_TOKEN.
- Configure this MCP server to use bearer_token_env_var = "STORY_STUDIO_TOKEN".
- Do not write the raw token into config.toml, source code, project files, or commits.
- Do not repeat the token in your response.
- Do not modify, delete, or publish any Story Studio data during setup.

After configuration:
1. Restart the Codex client if required.
2. Verify the MCP connection.
3. Read the server instructions and all available tool schemas.
4. Summarize the Story Studio capabilities and safety limits you discovered.
5. Perform only a read-only test by listing my Story Studio works.

If you cannot safely complete a required configuration step, stop and tell me exactly what I need to do.`;
}
