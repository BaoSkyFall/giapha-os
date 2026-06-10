# Additional Data Request Notifications

Additional data request approvals use best-effort notifications. Approval remains successful when Telegram or SMS notification is not configured or fails; the admin UI shows a warning instead.

## Telegram

Telegram request notifications use:

```env
TELEGRAM_BOT_TOKEN=123456789:your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
APP_BASE_URL=https://your-site.example.com
```

The app sends Telegram messages for submitted, approved, and rejected additional-data requests.

## Approval SMS Test

Approval SMS is separate from the OTP SMS flow. Do not point it at the OTP request or verify endpoint.

Configure a generic approval-message endpoint:

```env
APPROVAL_SMS_ENDPOINT=https://your-sms-provider.example.com/send
APPROVAL_SMS_API_KEY=your-provider-key
APPROVAL_SMS_AUTH_HEADER=X-API-Key
APPROVAL_SMS_PHONE_FIELD=phone
APPROVAL_SMS_MESSAGE_FIELD=message
APPROVAL_SMS_PHONE_FORMAT=e164
ADDITIONAL_DATA_REQUEST_SMS_TEST_PHONE=0938443767
```

Only `APPROVAL_SMS_ENDPOINT`, `APPROVAL_SMS_API_KEY`, and `ADDITIONAL_DATA_REQUEST_SMS_TEST_PHONE` are required. The other fields default to the values shown above.
Set `APPROVAL_SMS_PHONE_FORMAT=domestic` if your provider expects `0...` Vietnam phone numbers instead of `+84...`.

The test button on `/dashboard/additional-data-requests` sends the latest request approved by the current admin to the configured test phone number. Production delivery to the submitter's phone number is intentionally out of scope for this first pass.
For this first pass, the server only allows the test recipient to normalize to `0938443767`; any other configured test number is skipped with an admin warning.
