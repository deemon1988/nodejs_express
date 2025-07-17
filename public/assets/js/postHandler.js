document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", async (e) => {
    const likeIcon = e.target.closest(".like-icon");

    if (!likeIcon) return;

    e.preventDefault();

    const postId = likeIcon.dataset.id;
    const like = likeIcon.classList.contains("active");

    try {
      const response = await fetch(`/post/${postId}/like?like=${like}`, {
        method: "POST",
      });
      const data = await response.json();

      if (like) {
        likeIcon.classList.toggle("active");
      } else {
        likeIcon.classList.add("active");
      }

      likeIcon.textContent = data.likes;
    } catch (err) {
      console.log(err);
    }
  });
});
