# Lecsum

Turn lecture recordings and documents into study materials. Upload an audio file, PDF, Word doc, or image — get a transcript, summary, quiz, and flashcards powered by AI.

## What it does

1. Upload an MP3, WAV, M4A, FLAC, PDF, DOCX, PPTX, or image
2. Audio → AWS Transcribe converts speech to text
3. Documents/images → Amazon Bedrock Claude Haiku extracts all text and describes diagrams via vision
4. AI generates a summary, quiz questions, and flashcards from the content
5. Study in the browser with an editorial-style study page, color-coded per course
6. Organize lectures into courses, drag to assign or trash

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, Tailwind CSS, TypeScript |
| Backend | AWS Lambda (Python 3.12), Next.js API routes |
| Transcription | AWS Transcribe |
| AI / Vision | Amazon Bedrock (Claude Haiku 4.5, Nova Pro) |
| Storage | S3 (3 buckets), DynamoDB |
| CI/CD | GitHub Actions |
| Deployment | Vercel |

## Architecture

```
Any file upload → S3 (raw-uploads)
        ↓ S3 trigger
Lambda: router
    ├── Audio → starts Transcribe job → DynamoDB status: transcribing
    │       ↓ Transcribe finishes
    │   S3 (transcripts-outbox) → S3 trigger
    │   Lambda: transcript-parser → extracts text → S3 (transcripts-text) → DynamoDB: done
    │
    └── PDF / Image → DynamoDB status: extracting
            ↓ browser calls /api/extract
        Next.js API → Bedrock Claude Haiku vision → S3 (transcripts-text) → DynamoDB: done

Dashboard polls DynamoDB every 10s → card updates live when done
Study page → /api/summary, /api/quiz, /api/flashcards → Bedrock Nova Pro
           → responses cached in S3 (.summary.json, .quiz.json, .flashcards.json)
```

## Project structure

```
lecsum/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline
├── lambdas/
│   ├── router/                     # S3 trigger — routes by file type
│   │   └── lambda_function.py
│   ├── transcribe_trigger/         # starts Transcribe job, writes DynamoDB record
│   │   └── lambda_function.py
│   └── transcript_parser/          # extracts text, updates DynamoDB to done
│       └── lambda_function.py
├── lecsum-web/                     # Next.js frontend
│   └── app/
│       ├── dashboard/              # main dashboard — courses, lecture cards, upload
│       ├── processing/             # background status (legacy, kept for direct access)
│       ├── study/                  # editorial study page with sidebar nav
│       └── api/
│           ├── upload-url/         # presigned S3 URL
│           ├── job-status/         # polls DynamoDB
│           ├── lectures/           # scan all jobs, PATCH course/displayName, DELETE
│           │   └── [uploadKey]/
│           ├── courses/            # GET/POST courses list (stored in DynamoDB)
│           ├── extract/            # Bedrock vision extraction for PDFs/images
│           ├── transcript/         # reads .txt from S3
│           ├── summary/            # Bedrock summary with S3 cache
│           ├── quiz/               # Bedrock quiz with S3 cache
│           └── flashcards/         # Bedrock flashcards with S3 cache
├── scripts/
│   └── deploy.sh                   # packages deps + deploys Lambdas per env
├── tests/
│   ├── unit/
│   └── integration/
├── requirements-dev.txt
└── pyproject.toml
```

## S3 buckets

| Bucket | Purpose |
|---|---|
| `lectureai-raw-uploads-dev` | incoming audio, PDF, image files |
| `lecsum-transcripts-outbox` | raw Transcribe JSON output |
| `lecsum-transcripts-text` | plain text transcripts + cached AI outputs |

The `lecsum-transcripts-text` bucket stores:
- `<key>.txt` — extracted transcript
- `<key>.summary.json` — cached summary
- `<key>.quiz.json` — cached quiz
- `<key>.flashcards.json` — cached flashcards

## DynamoDB

Table: `lecsum-jobs` — partition key: `uploadKey`

| Field | Description |
|---|---|
| `uploadKey` | S3 key of the uploaded file |
| `jobName` | Transcribe job name (audio only) |
| `status` | `transcribing` \| `extracting` \| `done` \| `error` |
| `transcriptKey` | S3 key of the output `.txt` file |
| `fileName` | original filename |
| `displayName` | user-renamed label |
| `course` | course ID (from `lecsum-courses` item) |
| `createdAt` | ISO timestamp |

Courses are stored as a single item with `uploadKey: "courses"` and a `data` field containing the JSON array.

## CI/CD

Every push to `staging` → tests → lint → deploys to staging Lambdas.  
Every push to `main` → tests → lint → deploys to prod Lambdas.

Lambda naming convention: `lecsum-<function>-<env>`

## Local development

### Prerequisites
- Node.js 20+
- Python 3.12
- AWS account with Bedrock, Transcribe, S3, DynamoDB, Lambda access
- Bedrock model access: `claude-haiku-4-5` and `amazon.nova-pro-v1`

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
- [x] Real-time processing status (background, no redirect)
- [x] Multi-file support — PDF, DOCX, PPTX, images via Bedrock vision
- [x] Summary tab (Bedrock Nova Pro)
- [x] Quiz tab with scoring
- [x] Flashcard tab with spaced repetition UI
- [x] S3 caching for AI outputs
- [x] Dashboard with course organization
- [x] Drag-to-assign courses, drag-to-trash
- [x] Rename lectures and courses inline
- [x] Animated bubble panel for course cards
- [x] Dark / light theme toggle
- [x] Editorial study page with course color theming
- [x] Courses persisted in DynamoDB
- [x] Auth (Clerk)
- [ ] DOCX / PPTX native support (currently: convert to PDF)
- [ ] Anki .apkg export
- [ ] Bookmark and PDF export on study page
- [ ] Mobile app (Expo)
- [ ] A2A agent orchestration (Bedrock AgentCore)
- [ ] MCP integrations (Notion, Google Calendar auto-tagging)
