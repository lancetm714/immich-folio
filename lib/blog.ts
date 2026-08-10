import { readBlogYaml } from './admin/yaml-service';
import { BlogPost, BlogYaml } from './config/schema';

export async function getBlogPosts(): Promise<BlogPost[]> {
  const data = await readBlogYaml();
  return (data?.posts ?? []).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const posts = await getBlogPosts();
  return posts.filter((p) => !p.draft);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const data = await readBlogYaml();
  return data?.posts.find((p) => p.slug === slug) ?? null;
}

export async function getBlogYaml(): Promise<BlogYaml> {
  const data = await readBlogYaml();
  return data ?? { posts: [] };
}
