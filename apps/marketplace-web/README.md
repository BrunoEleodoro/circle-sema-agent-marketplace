# KnowMarket Web

Minimal local browser UI and landing page for KnowMarket.

```bash
pnpm --filter @agent-stack-ecosystem-kits/marketplace-web dev
```

Open:

```text
http://localhost:5173
```

Hackathon animated showcase:

```text
http://localhost:5173/slides.html
```

Hackathon landing page and QR target:

```text
http://localhost:5173/landing.html
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
