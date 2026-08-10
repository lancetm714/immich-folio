import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminAuthenticated, isAdminEnabled } from '@/lib/admin/auth';
import { readBlogYaml, writeBlogYaml } from '@/lib/admin/yaml-service';
import { invalidateConfigCache } from '@/lib/config';
import { slugify } from '@/lib/config/schema';
import type { BlogYaml, BlogPost } from '@/lib/config/schema';

export async function GET() {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: 'Admin not enabled' }, { status: 403 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await readBlogYaml();
  return NextResponse.json({ posts: data?.posts ?? [] });
}

export async function PUT(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: 'Admin not enabled' }, { status: 403 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.posts || !Array.isArray(body.posts)) {
    return NextResponse.json({ error: 'Missing posts array' }, { status: 400 });
  }

  const posts: BlogPost[] = body.posts.map((p: Partial<BlogPost>) => {
    if (!p.title) throw new Error('Post must have a title');
    if (!p.date) throw new Error('Post must have a date');
    return {
      slug: slugify(p.title),
      title: p.title,
      date: p.date,
      excerpt: p.excerpt ?? '',
      content: p.content ?? '',
      coverImageId: p.coverImageId,
      tags: p.tags ?? [],
      draft: p.draft === true,
    };
  });

  const blogYaml: BlogYaml = { posts };

  try {
    await writeBlogYaml(blogYaml);
    invalidateConfigCache();
    revalidatePath('/blog', 'layout');
    return NextResponse.json({ success: true, message: 'Saved successfully.' });
  } catch (err) {
    console.error('[Admin] Failed to write blog.yaml:', err);
    return NextResponse.json({ error: 'Failed to save blog posts' }, { status: 500 });
  }
}
