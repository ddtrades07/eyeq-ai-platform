# Transcription provider setup

Ambient scribe requires an approved speech-to-text vendor with a signed BAA before production PHI use.

## Supported providers

| Provider | Env vars | Status |
|----------|----------|--------|
| Deepgram (medical) | `TRANSCRIPTION_PROVIDER=deepgram`, `TRANSCRIPTION_API_KEY` | Implemented |

## Configuration

```env
TRANSCRIPTION_PROVIDER=deepgram
TRANSCRIPTION_API_KEY=your-key
TRANSCRIPTION_BAA_CONFIRMED=true
TRANSCRIPTION_STORE_AUDIO=false
```

## Behavior when not configured

- Recording start is disabled in the scribe workspace
- Manual transcript entry remains available
- Demo fill is only available when `FEATURE_DEMO_MODE=true`

## Audio handling

Audio must be uploaded to secure storage and passed to the transcription adapter via signed URL. Live browser streaming integration is planned for a future release.
