##############################################################################
# environments/prod.tfvars — Variable values for the PROD environment
#
# Resources Terraform will create:
#   rg-cashflow-tf-prod
#   asp-cashflow-tf-prod
#   cashflowapi-akash2026-prod
#   cashflowweb-akash2026-prod
#   cashflowdb-akash2026-prod   (Cosmos DB for MongoDB)
#   cashflowmcp-akash2026-prod  (MCP Container App)
##############################################################################

environment             = "prod"
location                = "centralindia"
static_web_app_location = "eastasia"

project       = "cashflow"
unique_suffix = "akash2026"

# Production tier — B1 is fine to start, upgrade to P1v3 under load
app_service_sku = "B1"
speech_sku      = "S0"
node_runtime    = "NODE:20-lts"

# Production custom domains
# NOTE: Custom domains temporarily cleared to skip domain creation in Terraform.
# Add DNS records first, then restore these values:
#   - CNAME: cash-flow.in -> cashflowweb-akash2026-prod.azurestaticapps.net
#   - TXT: asuid.api.cash-flow.in -> 7275406497377b2a8050b89b621493ddd43373243ad41fec2f5435da2f12987f
#   - CNAME: api.cash-flow.in -> cashflowapi-akash2026-prod.azurewebsites.net
client_url   = ""
api_base_url = ""

# MCP Server custom domain
mcp_custom_domain = "mcp.cash-flow.in"

# Cosmos DB — use paid tier for production (Free tier is 1 per subscription, used by dev)
cosmosdb_compute_tier = "M25"
cosmosdb_location     = "centralindia"

# Production firewall — only Azure services (no dev IPs)
cosmosdb_allowed_ips = [
  { name = "AllowAzureServices", start_ip = "0.0.0.0", end_ip = "0.0.0.0" },
]

# ── Non-secret settings ───────────────────────────────────────────────────────
jwt_access_expiry  = "6h"
jwt_refresh_expiry = "14d"
bcrypt_rounds      = 12
rate_limit_ttl     = 60
rate_limit_max     = 100

# OAuth — fill with production credentials
google_client_id     = ""
google_client_secret = ""
github_client_id     = ""
github_client_secret = ""
