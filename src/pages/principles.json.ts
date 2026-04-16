import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function getGitDate(filePath: string): string {
  try {
    return execSync(`git log -1 --format=%aI -- "${filePath}"`, { encoding: 'utf-8' }).trim();
  } catch {
    return new Date().toISOString();
  }
}

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

function getLastBuildDate(): string {
  try {
    return execSync('git log -1 --format=%aI', { encoding: 'utf-8' }).trim();
  } catch {
    return new Date().toISOString();
  }
}

export const GET: APIRoute = async () => {
  const principles = await getCollection('principles');
  const sorted = principles.sort((a, b) => a.data.number - b.data.number);
  const version = getVersion();
  const lastModified = getLastBuildDate();

  const output = {
    name: "Agent-First CLI",
    version,
    last_modified: lastModified,
    url: "https://agentfirstcli.github.io",
    description: "16 principles for building CLIs that serve both humans and machines.",
    principles: sorted.map((p) => {
      const slug = p.id.replace(/^\d+-/, '').replace(/\.md$/, '');
      const filePath = `src/content/principles/${p.id}`;
      return {
        number: p.data.number,
        title: p.data.title,
        tagline: p.data.tagline,
        category: p.data.category,
        last_modified: getGitDate(filePath),
        url: `https://agentfirstcli.github.io/principles/${slug}/`,
        markdown_url: `https://agentfirstcli.github.io/principles/${slug}.md`,
      };
    }),
  };

  return new Response(JSON.stringify(output, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
