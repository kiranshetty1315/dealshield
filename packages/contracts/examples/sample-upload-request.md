# Sample Upload Request

## Endpoint

```
POST /api/v1/chats/upload
Content-Type: multipart/form-data
```

## Request

Upload a WhatsApp `.txt` export file as form data:

```
file: <whatsapp-export.txt>
```

## Expected Response (200 OK)

```json
{
  "chat_id": "chat-001",
  "filename": "whatsapp-export.txt",
  "message_count": 10,
  "parties": ["Raj Mehta", "Priya Sharma"],
  "uploaded_at": "2024-03-15T14:00:00Z"
}
```

## Error Responses

### 400 Bad Request — Invalid file format
```json
{
  "detail": "Invalid file format. Please upload a WhatsApp .txt export.",
  "status": "error"
}
```

### 413 Request Entity Too Large
```json
{
  "detail": "File size exceeds maximum allowed (10MB).",
  "status": "error"
}
```

### 501 Not Implemented (current scaffold)
```json
{
  "detail": "Chat upload not yet implemented",
  "status": "not_implemented"
}
```
