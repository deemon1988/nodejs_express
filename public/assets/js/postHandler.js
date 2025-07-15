document.addEventListener("DOMContentLoaded", () => {
  const likeIcon = document.querySelector(".like-icon");

  if (likeIcon) {
    const postId = likeIcon.dataset.id;
   
   
    likeIcon.addEventListener("click", async (e) => {
      e.preventDefault();
        const like = likeIcon.classList.contains('active')
  console.log(like)
      fetch(`/post/${postId}/like?like=${like}`, {
        method: "POST",
      })
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          like ? likeIcon.classList.toggle('active') : likeIcon.classList.add('active')
          likeIcon.textContent = data.likes;
        })
        .catch((err) => console.log(err));
    });
  }
});
