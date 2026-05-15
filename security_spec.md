# Security Specification: Life Admin

## Data Invariants
1. **Ownership**: Every document in the `tasks` collection MUST have a `userId` field that matches the `request.auth.uid`.
2. **Immutability**: The `userId` and `createdAt` fields are immutable after creation.
3. **Temporal Integrity**: `createdAt` and `updatedAt` MUST use `request.time`.
4. **Schema Enforcement**: All fields must match the types and enums defined in the blueprint.
5. **Isolation**: Users can only access their own profile in the `users` collection.

## The "Dirty Dozen" (Attack Payloads)
1. **Identity Theft**: Creating a task with `userId` of another user.
2. **Privilege Escalation**: Attempting to set `isAdmin: true` on a user profile (system doesn't have admins, but checking for ghost fields).
3. **Time Travel**: Setting `createdAt` to a year in the future.
4. **Orphaned Updates**: Updating a task's `userId` to a different user to "transfer" or "steal" data.
5. **Collection Scraping**: Querying `/tasks` without a `where('userId', '==', uid)` filter.
6. **Denial of Wallet (Subtasks)**: Sending an array of 5,000 subtasks to exceed document limits or processing costs.
7. **Value Poisoning**: Sending a 1MB string for a task `title`.
8. **Enum Busting**: Setting `status` to "deleted_permanently_lol" instead of "pending".
9. **Creation Shadowing**: Creating a task with only a `title` and omitting the `category`.
10. **Identity Spoofing (Profile)**: Overwriting another user's profile metadata.
11. **Verification Bypass**: Attempting to write without a verified email (if strict verification is enabled).
12. **Ghost Field Mutation**: Adding a field `verifiedByAdmin` to a task to bypass checklist items.

## Security Controls
- Standard `isValidLifeTask` and `isValidUser` helpers.
- `affectedKeys().hasOnly()` gates for specific status updates.
- `isSignedIn()` check on all rules.
- `userId == request.auth.uid` relational check.
