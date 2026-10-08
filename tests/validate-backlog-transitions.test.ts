import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf-8');

// Body of a `### name(...)` operation, up to the next heading or rule.
function operation(content: string, name: string): string {
  const start = content.indexOf(`### ${name}(`);
  expect(start, `operation ${name}() not found`).toBeGreaterThanOrEqual(0);
  const rest = content.slice(start + 4);
  const end = rest.search(/\n(### |## |---\n)/);
  return end === -1 ? rest : rest.slice(0, end);
}

// Body of a `### Step N:` section in a command, up to the next step.
function step(content: string, heading: string): string {
  const start = content.indexOf(heading);
  expect(start, `${heading} not found`).toBeGreaterThanOrEqual(0);
  const rest = content.slice(start + heading.length);
  const end = rest.search(/\n### Step /);
  return end === -1 ? rest : rest.slice(0, end);
}

describe('backlog-local — a status change moves the item, not just its marker', () => {
  const local = read('skills', 'backlog-local', 'SKILL.md');

  it.each([
    ['start', '## Doing'],
    ['mark_implemented', '## Doing'],
    ['complete', '## Done'],
  ])('%s() files the line under %s', (name, section) => {
    const body = operation(local, name);
    expect(body).toMatch(/move/i);
    expect(body).toContain(section);
  });

  it('complete() accepts an item that never left ready', () => {
    expect(operation(local, 'complete')).toContain('`[ ]`');
  });

  it('complete() verifies the result before committing', () => {
    expect(operation(local, 'complete')).toMatch(/verify/i);
  });
});

describe('backlog — completing an item updates the parent document status', () => {
  it.each([
    ['backlog'],
    ['backlog-local'],
    ['backlog-external'],
  ])('%s complete() covers feature specs (done) and bug reports (fixed)', (skill) => {
    const body = operation(read('skills', skill, 'SKILL.md'), 'complete');
    expect(body).toContain('status: done');
    expect(body).toContain('status: fixed');
  });
});

describe('backlog — a plan is closed when the stories it covers are done', () => {
  const SKILLS = [['backlog'], ['backlog-local'], ['backlog-external']];

  it.each(SKILLS)('%s defines link_plan()', (skill) => {
    operation(read('skills', skill, 'SKILL.md'), 'link_plan');
  });

  it.each(SKILLS)('%s complete() closes the linked plan', (skill) => {
    expect(operation(read('skills', skill, 'SKILL.md'), 'complete')).toMatch(/plan[^\n]*`status: done`/i);
  });

  it('backlog-local stores the link as a plan: tag', () => {
    const local = read('skills', 'backlog-local', 'SKILL.md');
    expect(operation(local, 'link_plan')).toContain('plan:{plan_path}');
    expect(operation(local, 'complete')).toContain('`plan:`');
  });

  it('/plan links the stories it covers and documents the done status', () => {
    const plan = read('commands', 'plan.md');
    expect(plan).toContain('`link_plan(');
    expect(plan).toContain('`status: done`');
  });

  it('/pr verifies and reports the plan status', () => {
    const pr = read('commands', 'pr.md');
    expect(step(pr, '### Step 7: Update Backlog')).toMatch(/plan/i);
    expect(step(pr, '### Step 8: Report')).toMatch(/plan/i);
  });
});

describe('/pr — the backlog update cannot be silently skipped', () => {
  const backlogStep = step(read('commands', 'pr.md'), '### Step 7: Update Backlog');

  it('does not select stories by the implemented status alone', () => {
    expect(backlogStep).toMatch(/ready/);
    expect(backlogStep).toMatch(/doing/);
  });

  it('stops when no story is identified', () => {
    expect(backlogStep).toMatch(/STOP/);
  });

  it('verifies statuses after completing', () => {
    expect(backlogStep).toMatch(/verify/i);
  });
});
