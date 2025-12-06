"use client";

import { useState, useCallback, useMemo } from "react";

// Blog types
export type BlogStatus = "draft" | "published" | "archived";

export type Blog = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: BlogStatus;
  featured_image: string | null;
  author_name: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogInput = {
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  status: BlogStatus;
  featured_image?: string | null;
  published_at?: string | null;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Mock data
const mockBlogs: Blog[] = [
  {
    id: "1",
    title: "10 Điểm Du Lịch Đẹp Nhất Việt Nam",
    slug: "10-diem-du-lich-dep-nhat-viet-nam",
    content: "Việt Nam là một đất nước với nhiều cảnh đẹp tuyệt vời...",
    excerpt:
      "Khám phá những điểm du lịch đẹp nhất Việt Nam mà bạn không nên bỏ lỡ.",
    status: "published",
    featured_image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
    author_name: "Nguyễn Văn A",
    published_at: "2024-01-15T10:00:00Z",
    created_at: "2024-01-10T08:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    title: "Hướng Dẫn Đặt Phòng Khách Sạn Online",
    slug: "huong-dan-dat-phong-khach-san-online",
    content: "Đặt phòng khách sạn online ngày càng trở nên phổ biến...",
    excerpt:
      "Các bước đơn giản để đặt phòng khách sạn online một cách nhanh chóng và tiện lợi.",
    status: "published",
    featured_image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    author_name: "Trần Thị B",
    published_at: "2024-01-20T14:30:00Z",
    created_at: "2024-01-18T09:00:00Z",
    updated_at: "2024-01-20T14:30:00Z",
  },
  {
    id: "3",
    title: "Top 5 Khách Sạn View Đẹp Tại Đà Lạt",
    slug: "top-5-khach-san-view-dep-tai-da-lat",
    content:
      "Đà Lạt nổi tiếng với khí hậu mát mẻ và cảnh quan thiên nhiên tuyệt đẹp...",
    excerpt:
      "Danh sách các khách sạn có view đẹp nhất tại Đà Lạt mà bạn nên trải nghiệm.",
    status: "draft",
    featured_image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
    author_name: "Lê Văn C",
    published_at: null,
    created_at: "2024-01-25T11:00:00Z",
    updated_at: "2024-01-25T11:00:00Z",
  },
  {
    id: "4",
    title: "Kinh Nghiệm Du Lịch Phú Quốc 3 Ngày 2 Đêm",
    slug: "kinh-nghiem-du-lich-phu-quoc-3-ngay-2-dem",
    content: "Phú Quốc là điểm đến lý tưởng cho kỳ nghỉ hè...",
    excerpt:
      "Chia sẻ kinh nghiệm du lịch Phú Quốc với lịch trình 3 ngày 2 đêm chi tiết.",
    status: "published",
    featured_image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
    author_name: "Phạm Thị D",
    published_at: "2024-02-01T09:00:00Z",
    created_at: "2024-01-28T10:00:00Z",
    updated_at: "2024-02-01T09:00:00Z",
  },
  {
    id: "5",
    title: "Các Món Ăn Đặc Sản Miền Bắc",
    slug: "cac-mon-an-dac-san-mien-bac",
    content: "Ẩm thực miền Bắc có nhiều món ăn đặc trưng...",
    excerpt: "Khám phá những món ăn đặc sản nổi tiếng của miền Bắc Việt Nam.",
    status: "archived",
    featured_image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
    author_name: "Hoàng Văn E",
    published_at: "2023-12-15T16:00:00Z",
    created_at: "2023-12-10T08:00:00Z",
    updated_at: "2024-01-05T10:00:00Z",
  },
  {
    id: "6",
    title: "Lễ Hội Hoa Anh Đào Nhật Bản",
    slug: "le-hoi-hoa-anh-dao-nhat-ban",
    content: "Mùa hoa anh đào là thời điểm đẹp nhất trong năm tại Nhật Bản...",
    excerpt:
      "Tìm hiểu về lễ hội hoa anh đào nổi tiếng của Nhật Bản và thời điểm tốt nhất để ngắm hoa.",
    status: "draft",
    featured_image:
      "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800",
    author_name: "Nguyễn Thị F",
    published_at: null,
    created_at: "2024-02-05T13:00:00Z",
    updated_at: "2024-02-05T13:00:00Z",
  },
  {
    id: "7",
    title: "Review Khách Sạn 5 Sao Tại Hà Nội",
    slug: "review-khach-san-5-sao-tai-ha-noi",
    content: "Hà Nội có nhiều khách sạn 5 sao sang trọng...",
    excerpt: "Đánh giá chi tiết các khách sạn 5 sao tốt nhất tại Hà Nội.",
    status: "published",
    featured_image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    author_name: "Trần Văn G",
    published_at: "2024-02-10T11:00:00Z",
    created_at: "2024-02-08T09:00:00Z",
    updated_at: "2024-02-10T11:00:00Z",
  },
  {
    id: "8",
    title: "Cẩm Nang Du Lịch Bụi Cho Người Mới",
    slug: "cam-nang-du-lich-bui-cho-nguoi-moi",
    content: "Du lịch bụi là một trải nghiệm thú vị và đầy thử thách...",
    excerpt: "Hướng dẫn chi tiết cho những người mới bắt đầu với du lịch bụi.",
    status: "published",
    featured_image:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800",
    author_name: "Lê Thị H",
    published_at: "2024-02-12T15:00:00Z",
    created_at: "2024-02-10T10:00:00Z",
    updated_at: "2024-02-12T15:00:00Z",
  },
];

// Hook for managing blogs with mock data
export function useBlogs(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const [blogs, setBlogs] = useState<Blog[]>(mockBlogs);
  const [isLoading, setIsLoading] = useState(false);

  // Filter and paginate blogs
  const filteredBlogs = useMemo(() => {
    let filtered = blogs;

    // Apply search filter
    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase();
      filtered = blogs.filter(
        (blog) =>
          blog.title.toLowerCase().includes(searchLower) ||
          blog.content.toLowerCase().includes(searchLower) ||
          blog.slug.toLowerCase().includes(searchLower) ||
          (blog.excerpt && blog.excerpt.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [blogs, search]);

  // Paginate filtered blogs
  const paginatedBlogs = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredBlogs.slice(start, end);
  }, [filteredBlogs, page, limit]);

  const pagination: PaginationMeta = useMemo(() => {
    const total = filteredBlogs.length;
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
    };
  }, [filteredBlogs.length, page, limit]);

  // Create blog
  const createBlog = useCallback(async (input: BlogInput): Promise<Blog> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call

    const newBlog: Blog = {
      id: Date.now().toString(),
      excerpt: input.excerpt || null,
      featured_image: input.featured_image || null,
      status: input.status || "draft",
      published_at: input.published_at || null,
      title: input.title || "",
      slug: input.slug || "",
      content: input.content || "",
      author_name: "Người dùng hiện tại",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setBlogs((prev) => [newBlog, ...prev]);
    setIsLoading(false);
    return newBlog;
  }, []);

  // Update blog
  const updateBlog = useCallback(
    async (id: string, input: Partial<BlogInput>): Promise<Blog> => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call

      const updatedBlog = blogs.find((b) => b.id === id);
      if (!updatedBlog) {
        throw new Error("Blog không tồn tại");
      }

      const blog: Blog = {
        ...updatedBlog,
        ...input,
        updated_at: new Date().toISOString(),
      };

      setBlogs((prev) => prev.map((b) => (b.id === id ? blog : b)));
      setIsLoading(false);
      return blog;
    },
    [blogs]
  );

  // Update blog status
  const updateBlogStatus = useCallback(
    async (id: string, status: BlogStatus): Promise<Blog> => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate API call

      const updatedBlog = blogs.find((b) => b.id === id);
      if (!updatedBlog) {
        throw new Error("Blog không tồn tại");
      }

      const blog: Blog = {
        ...updatedBlog,
        status,
        updated_at: new Date().toISOString(),
        published_at:
          status === "published" && !updatedBlog.published_at
            ? new Date().toISOString()
            : updatedBlog.published_at,
      };

      setBlogs((prev) => prev.map((b) => (b.id === id ? blog : b)));
      setIsLoading(false);
      return blog;
    },
    [blogs]
  );

  // Delete blog
  const deleteBlog = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate API call

    setBlogs((prev) => prev.filter((b) => b.id !== id));
    setIsLoading(false);
  }, []);

  // Get blog by ID
  const getBlogById = useCallback(
    async (id: string): Promise<Blog | null> => {
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate API call
      return blogs.find((b) => b.id === id) || null;
    },
    [blogs]
  );

  // Refetch blogs
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsLoading(false);
  }, []);

  return {
    blogs: paginatedBlogs,
    isLoading,
    pagination,
    createBlog,
    updateBlog,
    updateBlogStatus,
    deleteBlog,
    getBlogById,
    refetch,
  };
}
