import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { jobsOf, type Experiment } from "./experiment";
import { estimate, measureSpeeds, FAMILIES, SIZES, type Estimate, type MachineOption } from "./estimate";
import { statusOf } from "./job";

/**
 * Running experiments on AWS (see infra/aws/README.md for the one-time setup). Everything goes
 * through the `aws` command-line tool with the `evolution-sim` profile, which may only start and
 * stop machines tagged Project=evolution-sim and use the evolution-sim-results-* buckets.
 *
 * A launch uploads the code at the current commit, starts ONE on-demand machine (never spot),
 * and that machine installs Node, runs the experiment on all its cores, uploads results to S3
 * every few minutes, and shuts itself down when done, which terminates it. It also has a hard
 * stop time, so it can never run on unwatched.
 */
export const PROFILE = "evolution-sim";
export const ROLE = "evolution-sim-instance";
export const TAG = { Key: "Project", Value: "evolution-sim" };
/** The project's monthly spending cap (the whole AWS account's spend counts toward it). */
export const MONTHLY_CAP = 50;
/** The machine is stopped for good at the estimated time times this (the estimate already allows for slow runs). */
export const HARD_STOP_FACTOR = 1.3;
/** Results in S3 are deleted after this many days. */
export const KEEP_DAYS = 60;
const AMI_PARAMETER = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64";

interface Context {
  here: string;
  repoRoot: string;
  load: (folder: string | undefined, ticks: string | true | undefined) => Experiment;
  describeEstimate: (est: Estimate) => string;
}

