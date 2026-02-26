(function () {
  var RC_URL = "{{baseUrl}}";
  var COOKIE_NAME = "rc_cid";
  var COOKIE_DAYS = 365;

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie =
      name +
      "=" +
      encodeURIComponent(value) +
      ";expires=" +
      d.toUTCString() +
      ";path=/;SameSite=Lax";
  }

  function getContactId() {
    return getCookie(COOKIE_NAME) || null;
  }

  function send(endpoint, payload) {
    var url = RC_URL + endpoint;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, JSON.stringify(payload));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify(payload));
    }
  }

  function trackPageView() {
    send("/api/v1/tracking/page", {
      url: window.location.href,
      referrer: document.referrer || undefined,
      title: document.title || undefined,
      contactId: getContactId(),
    });
  }

  function trackEvent(eventName, data) {
    send("/api/v1/tracking/page", {
      url: window.location.href,
      contactId: getContactId(),
      event: eventName,
      data: data || {},
    });
  }

  function identify(contactId) {
    if (contactId) {
      setCookie(COOKIE_NAME, contactId, COOKIE_DAYS);
    }
  }

  var params = new URLSearchParams(window.location.search);
  var cidParam = params.get("rc_cid");
  if (cidParam) {
    identify(cidParam);
  }

  window.rc = {
    track: trackEvent,
    identify: identify,
    getContactId: getContactId,
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    trackPageView();
  } else {
    document.addEventListener("DOMContentLoaded", trackPageView);
  }
})();
