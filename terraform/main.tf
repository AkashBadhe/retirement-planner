##############################################################################
# main.tf — Azure resources for Financial Calculators
#
# Resources:
#   1. Resource Group
#   2. App Service Plan (Free tier)
#   3. API Web App (NestJS — Yahoo Finance proxy)
#   4. Static Web App (React frontend)
##############################################################################

locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

##############################################################################
# 1. Resource Group
##############################################################################
resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = local.common_tags
}

##############################################################################
# 2. App Service Plan (Free tier — Linux)
##############################################################################
resource "azurerm_service_plan" "main" {
  name                = "asp-${local.name_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.app_service_sku
  tags                = local.common_tags
}

##############################################################################
# 3. API Web App (NestJS — Yahoo Finance proxy)
##############################################################################
resource "azurerm_linux_web_app" "api" {
  name                = "${var.project}-api-${var.unique_suffix}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id
  tags                = local.common_tags

  site_config {
    always_on        = var.app_service_sku != "F1"
    app_command_line = "node dist/main.js"

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    NODE_ENV                 = "production"
    PORT                     = "8080"
    CLIENT_URL               = var.client_url != "" ? var.client_url : "https://${azurerm_static_web_app.web.default_host_name}"
    WEBSITE_RUN_FROM_PACKAGE = "1"
  }
}

##############################################################################
# 4. Static Web App (React frontend)
##############################################################################
resource "azurerm_static_web_app" "web" {
  name                = "${var.project}-web-${var.unique_suffix}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.static_web_app_location
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.common_tags
}
