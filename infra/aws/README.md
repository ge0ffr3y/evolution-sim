# Running experiments on AWS

The sweeps run on one large rented machine (Graviton, for example `c7g.16xlarge`: 64 cores, 128 GB) that starts for a batch and shuts itself down when the batch ends. Results and save files go to an S3 bucket. The laptop only builds, launches and downloads.

**Budget:** at most $50 a month. The guard rails:
- an AWS Budget alert;
- spot machines only (cheapest);
- every machine terminates itself when its batch ends or after a hard time limit;
- the runner prints a time and cost estimate and waits for a yes before it launches anything.

## One-time setup (done by the owner, about 10 minutes)

These steps change who can do what in the AWS account, so they are done by the owner, not by the coding agent. Nothing here contains a password or key; the access key is created in step 2 and stays on the laptop.

Run the commands from the repository folder, with an AWS profile that is allowed to manage IAM (your own admin login).

### 1. A spending alert at $50 a month

In the AWS console: **Billing and Cost Management > Budgets > Create budget > Use a template > Monthly cost budget**.
- Name: `evolution-sim`.
- Amount: `50`.
- Email: your address.

AWS then emails you at 85% and 100% of actual spend and when the forecast passes 100%. (Optional: add an alert at 50%.)

### 2. The runner's user (what the laptop uses to start and stop machines)

```bash
aws iam create-user --user-name evolution-sim-runner
```

```bash
aws iam put-user-policy --user-name evolution-sim-runner --policy-name evolution-sim-runner --policy-document file://infra/aws/runner-user-policy.json
```

```bash
aws iam create-access-key --user-name evolution-sim-runner
```

The last command prints an access key ID and a secret. Store them on the laptop under their own profile, and nowhere else:

```bash
aws configure --profile evolution-sim
```

(Enter the key ID, the secret, region `us-east-1` or the one nearest you, output `json`.) The runner always uses `--profile evolution-sim`, so it never touches your main login.

### 3. The machines' role (lets a cloud machine write results to S3, and nothing else)

```bash
aws iam create-role --role-name evolution-sim-instance --assume-role-policy-document file://infra/aws/instance-role-trust.json
```

```bash
aws iam put-role-policy --role-name evolution-sim-instance --policy-name evolution-sim-results --policy-document file://infra/aws/instance-role-policy.json
```

```bash
aws iam create-instance-profile --instance-profile-name evolution-sim-instance
```

```bash
aws iam add-role-to-instance-profile --instance-profile-name evolution-sim-instance --role-name evolution-sim-instance
```

### 4. Check it

```bash
aws sts get-caller-identity --profile evolution-sim
```

It should name `evolution-sim-runner`.

## What the runner's user can and cannot do

**It can:**
- look at machines, images and prices;
- start machines, but only compute machines (`c7g`, `c8g` and `t4g` types) and only if they are tagged `Project=evolution-sim`;
- stop and terminate only machines with that tag;
- create its own SSH key and firewall, tagged the same way, and edit only that firewall;
- give machines the `evolution-sim-instance` role;
- read and write buckets named `evolution-sim-results-*`;
- read the month's spending.

**It cannot:**
- touch any other machine or bucket;
- start other machine types (no GPUs, no huge memory machines);
- change IAM, billing or budgets.

## Removing it all later

Terminate any machines tagged `Project=evolution-sim`, then delete the bucket, the access key, the user, and the role with its instance profile.

## The account's core limit

AWS caps how many cores an account may run at once. For C-family machines (c7g, c8g) this account's limit is **32** (the quota "Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances", found in the AWS console under Service Quotas > Amazon EC2). The runner never plans a machine bigger than this (`MAX_VCPUS` in `apps/runner/src/exp/estimate.ts`).

To run bigger batches faster (for example 64 worlds at once), the owner can request a higher value in Service Quotas. It is free to ask, and AWS usually answers within a day. (Requested: 192, on 2026-10-21.)

How the runner uses it:
- **The limit:** each launch reads the quota itself when the runner's user may (`servicequotas:GetServiceQuota`, a read-only permission now in `runner-user-policy.json`; update the inline policy in the console to add it). Otherwise it uses `MAX_VCPUS` (32).
- **Running several at once:** it subtracts the cores used by experiment machines already running, so several experiments can run side by side within the limit.
- **Budget:** each machine is tagged with its hard stop. The spending guard adds what running machines can still cost to the new machine's worst case, before allowing a launch under the $50 monthly cap.
