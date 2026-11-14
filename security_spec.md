# WillBank Firestore Security Specification

## Data Invariants
1. Every document in `/users/{userId}` and its subcollections is strictly isolated to the authenticated owner (`request.auth.uid == userId` and `data.ownerId == request.auth.uid`).
2. All writes require verified authentication (`request.auth != null && request.auth.token.email_verified == true`).
3. No subcollection record (`familyMembers`, `creditCards`, `incomes`, `expenses`, `budgets`, `goals`, `debts`) can exist without a valid parent `/users/{userId}` workspace owned by `request.auth.uid`.
4. All document IDs (`userId`, `memberId`, `cardId`, `incomeId`, `expenseId`, `budgetId`, `goalId`, `debtId`) must satisfy `^[a-zA-Z0-9_\-]+$` and length `<= 128`.
5. `ownerId`, `id`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` are strictly validated against `request.time`.
6. Once a `DebtRecord` reaches terminal status `'paid'`, subsequent updates are forbidden.
7. List queries on subcollections enforce `resource.data.ownerId == request.auth.uid` without database lookups (`get`/`exists`), forcing secure client `where('ownerId', '==', uid)` queries.

## The Dirty Dozen Adversarial Payloads
1. **Unauthenticated read/write**: Request without `request.auth` to `/users/uid1/expenses/exp-1` -> DENIED.
2. **Unverified email write**: Authenticated user with `email_verified: false` attempting `create` on `/users/uid1/incomes/inc-1` -> DENIED.
3. **Cross-user access**: Authenticated `uid2` attempting `get`/`list`/`create`/`update`/`delete` inside `/users/uid1/...` -> DENIED.
4. **Identity spoofing on create**: `uid1` creating `/users/uid1/expenses/exp-1` with `ownerId: "uid2"` -> DENIED.
5. **Shadow field injection**: `uid1` creating `/users/uid1/goals/g1` with extra unexpected key `isAdmin: true` -> DENIED (`keys().hasOnly(...)`).
6. **ID poisoning**: `uid1` creating `/users/uid1/expenses/../../admin` or 1.5KB ID string -> DENIED (`isValidId`).
7. **Resource exhaustion (Denial of Wallet)**: `uid1` creating an expense with a 10KB `description` string -> DENIED (`description.size() <= 160`).
8. **Timestamp forgery**: `uid1` creating a card with client-forged `createdAt` instead of `request.time` -> DENIED.
9. **Immutable ownerId/createdAt mutation**: `uid1` updating `ownerId` or `createdAt` on an existing debt -> DENIED.
10. **Terminal state bypass**: `uid1` updating a `DebtRecord` whose `existing().status == 'paid'` -> DENIED.
11. **Value poisoning on whitelisted update key**: `uid1` updating `expense.status` to `"hacked"` instead of `"paid" | "pending"` -> DENIED (`isValidExpense` runs before action branches).
12. **Unconstrained list query**: Client querying `collection(db, 'users', uid1, 'expenses')` without `where('ownerId', '==', uid1)` -> DENIED.
