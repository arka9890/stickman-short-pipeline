$ErrorActionPreference = "Stop"
$root = "C:\Users\Dien\OpenBot\Agents\agent-2f405f5c-0552-458e-9463-cf4fb787b35d"
$model = Join-Path $root "piper-voices\en_US-ryan-high.onnx"
$outDir = Join-Path $root "first-paper\public\audio"
New-Item -ItemType Directory -Force $outDir | Out-Null
$lines = Get-Content (Join-Path $root "first-paper\stills\vo.txt")
foreach ($line in $lines) {
  $sep = $line.IndexOf("::")
  $id = $line.Substring(0, $sep).ToLower()
  $text = $line.Substring($sep + 2)
  $out = Join-Path $outDir ("vo_" + $id + ".wav")
  echo $text | piper -m $model -f $out
  # Trim leading/trailing silence so every segment starts and ends crisp;
  # inter-segment gaps are then controlled by the timeline, not by the speech.
  ffmpeg -y -v error -i $out -af "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.08,areverse" "$out.tmp.wav"
  if (Test-Path "$out.tmp.wav") { Move-Item -Force "$out.tmp.wav" $out }
  Write-Host "wrote $out"
}
