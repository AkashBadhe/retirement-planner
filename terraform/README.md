# Terraform — Financial Calculators Infrastructure

## Resources Created

| Resource | Type | Tier |
|----------|------|------|
| Resource Group | `rg-fincalc-dev` | — |
| App Service Plan | Linux | F1 (Free) |
| API Web App | NestJS (Node 20) | Free |
| Static Web App | React SPA | Free |

## Prerequisites

1. [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) >= 1.7
2. [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. Logged in: `az login`

## Quick Start

```powershell
cd terraform

# First time — initialize
terraform init

# Deploy dev environment
.\deploy.ps1 -env dev

# Or manually:
terraform workspace select dev   # or: terraform workspace new dev
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"

# See outputs
terraform output
terraform output -raw static_web_app_api_key
```

## After Deployment

1. Get the API publish profile from Azure Portal → App Service → "Get publish profile"
2. Add GitHub Secrets:
   - `AZURE_API_PUBLISH_PROFILE` — XML from step 1
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` — `terraform output -raw static_web_app_api_key`
3. Update `.env.production` with the API URL from `terraform output api_url`
4. Push to trigger GitHub Actions deployment

## Destroy

```powershell
terraform destroy -var-file="environments/dev.tfvars"
```

## Notes

- F1 (Free) tier: 60 CPU minutes/day, no custom domain, no always-on
- If F1 isn't available in your region, change `app_service_sku` to `B1` in tfvars
- Static Web App uses `eastasia` region (limited availability for Free tier)
- State is stored locally per workspace (`terraform.tfstate.d/<env>/`)
