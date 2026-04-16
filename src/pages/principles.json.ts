import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const principles = await getCollection('principles');
  const sorted = principles.sort((a, b) => a.data.number - b.data.number);

  const output = {
    name: "Agent-First CLI",
    version: "1.0.0",
    url: "https://agentfirstcli.github.io",
    description: "15 principles for building CLIs that serve both humans and machines.",
    principles: sorted.map((p) => ({
      number: p.data.number,
      title: p.data.title,
      tagline: p.data.tagline,
      category: p.data.category,
      url: `https://agentfirstcli.github.io/principles/${p.id.replace(/^\d+-/, '').replace(/\.md$/, '')}/`,
    })),
  };

  return new Response(JSON.stringify(output, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
