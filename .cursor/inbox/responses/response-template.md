# InterTools Response Template

## Command Execution Response

When executing InterTools commands, use this format:

```json
{
  "commandId": "command-id-here",
  "status": "success|error|partial",
  "result": "detailed result or output",
  "suggestions": [
    "additional suggestions based on result"
  ],
  "nextSteps": [
    "recommended next actions"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Status Codes
- **success**: Command executed successfully
- **error**: Command failed with error
- **partial**: Command partially succeeded

## Response Guidelines
1. Always include the commandId
2. Provide detailed results
3. Include actionable suggestions
4. Suggest logical next steps
5. Include timestamp for tracking

---
*InterTools Response Template*
