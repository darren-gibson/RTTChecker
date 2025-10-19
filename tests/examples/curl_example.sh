curl -X POST http://localhost:8080/smarthome \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test-query-001",
    "inputs": [
      {
        "intent": "action.devices.QUERY",
        "payload": {
          "devices": [
            { "id": "train_1" }
          ]
        }
      }
    ]
  }'