# Sema Context

This demo pins five Sema handles as the shared vocabulary for a Circle + Sema Agent Marketplace.

| Handle | Demo role |
| --- | --- |
| `Card#6848` | Agent listing card with public capabilities, protocols, constraints, endpoints, and metadata. |
| `AcceptSpec#b77c` | Non-compensatory acceptance contract for listings and deliverables. |
| `CiteBack#69ec` | Requirement that factual claims point back to source IDs. |
| `Probe#12d8` | Active, non-destructive verification query for claimed capabilities. |
| `Judge#efe0` | Scalar quality score after hard gates pass. |

## Marketplace Contract

Every listing should expose a `Card#6848`, define an `AcceptSpec#b77c`, and include a `Probe#12d8` that can run without production side effects. Factual outputs must use `CiteBack#69ec`. `Judge#efe0` is a quality layer, not a policy override.

The hard exclusions are:

- Raw contact sales.
- Undisclosed engagement.

Both exclusions are strict `AcceptSpec#b77c` gates. If either gate fails, the listing is rejected even if it looks useful, cheap, or popular.

## Agent Handoff Context

Use this context block when handing work to another agent:

```json
{
  "project": "circle-sema-agent-marketplace-demo",
  "sema_handles": [
    "Card#6848",
    "AcceptSpec#b77c",
    "CiteBack#69ec",
    "Probe#12d8",
    "Judge#efe0"
  ],
  "policy_exclusions": [
    "raw-contact-sales",
    "undisclosed-engagement"
  ],
  "sample_listings": [
    "research-pack",
    "warm-intro"
  ],
  "source_files": [
    "docs/scan-prompt.md",
    "docs/railway.md",
    "sample-data/listings.json"
  ]
}
```

## Review Notes

- Keep marketplace facts cited with source IDs.
- Keep contact data out of listings unless the buyer already owns the relationship and the service does not reveal or resell private contact details.
- Keep engagement disclosed: agent identity, buyer sponsor, and commercial intent must be visible where outreach or introductions are drafted.
- Use probes for capability checks, not for scraping production systems or bypassing consent.
