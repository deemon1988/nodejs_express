const Post = require("../models/post");
const Category = require("../models/category");
const { getAllPosts } = require("./allPostsPerPage");



const mockPosts = ["post1", "post2", "post3", "post4", "post5", "post6"];

jest.mock("../models/post", () => ({
  count: jest.fn(),
  findAll: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks(); // очищаем моки после каждого теста
});

test("getAllPost должна вызывать count", async () => {
  
    const result = await getAllPosts(1, 5);

  expect(Post.count).toHaveBeenCalled();

});

test("getAllPost должна возвращать правильное количество всех постов", async () => {
  Post.count.mockResolvedValue(mockPosts.length)

  const result = await getAllPosts(1, 5);

  expect(result.total).toBe(6);
});


test("getAllPost должна возвращать правильные данные на первой странице", async () => {
  Post.count.mockResolvedValue(mockPosts.length)
  Post.findAll.mockResolvedValue(mockPosts.slice(0, 5))
  
  const result = await getAllPosts(1, 5);

  expect(result).toEqual({
    posts: ["post1", "post2", "post3", "post4", "post5"],
    total: 6,
    page: 1,
    limit: 5,
    totalPages: 2,
  });
});

test("getAllPost должна возвращать правильные данные на второй странице", async () => {
  Post.count.mockResolvedValue(mockPosts.length)
  Post.findAll.mockResolvedValue(mockPosts.slice(5, 6))
  
  const result = await getAllPosts(2, 5);

  expect(result).toEqual({
    posts: ["post6"],
    total: 6,
    page: 2,
    limit: 5,
    totalPages: 2,
  });
});

test("getAllPost должна вызывать findAll() с правильными аргументами", async() => {
    await getAllPosts(page = 2, limit = 5);

     expect(Post.findAll).toHaveBeenCalledWith({
     include: [
        {
          model: Category,
          as: "category",
        },
      ],
      limit: 5,
      offset: 5,
      order: [["createdAt", "DESC"]], // PostgreSQL
  });

})