# Script to add Coffee Products component to Settings page

$settingsFile = "src/app/settings/page.tsx"
$componentFile = "src/app/settings/coffee-products-component.tsx"

# Read the component code
$componentCode = Get-Content $componentFile -Raw

# Remove the comment header and imports from component code
$componentCode = $componentCode -replace '(?s)^.*?interface Product', 'interface Product'

# Add Image import to settings file if not present
$settingsContent = Get-Content $settingsFile -Raw

if ($settingsContent -notmatch 'import Image from') {
    $settingsContent = $settingsContent -replace '(import { useEffect, useState } from "react";)', '$1`nimport Image from "next/image";'
}

# Append the component code at the end
$settingsContent = $settingsContent.TrimEnd() + "`n`n// ===== COFFEE PRODUCTS MANAGEMENT =====`n`n" + $componentCode

# Save the file
$settingsContent | Set-Content $settingsFile -NoNewline

Write-Host "Coffee Products component added successfully!"
