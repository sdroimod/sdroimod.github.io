(function () {
  // Bỏ qua kiểm tra nếu đang ở trang blocked.html
  if (window.location.pathname.endsWith('/blocked.html') || window.location.pathname === '/blocked.html') {
    return;
  }

  function blockAccess() {
    document.documentElement.style.display = 'none';
    var redirectUrl = window.location.origin + '/blocked.html';
    window.location.href = redirectUrl;
  }

  // Kiểm tra cache trong sessionStorage để tránh spam API
  var cachedCountry = sessionStorage.getItem('user_country');
  if (cachedCountry === 'VN') {
    blockAccess();
    return;
  } else if (cachedCountry && cachedCountry !== 'VN') {
    return;
  }

  // Gọi API kiểm tra GeoIP với Timeout 3s
  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timeoutId = setTimeout(function () {
    if (controller) controller.abort();
  }, 3000);

  fetch('https://api.country.is/', { signal: controller ? controller.signal : undefined })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      clearTimeout(timeoutId);
      if (data && data.country) {
        sessionStorage.setItem('user_country', data.country);
        if (data.country === 'VN') {
          blockAccess();
        }
      }
    })
    .catch(function () {
      // Fallback sang ipapi.co nếu API chính không phản hồi
      fetch('https://ipapi.co/json/')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.country_code) {
            sessionStorage.setItem('user_country', data.country_code);
            if (data.country_code === 'VN') {
              blockAccess();
            }
          }
        })
        .catch(function (err) {
          console.warn('GeoIP check unavailable:', err);
        });
    });
})();

