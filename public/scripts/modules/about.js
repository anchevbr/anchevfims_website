const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const createRoutePath = (points) => points.reduce((path, point, index) => {
  if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;

  const previousPoint = points[index - 1];
  const midpointY = (previousPoint.y + point.y) / 2;
  return `${path} C ${previousPoint.x.toFixed(1)} ${midpointY.toFixed(1)}, ${point.x.toFixed(1)} ${midpointY.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
}, '');

const getGridCoordinates = (length, spacing = 184) => {
  const coordinates = [];
  for (let coordinate = 0; coordinate < length; coordinate += spacing) {
    coordinates.push(coordinate);
  }
  coordinates.push(length);
  return coordinates;
};

const getWobbledGridPoint = (baseX, baseY, width, height, phase) => {
  const horizontalOffset = Math.sin(baseY / 220 + phase) * 3.5
    + Math.sin(baseX / 420 - phase * 0.6) * 1.5;
  const verticalOffset = Math.cos(baseX / 280 - phase * 0.75) * 3.25
    + Math.sin(baseY / 460 + phase * 0.5) * 1.25;

  return {
    x: clamp(baseX + horizontalOffset, 0, width),
    y: clamp(baseY + verticalOffset, 0, height)
  };
};

const createGridLinePath = (orientation, position, width, height, phase) => {
  const lineLength = orientation === 'horizontal' ? width : height;
  const segmentCount = Math.max(1, Math.ceil(lineLength / 96));
  const points = Array.from({ length: segmentCount + 1 }, (_value, index) => {
    const lineProgress = index / segmentCount;
    const baseX = orientation === 'horizontal' ? lineProgress * width : position;
    const baseY = orientation === 'horizontal' ? position : lineProgress * height;
    return getWobbledGridPoint(baseX, baseY, width, height, phase);
  });

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
};

const setupAboutRoute = (root) => {
  const editorial = root.querySelector('.about-ed');
  const productionFieldSvg = root.querySelector('.about-production-field-svg');
  const productionFieldGrid = root.querySelector('.about-production-grid');
  const route = root.querySelector('.about-route');
  const routeSvg = root.querySelector('.about-route-svg');
  const routeTrack = root.querySelector('.about-route-track');
  const routeProgress = root.querySelector('.about-route-progress');
  const routeNodes = root.querySelector('.about-route-nodes');
  const sections = [...root.querySelectorAll('.about-ed-section')];
  const bar = root.querySelector('.about-ed-bar');
  const quote = root.querySelector('.about-ed-quote-wrap');
  const hero = root.querySelector('.about-ed-hero');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!editorial || !productionFieldSvg || !productionFieldGrid || !route || !routeSvg || !routeTrack || !routeProgress || !routeNodes || !bar || !quote || !hero) return () => {};

  sections.forEach((section) => {
    section.dataset.routePosition = String(Math.random() * 2 - 1);
  });

  let isActive = true;
  let layoutTimer = 0;
  let scrollTimer = 0;
  let pathLength = 0;
  let routeStartY = 0;
  let routeEndY = 0;
  let gridWidth = 0;
  let gridHeight = 0;
  let gridLines = [];

  const updateGrid = () => {
    if (!gridLines.length) return;

    const phase = motionPreference.matches ? 0 : window.scrollY * 0.0025;
    gridLines.forEach(({ path, orientation, position }) => {
      path.setAttribute('d', createGridLinePath(orientation, position, gridWidth, gridHeight, phase));
    });
  };

  const drawGrid = (width, height) => {
    gridWidth = width;
    gridHeight = height;
    gridLines = [];
    productionFieldSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    productionFieldGrid.replaceChildren();

    const addGridLine = (orientation, position) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('about-route-grid-line');
      productionFieldGrid.append(path);
      gridLines.push({ path, orientation, position });
    };

    getGridCoordinates(height).forEach((position) => addGridLine('horizontal', position));
    getGridCoordinates(width).forEach((position) => addGridLine('vertical', position));
    updateGrid();
  };

  const getStablePoint = (element, horizontalAnchor = 0.5, verticalAnchor = 0.5) => {
    let x = element.offsetWidth * horizontalAnchor;
    let y = element.offsetHeight * verticalAnchor;
    let current = element;

    while (current && current !== editorial) {
      x += current.offsetLeft;
      y += current.offsetTop;
      current = current.offsetParent;
    }

    if (current === editorial) return { x, y };

    const editorialRect = editorial.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    return {
      x: elementRect.left - editorialRect.left + elementRect.width * horizontalAnchor,
      y: elementRect.top - editorialRect.top + elementRect.height * verticalAnchor
    };
  };

  const updateProgress = () => {
    if (!pathLength || !routeEndY) return;

    const viewportLead = window.scrollY + window.innerHeight * 0.7;
    const editorialTop = window.scrollY + editorial.getBoundingClientRect().top;
    const routeContainerTop = window.scrollY + root.getBoundingClientRect().top;
    const routeStart = editorialTop + routeStartY;
    const routeEnd = editorialTop + routeEndY;
    const isAtRouteEnd = window.scrollY + window.innerHeight >= routeContainerTop + root.clientHeight - 2;
    const progress = motionPreference.matches || isAtRouteEnd
      ? 1
      : clamp((viewportLead - routeStart) / Math.max(1, routeEnd - routeStart), 0, 1);

    routeProgress.style.strokeDashoffset = `${pathLength * (1 - progress)}`;
    route.dataset.progress = String(progress);
    updateGrid();
  };

  const positionSections = () => {
    const editorialStyles = window.getComputedStyle(editorial);
    const contentWidth = editorial.clientWidth
      - Number.parseFloat(editorialStyles.paddingLeft)
      - Number.parseFloat(editorialStyles.paddingRight);

    sections.forEach((section) => {
      const availableWidth = Math.max(0, contentWidth - section.offsetWidth);
      const maximumOffset = Math.min(72, availableWidth / 2);
      const position = Number(section.dataset.routePosition);
      section.style.setProperty('--about-section-offset', `${Math.round(maximumOffset * position)}px`);
    });
  };

  const drawRoute = () => {
    const editorialWidth = editorial.clientWidth;
    const editorialHeight = editorial.scrollHeight;
    const fieldWidth = root.clientWidth;
    const fieldHeight = root.scrollHeight;
    if (!editorialWidth || !editorialHeight || !fieldWidth || !fieldHeight) return;

    const points = [
      getStablePoint(bar, 0.5, 1),
      getStablePoint(quote),
      ...sections.map((section) => getStablePoint(section.querySelector('.about-ed-section-hd'))),
      getStablePoint(hero)
    ];
    const path = createRoutePath(points);

    routeSvg.setAttribute('viewBox', `0 0 ${editorialWidth} ${editorialHeight}`);
    drawGrid(fieldWidth, fieldHeight);
    routeTrack.setAttribute('d', path);
    routeProgress.setAttribute('d', path);
    routeNodes.replaceChildren();

    points.slice(1).forEach((point) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      node.classList.add('about-route-node');
      node.setAttribute('cx', point.x.toFixed(1));
      node.setAttribute('cy', point.y.toFixed(1));
      node.setAttribute('r', '3.5');
      routeNodes.append(node);
    });

    pathLength = routeProgress.getTotalLength();
    routeProgress.style.strokeDasharray = `${pathLength} ${pathLength}`;
    routeStartY = points[0].y;
    routeEndY = points[points.length - 1].y;
    updateProgress();
  };

  const scheduleLayout = () => {
    if (!isActive || layoutTimer) return;
    layoutTimer = window.setTimeout(() => {
      layoutTimer = 0;
      positionSections();
      drawRoute();
    }, 16);
  };

  const scheduleProgress = () => {
    if (!isActive || scrollTimer) return;
    scrollTimer = window.setTimeout(() => {
      scrollTimer = 0;
      updateProgress();
    }, 16);
  };

  const resizeObserver = new ResizeObserver(scheduleLayout);
  resizeObserver.observe(root);
  window.addEventListener('resize', scheduleLayout);
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  motionPreference.addEventListener('change', scheduleProgress);
  document.fonts?.ready.then(scheduleLayout);
  positionSections();
  drawRoute();

  return () => {
    isActive = false;
    window.clearTimeout(layoutTimer);
    window.clearTimeout(scrollTimer);
    resizeObserver.disconnect();
    window.removeEventListener('resize', scheduleLayout);
    window.removeEventListener('scroll', scheduleProgress);
    motionPreference.removeEventListener('change', scheduleProgress);
  };
};

export const renderAbout = () => {
  const root = document.getElementById('about-page-content');
  if (!root) return;
  root._aboutCleanup?.();
  if (!root.childElementCount) root.innerHTML = `
    <div class="about-production-field" aria-hidden="true">
      <svg class="about-production-field-svg" viewBox="0 0 1 1" preserveAspectRatio="none">
        <g class="about-production-grid"></g>
      </svg>
    </div>
    <div class="about-ed">
      <div class="about-route" aria-hidden="true">
        <svg class="about-route-svg" viewBox="0 0 1 1" preserveAspectRatio="none">
          <path class="about-route-track"></path>
          <path class="about-route-progress"></path>
          <g class="about-route-nodes"></g>
        </svg>
      </div>

      <div class="about-ed-bar">
        <span class="about-ed-eyebrow" data-av>About Anchev Films</span>
        <span class="about-ed-bar-rule"></span>
        <button class="about-ed-back" data-av data-scroll-to="home" type="button">↑ Back</button>
      </div>

      <div class="about-ed-quote-wrap" data-av>
        <blockquote class="about-ed-quote">
          <p><em>"The standard is simple: make the work matter."</em></p>
          <cite>— Boris Anchev, Founder</cite>
        </blockquote>
      </div>

      <div class="about-ed-section" data-av>
        <div class="about-ed-section-hd">
          <h3 class="about-ed-heading">Ambition needs<br>a way through.</h3>
        </div>
        <div class="about-ed-body">
          <p>Good ideas do not fail because they lack imagination. They fail when the plan cannot carry them through the realities of budget, schedule, location, and people.</p>
          <p>We build the structure early: one clear direction, the right team, and a production plan that keeps the work moving.</p>
        </div>
      </div>

      <div class="about-ed-section" data-av>
        <div class="about-ed-section-hd">
          <h3 class="about-ed-heading">Production should<br>create momentum.</h3>
        </div>
        <div class="about-ed-body">
          <p>We bring the right people into the room early, set decisions in motion, and keep the distance between creative intent and execution short.</p>
          <p>That is how a production moves quickly without becoming careless, and how an idea keeps its edge from first conversation to final delivery.</p>
        </div>
      </div>

      <div class="about-ed-section" data-av>
        <div class="about-ed-section-hd">
          <h3 class="about-ed-heading">Built to deliver,<br>not just impress.</h3>
        </div>
        <div class="about-ed-body">
          <p>From the first treatment to the final master, we take responsibility for the details that determine whether the work lands.</p>
          <p>Every choice is tested against the same question: does it make the film stronger, clearer, and more effective?</p>
        </div>
      </div>

      <div class="about-ed-section" data-av>
        <div class="about-ed-section-hd">
          <h3 class="about-ed-heading">We stay close<br>to the hard parts.</h3>
        </div>
        <div class="about-ed-body">
          <p>Production becomes valuable when the pressure arrives: a late change, a tight location, a difficult schedule, or a decision that cannot wait.</p>
          <p>We are there to solve, make the call, and protect the work. That is what clients are hiring when they bring us in.</p>
        </div>
      </div>

      <div class="about-ed-section" data-av>
        <div class="about-ed-section-hd">
          <h3 class="about-ed-heading">The work has<br>to travel.</h3>
        </div>
        <div class="about-ed-body">
          <p>A film has to work beyond the set: across audiences, channels, markets, and the life of a campaign.</p>
          <p>We make with that in mind: a clear idea, a considered finish, and the operational discipline to deliver work that holds up wherever it is seen.</p>
        </div>
      </div>

      <header class="about-ed-hero" data-av>
        <p class="about-ed-tagline">Built on the need to make things happen.</p>
      </header>
      </div>
  `;

  // Per-element scroll-triggered reveal
  const items = root.querySelectorAll('[data-av]');
  items.forEach((el, i) => el.style.setProperty('--av-delay', `${i * 60}ms`));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('av-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el) => observer.observe(el));
  const cleanupRoute = setupAboutRoute(root);
  root._aboutCleanup = () => {
    observer.disconnect();
    cleanupRoute();
  };
};
