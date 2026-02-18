# NanumAuth Database Schema

## Overview

NanumAuth uses Supabase (PostgreSQL) as its backend database with strict **Row Level Security (RLS)** policies to ensure complete tenant isolation and data security.

## Database Architecture

### Core Principles

1. **Multi-Tenancy**: Every table (except `auth.users`) includes a `tenant_id` column
2. **Row Level Security**: All tables have RLS enabled with comprehensive policies
3. **Audit Trail**: Critical operations are automatically logged
4. **Automated Triggers**: Common operations (timestamps, profile creation) are automated
5. **Type Safety**: TypeScript types are generated from the schema

## Tables

### `public.tenants`

Stores tenant (customer/organization) information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Tenant display name |
| `domain` | VARCHAR(255) | Unique subdomain or identifier |
| `settings` | JSONB | Tenant-specific configuration |
| `is_active` | BOOLEAN | Tenant activation status |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Settings Structure**:
```json
{
  "branding": {
    "logo_url": "string",
    "primary_color": "#hex",
    "secondary_color": "#hex"
  },
  "features": {
    "mfa_enabled": boolean,
    "sso_enabled": boolean,
    "passwordless_enabled": boolean
  },
  "security": {
    "password_min_length": number,
    "password_require_uppercase": boolean,
    "password_require_lowercase": boolean,
    "password_require_numbers": boolean,
    "password_require_symbols": boolean,
    "session_timeout_minutes": number
  }
}
```

### `public.profiles`

Extended user information linked to `auth.users`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `auth.users.id` |
| `tenant_id` | UUID | Foreign key to `tenants.id` |
| `email` | VARCHAR(255) | User email (synced with auth.users) |
| `full_name` | VARCHAR(255) | User's full name |
| `avatar_url` | TEXT | Profile picture URL |
| `role` | VARCHAR(50) | User role: `admin`, `user`, `developer` |
| `metadata` | JSONB | Additional custom fields |
| `is_active` | BOOLEAN | Account activation status |
| `last_login_at` | TIMESTAMPTZ | Last login timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Constraints**:
- Unique combination of `user_id` and `tenant_id`
- Email must be valid format
- Role must be one of: `admin`, `user`, `developer`

### `public.applications`

OAuth2/OIDC client applications per tenant.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to `tenants.id` |
| `name` | VARCHAR(255) | Application name |
| `description` | TEXT | Application description |
| `client_id` | VARCHAR(255) | OAuth2 client identifier |
| `client_secret` | VARCHAR(255) | OAuth2 client secret |
| `redirect_uris` | TEXT[] | Allowed redirect URLs |
| `allowed_origins` | TEXT[] | CORS allowed origins |
| `grant_types` | TEXT[] | Supported OAuth2 grant types |
| `token_lifetime_seconds` | INTEGER | Access token lifetime (default: 3600) |
| `refresh_token_lifetime_seconds` | INTEGER | Refresh token lifetime (default: 2592000) |
| `is_active` | BOOLEAN | Application activation status |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Supported Grant Types**:
- `authorization_code`
- `refresh_token`
- `client_credentials`
- `password`

### `public.audit_logs`

Security and compliance audit trail.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to `tenants.id` |
| `user_id` | UUID | Foreign key to `auth.users.id` (nullable) |
| `action` | VARCHAR(100) | Action performed (created, updated, deleted) |
| `resource_type` | VARCHAR(100) | Type of resource affected |
| `resource_id` | UUID | ID of affected resource |
| `ip_address` | INET | IP address of requester |
| `user_agent` | TEXT | Browser/client user agent |
| `metadata` | JSONB | Additional context and details |
| `created_at` | TIMESTAMPTZ | Log entry timestamp |

**Note**: Audit logs are **immutable** (no updates or deletes allowed).

### `public.sessions`

Active user session tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `auth.users.id` |
| `tenant_id` | UUID | Foreign key to `tenants.id` |
| `token_hash` | VARCHAR(255) | Hashed session token |
| `ip_address` | INET | Session IP address |
| `user_agent` | TEXT | Session user agent |
| `expires_at` | TIMESTAMPTZ | Session expiration time |
| `created_at` | TIMESTAMPTZ | Session creation time |
| `last_activity_at` | TIMESTAMPTZ | Last activity timestamp |

