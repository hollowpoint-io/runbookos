# Outbox

Approval requests go here.

Agents should prepare proposed external actions as markdown files. A human approves, rejects, or asks for revision before execution.

Default approval files live under:

```text
outbox/approvals/
```

Approving a file records human intent only. It does not send email, publish content, mutate Shopify, or execute any external action.
