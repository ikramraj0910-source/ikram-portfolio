(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  /* ---------- mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var list = document.getElementById("nav-list");

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    list.classList.toggle("is-open", open);
    toggle.querySelector(".nav-toggle-label").textContent = open ? "Close" : "Menu";
  }

  if (toggle && list) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    list.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && list.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* ---------- header border on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- active section in navigation ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-list a:not(.btn)'));
  var sectionFor = {};
  navLinks.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (el) sectionFor[id] = a;
  });
  // the development section belongs to "Skills" in the navigation
  var aliases = { development: "skills" };

  if ("IntersectionObserver" in window) {
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });
      var current = null;
      ["home", "about", "experience", "projects", "skills", "development", "contact"].forEach(function (id) {
        if (visible[id] && !current) current = aliases[id] || id;
      });
      navLinks.forEach(function (a) {
        if (a.getAttribute("href") === "#" + current) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["home", "about", "experience", "projects", "skills", "development", "contact"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ---------- case study dialog ---------- */
  var dialog = document.getElementById("case-dialog");
  var body = document.getElementById("case-dialog-body");
  var library = document.getElementById("case-library");
  var opener = null;
  var current = null;

  function openCase(id, trigger) {
    var article = document.getElementById(id);
    if (!article || !dialog || typeof dialog.showModal !== "function") return false;
    if (current) library.appendChild(current);
    current = article;
    opener = trigger || null;
    body.appendChild(article);
    var title = article.querySelector(".case-title");
    if (title) dialog.setAttribute("aria-labelledby", title.id);
    if (!dialog.open) dialog.showModal();
    body.scrollTop = 0;
    root.classList.add("dialog-open");
    return true;
  }

  if (dialog && typeof dialog.showModal === "function") {
    document.querySelectorAll("[data-case]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        if (openCase(link.getAttribute("data-case"), link)) e.preventDefault();
      });
    });

    dialog.addEventListener("close", function () {
      if (current) library.appendChild(current);
      current = null;
      root.classList.remove("dialog-open");
      if (opener) opener.focus();
    });

    dialog.querySelector("[data-close]").addEventListener("click", function () {
      dialog.close();
    });

    // click on the backdrop closes the dialog
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });

    // deep links such as #case-setup open the matching case study
    var hash = window.location.hash.slice(1);
    if (hash.indexOf("case-") === 0) openCase(hash, document.querySelector('[data-case="' + hash + '"]'));
  } else {
    // no <dialog> support: show the case studies inline
    root.classList.remove("js");
  }

  /* ---------- copy email ---------- */
  var copyBtn = document.getElementById("copy-email");
  var status = document.getElementById("copy-status");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = copyBtn.getAttribute("data-copy");
      function selectFallback() {
        var el = document.getElementById("email-value");
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        status.textContent = "Address selected. Press Ctrl+C or ⌘C to copy.";
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          status.textContent = "Email address copied.";
          copyBtn.textContent = "Copied";
          setTimeout(function () { copyBtn.textContent = "Copy address"; }, 2400);
        }, selectFallback);
      } else {
        selectFallback();
      }
    });
  }

  /* ---------- year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
