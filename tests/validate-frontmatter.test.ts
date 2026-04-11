import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      fields[key] = value;
    }
  }
  return fields;
}

function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectMdFiles(full));
    } else if (entry.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

describe('command frontmatter', () => {
  const commandDir = join(ROOT, 'commands');
  const files = readdirSync(commandDir).filter(f => f.endsWith('.md'));

  it.each(files)('%s has valid frontmatter with name and description', (file) => {
    const content = readFileSync(join(commandDir, file), 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm, `${file} is missing frontmatter`).not.toBeNull();
    expect(fm!.name, `${file} is missing 'name' field`).toBeTruthy();
    expect(fm!.description, `${file} is missing 'description' field`).toBeTruthy();
  });

  it.each(files)('%s name matches filename', (file) => {
    const content = readFileSync(join(commandDir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    const expectedName = file.replace('.md', '');

    expect(fm!.name).toBe(expectedName);
  });

  it.each(files)('%s has a valid model value', (file) => {
    const content = readFileSync(join(commandDir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    const validModels = ['opus', 'sonnet', 'haiku'];

    if (fm!.model) {
      expect(validModels, `${file} has invalid model '${fm!.model}'`).toContain(fm!.model);
    }
  });
});

describe('skill frontmatter', () => {
  const skillsDir = join(ROOT, 'skills');
  const skillFiles = collectMdFiles(skillsDir).filter(f => f.endsWith('SKILL.md'));

  it.each(skillFiles.map(f => [f.replace(skillsDir + '/', ''), f]))(
    '%s has valid frontmatter with name and description',
    (_, fullPath) => {
      const content = readFileSync(fullPath, 'utf-8');
      const fm = parseFrontmatter(content);

      expect(fm, `missing frontmatter`).not.toBeNull();
      expect(fm!.name, `missing 'name' field`).toBeTruthy();
      expect(fm!.description, `missing 'description' field`).toBeTruthy();
    }
  );
});

describe('agent frontmatter', () => {
  const agentsDir = join(ROOT, 'agents');
  const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));

  it.each(files)('%s has valid frontmatter with name and description', (file) => {
    const content = readFileSync(join(agentsDir, file), 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm, `${file} is missing frontmatter`).not.toBeNull();
    expect(fm!.name, `${file} is missing 'name' field`).toBeTruthy();
    expect(fm!.description, `${file} is missing 'description' field`).toBeTruthy();
  });

  it.each(files)('%s name matches filename', (file) => {
    const content = readFileSync(join(agentsDir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    const expectedName = file.replace('.md', '');

    expect(fm!.name).toBe(expectedName);
  });
});
