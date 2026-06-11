# deploy.ps1 — Quick deploy script for Financial Calculators infra
# Usage: .\deploy.ps1 -env dev
# Usage: .\deploy.ps1 -env prod

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$env
)

Write-Host "Deploying environment: $env" -ForegroundColor Cyan

# Select or create workspace
$currentWorkspace = terraform workspace show
if ($currentWorkspace -ne $env) {
    $workspaces = terraform workspace list
    if ($workspaces -match $env) {
        terraform workspace select $env
    } else {
        terraform workspace new $env
    }
}

# Init and apply
terraform init
terraform plan -var-file="environments/$env.tfvars" -out="tfplan-$env"

Write-Host "`nReview the plan above. Apply? (y/n)" -ForegroundColor Yellow
$confirm = Read-Host
if ($confirm -eq "y") {
    terraform apply "tfplan-$env"
    Write-Host "`nDone! Run 'terraform output' to see URLs and next steps." -ForegroundColor Green
} else {
    Write-Host "Cancelled." -ForegroundColor Red
}
