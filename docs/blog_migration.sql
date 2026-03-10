-- ==========================================
-- BLOG FEATURE MIGRATION
-- Run this in Supabase SQL Editor
-- ==========================================

-- Blog post status enum
DO $$ BEGIN
    CREATE TYPE public.blog_post_status AS ENUM ('draft', 'review', 'published');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- TABLES
-- ==========================================

-- Blog Categories
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT 'bg-slate-100 text-slate-800',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Tags
CREATE TABLE IF NOT EXISTS public.blog_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT, -- HTML from Tiptap editor
    excerpt TEXT,
    cover_image_url TEXT, -- Cloudinary URL
    status public.blog_post_status DEFAULT 'draft' NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    views INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: Posts <-> Categories
CREATE TABLE IF NOT EXISTS public.blog_post_categories (
    post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.blog_categories(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (post_id, category_id)
);

-- Junction: Posts <-> Tags
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
    post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.blog_tags(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (post_id, tag_id)
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured ON public.blog_posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);

-- ==========================================
-- TRIGGERS
-- ==========================================

DROP TRIGGER IF EXISTS tr_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER tr_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Auto-set published_at when status changes to 'published'
CREATE OR REPLACE FUNCTION public.handle_blog_publish()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        NEW.published_at = COALESCE(NEW.published_at, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_blog_posts_publish ON public.blog_posts;
CREATE TRIGGER tr_blog_posts_publish
    BEFORE INSERT OR UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE PROCEDURE public.handle_blog_publish();

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Blog Posts: Public can read published posts
DROP POLICY IF EXISTS "Published posts are public" ON public.blog_posts;
CREATE POLICY "Published posts are public" ON public.blog_posts
    FOR SELECT USING (status = 'published');

-- Blog Posts: Admins can read all posts
DROP POLICY IF EXISTS "Admins can read all posts" ON public.blog_posts;
CREATE POLICY "Admins can read all posts" ON public.blog_posts
    FOR SELECT TO authenticated USING (public.is_admin());

-- Blog Posts: Admins can insert
DROP POLICY IF EXISTS "Admins can create posts" ON public.blog_posts;
CREATE POLICY "Admins can create posts" ON public.blog_posts
    FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- Blog Posts: Admins can update
DROP POLICY IF EXISTS "Admins can update posts" ON public.blog_posts;
CREATE POLICY "Admins can update posts" ON public.blog_posts
    FOR UPDATE TO authenticated USING (public.is_admin());

-- Blog Posts: Admins can delete
DROP POLICY IF EXISTS "Admins can delete posts" ON public.blog_posts;
CREATE POLICY "Admins can delete posts" ON public.blog_posts
    FOR DELETE TO authenticated USING (public.is_admin());

-- Categories: Public read
DROP POLICY IF EXISTS "Categories are public" ON public.blog_categories;
CREATE POLICY "Categories are public" ON public.blog_categories
    FOR SELECT USING (true);

-- Categories: Admin manage
DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;
CREATE POLICY "Admins can manage categories" ON public.blog_categories
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tags: Public read
DROP POLICY IF EXISTS "Tags are public" ON public.blog_tags;
CREATE POLICY "Tags are public" ON public.blog_tags
    FOR SELECT USING (true);

-- Tags: Admin manage
DROP POLICY IF EXISTS "Admins can manage tags" ON public.blog_tags;
CREATE POLICY "Admins can manage tags" ON public.blog_tags
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Junctions: Public read (follows post visibility)
DROP POLICY IF EXISTS "Post categories follow post visibility" ON public.blog_post_categories;
CREATE POLICY "Post categories follow post visibility" ON public.blog_post_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage post categories" ON public.blog_post_categories;
CREATE POLICY "Admins can manage post categories" ON public.blog_post_categories
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Post tags follow post visibility" ON public.blog_post_tags;
CREATE POLICY "Post tags follow post visibility" ON public.blog_post_tags
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage post tags" ON public.blog_post_tags;
CREATE POLICY "Admins can manage post tags" ON public.blog_post_tags
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==========================================
-- RPC FUNCTIONS
-- ==========================================

-- Increment view counter (callable by anyone viewing a published post)
CREATE OR REPLACE FUNCTION public.increment_blog_views(post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.blog_posts
    SET views = views + 1
    WHERE id = post_id AND status = 'published';
END;
$$;

-- ==========================================
-- SEED DATA
-- ==========================================

-- Categories
INSERT INTO public.blog_categories (id, name, slug, color) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Lịch Sử', 'lich-su', 'bg-heritage-red/10 text-heritage-red'),
    ('c0000000-0000-0000-0000-000000000002', 'Phong Tục', 'phong-tuc', 'bg-amber-100 text-amber-800'),
    ('c0000000-0000-0000-0000-000000000003', 'Khuyến Học', 'khuyen-hoc', 'bg-blue-100 text-blue-800'),
    ('c0000000-0000-0000-0000-000000000004', 'Phả Hệ', 'pha-he', 'bg-heritage-red/10 text-heritage-red'),
    ('c0000000-0000-0000-0000-000000000005', 'Văn Hóa', 'van-hoa', 'bg-emerald-100 text-emerald-800'),
    ('c0000000-0000-0000-0000-000000000006', 'Thông Báo', 'thong-bao', 'bg-purple-100 text-purple-800')
ON CONFLICT (id) DO NOTHING;

-- Tags
INSERT INTO public.blog_tags (id, name) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Quảng Nam'),
    ('e0000000-0000-0000-0000-000000000002', 'Cội nguồn'),
    ('e0000000-0000-0000-0000-000000000003', 'Giáo dục'),
    ('e0000000-0000-0000-0000-000000000004', 'Truyền thống'),
    ('e0000000-0000-0000-0000-000000000005', 'Ngày giỗ'),
    ('e0000000-0000-0000-0000-000000000006', 'Gia phả')
ON CONFLICT (id) DO NOTHING;

-- Sample Posts (author_id is NULL since we don't know the admin UUID at migration time)
INSERT INTO public.blog_posts (id, title, slug, content, excerpt, status, is_featured, views, published_at) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'Nguồn Gốc Dòng Họ Phạm Phú Tại Quảng Nam',
    'nguon-goc-dong-ho',
    '<p>Lịch sử dòng họ Phạm Phú khởi nguồn từ vùng đất Quảng Nam địa linh nhân kiệt. Trải qua bao thăng trầm của lịch sử, các thế hệ con cháu luôn giữ vững nếp nhà, phát huy truyền thống hiếu học và lòng yêu nước nồng nàn.</p><blockquote>"Dòng tộc là cội rễ, văn hóa là nhựa sống. Cây có vững gốc mới xanh lá, người có nhớ nguồn mới nên danh."</blockquote><p>Việc biên soạn lại sử liệu dòng họ không chỉ là trách nhiệm của những người làm công tác quản trị, mà còn là tâm nguyện của toàn thể con cháu hướng về nguồn cội.</p>',
    'Tìm hiểu về nguồn gốc và lịch sử hình thành dòng họ Phạm Phú tại vùng đất Quảng Nam.',
    'published', TRUE, 1240, NOW() - INTERVAL '30 days'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'Ý Nghĩa Ngày Giỗ Tổ Hằng Năm',
    'y-nghia-ngay-gio-to',
    '<p>Ngày giỗ tổ là dịp quan trọng nhất trong năm của dòng họ Phạm Phú. Đây là lúc con cháu khắp nơi quy tụ về nhà thờ tổ, cùng nhau tưởng nhớ công đức của tiền nhân.</p>',
    'Ngày giỗ tổ hằng năm mang ý nghĩa thiêng liêng trong văn hóa dòng tộc.',
    'draft', FALSE, 0, NULL
),
(
    'b0000000-0000-0000-0000-000000000003',
    'Gương Sáng Khuyến Học Tộc Phạm Phú 2023',
    'khuyen-hoc-2023',
    '<p>Năm 2023, quỹ khuyến học dòng họ đã trao tặng 15 suất học bổng cho các cháu có thành tích xuất sắc trong học tập. Đây là truyền thống tốt đẹp được duy trì hơn 20 năm qua.</p>',
    'Tổng kết hoạt động khuyến học và trao học bổng năm 2023 của dòng họ.',
    'published', FALSE, 856, NOW() - INTERVAL '25 days'
),
(
    'b0000000-0000-0000-0000-000000000004',
    'Phổ Hệ Chi Thứ Tư - Nhánh Phú Đa',
    'pho-he-chi-tu',
    '<p>Chi thứ tư của dòng họ Phạm Phú đã phát triển mạnh mẽ tại vùng Phú Đa. Qua nhiều thế hệ, nhánh này đã có nhiều đóng góp quan trọng cho sự phát triển của cả dòng tộc.</p>',
    'Giới thiệu phổ hệ chi thứ tư, nhánh Phú Đa của dòng họ Phạm Phú.',
    'published', FALSE, 2410, NOW() - INTERVAL '20 days'
),
(
    'b0000000-0000-0000-0000-000000000005',
    'Nghi Thức Cúng Tổ Tại Nhà Thờ Tộc',
    'nghi-thuc-cung-to',
    '<p>Bài viết hướng dẫn chi tiết các nghi thức cúng tổ truyền thống được thực hiện tại Nhà thờ Tộc Phạm Phú qua các dịp lễ lớn trong năm.</p>',
    'Hướng dẫn chi tiết nghi thức cúng tổ truyền thống tại Nhà thờ Tộc.',
    'published', FALSE, 634, NOW() - INTERVAL '15 days'
),
(
    'b0000000-0000-0000-0000-000000000006',
    'Kế Hoạch Tổ Chức Đại Hội Đại Biểu 2024',
    'dai-hoi-2024',
    '<p>Thông báo về kế hoạch tổ chức Đại hội Đại biểu dòng họ năm 2024. Mời toàn thể con cháu tham gia đóng góp ý kiến.</p>',
    'Thông báo kế hoạch tổ chức Đại hội Đại biểu dòng họ năm 2024.',
    'draft', FALSE, 0, NULL
)
ON CONFLICT (id) DO NOTHING;

-- Post <-> Category links
INSERT INTO public.blog_post_categories (post_id, category_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003'),
    ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004'),
    ('b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005'),
    ('b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

-- Post <-> Tag links
INSERT INTO public.blog_post_tags (post_id, tag_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005'),
    ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004'),
    ('b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003'),
    ('b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000006'),
    ('b0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004'),
    ('b0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

