const Post = require("../models/post");
const Category = require("../models/category");
const { getAllPostsOnPage } = require("./allPostsPerPage");
const User = require("../models/user");
const Comment = require("../models/comment");

const mockPosts = ["post1", "post2", "post3", "post4", "post5", "post6"];

jest.mock("../models/post");

// jest.mock("../models/post", () => ({
//   count: jest.fn(),
//   findAll: jest.fn(),
// }));

describe("getAllPost()", () => {
  let fakePostIds, fakeBatchOfPosts;

  beforeEach(() => {
    fakePostIds = [1, 2, 3, 4, 5, 6];
    fakeBatchOfPosts = [
      {
        id: 1,
        userId: 2,
        categoryId: 2,
        category: {
          id: 2,
        },
      },
      {
        id: 2,
        userId: 2,
        categoryId: 3,
        category: {
          id: 3,
        },
      },
      {
        id: 3,
        userId: 2,
        categoryId: 4,
        category: {
          id: 4,
        },
      },
      {
        id: 4,
        userId: 2,
        categoryId: 2,
        category: {
          id: 2,
        },
      },
      {
        id: 5,
        userId: 2,
        categoryId: 3,
        category: {
          id: 3,
        },
      },
    ];

    fakeReturnValue = {
      ...fakeBatchOfPosts,
      total: 6,
      page: 1,
      limit: 5,
      totalPages: 2,
    };
  });

  afterEach(() => {
    jest.clearAllMocks(); // очищаем моки после каждого теста
  });

  test("Post.count() должна вызываться", async () => {
    await getAllPostsOnPage(2, 1, 5, fakePostIds);

    expect(Post.count).toHaveBeenCalled();
  });

  test("Post.count() должна вызываться с правильными параметрами", async () => {
    await getAllPostsOnPage(2, 1, 5, fakePostIds);

    expect(Post.count).toHaveBeenCalledWith({ where: { id: fakePostIds } });
  });

  test("Post.count() должна возвращать правильное количество всех постов", async () => {
    Post.count.mockResolvedValueOnce(fakePostIds.length);

    const result = await getAllPostsOnPage(1, 5);

    expect(result.total).toBe(6);
  });

  test("Post.findAll() должна возвращать правильные данные на первой странице", async () => {
    Post.count.mockResolvedValueOnce(fakePostIds.length);
    Post.findAll.mockResolvedValueOnce(fakeBatchOfPosts);

    const result = await getAllPostsOnPage(2, 1, 5, fakePostIds);

    expect(result).toEqual({
      posts: fakeBatchOfPosts,
      total: 6,
      page: 1,
      limit: 5,
      totalPages: 2,
    });
  });

  test("Post.findAll() должна возвращать правильные данные на второй странице", async () => {
    Post.count.mockResolvedValueOnce(fakePostIds.length);
    Post.findAll.mockResolvedValueOnce([
      {
        id: 1,
        userId: 2,
        categoryId: 2,
        category: {
          id: 2,
        },
      },
    ]);

    const result = await getAllPostsOnPage(2, 2, 5, fakePostIds);

    expect(result).toEqual({
      posts: [
        {
          id: 1,
          userId: 2,
          categoryId: 2,
          category: {
            id: 2,
          },
        },
      ],
      total: 6,
      page: 2,
      limit: 5,
      totalPages: 2,
    });
  });

  test("findAll() должна вызываться с правильными аргументами", async () => {
    await getAllPostsOnPage(2, 2, 5, fakePostIds);

    expect(Post.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: fakePostIds },
        limit: 5,
        offset: 5,
        order: [["createdAt", "DESC"]],
        include: expect.arrayContaining([
          expect.objectContaining({
            model: Category,
            as: "category",
          }),
          expect.objectContaining({
            model: Comment,
            as: "comments",
            required: false,
          }),
          expect.objectContaining({
            model: User,
            as: "likedUsers",
            attributes: ["id"],
            through: { attributes: [] },
            where: { id: 2 },
            required: false,
          }),
        ]),
      })
    );
  });
});
