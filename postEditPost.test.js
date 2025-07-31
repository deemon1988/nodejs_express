const { postEditPost } = require("./controllers/admin");
const Post = require("./models/post");
const { deleteFile } = require("./util/fileUtils");
const {validationResult} = require('express-validator')

jest.mock("./models/post");
jest.mock("./util/fileUtils");
jest.mock("express-validator");

describe("postEditPost()", () => {
  let req, res, fakePost, updatedPost;
  beforeEach(() => {
    fakePost = {
      id: 1,
      title: "Test post title",
      content: "Test post content",
      categoryId: 2,
      image: "/images/test-image.png",
      cover: "/images/cover/test-cover.png",
      gallery: [
        "/images/gallery/test-image1.png",
        "/images/gallery/test-image2.png",
      ],
      userId: 1,
      save: jest.fn(),
    };

    req = {
      body: {
        postId: 1,
        title: "Title test",
        content: "Test content",
        category: 2,
      },
      user: {
        id: 1,
      },
      files: { image: ["image1.png"] },
      session: {},
    };

    res = {
      redirect: jest.fn(),
    };

    Post.findByPk.mockReturnValue(fakePost);
    validationResult.mockReturnValue({isEmpty: () => true})
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("deleteFile() не должна вызываться если нет ошибок и нет старого изображения поста", async () => {
    fakePost.image = null
    await postEditPost(req, res);

    expect(deleteFile).not.toHaveBeenCalled();
  });

  test("deleteFile() должна вызываться если нет ошибок и есть сохраненное в сессии изображение", async () => {
    req.session.tempImage = "/images/posts/temp-image.png";

    await postEditPost(req, res);

    expect(deleteFile).toHaveBeenCalled();
  });

   test("deleteFile() должна вызываться если нет ошибок и есть загруженное изображение", async () => {

    await postEditPost(req, res);

    expect(deleteFile).toHaveBeenCalled();
  });

  test("deleteFile() должна вызываться с правильными параметрами если нет ошибок и есть загруженное изображение", async () => {

    await postEditPost(req, res);

    expect(deleteFile).toHaveBeenCalledWith('/images/test-image1.png');
  });
  
});
