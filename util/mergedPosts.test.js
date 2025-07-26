const { getAllPosts } = require("./allPostsPerPage");
const { getRecommendedPosts } = require("./recomendedPosts");
const { getMergedPosts } = require("./mergedPosts");

let viewHistory;

jest.mock("./recomendedPosts", () => ({
  getRecommendedPosts: jest.fn(),
}));

jest.mock("./allPostsPerPage", () => ({
  getAllPosts: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks(); // очищаем моки после каждого теста
});

test("getMergedPosts возвращает объединенный массив уникальных постов", async () => {
  getRecommendedPosts.mockResolvedValue({ posts: [{ id: 1 }, { id: 2 }, { id: 5 }] });
  getAllPosts.mockResolvedValue({ posts: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }] });

  const result = await getMergedPosts(viewHistory, 1, 5);

  expect(result.posts).toEqual([{ id: 1 }, { id: 2 }, { id: 5 }, { id: 3 }]);
});

test("getMergedPosts возвращает объединенный массив определенной длины", async () => {
  getRecommendedPosts.mockResolvedValue({ posts: [{ id: 1 }, { id: 2 }, { id: 5 }] });
  getAllPosts.mockResolvedValue({ posts: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }] });

  const result = await getMergedPosts(viewHistory, 1, 5);

  expect(result.posts).toHaveLength(4)
});

test("getMergedPosts возвращает правильный формат данных", async () => {
  getRecommendedPosts.mockResolvedValue({ posts: [{ id: 1 }, { id: 2 }, { id: 5 }] });
  getAllPosts.mockResolvedValue({ posts: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }], total: 4 });

  const result = await getMergedPosts(viewHistory, 1, 5);

  expect(result).toEqual({
     posts: [{ id: 1 }, { id: 2 }, { id: 5 }, { id: 3 }],
      total: 4,
      page: 1,
      limit: 5,
      totalPages: 1,
  })
});

test("getMergedPosts возвращает правильный формат данных со всеми постами, если нет рекомендуемых ", async () => {
    viewHistory = null
  getRecommendedPosts.mockResolvedValue({ posts: [] });
  getAllPosts.mockResolvedValue({ posts: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], total: 4 });

  const result = await getMergedPosts(viewHistory, 1, 5);

  expect(result).toEqual({
     posts: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      total: 4,
      page: 1,
      limit: 5,
      totalPages: 1,
  })
});