import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const principles = await getCollection('principles');
  return principles.map((entry) => ({
    params: { slug: entry.id.replace(/^\d+-/, '').replace(/\.md$/, '') },
    props: { entry },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: any };
  const header = `# ${entry.data.number}. ${entry.data.title}\n\n*${entry.data.tagline}*\n\nCategory: ${entry.data.category}\n\n`;
  return new Response(header + entry.body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
