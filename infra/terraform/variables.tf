variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging or production (local/test never use Azure)."
  }
}
variable "location" {
  type        = string
  description = "Azure region - OPEN decision SEC-D06 (data residency)."
}
variable "tenant_id" { type = string }
variable "key_vault_secret_access" {
  description = "Approved Key Vault secret names by workload; empty grants no secret access."
  type        = map(set(string))
  default     = {}
  validation {
    condition = alltrue([
      for workload, names in var.key_vault_secret_access : contains(["api", "worker", "web", "migrator"], workload)
      && alltrue([for name in names : can(regex("^[A-Za-z0-9-]{1,127}$", name))])
      && length(distinct([for name in names : lower(name)])) == length(names)
    ])
    error_message = "Use known workload names and distinct, valid Key Vault secret names."
  }
}
variable "postgres_sku" {
  type    = string
  default = "GP_Standard_D2ds_v5" # PROPOSED
}
variable "postgres_backup_days" {
  type    = number
  default = 35 # PROPOSED; RPO/RTO are OPEN (SEC-D09)
}
variable "geo_redundant_backup" {
  type    = bool
  default = true
}
variable "postgres_subnet_id" { type = string }
variable "postgres_private_dns_zone_id" { type = string }
variable "log_retention_days" {
  type    = number
  default = 90 # PROPOSED; retention schedule is OPEN (SEC-D05)
}