/** Run an aws command and return its parsed JSON output (or the raw text). */
function aws(args: string[], { json = true, region }: { json?: boolean; region?: string } = {}): unknown {
  const full = [...args, "--profile", PROFILE];
  if (region) full.push("--region", region);
  if (json) full.push("--output", "json");
  const out = execFileSync("aws", full, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (!json) return out;
  return out.trim() ? JSON.parse(out) : null;
}

function regionOf(): string {
  return execFileSync("aws", ["configure", "get", "region", "--profile", PROFILE], { encoding: "utf8" }).trim() || "us-west-2";
}

export function bucketFor(account: string): string {
  return `evolution-sim-results-${account}`;
}

/** The script the machine runs when it starts. Pure, so it can be checked by tests without touching AWS. */
export function buildUserData(p: { bucket: string; region: string; name: string; runId: string; workers: number; ticks: number | null; hardStopMinutes: number; nodeVersion: string }): string {
  const ticksArg = p.ticks !== null ? ` --ticks ${p.ticks}` : "";
  return `#!/bin/bash
# Evolution Sim experiment machine: runs one experiment, uploads the results, then shuts down (which terminates it).
set -uo pipefail
exec > /var/log/evo.log 2>&1
# The absolute backstop: whatever happens, this machine is gone ${p.hardStopMinutes + 10} minutes after it started.
shutdown -h +${p.hardStopMinutes + 10}
export AWS_DEFAULT_REGION=${p.region}
BUCKET=${p.bucket}
NAME=${p.name}
RUN=${p.runId}
upload() {
  aws s3 sync /opt/evo/experiments/$NAME/results s3://$BUCKET/$NAME/results --quiet
  aws s3 cp /var/log/evo.log s3://$BUCKET/$NAME/logs/$RUN.log --quiet
}
# Node, the same version as on the laptop.
curl -fsSL https://nodejs.org/dist/${p.nodeVersion}/node-${p.nodeVersion}-linux-arm64.tar.xz | tar xJ -C /opt
export PATH=/opt/node-${p.nodeVersion}-linux-arm64/bin:$PATH
mkdir -p /opt/evo && cd /opt/evo
aws s3 cp s3://$BUCKET/$NAME/runs/$RUN/code.tar.gz - | tar xz
npm ci --no-audit --no-fund
mkdir -p experiments/$NAME/results
# Carry on from anything an earlier machine already finished or saved.
aws s3 sync s3://$BUCKET/$NAME/results experiments/$NAME/results --quiet
( while true; do sleep 300; upload; done ) &
# The planned stop: at the hard stop time, every job saves its progress, it is uploaded, and the machine shuts down.
( sleep ${p.hardStopMinutes * 60}; pkill -TERM -f "exp/cli.ts"; sleep 90; upload; shutdown -h now ) &
npm run exp -- run experiments/$NAME --jobs ${p.workers}${ticksArg}
echo "finished $(date -u +%FT%TZ)" > experiments/$NAME/results/machine-done-$RUN.txt
upload
shutdown -h now
`;
}

/** The request that starts the machine. Pure, so it can be checked by tests without touching AWS. */
export function buildLaunchRequest(p: { imageId: string; instanceType: string; userData: string; name: string; runId: string }): Record<string, unknown> {
  const tags = [TAG, { Key: "Experiment", Value: p.name }, { Key: "Run", Value: p.runId }, { Key: "Name", Value: `evolution-sim ${p.name}` }];
  return {
    ImageId: p.imageId,
    InstanceType: p.instanceType,
    MinCount: 1,
    MaxCount: 1,
    // On demand (no InstanceMarketOptions), and shutting down terminates it.
    InstanceInitiatedShutdownBehavior: "terminate",
    IamInstanceProfile: { Name: ROLE },
    UserData: Buffer.from(p.userData).toString("base64"),
    MetadataOptions: { HttpTokens: "required" },
    BlockDeviceMappings: [{ DeviceName: "/dev/xvda", Ebs: { VolumeSize: 30, VolumeType: "gp3", DeleteOnTermination: true } }],
    TagSpecifications: [
      { ResourceType: "instance", Tags: tags },
      { ResourceType: "volume", Tags: tags },
    ],
  };
}

/** The live on-demand price of a machine type (falls back to the table if the price list cannot be read). */
function livePrice(instanceType: string, region: string): number {
  const fallback = (): number => {
    const [family, size] = instanceType.split(".");
    const f = FAMILIES.find((x) => x.family === family);
    const s = SIZES.find((x) => x.size === size);
    return f && s ? f.pricePerVcpuHour * s.vcpus : NaN;
  };
  try {
    const out = aws(
      ["pricing", "get-products", "--service-code", "AmazonEC2", "--filters",
        `Type=TERM_MATCH,Field=instanceType,Value=${instanceType}`,
        `Type=TERM_MATCH,Field=regionCode,Value=${region}`,
        "Type=TERM_MATCH,Field=operatingSystem,Value=Linux",
        "Type=TERM_MATCH,Field=tenancy,Value=Shared",
        "Type=TERM_MATCH,Field=preInstalledSw,Value=NA",
        "Type=TERM_MATCH,Field=capacitystatus,Value=Used"],
      { region: "us-east-1" },
    ) as { PriceList: string[] };
    for (const item of out.PriceList) {
      const product = JSON.parse(item) as { terms: { OnDemand: Record<string, { priceDimensions: Record<string, { pricePerUnit: { USD: string } }> }> } };
      for (const term of Object.values(product.terms.OnDemand)) for (const dim of Object.values(term.priceDimensions)) {
        const usd = Number(dim.pricePerUnit.USD);
        if (usd > 0) return usd;
      }
    }
  } catch {
    // fall through to the table
  }
  return fallback();
}

/** What the whole AWS account has spent so far this month, in USD (one Cost Explorer query, which costs $0.01). */
function monthSpend(): number {
  const now = new Date();
  const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const out = aws(["ce", "get-cost-and-usage", "--time-period", `Start=${start},End=${tomorrow}`, "--granularity", "MONTHLY", "--metrics", "UnblendedCost"], { region: "us-east-1" }) as {
    ResultsByTime: { Total: { UnblendedCost: { Amount: string } } }[];
  };
  return out.ResultsByTime.reduce((sum, r) => sum + Number(r.Total.UnblendedCost.Amount), 0);
}

interface Machine {
  id: string;
  type: string;
  state: string;
  launched: string;
  experiment: string;
  run: string;
}

function ourMachines(region: string): Machine[] {
  const out = aws(["ec2", "describe-instances", "--filters", "Name=tag:Project,Values=evolution-sim", "Name=instance-state-name,Values=pending,running,stopping,shutting-down"], { region }) as {
    Reservations: { Instances: { InstanceId: string; InstanceType: string; State: { Name: string }; LaunchTime: string; Tags?: { Key: string; Value: string }[] }[] }[];
  };
  return out.Reservations.flatMap((r) =>
    r.Instances.map((i) => {
      const tag = (key: string): string => i.Tags?.find((t) => t.Key === key)?.Value ?? "";
      return { id: i.InstanceId, type: i.InstanceType, state: i.State.Name, launched: i.LaunchTime, experiment: tag("Experiment"), run: tag("Run") };
    }),
  );
}

function ensureBucket(bucket: string, region: string): void {
  try {
    aws(["s3api", "head-bucket", "--bucket", bucket], { region, json: false });
    return;
  } catch {
    // not there yet
  }
  aws(["s3api", "create-bucket", "--bucket", bucket, "--create-bucket-configuration", `LocationConstraint=${region}`], { region });
  const dir = mkdtempSync(join(tmpdir(), "evo-"));
  const rule = join(dir, "lifecycle.json");
  writeFileSync(rule, JSON.stringify({ Rules: [{ ID: `delete-after-${KEEP_DAYS}-days`, Status: "Enabled", Filter: { Prefix: "" }, Expiration: { Days: KEEP_DAYS }, AbortIncompleteMultipartUpload: { DaysAfterInitiation: 2 } }] }));
  aws(["s3api", "put-bucket-lifecycle-configuration", "--bucket", bucket, "--lifecycle-configuration", `file://${rule}`], { region });
  rmSync(dir, { recursive: true });
  console.log(`Created the results bucket ${bucket} (files are deleted after ${KEEP_DAYS} days).`);
}

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

export async function cloudCommand(positional: string[], options: Record<string, string | true>, ctx: Context): Promise<void> {
  const [action, folder] = positional;
  const region = regionOf();
  switch (action) {
    case "launch": {
      const exp = ctx.load(folder, options.ticks);
      const jobs = jobsOf(exp);
      const left = statusOf(exp, jobs).filter((s) => s.state !== "done" && s.state !== "extinct").length;
      if (left === 0) {
        console.log("Every job is already finished here. (Use --ticks to extend the runs.)");
        return;
      }
      // The code must be committed, so the machine runs exactly what is in git.
      const dirty = git(["status", "--porcelain", "--", "packages", "apps", "configs", relative(ctx.repoRoot, exp.folder)], ctx.repoRoot).trim();
      if (dirty) throw new Error(`Commit these first, so the machine runs exactly what is in git:\n${dirty}`);
      const running = ourMachines(region).filter((m) => m.experiment === exp.name);
      if (running.length) throw new Error(`A machine is already running ${exp.name} (${running.map((m) => m.id).join(", ")}). Wait for it, or stop it first.`);

      console.log("Measuring how fast each arm runs (a short trial here)...");
      const est = estimate(exp, jobs, measureSpeeds(exp, jobs));
      let pick: MachineOption = est.pick;
      if (typeof options.type === "string") {
        const chosen = est.options.find((o) => o.type === options.type);
        if (!chosen) throw new Error(`--type ${options.type} is not one of: ${est.options.map((o) => o.type).join(", ")}`);
        pick = chosen;
      }
      const price = livePrice(pick.type, region);
      const hardStopMinutes = Math.ceil(pick.wallHours * 60 * HARD_STOP_FACTOR);
      const expected = price * pick.wallHours;
      const worst = price * (hardStopMinutes + 10) / 60;
      console.log(ctx.describeEstimate(est));
      console.log(`\nLaunch plan: ${pick.type} on demand at $${price.toFixed(4)}/hour (live price), ${pick.workers} worlds at once.`);
      console.log(`  expected: about ${pick.wallHours.toFixed(1)} hours, about $${expected.toFixed(2)}`);
      console.log(`  hard stop after ${(hardStopMinutes / 60).toFixed(1)} hours: at most about $${worst.toFixed(2)}`);
      if (!options.confirm) {
        console.log("\nNothing launched. Add --confirm to launch (it also checks this month's spending, which costs $0.01).");
        return;
      }
      const spent = monthSpend();
      console.log(`  this month's AWS spend so far: $${spent.toFixed(2)} of the $${MONTHLY_CAP} cap`);
      if (spent + worst > MONTHLY_CAP) throw new Error(`Refusing: $${spent.toFixed(2)} spent plus up to $${worst.toFixed(2)} would pass the $${MONTHLY_CAP} monthly cap.`);

      const account = (aws(["sts", "get-caller-identity"]) as { Account: string }).Account;
      const bucket = bucketFor(account);
      ensureBucket(bucket, region);
      const runId = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
      const dir = mkdtempSync(join(tmpdir(), "evo-"));
      const tarball = join(dir, "code.tar.gz");
      execFileSync("git", ["archive", "--format=tar.gz", "-o", tarball, "HEAD"], { cwd: ctx.repoRoot });
      aws(["s3", "cp", tarball, `s3://${bucket}/${exp.name}/runs/${runId}/code.tar.gz`, "--quiet"], { region, json: false });
      const imageId = (aws(["ssm", "get-parameter", "--name", AMI_PARAMETER], { region }) as { Parameter: { Value: string } }).Parameter.Value;
      const userData = buildUserData({ bucket, region, name: exp.name, runId, workers: pick.workers, ticks: typeof options.ticks === "string" ? Number(options.ticks) : null, hardStopMinutes, nodeVersion: process.version });
      const request = join(dir, "launch.json");
      writeFileSync(request, JSON.stringify(buildLaunchRequest({ imageId, instanceType: pick.type, userData, name: exp.name, runId })));
      const out = aws(["ec2", "run-instances", "--cli-input-json", `file://${request}`], { region }) as { Instances: { InstanceId: string }[] };
      rmSync(dir, { recursive: true });
      console.log(`\nLaunched ${out.Instances[0]!.InstanceId} (${pick.type}) for ${exp.name}, run ${runId}.`);
      console.log("  check on it: npm run exp -- cloud status");
      console.log(`  results:     npm run exp -- cloud fetch ${relative(ctx.here, exp.folder)}`);
      return;
    }
    case "status": {
      const machines = ourMachines(region);
      if (!machines.length) console.log("No evolution-sim machines are running.");
      for (const m of machines) {
        const hoursUp = (Date.now() - Date.parse(m.launched)) / 3600000;
        const price = livePrice(m.type, region);
        console.log(`${m.id}  ${m.type}  ${m.state}  ${m.experiment} (run ${m.run})  up ${hoursUp.toFixed(1)} h, about $${(hoursUp * price).toFixed(2)} so far`);
      }
      return;
    }
    case "fetch": {
      const exp = ctx.load(folder, undefined);
      const account = (aws(["sts", "get-caller-identity"]) as { Account: string }).Account;
      const args = ["s3", "sync", `s3://${bucketFor(account)}/${exp.name}/results`, join(exp.folder, "results")];
      // A saved world and its rows file are a pair (resuming needs both at the same tick), so they travel together.
      if (!options["with-checkpoints"]) args.push("--exclude", "*.evosnap", "--exclude", "*.rows.json");
      aws(args, { region, json: false });
      console.log(`Downloaded ${exp.name}'s results to ${relative(ctx.here, join(exp.folder, "results"))}${options["with-checkpoints"] ? "" : " (without the saved worlds; add --with-checkpoints for those)"}.`);
      return;
    }
    case "stop": {
      const name = folder ? ctx.load(folder, undefined).name : null;
      const machines = ourMachines(region).filter((m) => !name || m.experiment === name);
      if (!machines.length) {
        console.log("Nothing to stop.");
        return;
      }
      aws(["ec2", "terminate-instances", "--instance-ids", ...machines.map((m) => m.id)], { region });
      console.log(`Terminating ${machines.map((m) => `${m.id} (${m.experiment})`).join(", ")}. Results uploaded so far are kept in S3.`);
      return;
    }
    default:
      throw new Error("cloud needs one of: launch, status, fetch, stop");
  }
}
