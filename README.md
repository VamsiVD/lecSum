# Lecsum

Turn lecture recordings into study materials. Upload an audio file, get a transcript, summary, quiz, and flashcards.

## What it does

1. Upload an MP3, WAV, M4A, or FLAC lecture recording
2. AWS Transcribe converts it to text
3. AI generates a summary, quiz questions, and flashcards
4. Study directly in the browser or export flashcards to Anki

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, Tailwind CSS, shadcn/ui |
| Backend | AWS Lambda (Python 3.14) |
| Transcription | AWS Transcribe |
| AI | Amazon Bedrock (Claude 3 Haiku) |
| Storage | S3 (3 buckets), DynamoDB |
| CI/CD | GitHub Actions |
| Deployment | Vercel (web), EAS (mobile — coming soon) |

## Architecture

```
Audio file → S3 (raw-uploads)
    ↓ S3 trigger
Lambda: transcribe-trigger → starts Transcribe job → writes to DynamoDB
    ↓ Transcribe finishes
S3 (transcripts-outbox) → S3 trigger
Lambda: transcript-parser → extracts text → saves to S3 (transcripts-text) → updates DynamoDB
    ↓
Next.js polls DynamoDB every 4s → redirects to study page when done
```

## Project structure

```
lecsum/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── lambdas/
│   ├── transcribe_trigger/     # starts Transcribe job, writes DynamoDB record
│   │   └── lambda_function.py
│   ├── transcript_parser/      # extracts text, updates DynamoDB to done
│   │   └── lambda_function.py
│   └── orchestrator/           # coming soon — A2A agent routing
├── lecsum-web/                 # Next.js frontend
│   └── app/
│       ├── page.tsx            # upload screen
│       ├── processing/         # real-time job status
│       ├── study/              # transcript + summary + quiz + flashcards
│       └── api/
│           ├── upload-url/     # generates presigned S3 URL
│           ├── job-status/     # polls DynamoDB for pipeline status
│           └── transcript/     # reads transcript text from S3
├── scripts/
│   └── deploy.sh               # packages and deploys Lambdas
├── tests/
│   ├── unit/                   # pytest, fully mocked
│   └── integration/            # smoke tests against real AWS
├── requirements-dev.txt
└── pyproject.toml
```

## S3 buckets

| Bucket | Purpose |
|---|---|
| `lectureai-raw-uploads-dev` | incoming audio files |
| `lecsum-transcripts-outbox` | raw Transcribe JSON output |
| `lecsum-transcripts-text` | plain text transcripts |

## DynamoDB

Table: `lecsum-jobs` — partition key: `uploadKey`

| Field | Description |
|---|---|
| `uploadKey` | S3 key of the uploaded audio file |
| `jobName` | Transcribe job name |
| `status` | `transcribing` \| `done` \| `error` |
| `transcriptKey` | S3 key of the output `.txt` file |
| `fileName` | original filename for display |
| `createdAt` | ISO timestamp |

## CI/CD

Every push to `staging` → runs tests → deploys to staging Lambdas.
Every push to `main` → runs tests → deploys to prod Lambdas.

Lambdas follow the naming convention `lecsum-<function>-<env>`.

## Local development

### Prerequisites
- Node.js 20+
- Python 3.14
- AWS account with Bedrock, Transcribe, S3, DynamoDB, Lambda access

### Frontend

```bash
cd lecsum-web
npm install
cp .env.example .env.local   # fill in your AWS credentials
npm run dev
```

### Environment variables

```
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_UPLOAD_BUCKET=lectureai-raw-uploads-dev
S3_TRANSCRIPTS_BUCKET=lecsum-transcripts-text
```

### Tests

```bash
pip install -r requirements-dev.txt
pytest tests/unit/ -v
```

### Linting

```bash
ruff check lambdas/
ruff format lambdas/
```

## Roadmap

- [x] Audio upload with presigned S3 URL
- [x] AWS Transcribe pipeline
- [x] DynamoDB job tracking
- [x] Real-time processing status
- [x] Transcript study view
- [ ] Summary tab (Bedrock)
- [ ] Quiz tab
- [ ] Flashcard tab + Anki export
- [ ] Auth (Clerk)
- [ ] Lecture history
- [ ] Mobile app (Expo)
- [ ] A2A agent orchestration