## Row Level Security (RLS) Policies

### Tenant Isolation

All RLS policies enforce strict tenant isolation using the `get_current_tenant_id()` helper function.

### Role-Based Access Control

| Table | Admin | User | Developer |
|-------|-------|------|-----------|
| `tenants` | Read/Write own tenant | Read own tenant | Read own tenant |
| `profiles` | Full access in tenant | Read all, write own | Read all, write own |
| `applications` | Full access in tenant | Read only | Read/Write in tenant |
| `audit_logs` | Read only in tenant | No access | No access |
| `sessions` | Read all in tenant | Read/Write own | Read/Write own |

## Database Functions

### Helper Functions

- `get_current_tenant_id()`: Returns current user's tenant ID
- `is_current_user_admin()`: Checks if user is admin
- `has_role(TEXT)`: Checks if user has specific role

### User Management

- `get_user_profile(UUID)`: Get comprehensive user profile
- `search_users(TEXT, INT, INT)`: Search users within tenant
- `update_user_role(UUID, TEXT)`: Update user role (admin only)
- `deactivate_user(UUID)`: Deactivate user account (admin only)
- `reactivate_user(UUID)`: Reactivate user account (admin only)

### Tenant Operations

- `get_tenant_stats(UUID)`: Get aggregated tenant statistics

### Session Management

- `get_active_sessions_count(UUID)`: Count active sessions
- `revoke_user_sessions(UUID)`: Revoke all user sessions

### Application Management

- `rotate_application_secret(UUID)`: Generate new client secret

### Audit & Compliance

- `get_audit_logs(...)`: Retrieve filtered audit logs (admin only)

## Triggers

### Automatic Timestamp Updates

All tables with `updated_at` column automatically update on modification.

### User Lifecycle

- **on_auth_user_created**: Automatically creates profile when user signs up
- **on_auth_user_login**: Updates `last_login_at` on user login

### Audit Logging

- **audit_tenants_changes**: Logs tenant modifications
- **audit_applications_changes**: Logs application modifications

### Data Integrity

- **validate_profile_email**: Ensures profile email matches auth.users
- **generate_application_credentials**: Auto-generates client_id and client_secret
- **cleanup_expired_sessions**: Removes expired sessions

## Migration Files

Execute in order:

1. `001_initial_schema.sql` - Core tables and indexes
2. `002_rls_policies.sql` - Row Level Security policies
3. `003_triggers.sql` - Database triggers
4. `004_functions.sql` - Stored procedures
5. `005_seed_data.sql` - Initial seed data

## Applying Migrations

### Using Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/types/supabase.ts
```

### Using Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Execute each migration file in order
3. Verify with `SELECT * FROM seed_data_status;`

## Type Generation

After applying migrations, regenerate TypeScript types:

```bash
npx supabase gen types typescript --project-id your-project-ref > src/types/supabase.ts
```

## Security Considerations

1. **Never disable RLS** on production tables
2. **Always use prepared statements** to prevent SQL injection
3. **Audit logs are immutable** - never delete or modify
4. **Client secrets** should be stored securely (encrypted at rest)
5. **Session tokens** should be hashed before storage
6. **IP addresses and user agents** are logged for security monitoring

## Performance Optimization

### Indexes

All critical foreign keys and frequently queried columns have indexes:

- `tenant_id` on all multi-tenant tables
- `user_id` on user-related tables
- `created_at DESC` on audit_logs for time-series queries
- Composite indexes on frequently joined columns

### Query Optimization Tips

1. Always filter by `tenant_id` first
2. Use `get_user_profile()` instead of manual joins
3. Batch operations when possible
4. Use pagination for large result sets

## Monitoring

Use the `seed_data_status` view to monitor table sizes:

```sql
SELECT * FROM public.seed_data_status;
```

## Backup & Recovery

Supabase provides automatic daily backups. For critical data:

1. Enable Point-in-Time Recovery (PITR)
2. Regular manual backups of audit logs
3. Export tenant data periodically

## Support

For database-related issues, check:

1. Supabase Dashboard > Database > Logs
2. RLS policy violations in error messages
3. Trigger execution in PostgreSQL logs
