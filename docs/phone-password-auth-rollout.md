# Phone + Password Rollout Checklist

This project now uses:
- Login: `phone_number + 6-digit password`
- OTP: only for `register` and `forgot_password`
- In-app password change: `/dashboard/account`

Before enabling this flow in production, complete all steps below.

## 1) Apply DB hardening migration

Run SQL in Supabase SQL editor:

- `docs/auth-hardening-migration.sql`

This creates:
- distributed auth rate-limit table
- `auth_consume_rate_limit(...)` RPC
- `auth_consume_otp_attempt(...)` RPC

## 2) Check data readiness

```bash
npm run auth:check-phone-readiness
```

The command exits with non-zero status if:
- active profiles are missing `phone_number`
- duplicate active `phone_number` values exist

## 3) Prepare and fill phone mapping

Generate a template:

```bash
npm run auth:prepare-phone-mapping
```

Fill `scripts/phone-mapping.template.json` with valid Vietnam numbers for all missing active profiles.

Apply mapping:

```bash
npm run auth:apply-phone-mapping
```

Re-run readiness check:

```bash
npm run auth:check-phone-readiness
```

## 4) Set default password for current non-admin users

Dry run:

```bash
npm run auth:migrate-default-password:dry
```

Execute:

```bash
npm run auth:migrate-default-password
```

This script refuses to run when non-admin users are still missing `phone_number`.

## 5) Smoke test

- Member login via `/login` with phone + 6-digit password
- Admin login via `/login` with phone + 6-digit password
- Register flow requires OTP
- Forgot-password flow requires OTP
- Password change works at `/dashboard/account`
