import 'dotenv/config';
import { createMarketplaceServer } from './server';

const port = Number(process.env.PORT ?? 3000);
const app = createMarketplaceServer();

app.listen(port, () => {
  console.log(`[marketplace-api] listening on http://localhost:${port}`);
});

