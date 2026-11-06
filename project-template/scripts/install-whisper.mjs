import path from 'path';
import { installWhisperCpp, downloadWhisperModel } from '@remotion/install-whisper-cpp';

const to = path.join(process.cwd(), 'whisper.cpp');
await installWhisperCpp({ to, version: '1.5.5' });
console.log('whisper.cpp installed');
await downloadWhisperModel({ model: 'medium.en', folder: to });
console.log('model downloaded');