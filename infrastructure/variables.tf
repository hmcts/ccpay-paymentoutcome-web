variable "product" {
  type    = string
  default = "ccpay"
}

variable "core_product" {
  type    = string
  default = "ccpay"
}

variable "component" {
  type    = string
  default = "ccpay-paymentoutcome-web"

}

variable "team_name" {
  type    = string
  default = "FeesAndPay"

}

variable "location" {
  type    = string
  default = "UK South"
}

variable "env" {
  type = string
}

variable "subscription" {
  type    = string
}

variable "common_tags" {
  type = map(string)
}

