##############################################################################
# outputs.tf — Values printed after `terraform apply`
##############################################################################

output "resource_group_name" {
  description = "Resource Group name."
  value       = azurerm_resource_group.main.name
}

output "api_url" {
  description = "API base URL (NestJS backend)."
  value       = "https://${azurerm_linux_web_app.api.default_hostname}"
}

output "api_app_name" {
  description = "API App Service name (for GitHub Actions deployment)."
  value       = azurerm_linux_web_app.api.name
}

output "web_url" {
  description = "Frontend Static Web App URL."
  value       = "https://${azurerm_static_web_app.web.default_host_name}"
}

output "web_app_name" {
  description = "Static Web App name."
  value       = azurerm_static_web_app.web.name
}

output "static_web_app_api_key" {
  description = "Deployment token for Static Web App — add as GitHub Secret."
  value       = azurerm_static_web_app.web.api_key
  sensitive   = true
}

output "next_steps" {
  description = "What to do after apply."
  value       = <<-EOT
    ✅ Infrastructure created!

    API URL: https://${azurerm_linux_web_app.api.default_hostname}
    Web URL: https://${azurerm_static_web_app.web.default_host_name}

    GitHub Secrets needed:
    1. AZURE_STATIC_WEB_APPS_API_TOKEN → terraform output -raw static_web_app_api_key
    2. AZURE_API_PUBLISH_PROFILE → Download from Azure Portal: App Service → Get publish profile
    3. Update .env.production with: REACT_APP_API_URL=https://${azurerm_linux_web_app.api.default_hostname}/api
  EOT
}
