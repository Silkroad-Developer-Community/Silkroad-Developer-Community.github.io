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

  async function fetchRepoStats() {
    const cards = document.querySelectorAll(".project-card[data-repo]");

    for (const card of cards) {
      const repo = card.dataset.repo;
      const statsContainer = card.querySelector(".project-stats");
      const statusBadge = card.querySelector(".project-status");
      if (!statsContainer) continue;

      try {
        let data = getCachedData(repo);

        if (!data) {
          // Fetch Repo Info
          const repoResponse = await fetch(`https://api.github.com/repos/${repo}`);
          if (!repoResponse.ok) throw new Error("Repo not found");
          const repoData = await repoResponse.json();

          // Fetch Latest Release
          let releaseData = null;
          try {
            const releaseResponse = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
            if (releaseResponse.ok) {
              releaseData = await releaseResponse.json();
            }
          } catch (e) {
            console.log(`No releases found for ${repo}`);
          }

          data = {
            stargazers_count: repoData.stargazers_count,
            forks_count: repoData.forks_count,
            open_issues_count: repoData.open_issues_count,
            version: releaseData ? releaseData.tag_name : "No Release",
            release_date: releaseData ? new Date(releaseData.published_at).toLocaleDateString() : "N/A",
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
    const cached = localStorage.getItem(`gh-stats-${repo}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`gh-stats-${repo}`);
      return null;
    }
    return data;
  }

  function cacheData(repo, data) {
    const cacheObject = {
      data: data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`gh-stats-${repo}`, JSON.stringify(cacheObject));
  }

  function updateStatsUI(card, data) {
    const statusBadge = card.querySelector(".project-status");
    const container = card.querySelector(".project-stats");

    if (statusBadge) statusBadge.textContent = data.version;

    const starValue = container.querySelector(".stat-item:nth-child(1) .stat-value");
    const forkValue = container.querySelector(".stat-item:nth-child(2) .stat-value");
    const issueValue = container.querySelector(".stat-item:nth-child(3) .stat-value");
    const dateValue = container.querySelector(".stat-item:nth-child(4) .stat-value");

    if (starValue) starValue.textContent = data.stargazers_count;
    if (forkValue) forkValue.textContent = data.forks_count;
    if (issueValue) issueValue.textContent = data.open_issues_count;
    if (dateValue) dateValue.textContent = data.release_date;
  }

  fetchRepoStats();
});
