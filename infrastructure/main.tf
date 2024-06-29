provider "azurerm" {
  features {}
}

locals {
  vaultName                = join("-", [var.core_product, var.env])
  s2sUrl                   = "http://rpe-service-auth-provider-${var.env}.service.core-compute-${var.env}.internal"
  s2s_rg_prefix            = "rpe-service-auth-provider"
  s2s_key_vault_name       = var.env == "preview" || var.env == "spreview" ? join("-", ["s2s", "aat"]) : join("-", ["s2s", var.env])
  s2s_vault_resource_group = var.env == "preview" || var.env == "spreview" ? join("-", [local.s2s_rg_prefix, "aat"]) : join("-", [local.s2s_rg_prefix, var.env])
}

data "azurerm_key_vault" "paymentoutcome_web_key_vault" {
  name                = local.vaultName
  resource_group_name = join("-", [var.core_product, var.env])
}

data "azurerm_key_vault" "s2s_key_vault" {
  name                = local.s2s_key_vault_name
  resource_group_name = local.s2s_vault_resource_group
}

data "azurerm_key_vault_secret" "s2s_secret" {
  name         = "microservicekey-paymentoutcome-web"
  key_vault_id = data.azurerm_key_vault.s2s_key_vault.id
}
resource "azurerm_key_vault_secret" "paymentoutcome-s2s-web" {
  name         = "paymentoutcome-s2s-web"
  value        = data.azurerm_key_vault_secret.s2s_secret.value
  key_vault_id = data.azurerm_key_vault.paymentoutcome_web_key_vault.id
}
