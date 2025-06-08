// assets/js/fabs-mover.js

document.addEventListener("DOMContentLoaded", function() {
  const fabsContainer = document.getElementById('fabs-container');
  if (fabsContainer) {
    // Move the container to be the last child of the body
    document.body.appendChild(fabsContainer);
    // Make it visible after moving
    fabsContainer.style.display = 'block';
  }
});