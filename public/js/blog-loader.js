(function() {
  'use strict';

  // Blog article loader - replaces Tilda feed with our API data
  function loadBlogArticles() {
    var container = document.querySelector('.js-feed-container');
    if (!container) {
      // Try again later
      setTimeout(loadBlogArticles, 500);
      return;
    }

    // Hide preloader
    var preloader = document.querySelector('.js-feed-preloader');
    if (preloader) {
      preloader.style.display = 'none';
    }

    fetch('/api/blog')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.status !== 'success' || !data.articles.length) {
          return;
        }

        container.innerHTML = '';

        data.articles.forEach(function(article) {
          var li = document.createElement('li');
          li.className = 't-feed__post t-feed__grid-col t-col t-col_4';

          var date = new Date(article.pubDate);
          var dateStr = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });

          var imageUrl = article.localImage || article.image;

          li.innerHTML = 
            '<div class="t-feed__post__wrapper">' +
              (imageUrl ? 
                '<a href="' + article.url + '">' +
                  '<div class="t-feed__post__img-wrapper" style="background-image:url(' + imageUrl + '); background-size:cover; background-position:center; height:250px; border-radius:20px;"></div>' +
                '</a>' : '') +
              '<div class="t-feed__post__text-wrapper" style="padding:15px 0;">' +
                '<div class="t-feed__post__date t-descr t-descr_xxs" style="color:#888;">' + dateStr + '</div>' +
                '<a href="' + article.url + '" style="text-decoration:none; color:inherit;">' +
                  '<h3 class="t-feed__post__title t-title t-title_xxs" style="margin:10px 0; font-family:Montserrat Alternates,sans-serif; font-weight:600; color:#0e0e0e;">' + article.title + '</h3>' +
                '</a>' +
                '<div class="t-feed__post__descr t-descr t-descr_xs" style="color:#555; line-height:1.5;">' + article.description + '</div>' +
              '</div>' +
            '</div>';

          container.appendChild(li);
        });

        // Make visible
        var records = document.getElementById('allrecords');
        if (records) {
          records.classList.add('t-records_animated', 't-records_visible');
        }
      })
      .catch(function(err) {
        console.error('Blog load error:', err);
      });
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadBlogArticles, 300);
  });
})();