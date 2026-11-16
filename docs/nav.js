// 공통 모듈: 하단 탭 메뉴. 각 페이지에서 renderNav("현재 페이지 키")로 호출한다.
// 새 페이지를 추가할 때만 NAV_ITEMS를 수정한다.

const NAV_ITEMS = [
  { key: "home", label: "홈", icon: "🏠", href: "index.html" },
  { key: "add", label: "기록", icon: "✏️", href: "add.html" },
  { key: "exercise", label: "종목별", icon: "🏋️", href: "by-exercise.html" },
  { key: "weekly", label: "주간", icon: "📅", href: "weekly.html" },
];

function renderNav(active) {
  const nav = document.getElementById("nav");
  if (!nav) return;
  nav.className = "tabbar";
  const inner = document.createElement("div");
  inner.className = "tabbar-inner";
  NAV_ITEMS.forEach((item) => {
    const a = document.createElement("a");
    a.href = item.href;
    if (item.key === active) a.className = "active";
    const icon = document.createElement("span");
    icon.textContent = item.icon;
    a.appendChild(icon);
    a.appendChild(document.createTextNode(item.label));
    inner.appendChild(a);
  });
  nav.appendChild(inner);
}
