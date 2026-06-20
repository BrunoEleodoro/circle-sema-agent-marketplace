# Marketplace Web

Minimal local browser UI for the Circle + Sema Agent Marketplace.

```bash
pnpm --filter @agent-stack-ecosystem-kits/marketplace-web dev
```

Open:

```text
http://localhost:5173
```

The UI defaults to the live Railway API:

```text
https://marketplace-api-production-4b82.up.railway.app
```

To point it at another API:

```text
http://localhost:5173?api=http://localhost:3000
```

The browser UI never moves money. It searches listings and generates copyable
agent prompts and Circle CLI checkout commands.
