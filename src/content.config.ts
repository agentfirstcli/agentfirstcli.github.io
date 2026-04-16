import { defineCollection, z } from 'astro:content';

const principles = defineCollection({
  type: 'content',
  schema: z.object({
    number: z.number(),
    title: z.string(),
    tagline: z.string(),
    category: z.string(),
  }),
});

export const collections = { principles };
