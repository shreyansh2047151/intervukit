function showPage(pageId) {
  // Hide all sections
  document.querySelectorAll(".content").forEach((section) => {
    section.classList.remove("active");
  });

  // Remove active state from sidebar
  document.querySelectorAll(".sidebar li").forEach((item) => {
    item.classList.remove("active");
  });

  // Show the selected section and apply animation
  const activeSection = document.getElementById(pageId);
  activeSection.classList.add("active");

  // Animate on page change
  setTimeout(() => {
    activeSection.classList.add("animate-fade-in");
  }, 100);

  // Set sidebar active
  document
    .querySelector(`.sidebar li[onclick="showPage('${pageId}')"]`)
    .classList.add("active");
}
