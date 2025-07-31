> [!WARNING]
> This README has been written by AI and has not been manually reviewed. The only functionality that has been thoroughly tested is the deployment behavior of the [bmpn-deploy.yml GitHub Action](/.github/workflows/bpmn-deploy.yml).

# Camunda CI Demo 1

A demonstration project showcasing Camunda external task workers using TypeScript and Bun. This project implements a simple order processing workflow with validation and conditional logic.

## Overview

This demo implements a Camunda workflow that processes order numbers through two external tasks:

1. **work1**: Validates the order number and determines if it's within an acceptable range (1,000-9,999)
2. **work2**: Processes valid order numbers by reversing their digits

The workflow includes error handling and conditional branching based on validation results.

## Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime and package manager)
- A running Camunda Platform instance
- Node.js (for TypeScript compilation)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd camunda-ci-demo-1
```

2. Install dependencies:
```bash
bun install
```

## Configuration

Set up the following environment variables:

```bash
CAMUNDA_URL=http://localhost:8080/engine-rest
CAMUNDA_USER=your-username
CAMUNDA_PASS=your-password
```

## Usage

### Starting the Workers

Run the external task workers:

```bash
bun run dev
```

This will start the workers that subscribe to the `work1` and `work2` topics.

### Deploying the Workflow

1. Open your Camunda Cockpit
2. Navigate to the Deployment section
3. Upload the BPMN file from `src/resources/demo1.bpmn`
4. Deploy the workflow

### Running the Workflow

1. In Camunda Cockpit, start a new instance of the "demo1" process
2. Provide an order number (default is 10)
3. The workflow will:
   - Validate the order number in work1
   - If valid (1,000-9,999), proceed to work2 and reverse the digits
   - If invalid, end the process

## Project Structure

```
src/
├── helpers/
│   └── envValidation.ts    # Environment variable validation
├── resources/
│   └── demo1.bpmn         # Camunda workflow definition
├── workers/
│   ├── worker1.ts         # Order validation worker
│   └── worker2.ts         # Order processing worker
└── workers.ts             # Main worker orchestration
```

## Workflow Details

### Process Flow

1. **Start Event**: Accepts an order number input
2. **work1 Task**: 
   - Validates the order number is a number
   - Checks if it's between 1,000 and 9,999
   - Sets `isOkay` variable based on validation
3. **Gateway**: Routes based on `isOkay` value
4. **work2 Task**: (Only if `isOkay` is true)
   - Reverses the order number digits
   - Sets `localeVariable` with the reversed number
5. **End Events**: Process completes based on validation result

### Error Handling

- Invalid order numbers (non-numeric) trigger BPMN errors
- Workers include comprehensive error logging
- Environment validation ensures required variables are set

## Development

### Adding New Workers

1. Create a new worker file in `src/workers/`
2. Export a handler function with the signature:
   ```typescript
   export async function newWorkerHandler({ task, taskService }: { task: Task; taskService: TaskService })
   ```
3. Subscribe to the worker in `src/workers.ts`

### Environment Variables

The project validates required environment variables on startup:
- `CAMUNDA_URL`: Camunda REST API endpoint
- `CAMUNDA_USER`: Camunda username
- `CAMUNDA_PASS`: Camunda password

## Dependencies

- `camunda-external-task-client-js`: Camunda external task client
- `zod`: Runtime type validation
- `@types/camunda-external-task-client-js`: TypeScript definitions
- `@types/bun`: Bun TypeScript definitions

## Scripts

- `bun run dev`: Start the external task workers

## License

Private project - see package.json for details.
