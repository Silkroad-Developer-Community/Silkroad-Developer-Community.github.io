import "./style.css";
import { marked } from "marked";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Silkroad Developer Community initialized.");

  const homeView = document.getElementById("home-view");
  const governanceView = document.getElementById("governance-view");
  const roadmapView = document.getElementById("roadmap-view");
  const markdownContent = document.getElementById("markdown-content");
  const roadmapContent = document.getElementById("roadmap-content");
  const roadmapTeaserContent = document.getElementById("roadmap-teaser-content");

  // Simple Router
  function handleRouting() {
    const hash = window.location.hash;
    if (hash === "#governance") {
      showView(governanceView, "Governance | Silkroad Developer Community", fetchAndRenderInfo);
    } else if (hash === "#roadmap") {
      showView(roadmapView, "Roadmap | Silkroad Developer Community", fetchAndRenderRoadmap);
    } else if (hash === "#tools") {
      showView(homeView, "Silkroad Developer Community", () => {
        fetchAndRenderRoadmapTeaser();
        setTimeout(() => {
          const toolsSection = document.getElementById("tools");
          if (toolsSection) toolsSection.scrollIntoView({ behavior: "smooth" });
        }, 100);
      });
    } else {
      showView(homeView, "Silkroad Developer Community", fetchAndRenderRoadmapTeaser);
    }
  }

  function showView(viewToShow, title, callback) {
    [homeView, governanceView, roadmapView].forEach((view) => {
      if (view) view.style.display = view === viewToShow ? "block" : "none";
    });
    document.title = title;
    window.scrollTo(0, 0);
    if (callback) callback();
  }

  async function fetchAndRenderInfo() {
    const GOVERNANCE_URL =
      "https://raw.githubusercontent.com/Silkroad-Developer-Community/GOVERNANCE/refs/heads/main/README.md";
    if (markdownContent.classList.contains("loaded")) return;

    try {
      const response = await fetch(GOVERNANCE_URL);
      if (!response.ok) throw new Error("Failed to fetch governance documentation");
      let mdText = await response.text();

      const headerMatches = Array.from(mdText.matchAll(/^#+\s/gm));
      if (headerMatches.length > 1) {
        mdText = mdText.substring(headerMatches[1].index);
      }

      markdownContent.innerHTML = marked.parse(mdText);
      markdownContent.classList.add("loaded");
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.error("Error rendering markdown:", e);
      markdownContent.innerHTML = `<div class="error-state">Failed to load documentation. <a href="${GOVERNANCE_URL}" target="_blank">Raw on GitHub</a></div>`;
    }
  }

  async function fetchAndRenderRoadmap() {
    const ROADMAP_URL =
      "https://raw.githubusercontent.com/Silkroad-Developer-Community/ROADMAP/refs/heads/main/README.md";
    if (roadmapContent.classList.contains("loaded")) return;

    try {
      const response = await fetch(ROADMAP_URL);
      if (!response.ok) throw new Error("Failed to fetch roadmap");
      const mdText = await response.text();

      roadmapContent.innerHTML = marked.parse(mdText);
      roadmapContent.classList.add("loaded");
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.error("Error rendering roadmap:", e);
      roadmapContent.innerHTML = `<div class="error-state">Failed to load roadmap. <a href="${ROADMAP_URL}" target="_blank">Raw on GitHub</a></div>`;
    }
  }

  async function fetchAndRenderRoadmapTeaser() {
    const ROADMAP_URL =
      "https://raw.githubusercontent.com/Silkroad-Developer-Community/ROADMAP/refs/heads/main/README.md";
    if (roadmapTeaserContent.classList.contains("loaded")) return;

    try {
      const response = await fetch(ROADMAP_URL);
      if (!response.ok) throw new Error("Failed to fetch roadmap");
      const mdText = await response.text();

      // Extract teaser (skip first header, take next few sections)
      const headerMatches = Array.from(mdText.matchAll(/^#+\s/gm));
      let teaserMd = mdText;

      if (headerMatches.length > 1) {
        // Start from second header (skip title)
        const start = headerMatches[1].index;
        // Take a decent chunk, but stop before it gets too long
        const end = headerMatches.length > 5 ? headerMatches[5].index : mdText.length;
        teaserMd = mdText.substring(start, end);

        // Final trim to ensure it doesn't overflow dramatically
        if (teaserMd.length > 800) {
          teaserMd = teaserMd.substring(0, 800).trim() + "...";
        }
      }

      roadmapTeaserContent.innerHTML = `<div class="markdown-body">${marked.parse(teaserMd)}</div>`;
      roadmapTeaserContent.classList.add("loaded");
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.error("Error rendering roadmap teaser:", e);
      roadmapTeaserContent.innerHTML = "<p>Unable to load roadmap highlights.</p>";
    }
  }

  window.addEventListener("hashchange", handleRouting);
  handleRouting(); // Initial check

  // GitHub Stats Fetching
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  const BASE_URL = "https://api.github.com";

  async function fetchRepoStats() {
    const cards = document.querySelectorAll(".project-card[data-repo]");

    for (const card of cards) {
      const repo = card.dataset.repo;
      const assetPattern = card.dataset.assetPattern;
      const statsContainer = card.querySelector(".project-stats");
      const statusBadge = card.querySelector(".project-status");
      if (!statsContainer) continue;

      try {
        let data = getCachedData(repo);

        if (!data) {
          const [repoResponse, releasesResponse] = await Promise.all([
            fetch(`${BASE_URL}/repos/${repo}`),
            fetch(`${BASE_URL}/repos/${repo}/releases`),
          ]);

          if (!repoResponse.ok) throw new Error("Failed to fetch repository data");

          const repoData = await repoResponse.json();
          const releases = releasesResponse.ok ? await releasesResponse.json() : [];

          const stableRelease = releases.find((r) => !r.prerelease);
          const preRelease = releases.find((r) => r.prerelease);

          const getDownloadUrl = (release, pattern) => {
            if (!release) return null;
            if (pattern && release.assets && release.assets.length > 0) {
              const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$", "i");
              const asset = release.assets.find((a) => regex.test(a.name));
              if (asset) return asset.browser_download_url;
            }
            return release.html_url;
          };

          data = {
            stargazers_count: repoData.stargazers_count,
            forks_count: repoData.forks_count,
            open_issues_count: repoData.open_issues_count,
            description: repoData.description,
            owner: repoData.owner.login,
            version: stableRelease ? stableRelease.tag_name : "No Release",
            release_date: stableRelease ? new Date(stableRelease.published_at).toLocaleDateString() : "N/A",
            stable_download_url: getDownloadUrl(stableRelease, assetPattern),
            pre_version: preRelease ? preRelease.tag_name : null,
            pre_download_url: getDownloadUrl(preRelease, assetPattern),
          };

          cacheData(repo, data);
        }

        updateStatsUI(card, data);
      } catch (error) {
        console.error(`Error fetching stats for ${repo}:`, error);
        if (statusBadge) statusBadge.textContent = "Error";
      }
    }

    // Initialize/Refresh Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function getCachedData(repo) {
    const cached = localStorage.getItem(`gh-stats-v5-${repo}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`gh-stats-v5-${repo}`);
      return null;
    }
    return data;
  }

  function cacheData(repo, data) {
    const cacheObject = {
      data: data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`gh-stats-v5-${repo}`, JSON.stringify(cacheObject));
  }

  function updateStatsUI(card, data) {
    const statusBadge = card.querySelector(".project-status");
    const container = card.querySelector(".project-stats");
    const description = card.querySelector("p");
    const downloadRow = card.querySelector(".download-row");
    const repoHeader = card.querySelector("h3");

    if (statusBadge) statusBadge.textContent = data.version;
    if (description && data.description) description.textContent = data.description;

    // Update Header with Author if external
    if (repoHeader && data.owner !== "Silkroad-Developer-Community") {
      const projectName = repoHeader.dataset.name || repoHeader.textContent.trim();
      if (!repoHeader.dataset.name) repoHeader.dataset.name = projectName;
      repoHeader.innerHTML = `<a href="https://github.com/${data.owner}" target="_blank" class="project-author">${data.owner}</a><span class="project-divider"> / </span>${projectName}`;
    }

    if (downloadRow) {
      downloadRow.innerHTML = ""; // Clear existing

      if (data.stable_download_url) {
        const downloadLink = document.createElement("a");
        downloadLink.href = data.stable_download_url;
        downloadLink.target = "_blank";
        downloadLink.className = "btn btn-primary btn-download";
        const label = data.pre_download_url ? "Stable" : "Download";
        downloadLink.innerHTML = `<i data-lucide="download"></i><span>${label}</span>`;
        downloadRow.appendChild(downloadLink);
      }

      if (data.pre_download_url) {
        const preLink = document.createElement("a");
        preLink.href = data.pre_download_url;
        preLink.target = "_blank";
        preLink.className = "btn btn-secondary btn-download";
        preLink.innerHTML = `<i data-lucide="flask-conical"></i><span>Pre-release</span>`;
        downloadRow.appendChild(preLink);
      }
    }

    const starValue = container.querySelector(".stat-item:nth-child(1) .stat-value");
    const forkValue = container.querySelector(".stat-item:nth-child(2) .stat-value");
    const issueValue = container.querySelector(".stat-item:nth-child(3) .stat-value");
    const dateItem = container.querySelector(".stat-item:nth-child(4)");
    const dateValue = dateItem ? dateItem.querySelector(".stat-value") : null;

    if (starValue) starValue.textContent = data.stargazers_count;
    if (forkValue) forkValue.textContent = data.forks_count;
    if (issueValue) issueValue.textContent = data.open_issues_count;

    if (dateItem) {
      if (data.release_date === "N/A" || data.version === "No Release") {
        dateItem.style.display = "none";
      } else {
        dateItem.style.display = "flex";
        if (dateValue) dateValue.textContent = data.release_date;
      }
    }
  }

  fetchRepoStats();

  // Mobile Menu Logic
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      const icon = menuToggle.querySelector("i");
      if (icon) {
        const isOpened = navLinks.classList.contains("active");
        icon.setAttribute("data-lucide", isOpened ? "x" : "menu");
        if (window.lucide) window.lucide.createIcons();
      }
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
        const icon = menuToggle.querySelector("i");
        if (icon) {
          icon.setAttribute("data-lucide", "menu");
          if (window.lucide) window.lucide.createIcons();
        }
      });
    });
  }
});
