const { getRecommendedPosts } = require("./recomendedPosts");
const Post = require("../models/post");
const Category = require("../models/post");

let viewHistoryMock;

jest.mock("../models/post", () => ({
  findByPk: jest.fn(),
  count: jest.fn(),
  findAll: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks(); // очищаем моки после каждого теста
});

test("getRecommendedPosts должна возвращать пустой массив для posts, если viewHistory = null или []", async () => {
  viewHistoryMock = null;
  let result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(result.posts).toEqual([]);

  viewHistoryMock = [];
  result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(result.posts).toEqual([]);
});

test("getRecommendedPosts вызывает findByPk() с аргументами из viewHistory", async () => {
  viewHistoryMock = [1, 2];
  Post.findByPk.mockResolvedValue(viewHistoryMock[0], 2);
  Post.findByPk.mockResolvedValue(viewHistoryMock[1], 2);

  await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.findByPk).toHaveBeenCalledTimes(2);
  expect(Post.findByPk).toHaveBeenCalledWith(viewHistoryMock[0], {
    attributes: ["id", "categoryId"],
  });
  expect(Post.findByPk).toHaveBeenCalledWith(viewHistoryMock[1], {
    attributes: ["id", "categoryId"],
  });
});

test("getRecommendedPosts вызывает findByPk() столько раз, сколько значений содержит viewHistory", async () => {
  viewHistoryMock = [1, 2];

  await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.findByPk).toHaveBeenCalledTimes(2);
});

test("getRecommendedPosts не вызывает findByPk() больше, чем длина массива viewHistory", async () => {
  viewHistoryMock = [1, 2];

  await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.findByPk).not.toHaveBeenCalledTimes(3);
});

test("getRecommendedPosts возвращает дефолтные значения, если viewedPosts содержит не найденные посты", async () => {
  viewHistoryMock = [1, 2, 3];
  Post.findByPk.mockResolvedValue(null);

  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.findByPk).toHaveBeenCalled();
  expect(Post.findByPk).toHaveBeenCalledTimes(3);
  expect(result).toEqual({
    posts: [],
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 0,
  });
});

test("getRecommendedPosts не возвращает дефолтные значения, если viewedPosts содержит хотя бы один найденный пост", async () => {
  viewHistoryMock = [1, 2];
  Post.findByPk.mockResolvedValueOnce(null);
  Post.findByPk.mockResolvedValueOnce({ id: 1, categoryId: 2 });

  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.findByPk).toHaveBeenCalled();
  expect(Post.findByPk).toHaveBeenCalledTimes(2);
  expect(result).not.toEqual({
    posts: [],
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 0,
  });
});

test("getRecommendedPosts вызывает Post.count() один раз", async () => {
    Post.findByPk.mockResolvedValueOnce({ id: 1, categoryId: 2 });
  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.count).toHaveBeenCalled();
  expect(Post.count).toHaveBeenCalledTimes(1);
});

test("getRecommendedPosts не вызывает Post.count() больше одного раза", async () => {
  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.count).not.toHaveBeenCalledTimes(2);
});

test("getRecommendedPosts не вызывает Post.count() больше одного раза", async () => {
  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.count).not.toHaveBeenCalledTimes(2);
});

test("getRecommendedPosts возвращает дефолтные значения если Post.count() возвращает 0", async () => {
  Post.count.mockResolvedValue(0);
  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(result).toEqual({
    posts: [],
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 0,
  });
});

test("getRecommendedPosts вызывает Post.count() с правильными параметрами", async () => {
  Post.count.mockResolvedValue(1);
  Post.findByPk.mockResolvedValueOnce({ id: 1, categoryId: 3 });
  Post.findByPk.mockResolvedValueOnce({ id: 2, categoryId: 4 });
  viewHistoryMock = [1, 2];

  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.count).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        categoryId: [3, 4]
      })
    })
  );
});

test("getRecommendedPosts вызывает Post.count() с правильными параметрами", async () => {
    Post.findByPk.mockResolvedValueOnce({ id: 1, categoryId: 3 })
    
  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(Post.findAll).toHaveBeenCalledWith(
    expect.objectContaining({
        where: expect.objectContaining({
            categoryId: [3]
        }),
        limit: 5,
        offset: 0
    }))
})

test("getRecommendedPosts вызывает Post.count() с правильными параметрами для второй страницы", async () => {
    Post.findByPk.mockResolvedValueOnce({ id: 1, categoryId: 4 })
    
  const result = await getRecommendedPosts(viewHistoryMock, 2, 5);

  expect(Post.findAll).toHaveBeenCalledWith(
    expect.objectContaining({
        where: expect.objectContaining({
            categoryId: [4]
        }),
        limit: 5,
        offset: 5
    }))
})

test("getRecommendedPosts возвращает правильные данные", async () => {
    Post.findByPk.mockResolvedValueOnce({ id: 1, categoryId: 4 })
    Post.count.mockResolvedValue(2)
    Post.findAll.mockResolvedValueOnce([{ id: 4, categoryId: 4 }, { id: 5, categoryId: 4 }])

  const result = await getRecommendedPosts(viewHistoryMock, 2, 5);

  expect(result).toEqual({
     posts: [{ id: 4, categoryId: 4 }, { id: 5, categoryId: 4 }],
      total: 2,
      page: 2,
      limit: 5,
      totalPages: 1,
  })
})

test("getRecommendedPosts возвращает правильное количество страниц", async () => {
    Post.findByPk.mockResolvedValueOnce({ id: 1, categoryId: 4 })
    Post.count.mockResolvedValue(10)
    Post.findAll.mockResolvedValueOnce(['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10'])

  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(result).toEqual({
     posts: ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10'],
      total: 10,
      page: 1,
      limit: 5,
      totalPages: 2,
  })
})

test("getRecommendedPosts не возвращает не правильные данные", async () => {
    Post.findByPk.mockResolvedValueOnce({ id: 1, categoryId: 4 })
    Post.count.mockResolvedValue(1)
    Post.findAll.mockResolvedValueOnce(['p1'])

  const result = await getRecommendedPosts(viewHistoryMock, 1, 5);

  expect(result).not.toEqual({
     posts: ['p1', 'p2', 'p3'],
      total: 10,
      page: 1,
      limit: 5,
      totalPages: 2,
  })
})