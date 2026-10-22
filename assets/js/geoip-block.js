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
  // Kiểm tra cache trong sessionStorage
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
  function checkCloudflareTrace() {
    return fetch('https://www.cloudflare.com/cdn-cgi/trace')
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].indexOf('loc=') === 0) {
            return lines[i].split('=')[1].trim();
          }
        }
        return null;
      });
  }

  fetch('https://api.country.is/', { signal: controller ? controller.signal : undefined })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      clearTimeout(timeoutId);
      if (data && data.country) {
        sessionStorage.setItem('user_country', data.country);
        if (data.country === 'VN') {
          blockAccess();
        }
  function checkGeoJS() {
    return fetch('https://get.geojs.io/v1/ip/country.json')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        return data && data.country ? data.country : null;
      });
  }

  function checkIPWhois() {
    return fetch('https://ipwho.is/')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        return data && data.country_code ? data.country_code : null;
      });
  }

  function processCountry(country) {
    if (country) {
      sessionStorage.setItem('user_country', country);
      if (country === 'VN') {
        blockAccess();
        return true;
      }
    }
    return false;
  }

  // Ưu tiên 1: Cloudflare Trace (Không bao giờ bị AdBlock chặn và không giới hạn rate limit)
  checkCloudflareTrace()
    .then(function (country) {
      if (!processCountry(country)) {
        // Nếu CF trace không lấy được, thử GeoJS
        return checkGeoJS().then(processCountry);
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
      // Fallback 1: GeoJS
      checkGeoJS()
        .then(function (country) {
          if (!processCountry(country)) {
            // Fallback 2: IPWhois
            return checkIPWhois().then(processCountry);
          }
        })
        .catch(function (err) {
          console.warn('GeoIP check unavailable:', err);
        .catch(function () {
          // Fallback 2: IPWhois
          checkIPWhois().then(processCountry).catch(function (err) {
            console.warn('GeoIP detection failed across all endpoints:', err);
          });
        });
    });
})();

