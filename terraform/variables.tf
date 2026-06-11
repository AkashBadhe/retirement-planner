##############################################################################
# variables.tf — Input variables for Financial Calculators infra
##############################################################################

variable "environment" {
  description = "Environment name (dev, prod)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be one of: dev, prod."
  }
}

variable "location" {
  description = "Azure region for resources. Use a region that supports F1 free tier with Linux."
  type        = string
  default     = "eastus"
}

variable "static_web_app_location" {
  description = "Azure region for Static Web App (limited regions supported)."
  type        = string
  default     = "eastasia"
}

variable "project" {
  description = "Short project name used in resource naming."
  type        = string
  default     = "fincalc"
}

variable "unique_suffix" {
  description = "A short unique string for globally-unique resource names."
  type        = string
}

variable "app_service_sku" {
  description = "App Service Plan SKU. F1 = Free, B1 = Basic."
  type        = string
  default     = "F1"
}

variable "client_url" {
  description = "Frontend URL for CORS (leave empty to auto-detect from Static Web App)."
  type        = string
  default     = ""
}
