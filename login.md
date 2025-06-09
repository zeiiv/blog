---
layout: single
locale: en
lang: en
permalink: /login/
---

### Please Log In to Access This Site

<div data-netlify-identity-button></div>  <div data-netlify-identity-menu></div>    <script>
  // Optional: Redirect to the homepage or a specific page after successful login
  if (window.netlifyIdentity) {
    window.netlifyIdentity.on("login", user => {
      document.location.href = "/"; // Redirects to the homepage after login
    });
  }
</script>
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>