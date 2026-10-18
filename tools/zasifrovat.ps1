# Zasifruje pripravene hodiny (pripravy/*.json, mimo git) do data/prepared/*.enc heslem webu.
# Heslo se cte ze souboru (vychozi: Dokumenty\Anglictina\heslo-webu.txt), do repozitare nejde.
# Protejsek v prohlizeci: js/crypto.js. Pri zmene hesla se vytvori nova sul -> vsichni se prihlasi znovu.
param([string]$PasswordFile = (Join-Path $env:USERPROFILE 'Documents\Anglictina\heslo-webu.txt'))
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root 'pripravy'
$out = Join-Path $root 'data\prepared'
$keyFile = Join-Path $out 'key.json'
$iter = 200000
$utf8 = New-Object System.Text.UTF8Encoding($false)
$pw = (Get-Content -LiteralPath $PasswordFile -Raw -Encoding UTF8).Trim()
if ($pw.Length -lt 8) { throw 'Heslo musi mit aspon 8 znaku.' }

function Get-Keys([byte[]]$salt) {
  $kdf = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($pw, $salt, $iter, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
  $k = $kdf.GetBytes(64)
  return @{ aes = [byte[]]$k[0..31]; mac = [byte[]]$k[32..63] }
}

function Get-Mac($keys, [byte[]]$iv, [byte[]]$ct) {
  $h = [System.Security.Cryptography.HMACSHA256]::new($keys.mac)
  return $h.ComputeHash([byte[]]($iv + $ct))
}

function Protect-Text($keys, [string]$text) {
  $aes = [System.Security.Cryptography.Aes]::Create()
  $aes.Mode = 'CBC'; $aes.Padding = 'PKCS7'; $aes.Key = $keys.aes; $aes.GenerateIV()
  $plain = $utf8.GetBytes($text)
  $ct = $aes.CreateEncryptor().TransformFinalBlock($plain, 0, $plain.Length)
  return [ordered]@{
    iv  = [Convert]::ToBase64String($aes.IV)
    ct  = [Convert]::ToBase64String($ct)
    mac = [Convert]::ToBase64String((Get-Mac $keys $aes.IV $ct))
  }
}

function Test-Keys($keys, $blob) {
  $mac = [Convert]::ToBase64String((Get-Mac $keys ([Convert]::FromBase64String($blob.iv)) ([Convert]::FromBase64String($blob.ct))))
  return $mac -eq $blob.mac
}

# Sul zustava, dokud se nezmeni heslo (prihlaseni v prohlizecich pak plati dal).
$salt = $null
if (Test-Path -LiteralPath $keyFile) {
  $lock = Get-Content -LiteralPath $keyFile -Raw | ConvertFrom-Json
  $old = [Convert]::FromBase64String($lock.salt)
  if ($lock.iter -eq $iter -and (Test-Keys (Get-Keys $old) $lock.check)) { $salt = $old }
}
if (-not $salt) {
  $salt = New-Object byte[] 16
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
  Write-Host 'Nova sul (nove heslo) - v prohlizecich bude potreba se prihlasit znovu.'
}
$keys = Get-Keys $salt

New-Item -ItemType Directory -Force $out | Out-Null
$check = Protect-Text $keys 'aj-rozna'
$lockJson = [ordered]@{ v = 1; iter = $iter; salt = [Convert]::ToBase64String($salt); check = $check } | ConvertTo-Json -Compress
[IO.File]::WriteAllText($keyFile, $lockJson, $utf8)

Get-ChildItem -LiteralPath $out -Filter '*.enc' | Remove-Item
$names = @()
foreach ($f in Get-ChildItem -LiteralPath $src -Filter '*.json' | Sort-Object Name) {
  $text = [IO.File]::ReadAllText($f.FullName, $utf8)
  $null = $text | ConvertFrom-Json  # kontrola, ze je to platny JSON
  $name = $f.BaseName + '.enc'
  [IO.File]::WriteAllText((Join-Path $out $name), ((Protect-Text $keys $text) | ConvertTo-Json -Compress), $utf8)
  $names += $name
}
$index = '[' + (($names | ForEach-Object { '"' + $_ + '"' }) -join ',') + ']'
[IO.File]::WriteAllText((Join-Path $out 'index.json'), $index, $utf8)
Write-Host ("Zasifrovano: " + ($names -join ', '))
