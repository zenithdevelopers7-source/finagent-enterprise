# FinAgent Enterprise - Azure reference infrastructure (prompt §33). Locally schema-validated;
# NOT PLANNED or APPLIED. Region, SKUs, retention and network design remain OPEN decisions
# (SEC-D06, NFR-D01..D09) - values below are PROPOSED.
terraform {
  required_version = ">= 1.7"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.10" }
  }
  backend "azurerm" {} # state storage configured per environment (never local state for shared envs)
}

provider "azurerm" {
  features {
    key_vault { purge_soft_delete_on_destroy = false }
  }
}

locals {
  name = "finagent-${var.environment}"
  tags = { system = "finagent", environment = var.environment, data = "restricted" }
  secret_grants = {
    for grant in flatten([
      for workload, names in var.key_vault_secret_access : [
        for name in names : { workload = workload, secret = lower(name) }
      ]
    ]) : "${grant.workload}/${grant.secret}" => grant
  }
}

resource "azurerm_resource_group" "rg" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "logs" {
  name                = "log-${local.name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days
  tags                = local.tags
}

resource "azurerm_key_vault" "kv" {
  name                          = "kv-${replace(local.name, "-", "")}"
  location                      = azurerm_resource_group.rg.location
  resource_group_name           = azurerm_resource_group.rg.name
  tenant_id                     = var.tenant_id
  sku_name                      = "premium"
  rbac_authorization_enabled    = true
  purge_protection_enabled      = true
  soft_delete_retention_days    = 90
  public_network_access_enabled = false
  tags                          = local.tags
}

resource "azurerm_postgresql_flexible_server" "pg" {
  name                          = "psql-${local.name}"
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = azurerm_resource_group.rg.location
  version                       = "16"
  sku_name                      = var.postgres_sku
  storage_mb                    = 65536
  backup_retention_days         = var.postgres_backup_days
  geo_redundant_backup_enabled  = var.geo_redundant_backup
  public_network_access_enabled = false
  delegated_subnet_id           = var.postgres_subnet_id
  private_dns_zone_id           = var.postgres_private_dns_zone_id
  zone                          = "1"
  authentication {
    active_directory_auth_enabled = true # app connects with a managed identity (ADR-0014)
    password_auth_enabled         = false
    tenant_id                     = var.tenant_id
  }
  high_availability { mode = "ZoneRedundant" }
  tags = local.tags
}

resource "azurerm_storage_account" "blobs" {
  name                            = "st${replace(local.name, "-", "")}"
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_resource_group.rg.location
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false # managed identity only
  public_network_access_enabled   = false
  blob_properties {
    versioning_enabled = true
    delete_retention_policy { days = 30 }
  }
  tags = local.tags
}

resource "azurerm_storage_container" "documents" {
  name                  = "finagent-documents"
  storage_account_id    = azurerm_storage_account.blobs.id
  container_access_type = "private"
}

resource "azurerm_servicebus_namespace" "bus" {
  name                          = "sb-${local.name}"
  location                      = azurerm_resource_group.rg.location
  resource_group_name           = azurerm_resource_group.rg.name
  sku                           = "Premium"
  capacity                      = 1
  local_auth_enabled            = false
  public_network_access_enabled = false
  tags                          = local.tags
}

resource "azurerm_servicebus_queue" "events" {
  name                                    = "finagent-events"
  namespace_id                            = azurerm_servicebus_namespace.bus.id
  lock_duration                           = "PT1M"
  max_delivery_count                      = 5 # consumer_max_deliveries (PROPOSED)
  requires_duplicate_detection            = true
  duplicate_detection_history_time_window = "PT1H"
  dead_lettering_on_message_expiration    = true
}

resource "azurerm_search_service" "search" {
  name                          = "srch-${local.name}"
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = azurerm_resource_group.rg.location
  sku                           = "standard"
  public_network_access_enabled = false
  local_authentication_enabled  = true # API key held in Key Vault; switch to RBAC when approved
  tags                          = local.tags
}

resource "azurerm_container_registry" "acr" {
  name                          = "acr${replace(local.name, "-", "")}"
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = azurerm_resource_group.rg.location
  sku                           = "Premium"
  admin_enabled                 = false
  public_network_access_enabled = false
  tags                          = local.tags
}

resource "azurerm_user_assigned_identity" "workload" {
  for_each            = toset(["api", "worker", "web", "migrator"])
  name                = "id-${local.name}-${each.key}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  tags                = local.tags
}

resource "azurerm_role_assignment" "blob_rw" {
  for_each             = toset(["api", "worker"])
  scope                = azurerm_storage_account.blobs.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.workload[each.key].principal_id
}

resource "azurerm_role_assignment" "kv_secrets" {
  for_each             = local.secret_grants
  scope                = "${azurerm_key_vault.kv.id}/secrets/${each.value.secret}"
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.workload[each.value.workload].principal_id
}

resource "azurerm_role_assignment" "bus_send" {
  scope                = azurerm_servicebus_namespace.bus.id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_user_assigned_identity.workload["worker"].principal_id
}

resource "azurerm_role_assignment" "bus_receive" {
  scope                = azurerm_servicebus_namespace.bus.id
  role_definition_name = "Azure Service Bus Data Receiver"
  principal_id         = azurerm_user_assigned_identity.workload["worker"].principal_id
}
