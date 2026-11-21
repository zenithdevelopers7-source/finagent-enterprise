mock_provider "azurerm" {
  mock_resource "azurerm_key_vault" {
    override_during = plan
    defaults = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test/providers/Microsoft.KeyVault/vaults/test-vault"
    }
  }
}

variables {
  environment                  = "dev"
  location                     = "uaenorth"
  tenant_id                    = "00000000-0000-0000-0000-000000000000"
  postgres_subnet_id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test/providers/Microsoft.Network/virtualNetworks/test/subnets/postgres"
  postgres_private_dns_zone_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test/providers/Microsoft.Network/privateDnsZones/test.postgres.database.azure.com"
}

run "default_grants_no_secret_access" {
  command = plan
  assert {
    condition     = length(azurerm_role_assignment.kv_secrets) == 0
    error_message = "Secret access must be opt-in."
  }
  assert {
    condition     = length(azurerm_user_assigned_identity.workload) == 4
    error_message = "Each application workload requires its own identity."
  }
}

run "explicit_grants_are_separate" {
  command = plan
  variables {
    key_vault_secret_access = {
      api      = ["api-database"]
      migrator = ["migration-database"]
      web      = ["web-session"]
    }
  }
  assert {
    condition     = toset(keys(azurerm_role_assignment.kv_secrets)) == toset(["api/api-database", "migrator/migration-database", "web/web-session"])
    error_message = "Only explicitly named workload and secret pairs should be granted."
  }
  assert {
    condition     = endswith(azurerm_role_assignment.kv_secrets["api/api-database"].scope, "/secrets/api-database") && azurerm_role_assignment.kv_secrets["api/api-database"].role_definition_name == "Key Vault Secrets User"
    error_message = "Secret access must use the secret scope and reader role."
  }
}

run "reject_unknown_workload" {
  command = plan
  variables {
    key_vault_secret_access = { unknown = ["secret"] }
  }
  expect_failures = [var.key_vault_secret_access]
}

run "reject_case_duplicate_names" {
  command = plan
  variables {
    key_vault_secret_access = { api = ["Secret", "secret"] }
  }
  expect_failures = [var.key_vault_secret_access]
}

run "reject_invalid_secret_name" {
  command = plan
  variables {
    key_vault_secret_access = { api = ["not/a-secret-name"] }
  }
  expect_failures = [var.key_vault_secret_access]
}

run "normalize_secret_name_case" {
  command = plan
  variables {
    key_vault_secret_access = { web = ["Web-Session"] }
  }
  assert {
    condition     = endswith(azurerm_role_assignment.kv_secrets["web/web-session"].scope, "/secrets/web-session")
    error_message = "Secret names must be normalized consistently in keys and scopes."
  }
}
