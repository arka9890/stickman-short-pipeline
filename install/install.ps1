# Stickman Short Pipeline — one-shot dependency installer (Windows).
# Installs and verifies everything the skill needs:
#   Node.js + npm, Python, ffmpeg (winget mirrors), Remotion deps,
#   whisper.cpp via @remotion/install-whisper-cpp (medium.en),
#   Kokoro-82M ONNX TTS model + voices, yt-dlp.
# Usage (from the repo root):
#   powershell -ExecutionPolicy Bypass -File install\install.ps1
# Then per video: copy project-template\ to your video folder and work there.

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
function Test-Cmd($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}
function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# ---- 1. Node.js ----
Step "Node.js"
if (-not (Test-Cmd npm)) {
  winget install --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
  # refresh PATH in this session
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
} else { Write-Host "ok: npm $((npm --version))" }

# ---- 2. Python ----
Step "Python"
if (-not (Test-Cmd python)) {
  winget install --id Python.Python.3.12 --silent --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
} else { Write-Host "ok: python $((python --version 2>&1))" }

# ---- 3. ffmpeg ----
Step "ffmpeg"
if (-not (Test-Cmd ffmpeg)) {
  winget install --id Gyan.FFmpeg --silent --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
} else { Write-Host "ok: $((ffmpeg -version | Select-Object -First 1))" }

# ---- 4. yt-dlp ----
Step "yt-dlp (competition research)"
if (-not (Test-Cmd yt-dlp)) {
  winget install --id yt-dlp.yt-dlp --silent --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
} else { Write-Host "ok: yt-dlp $((yt-dlp --version))" }

# ---- 5. uv + gflow-cli (stills engine) ----
Step "uv + gflow-cli (stills engine)"
if (-not (Test-Cmd uv)) {
  winget install --id astral-sh.uv --silent --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
} else { Write-Host "ok: uv $((uv --version))" }
if (-not (Test-Cmd gflow)) {
  uv tool install gflow-cli
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
  $env:Path = $env:Path + ';' + (Join-Path $env:USERPROFILE '.local\bin')
} else { Write-Host "ok: gflow $((gflow --version))" }

# ---- 6. Python deps for Kokoro TTS + BGM/SFX synths ----
Step "Python packages (kokoro-onnx, onnxruntime, numpy, soundfile, espeak-ng data loader)"
python -m pip install --quiet --upgrade kokoro-onnx espeakng-loader phonemizer-fork onnxruntime numpy soundfile
if ($LASTEXITCODE -ne 0) { Write-Warning "pip install failed — retry manually: python -m pip install kokoro-onnx espeakng-loader phonemizer-fork onnxruntime numpy soundfile" }

# ---- 7. Kokoro model files (project-local, ~350 MB total, cached) ----
Step "Kokoro-82M ONNX model + voices (download ~350 MB if missing)"
$kokoroDir = Join-Path $env:USERPROFILE 'kokoro-models'
New-Item -ItemType Directory -Force -Path $kokoroDir | Out-Null
$model  = Join-Path $kokoroDir 'kokoro-v1.0.onnx'
$voices = Join-Path $kokoroDir 'voices-v1.0.bin'
if (-not (Test-Path $model)) {
  Invoke-WebRequest -Uri 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx' -OutFile $model
}
if (-not (Test-Path $voices)) {
  Invoke-WebRequest -Uri 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin' -OutFile $voices
}
Write-Host "cached at: $kokoroDir"
# genvo_kokoro.py reads <project>\kokoro\ — link or copy into each new project
Write-Host @"
NOTE: for each new video project folder:
  New-Item -ItemType Junction -Path <project>\kokoro -Target $kokoroDir
(the project-template README covers this)
"@

# ---------- 8. Project template deps + whisper.cpp ----------
Step "Project template: npm install + whisper.cpp (medium.en)"
$template = Join-Path $repoRoot 'project-template'
Push-Location $template
npm install
node scripts/install-whisper.mjs
Pop-Location
Write-Host @"
NOTE: whisper.cpp was built in project-template\whisper.cpp. For a new video,
copy the whole project-template folder (or just re-run:
  node scripts\install-whisper.mjs
inside the new project folder).
"@

# ---- 9. Verify ----
Step "Verification"
$checks = @(
  @{ n='npm';    v={ npm --version } },
  @{ n='python'; v={ python --version 2>&1; $LASTEXITCODE } },
  @{ n='ffmpeg'; v={ (ffmpeg -Version | Select-Object -First 1) -replace '.*ffmpeg version ([\d.]+).*','$1' } },
  @{ n='yt-dlp'; v={ yt-dlp --version } },
  @{ n='kokoro model';  v={ '{0:N0} MB' -f ((Get-Item $model).Length / 1MB) } },
  @{ n='kokoro voices'; v={ '{0:N0} MB' -f ((Get-Item $voices).Length / 1MB) } },
  @{ n='gflow-cli'; v={ (gflow --version) } }
)
$fail = $false
foreach ($c in $checks) {
  try {
    $val = & $c.v
    Write-Host ("  {0,-16} {1}" -f $c.n, $val)
  } catch {
    Write-Warning ("  {0,-16} MISSING/FAILED" -f $c.n)
    $fail = $true
  }
}
if ($fail) { Write-Warning 'Some checks failed — see the notes above. Re-run this script to retry.'; exit 1 }
Write-Host "`nDONE. Read skill\SKILL.md and follow its Gate 1 (IDEA) first.`n" -ForegroundColor Green
